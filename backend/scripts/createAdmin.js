import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';

/**
 * Usage:
 *   ADMIN_NAME="CSE Admin" ADMIN_EMAIL="csead@ug.cusat.ac.in" ADMIN_PASS="SecurePass123" ADMIN_ROLE="DEPARTMENT_ADMIN" ADMIN_DEPT="CSE" node scripts/createAdmin.js
 *   ADMIN_NAME="Sports Admin" ADMIN_EMAIL="sportsad@ug.cusat.ac.in" ADMIN_PASS="SecurePass123" ADMIN_ROLE="SPORTS_ADMIN" node scripts/createAdmin.js
 */

async function createAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASS;
  const role = process.env.ADMIN_ROLE;
  const deptCode = process.env.ADMIN_DEPT;

  if (!name || !email || !password || !role) {
    console.error('❌ Required: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASS, ADMIN_ROLE');
    process.exit(1);
  }

  if (!['DEPARTMENT_ADMIN', 'SPORTS_ADMIN'].includes(role)) {
    console.error('❌ ADMIN_ROLE must be DEPARTMENT_ADMIN or SPORTS_ADMIN');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  let departmentId = null;
  if (role === 'DEPARTMENT_ADMIN') {
    if (!deptCode) {
      console.error('❌ ADMIN_DEPT (department code) is required for DEPARTMENT_ADMIN');
      process.exit(1);
    }
    const dept = await Department.findOne({ code: deptCode.toUpperCase() });
    if (!dept) {
      console.error(`❌ Department with code "${deptCode}" not found. Run seed first.`);
      process.exit(1);
    }
    departmentId = dept._id;
    console.log(`   📁 Department: ${dept.name}`);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`❌ User with email ${email} already exists`);
    process.exit(1);
  }

  const passwordHash = await User.hashPassword(password);
  const admin = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    departmentId,
    emailVerified: true,
    accountStatus: 'ACTIVE',
  });

  console.log(`\n✅ Admin created successfully!`);
  console.log(`   Name: ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   ID: ${admin._id}`);

  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
