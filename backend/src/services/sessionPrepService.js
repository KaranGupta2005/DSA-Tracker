const SessionProgress = require('../Models/SessionProgress');
const { callAI } = require('./aiService');
const { createAppError } = require('../middleware/errorHandler');

/**
 * Structured curriculum with ≥3 categories and individually completable modules.
 */
const CURRICULUM = {
  categories: [
    {
      id: 'ai-ml-fundamentals',
      name: 'AI/ML Fundamentals',
      modules: [
        { id: 'intro-ml', title: 'Introduction to Machine Learning', description: 'Core concepts of ML, types of learning, and real-world applications' },
        { id: 'supervised-learning', title: 'Supervised Learning', description: 'Regression, classification, decision trees, and evaluation metrics' },
        { id: 'unsupervised-learning', title: 'Unsupervised Learning', description: 'Clustering, dimensionality reduction, and anomaly detection' },
        { id: 'neural-networks', title: 'Neural Networks Basics', description: 'Perceptrons, activation functions, backpropagation, and gradient descent' },
        { id: 'deep-learning', title: 'Deep Learning & CNNs', description: 'Convolutional neural networks, transfer learning, and image classification' },
      ],
    },
    {
      id: 'presentation-skills',
      name: 'Presentation Skills',
      modules: [
        { id: 'public-speaking', title: 'Public Speaking Fundamentals', description: 'Voice projection, pacing, body language, and managing nervousness' },
        { id: 'slide-design', title: 'Effective Slide Design', description: 'Visual hierarchy, minimal text, diagrams, and consistent styling' },
        { id: 'live-coding', title: 'Live Coding Demonstrations', description: 'Preparing demos, handling errors gracefully, and audience interaction' },
        { id: 'audience-engagement', title: 'Audience Engagement', description: 'Q&A facilitation, interactive exercises, and reading the room' },
      ],
    },
    {
      id: 'hands-on-projects',
      name: 'Hands-on Project Guidance',
      modules: [
        { id: 'project-planning', title: 'Project Planning & Scoping', description: 'Defining objectives, timelines, deliverables, and team coordination' },
        { id: 'data-preprocessing', title: 'Data Preprocessing', description: 'Cleaning, normalization, feature engineering, and handling missing data' },
        { id: 'model-training', title: 'Model Training & Evaluation', description: 'Train/test splits, cross-validation, hyperparameter tuning, and metrics' },
        { id: 'deployment', title: 'Model Deployment Basics', description: 'Flask/FastAPI serving, containerization, and cloud deployment options' },
        { id: 'workshop-facilitation', title: 'Workshop Facilitation', description: 'Structuring hands-on sessions, troubleshooting participant issues, and time management' },
      ],
    },
  ],
};

/**
 * Total number of modules across all categories.
 */
const TOTAL_MODULES = CURRICULUM.categories.reduce(
  (sum, cat) => sum + cat.modules.length,
  0
);

/**
 * Returns all valid module IDs from the curriculum.
 */
const getAllModuleIds = () => {
  const ids = [];
  for (const category of CURRICULUM.categories) {
    for (const mod of category.modules) {
      ids.push(mod.id);
    }
  }
  return ids;
};

/**
 * Calculates completion percentage as Math.round(completed / total * 100).
 * Exported as a pure function for property-based testing.
 * @param {number} completed - Number of completed modules
 * @param {number} total - Total number of modules
 * @returns {number} Percentage between 0 and 100
 */
const calculateCompletionPercentage = (completed, total) => {
  if (total <= 0) return 0;
  if (completed <= 0) return 0;
  if (completed >= total) return 100;
  return Math.round((completed / total) * 100);
};

/**
 * Returns the structured curriculum.
 * @returns {Object} The curriculum with categories and modules
 */
const getCurriculum = () => {
  return { ...CURRICULUM, totalModules: TOTAL_MODULES };
};

/**
 * Fetches or creates a SessionProgress record for the given member.
 * @param {string} memberId - The member's ObjectId
 * @returns {Promise<Object>} The SessionProgress document
 */
