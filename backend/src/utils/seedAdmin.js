const Admin = require('../Models/Admin');
const config = require('../config');

/**
 * Seeds the Head Admin on startup if it doesn't already exist.
 * If it exists but password might be stale, updates the password.
 * Uses HEAD_ADMIN_USERNAME, HEAD_ADMIN_EMAIL, HEAD_ADMIN_PASSWORD from .env.
 */
async function seedHeadAdmin() {
  try {
    const { headAdminUsername, headAdminEmail, headAdminPassword } = config;

    if (!headAdminEmail || !headAdminPassword || !headAdminUsername) {
      console.log('Head Admin credentials not found in env. Skipping admin seeding.');
      return;
    }

    // Check if head admin already exists
    const existing = await Admin.findOne({
      $or: [{ email: headAdminEmail }, { username: headAdminUsername }],
    });

    if (existing) {
      // Update password in case it changed in env
      existing.password = headAdminPassword;
      existing.isHeadAdmin = true;
      await existing.save(); // pre-save hook will hash the password
      console.log('Head Admin exists — password synced from env.');
      return;
    }

    // Create the head admin
    await Admin.create({
      username: headAdminUsername,
      email: headAdminEmail,
      password: headAdminPassword,
      isHeadAdmin: true,
    });

    console.log('Head Admin seeded successfully.');
  } catch (error) {
    console.error('Error seeding Head Admin:', error.message);
  }
}

module.exports = { seedHeadAdmin };
