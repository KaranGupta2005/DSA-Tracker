const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',

  // AI Provider Keys
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,

  // Admin Seeding
  headAdminUsername: process.env.HEAD_ADMIN_USERNAME,
  headAdminEmail: process.env.HEAD_ADMIN_EMAIL,
  headAdminPassword: process.env.HEAD_ADMIN_PASSWORD,
};

module.exports = config;