const getProgress = async (memberId) => {
  let progress = await SessionProgress.findOne({ memberId });

  if (!progress) {
    progress = await SessionProgress.create({
      memberId,
      completedModules: [],
      totalModules: TOTAL_MODULES,
      completionPercentage: 0,
    });
  }

  return progress;
};

/**
 * Marks a module as complete for the given member.
 * Recalculates completion percentage and persists.
 * @param {string} memberId - The member's ObjectId
 * @param {string} moduleId - The module identifier to mark complete
 * @returns {Promise<Object>} The updated SessionProgress document
 */
const completeModule = async (memberId, moduleId) => {
  // Validate moduleId exists in curriculum
  const validModuleIds = getAllModuleIds();
  if (!validModuleIds.includes(moduleId)) {
    throw createAppError(
      'VALIDATION_ERROR',
      `Module "${moduleId}" does not exist in the curriculum.`,
      { field: 'moduleId', validModules: validModuleIds }
    );
  }

  let progress = await getProgress(memberId);

  // Check if module is already completed
  const alreadyCompleted = progress.completedModules.some(
    (m) => m.moduleId === moduleId
  );

  if (alreadyCompleted) {
    return progress;
  }

  // Mark module as complete
  progress.completedModules.push({
    moduleId,
    completedAt: new Date(),
  });

  // Recalculate percentage
  progress.completionPercentage = calculateCompletionPercentage(
    progress.completedModules.length,
    progress.totalModules
  );

  await progress.save();

  return progress;
};

/**
 * Generates a timeline of milestones from the current month through September 2026.
 * At least one milestone per month.
 * @param {Date} currentDate - The reference date to start from
 * @returns {Array<{month: string, title: string, description: string}>}
 */
const getTimeline = (currentDate) => {
  const milestones = [];
  const endYear = 2026;
  const endMonth = 8; // September is month index 8 (0-based)

  let year = currentDate.getFullYear();
  let month = currentDate.getMonth(); // 0-based

  // Milestone templates that cycle through the months
  const milestoneTemplates = [
    { title: 'Foundation Building', description: 'Complete introductory ML modules and start learning presentation basics' },
    { title: 'Core Concepts Deep Dive', description: 'Study supervised and unsupervised learning algorithms in depth' },
    { title: 'Neural Networks Exploration', description: 'Understand neural network architectures and backpropagation' },
    { title: 'Presentation Skills Practice', description: 'Practice public speaking and slide design with peer feedback' },
    { title: 'First Mini-Project', description: 'Plan and execute a small ML project with a partner' },
    { title: 'Data Pipeline Mastery', description: 'Master data preprocessing, cleaning, and feature engineering workflows' },
    { title: 'Model Training Workshop', description: 'Train models, perform hyperparameter tuning, and evaluate results' },
    { title: 'Live Coding Practice', description: 'Prepare and deliver live coding demonstrations to small groups' },
    { title: 'Deployment Fundamentals', description: 'Learn to deploy models using Flask/FastAPI and cloud services' },
    { title: 'Workshop Dry Run', description: 'Conduct a practice workshop session for team members' },
    { title: 'Advanced Topics Review', description: 'Review deep learning, CNNs, and transfer learning concepts' },
    { title: 'Content Finalization', description: 'Finalize session materials, slides, and code examples' },
    { title: 'Peer Review Sessions', description: 'Get feedback from peers and mentors on presentation quality' },
    { title: 'Mock Session Delivery', description: 'Deliver a full mock session with audience Q&A handling' },
    { title: 'Final Preparation', description: 'Polish all materials and rehearse the complete session end-to-end' },
    { title: 'Session Ready', description: 'Complete all preparation — ready to conduct AI/ML sessions independently' },
  ];

  let templateIndex = 0;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const template = milestoneTemplates[templateIndex % milestoneTemplates.length];

    milestones.push({
      month: monthStr,
      title: template.title,
      description: template.description,
    });

    templateIndex++;

    // Move to next month
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return milestones;
};

/**
 * Generates AI-powered topic content including explanations, talking points, and example code.
 * Calls the AI service with a topic-specific prompt and returns structured content.
 * @param {string} topic - The topic to generate content for
 * @returns {Promise<{topic: string, explanations: string, talkingPoints: string[], exampleCode: string}>}
 * @throws {Error} AI_SERVICE_UNAVAILABLE if AI providers are unavailable
 */
