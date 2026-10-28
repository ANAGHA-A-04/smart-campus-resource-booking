import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import Department from '../src/models/Department.js';
import User from '../src/models/User.js';

const DEPARTMENTS = [
  { name: 'Computer Science and Engineering', code: 'CSE', description: 'Department of Computer Science and Engineering' },
  { name: 'Electronics and Communication Engineering', code: 'ECE', description: 'Department of Electronics and Communication Engineering' },
  { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology' },
  { name: 'Electrical and Electronics Engineering', code: 'EEE', description: 'Department of Electrical and Electronics Engineering' },
  { name: 'Master of Computer Applications', code: 'MCA', description: 'Department of Master of Computer Applications' },
  { name: 'Civil Engineering', code: 'CIVIL', description: 'Department of Civil Engineering' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Create departments
  console.log('\n📚 Creating departments...');
  const createdDepts = {};
  for (const dept of DEPARTMENTS) {
    const existing = await Department.findOne({ code: dept.code });
    if (existing) {
      console.log(`   ⏭️  ${dept.code} already exists`);
      createdDepts[dept.code] = existing;
    } else {
      const created = await Department.create(dept);
      createdDepts[dept.code] = created;
      console.log(`   ✅ Created: ${dept.name} (${dept.code})`);
    }
  }

  console.log('\n✅ Seed completed!');
  console.log('\nDepartment IDs (save these for admin creation):');
  for (const [code, dept] of Object.entries(createdDepts)) {
    console.log(`   ${code}: ${dept._id}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
