const SessionProgress = require('../Models/SessionProgress');
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

module.exports = {
  getCurriculum,
  getProgress,
  completeModule,
  getTimeline,
  calculateCompletionPercentage,
  CURRICULUM,
  TOTAL_MODULES,
};