const generateTopicContent = async (topic) => {
  const prompt = `You are an AI/ML educator preparing content for an undergraduate workshop session on "${topic}".

Generate educational content in the following JSON format:
{
  "explanations": "Clear, detailed explanations of the topic suitable for undergraduate students",
  "talkingPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "exampleCode": "A complete, runnable Python code example demonstrating the key concept"
}

Rules:
- explanations: A comprehensive but accessible explanation of the topic (2-4 paragraphs)
- talkingPoints: 3 to 7 key talking points the presenter should cover
- exampleCode: A practical Python code example with comments explaining each step

Respond ONLY with valid JSON, no additional text.`;

  const rawResponse = await callAI(prompt);

  // Parse the JSON response
  let content;
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    content = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Failed to parse AI response for topic content.',
      { rawResponse: rawResponse.substring(0, 200) }
    );
  }

  // Validate required fields
  if (!content.explanations || typeof content.explanations !== 'string') {
    throw createAppError('VALIDATION_ERROR', 'AI response missing valid explanations field.');
  }
  if (!Array.isArray(content.talkingPoints) || content.talkingPoints.length === 0) {
    throw createAppError('VALIDATION_ERROR', 'AI response missing valid talkingPoints field.');
  }
  if (!content.exampleCode || typeof content.exampleCode !== 'string') {
    throw createAppError('VALIDATION_ERROR', 'AI response missing valid exampleCode field.');
  }

  return {
    topic,
    explanations: content.explanations,
    talkingPoints: content.talkingPoints,
    exampleCode: content.exampleCode,
  };
};

/**
 * Generates AI-powered practice questions with model answers for a session topic.
 * Returns between 3 and 10 questions targeted at an undergraduate workshop audience.
 * @param {string} topic - The topic to generate questions for
 * @returns {Promise<{topic: string, questions: Array<{question: string, answer: string}>}>}
 * @throws {Error} AI_SERVICE_UNAVAILABLE if AI providers are unavailable
 */
const generatePracticeQuestions = async (topic) => {
  const prompt = `You are an AI/ML educator creating practice questions for an undergraduate workshop on "${topic}".

Generate practice questions with model answers in the following JSON format:
{
  "questions": [
    {"question": "Question text here?", "answer": "Model answer here"},
    {"question": "Question text here?", "answer": "Model answer here"}
  ]
}

Rules:
- Generate between 3 and 10 questions (aim for 5-7)
- Questions should be appropriate for undergraduate-level students attending a workshop
- Include a mix of conceptual understanding and practical application questions
- Model answers should be concise but complete (2-4 sentences each)
- Questions should progress from basic understanding to more advanced application

Respond ONLY with valid JSON, no additional text.`;

  const rawResponse = await callAI(prompt);

  // Parse the JSON response
  let content;
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    content = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Failed to parse AI response for practice questions.',
      { rawResponse: rawResponse.substring(0, 200) }
    );
  }

  // Validate questions array
  if (!Array.isArray(content.questions)) {
    throw createAppError('VALIDATION_ERROR', 'AI response missing valid questions array.');
  }

  // Validate question count (3-10)
  if (content.questions.length < 3 || content.questions.length > 10) {
    throw createAppError(
      'VALIDATION_ERROR',
      `AI response must contain 3-10 questions, received ${content.questions.length}.`
    );
  }

  // Validate each question has question and answer fields
  for (const q of content.questions) {
    if (!q || typeof q.question !== 'string' || q.question.trim().length === 0) {
      throw createAppError('VALIDATION_ERROR', 'Each question must have a non-empty question field.');
    }
    if (!q || typeof q.answer !== 'string' || q.answer.trim().length === 0) {
      throw createAppError('VALIDATION_ERROR', 'Each question must have a non-empty answer field.');
    }
  }

  return {
    topic,
    questions: content.questions,
  };
};

module.exports = {
  getCurriculum,
  getProgress,
  completeModule,
  getTimeline,
  generateTopicContent,
  generatePracticeQuestions,
  calculateCompletionPercentage,
  CURRICULUM,
  TOTAL_MODULES,
};
