import dns from 'dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Department from '../src/models/Department.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import TimetableEntry from '../src/models/TimetableEntry.js';
import EligibleStudent from '../src/models/EligibleStudent.js';

async function seed() {
  await connectDatabase();

  // 1. Departments
  const cseDept = await Department.findOne({ code: 'CSE' });
  const eceDept = await Department.findOne({ code: 'ECE' });
  const itDept = await Department.findOne({ code: 'IT' });

  if (!cseDept || !eceDept) {
    throw new Error('CSE and ECE departments required. Run seedDepartments.js first.');
  }

  // 2. Official Student Eligibility Dataset (Managed by Department Admins)
  console.log('📋 Seeding Authorized Student Eligibility Dataset (EligibleStudents)...');

  const demoEligibleStudents = [
    // CSE 2023-2027 Batch
    { studentId: '20223517', name: 'Anand Krishna',    institutionalEmail: 'student@ug.cusat.ac.in',   departmentId: cseDept._id, academicYear: '2023-2027', eligibilityStatus: 'ELIGIBLE' },
    { studentId: '20223518', name: 'Sneha Paul',       institutionalEmail: 'snehap@ug.cusat.ac.in',    departmentId: cseDept._id, academicYear: '2023-2027', eligibilityStatus: 'ELIGIBLE' },
    { studentId: '20223519', name: 'Vivek Sharma',     institutionalEmail: 'viveks@ug.cusat.ac.in',    departmentId: cseDept._id, academicYear: '2023-2027', eligibilityStatus: 'ELIGIBLE' },
    // CSE 2024-2028 Batch
    { studentId: '20243001', name: 'Adithya V',        institutionalEmail: 'adithyav@ug.cusat.ac.in',  departmentId: cseDept._id, academicYear: '2024-2028', eligibilityStatus: 'ELIGIBLE' },
    { studentId: '20243002', name: 'Bhavna K',         institutionalEmail: 'bhavnak@ug.cusat.ac.in',   departmentId: cseDept._id, academicYear: '2024-2028', eligibilityStatus: 'ELIGIBLE' },
    // ECE 2023-2027 Batch
    { studentId: '20224101', name: 'Rahul Nair',       institutionalEmail: 'ecestudent@ug.cusat.ac.in',departmentId: eceDept._id, academicYear: '2023-2027', eligibilityStatus: 'ELIGIBLE' },
    { studentId: '20224115', name: 'Pooja Menon',      institutionalEmail: 'poojam@ug.cusat.ac.in',    departmentId: eceDept._id, academicYear: '2023-2027', eligibilityStatus: 'ELIGIBLE' },
    // IT 2023-2027 Batch
    { studentId: '20225201', name: 'Meera Raj',        institutionalEmail: 'itstudent@ug.cusat.ac.in', departmentId: itDept._id,  academicYear: '2023-2027', eligibilityStatus: 'ELIGIBLE' },
    // Ineligible / Suspended Student for Testing
    { studentId: '20223599', name: 'Suspended Student',institutionalEmail: 'suspended@ug.cusat.ac.in', departmentId: cseDept._id, academicYear: '2023-2027', eligibilityStatus: 'INELIGIBLE' },
  ];

  for (const s of demoEligibleStudents) {
    await EligibleStudent.findOneAndUpdate(
      { institutionalEmail: s.institutionalEmail, departmentId: s.departmentId },
      s,
      { upsert: true, new: true }
    );
  }
  console.log(`   ✓ Seeded ${demoEligibleStudents.length} eligible student roster records`);

  // 3. Demo Users
  console.log('👤 Creating/Updating demo users...');

  // CSE Dept Admin
  let deptAdmin = await User.findOne({ email: 'admin@ug.cusat.ac.in' });
  const adminPassHash = await User.hashPassword('Admin@12345');
  if (deptAdmin) {
    deptAdmin.passwordHash = adminPassHash;
    deptAdmin.emailVerified = true;
    deptAdmin.accountStatus = 'ACTIVE';
    deptAdmin.departmentId = cseDept._id;
    deptAdmin.role = 'DEPARTMENT_ADMIN';
    await deptAdmin.save();
    console.log('   ✓ Updated CSE Admin: admin@ug.cusat.ac.in (Admin@12345)');
  } else {
    deptAdmin = await User.create({
      name: 'CSE Department Admin',
      email: 'admin@ug.cusat.ac.in',
      passwordHash: adminPassHash,
      role: 'DEPARTMENT_ADMIN',
      departmentId: cseDept._id,
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });
    console.log('   ✓ Created CSE Admin: admin@ug.cusat.ac.in (Admin@12345)');
  }

  // ECE Dept Admin
  let eceAdmin = await User.findOne({ email: 'eceadmin@ug.cusat.ac.in' });
  if (eceAdmin) {
    eceAdmin.passwordHash = adminPassHash;
    eceAdmin.emailVerified = true;
    eceAdmin.accountStatus = 'ACTIVE';
    eceAdmin.departmentId = eceDept._id;
    eceAdmin.role = 'DEPARTMENT_ADMIN';
    await eceAdmin.save();
    console.log('   ✓ Updated ECE Admin: eceadmin@ug.cusat.ac.in (Admin@12345)');
  } else {
    eceAdmin = await User.create({
      name: 'ECE Department Admin',
      email: 'eceadmin@ug.cusat.ac.in',
      passwordHash: adminPassHash,
      role: 'DEPARTMENT_ADMIN',
      departmentId: eceDept._id,
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });
    console.log('   ✓ Created ECE Admin: eceadmin@ug.cusat.ac.in (Admin@12345)');
  }

  // Sports Admin
  let sportsAdmin = await User.findOne({ email: 'sports@ug.cusat.ac.in' });
  const sportsPassHash = await User.hashPassword('Sports@12345');
  if (sportsAdmin) {
    sportsAdmin.passwordHash = sportsPassHash;
    sportsAdmin.emailVerified = true;
    sportsAdmin.accountStatus = 'ACTIVE';
    sportsAdmin.role = 'SPORTS_ADMIN';
    await sportsAdmin.save();
    console.log('   ✓ Updated Sports Admin: sports@ug.cusat.ac.in (Sports@12345)');
  } else {
    sportsAdmin = await User.create({
      name: 'CUSAT Sports Directorate',
      email: 'sports@ug.cusat.ac.in',
      passwordHash: sportsPassHash,
      role: 'SPORTS_ADMIN',
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });
    console.log('   ✓ Created Sports Admin: sports@ug.cusat.ac.in (Sports@12345)');
  }

  // CSE Student (Anand Krishna)
  let student = await User.findOne({ email: 'student@ug.cusat.ac.in' });
  const studentPassHash = await User.hashPassword('Student@12345');
  if (student) {
    student.passwordHash = studentPassHash;
    student.emailVerified = true;
    student.accountStatus = 'ACTIVE';
    student.role = 'STUDENT';
    student.departmentId = cseDept._id;
    student.studentId = '20223517';
    await student.save();
    console.log('   ✓ Updated CSE Student: student@ug.cusat.ac.in (Student@12345)');
  } else {
    student = await User.create({
      name: 'Anand Krishna',
      email: 'student@ug.cusat.ac.in',
      passwordHash: studentPassHash,
      role: 'STUDENT',
      studentId: '20223517',
      departmentId: cseDept._id,
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });
    console.log('   ✓ Created CSE Student: student@ug.cusat.ac.in (Student@12345)');
  }

  // ECE Student (Rahul Nair)
  let eceStudent = await User.findOne({ email: 'ecestudent@ug.cusat.ac.in' });
  const ecePassHash = await User.hashPassword('Ece@12345');
  if (eceStudent) {
    eceStudent.passwordHash = ecePassHash;
    eceStudent.emailVerified = true;
    eceStudent.accountStatus = 'ACTIVE';
    eceStudent.role = 'STUDENT';
    eceStudent.departmentId = eceDept._id;
    eceStudent.studentId = '20224101';
    await eceStudent.save();
    console.log('   ✓ Updated ECE Student: ecestudent@ug.cusat.ac.in (Ece@12345)');
  } else {
    eceStudent = await User.create({
      name: 'Rahul Nair',
      email: 'ecestudent@ug.cusat.ac.in',
      passwordHash: ecePassHash,
      role: 'STUDENT',
      studentId: '20224101',
      departmentId: eceDept._id,
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });
    console.log('   ✓ Created ECE Student: ecestudent@ug.cusat.ac.in (Ece@12345)');
  }

  // 4. Resources
  console.log('🏢 Creating demo resources...');
  const defaultSportsHours = [0, 1, 2, 3, 4, 5, 6].map(d => ({
    dayOfWeek: d,
    openTime: '06:00',
    closeTime: '21:00',
    isClosed: false,
  }));

  const demoResources = [
    // CSE Resources
    {
      name: 'Alan Turing Seminar Hall',
      type: 'SEMINAR_HALL',
      departmentId: cseDept._id,
      location: 'CSE Block, 2nd Floor',
      description: 'Capacity 150 seats, 4K Projector, Surround Sound, Central AC, Podium & Wireless Mics.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 300, advanceBookingDays: 30, cancellationHours: 2 },
      createdBy: deptAdmin._id,
    },
    {
      name: 'Ada Lovelace Advanced Computing Lab',
      type: 'LABORATORY',
      departmentId: cseDept._id,
      location: 'CSE Block, 1st Floor, Room 104',
      description: '60 High-performance i7 Workstations with dual monitors, GPU cluster access, Gigabit LAN.',
      accessPolicy: 'DEPARTMENT_ONLY',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 14, cancellationHours: 1 },
      createdBy: deptAdmin._id,
    },
    {
      name: 'IoT & Embedded Systems Lab',
      type: 'LABORATORY',
      departmentId: cseDept._id,
      location: 'CSE Block, Ground Floor',
      description: '35 Workstations equipped with Raspberry Pi 4, Arduino, ESP32 boards, logic analyzers and solder stations.',
      accessPolicy: 'DEPARTMENT_ONLY',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 14, cancellationHours: 1 },
      createdBy: deptAdmin._id,
    },
    {
      name: 'Smart Lecture Hall 201',
      type: 'CLASSROOM',
      departmentId: cseDept._id,
      location: 'CSE Block, 2nd Floor',
      description: 'Tiered seating for 80 students, interactive smart board, ceiling speakers, lecture recording camera.',
      accessPolicy: 'DEPARTMENT_ONLY',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 120, advanceBookingDays: 14, cancellationHours: 2 },
      createdBy: deptAdmin._id,
    },

    // ECE Resources
    {
      name: 'ECE DSP & Signal Processing Lab',
      type: 'LABORATORY',
      departmentId: eceDept._id,
      location: 'ECE Block, 1st Floor',
      description: 'Digital Signal Processing hardware kits, TMS320C6713 boards, MATLAB workstations. Restricted strictly to ECE.',
      accessPolicy: 'DEPARTMENT_ONLY',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 14, cancellationHours: 1 },
      createdBy: eceAdmin._id,
    },
    {
      name: 'ECE Multimedia Seminar Hall',
      type: 'SEMINAR_HALL',
      departmentId: eceDept._id,
      location: 'ECE Block, Ground Floor',
      description: 'Air-conditioned seminar hall, capacity 120 seats, smart interactive display. Open to all campus departments.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 240, advanceBookingDays: 20, cancellationHours: 2 },
      createdBy: eceAdmin._id,
    },
    {
      name: 'ECE Advanced VLSI Design Lab',
      type: 'LABORATORY',
      departmentId: eceDept._id,
      location: 'ECE Block, 2nd Floor',
      description: 'Cadence and Synopsys EDA tools for IC design. Available ONLY to ECE and CSE departments.',
      accessPolicy: 'RESTRICTED',
      allowedDepartmentIds: [eceDept._id, cseDept._id],
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 240, advanceBookingDays: 14, cancellationHours: 2 },
      createdBy: eceAdmin._id,
    },

    // Sports Facilities
    {
      name: 'Main Football & Athletics Stadium',
      type: 'SPORTS_FACILITY',
      departmentId: null,
      location: 'University Sports Complex, East Campus',
      description: 'FIFA standard natural turf pitch, 400m synthetic running track, floodlit lighting.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 120, advanceBookingDays: 7, cancellationHours: 3, slotDurationMinutes: 60 },
      operatingHours: defaultSportsHours,
      createdBy: sportsAdmin._id,
    },
    {
      name: 'Indoor Badminton Court A',
      type: 'SPORTS_FACILITY',
      departmentId: null,
      location: 'Indoor Stadium, Ground Floor',
      description: 'BWF certified wooden parquet surface, anti-glare LED lighting, air-conditioned viewing gallery.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 120, advanceBookingDays: 5, cancellationHours: 2, slotDurationMinutes: 60 },
      operatingHours: defaultSportsHours,
      createdBy: sportsAdmin._id,
    },
    {
      name: 'Indoor Badminton Court B',
      type: 'SPORTS_FACILITY',
      departmentId: null,
      location: 'Indoor Stadium, Ground Floor',
      description: 'BWF certified wooden parquet surface, high clearance ceiling, LED illumination.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 120, advanceBookingDays: 5, cancellationHours: 2, slotDurationMinutes: 60 },
      operatingHours: defaultSportsHours,
      createdBy: sportsAdmin._id,
    },
    {
      name: 'Floodlit Basketball Court',
      type: 'SPORTS_FACILITY',
      departmentId: null,
      location: 'Outdoor Sports Quadrangle',
      description: 'Acrylic hard court with shock absorption layer, glass backboards, perimeter fencing.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 120, advanceBookingDays: 5, cancellationHours: 2, slotDurationMinutes: 60 },
      operatingHours: defaultSportsHours,
      createdBy: sportsAdmin._id,
    },
    {
      name: 'Campus Fitness & Gymnasium',
      type: 'SPORTS_FACILITY',
      departmentId: null,
      location: 'Indoor Sports Complex, 1st Floor',
      description: 'Fully equipped multi-gym, Olympic weightlifting platforms, cardio zone with treadmills and ellipticals.',
      accessPolicy: 'ALL_DEPARTMENTS',
      bookingEnabled: true,
      status: 'ACTIVE',
      bookingRules: { minDurationMinutes: 60, maxDurationMinutes: 120, advanceBookingDays: 3, cancellationHours: 1, slotDurationMinutes: 60 },
      operatingHours: defaultSportsHours,
      createdBy: sportsAdmin._id,
    },
  ];

  const savedResources = {};
  for (const item of demoResources) {
    let res = await Resource.findOne({ name: item.name });
    if (!res) {
      res = await Resource.create(item);
      console.log(`   ✓ Created resource: ${res.name} (${res.type})`);
    } else {
      res.accessPolicy = item.accessPolicy;
      res.allowedDepartmentIds = item.allowedDepartmentIds || [];
      res.departmentId = item.departmentId;
      await res.save();
      console.log(`   ✓ Updated resource: ${res.name} (${res.accessPolicy})`);
    }
    savedResources[item.name] = res;
  }

  // 5. Academic Timetable Entries
  console.log('📅 Creating academic timetable entries...');
  const adaLab = savedResources['Ada Lovelace Advanced Computing Lab'];

  if (adaLab) {
    const existingTT = await TimetableEntry.findOne({ resourceId: adaLab._id });
    if (!existingTT) {
      await TimetableEntry.create([
        {
          resourceId: adaLab._id,
          title: 'CS204 Data Structures Lab',
          recurrence: 'WEEKLY',
          daysOfWeek: ['MONDAY'],
          startTime: '09:00',
          endTime: '12:00',
          effectiveFrom: new Date('2026-01-01'),
          effectiveUntil: new Date('2026-12-31'),
          isActive: true,
          createdBy: deptAdmin._id,
        },
        {
          resourceId: adaLab._id,
          title: 'CS306 Compiler Design Lab',
          recurrence: 'WEEKLY',
          daysOfWeek: ['WEDNESDAY'],
          startTime: '13:30',
          endTime: '16:30',
          effectiveFrom: new Date('2026-01-01'),
          effectiveUntil: new Date('2026-12-31'),
          isActive: true,
          createdBy: deptAdmin._id,
        },
      ]);
      console.log('   ✓ Seeded 2 recurring timetable entries for Ada Lovelace Lab');
    }
  }

  // 6. Sample Bookings
  console.log('🎟️ Creating sample bookings for student...');
  const badmintonCourt = savedResources['Indoor Badminton Court A'];
  const turingHall = savedResources['Alan Turing Seminar Hall'];
  const existingBookings = await Booking.find({ studentId: student._id });

  if (existingBookings.length === 0 && badmintonCourt && turingHall) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(18, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    nextWeek.setHours(10, 0, 0, 0);

    const nextWeekEnd = new Date(nextWeek);
    nextWeekEnd.setHours(12, 0, 0, 0);

    await Booking.create([
      {
        studentId: student._id,
        resourceId: badmintonCourt._id,
        startTime: tomorrow,
        endTime: tomorrowEnd,
        purpose: 'Inter-batch friendly badminton practice match',
        status: 'CONFIRMED',
      },
      {
        studentId: student._id,
        resourceId: turingHall._id,
        startTime: nextWeek,
        endTime: nextWeekEnd,
        purpose: 'CUSAT ACM Student Chapter Technical Talk on Cloud AI',
        status: 'CONFIRMED',
      },
    ]);
    console.log('   ✓ Seeded 2 active bookings for Anand Krishna (student)');
  }

  console.log('\n🎉 Full demo database seeding completed successfully!');
  console.log('\nDemo Credentials:');
  console.log('──────────────────────────────────────────────────────────');
  console.log('CSE Department Admin:');
  console.log('   Email:    admin@ug.cusat.ac.in');
  console.log('   Password: Admin@12345');
  console.log('   Role:     DEPARTMENT_ADMIN (CSE)');
  console.log('\nECE Department Admin:');
  console.log('   Email:    eceadmin@ug.cusat.ac.in');
  console.log('   Password: Admin@12345');
  console.log('   Role:     DEPARTMENT_ADMIN (ECE)');
  console.log('\nSports Admin:');
  console.log('   Email:    sports@ug.cusat.ac.in');
  console.log('   Password: Sports@12345');
  console.log('   Role:     SPORTS_ADMIN');
  console.log('\nCSE Student:');
  console.log('   Email:    student@ug.cusat.ac.in');
  console.log('   Password: Student@12345');
  console.log('   Role:     STUDENT (Roll No: 20223517, Dept: CSE)');
  console.log('\nECE Student:');
  console.log('   Email:    ecestudent@ug.cusat.ac.in');
  console.log('   Password: Ece@12345');
  console.log('   Role:     STUDENT (Roll No: 20224101, Dept: ECE)');
  console.log('──────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
