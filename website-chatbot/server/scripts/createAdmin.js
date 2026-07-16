/**
 * Create Admin Script — Run once to create the first admin user
 * Usage: node scripts/createAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { connectDB } = require('../config/database');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log('✅ Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@kalairestaurant.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'superadmin',
    });

    console.log('✅ Admin created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log('\n⚠️  Remember to change the default password immediately!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create admin:', err.message);
    process.exit(1);
  }
};

createAdmin();
