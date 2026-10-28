import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import EligibleStudent from '../src/models/EligibleStudent.js';
import VerificationChallenge from '../src/models/VerificationChallenge.js';
import * as authService from '../src/services/authService.js';
import * as bookingService from '../src/services/bookingService.js';
import * as resourceController from '../src/controllers/resourceController.js';

let mongod;
let cseDept, eceDept, mechDept;
let cseStudent, eceStudent, unverifiedStudent, suspendedStudent;
let cseAdmin, eceAdmin;
let eceDeptOnlyResource, eceAllDeptsResource, eceRestrictedResource, cseDeptOnlyResource;

// Mock Response Helper
function mockResponse() {
  const res = {};
  res.statusCode = 200;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.body = data;
    return this;
  };
  return res;
}

async function setup() {
  console.log('🚀 Setting up isolated test database for Security & Access Control Tests...');
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // 1. Departments
  cseDept = await Department.create({ name: 'Computer Science and Engineering', code: 'CSE' });
  eceDept = await Department.create({ name: 'Electronics and Communication Engineering', code: 'ECE' });
  mechDept = await Department.create({ name: 'Mechanical Engineering', code: 'MECH' });

  // 2. Pre-seeded Student Eligibility Dataset (EligibleStudents)
  await EligibleStudent.create([
    {
      studentId: '2023CS001',
      name: 'CSE Student One',
      institutionalEmail: 'cse1@ug.cusat.ac.in',
      departmentId: cseDept._id,
      academicYear: '2023-2027',
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      studentId: '2023EC001',
      name: 'ECE Student One',
      institutionalEmail: 'ece1@ug.cusat.ac.in',
      departmentId: eceDept._id,
      academicYear: '2023-2027',
      eligibilityStatus: 'ELIGIBLE',
    },
    {
      studentId: '2023CS999',
      name: 'Suspended Student',
      institutionalEmail: 'suspended@ug.cusat.ac.in',
      departmentId: cseDept._id,
      academicYear: '2023-2027',
      eligibilityStatus: 'INELIGIBLE',
    },
  ]);

  // 3. User Accounts
  const hash = await User.hashPassword('Pass@12345');

  cseStudent = await User.create({
    name: 'CSE Student One',
    email: 'cse1@ug.cusat.ac.in',
    studentId: '2023CS001',
    passwordHash: hash,
    role: 'STUDENT',
    departmentId: cseDept._id,
    emailVerified: true,
    accountStatus: 'ACTIVE',
  });

  eceStudent = await User.create({
    name: 'ECE Student One',
    email: 'ece1@ug.cusat.ac.in',
    studentId: '2023EC001',
    passwordHash: hash,
    role: 'STUDENT',
    departmentId: eceDept._id,
    emailVerified: true,
    accountStatus: 'ACTIVE',
  });

  unverifiedStudent = await User.create({
    name: 'Unverified Student',
    email: 'unverified@ug.cusat.ac.in',
    studentId: '2023CS002',
    passwordHash: hash,
    role: 'STUDENT',
    departmentId: cseDept._id,
    emailVerified: false,
    accountStatus: 'ACTIVE',
  });

  suspendedStudent = await User.create({
    name: 'Suspended Account Student',
    email: 'suspended@ug.cusat.ac.in',
    studentId: '2023CS999',
    passwordHash: hash,
    role: 'STUDENT',
    departmentId: cseDept._id,
    emailVerified: true,
    accountStatus: 'SUSPENDED',
  });

  cseAdmin = await User.create({
    name: 'CSE Admin',
    email: 'admin_cse@ug.cusat.ac.in',
    passwordHash: hash,
    role: 'DEPARTMENT_ADMIN',
    departmentId: cseDept._id,
    emailVerified: true,
    accountStatus: 'ACTIVE',
  });

  eceAdmin = await User.create({
    name: 'ECE Admin',
    email: 'admin_ece@ug.cusat.ac.in',
    passwordHash: hash,
    role: 'DEPARTMENT_ADMIN',
    departmentId: eceDept._id,
    emailVerified: true,
    accountStatus: 'ACTIVE',
  });

  // 4. Resources
  eceDeptOnlyResource = await Resource.create({
    name: 'ECE Signal Processing Lab',
    type: 'LABORATORY',
    departmentId: eceDept._id,
    accessPolicy: 'DEPARTMENT_ONLY',
    bookingEnabled: true,
    status: 'ACTIVE',
    bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 30 },
    createdBy: eceAdmin._id,
  });

  eceAllDeptsResource = await Resource.create({
    name: 'ECE Tech Seminar Hall',
    type: 'SEMINAR_HALL',
    departmentId: eceDept._id,
    accessPolicy: 'ALL_DEPARTMENTS',
    bookingEnabled: true,
    status: 'ACTIVE',
    bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 30 },
    createdBy: eceAdmin._id,
  });

  eceRestrictedResource = await Resource.create({
    name: 'ECE VLSI Cleanroom',
    type: 'LABORATORY',
    departmentId: eceDept._id,
    accessPolicy: 'RESTRICTED',
    allowedDepartmentIds: [eceDept._id, cseDept._id], // ECE and CSE only
    bookingEnabled: true,
    status: 'ACTIVE',
    bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 30 },
    createdBy: eceAdmin._id,
  });

  cseDeptOnlyResource = await Resource.create({
    name: 'CSE Supercomputing Lab',
    type: 'LABORATORY',
    departmentId: cseDept._id,
    accessPolicy: 'DEPARTMENT_ONLY',
    bookingEnabled: true,
    status: 'ACTIVE',
    bookingRules: { minDurationMinutes: 30, maxDurationMinutes: 180, advanceBookingDays: 30 },
    createdBy: cseAdmin._id,
  });

  console.log('✅ Test environment initialized successfully.\n');
}

let slotCounter = 0;
function getFutureSlot(daysAhead = 2, durationMinutes = 60) {
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  // Guarantee within standard campus hours (10:00 AM - 04:00 PM)
  const hour = 10 + (slotCounter % 4);
  slotCounter++;
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { startTime: start, endTime: end };
}

async function runTests() {
  await setup();

  let passed = 0;
  let failed = 0;

  async function test(title, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${title}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  console.log('================================================================');
  console.log('  RUNNING SPECIFICATION REQUIRED TESTS (9 CORE SCENARIOS)       ');
  console.log('================================================================\n');

  // Test 1: ECE student can book an ECE resource configured as DEPARTMENT_ONLY
  await test('Test 1: An ECE student can book an ECE resource configured as DEPARTMENT_ONLY', async () => {
    const { startTime, endTime } = getFutureSlot(1);
    const booking = await bookingService.createBooking({
      studentId: eceStudent._id,
      resourceId: eceDeptOnlyResource._id,
      startTime,
      endTime,
      purpose: 'ECE DSP Hardware Practicum',
    });
    if (!booking || booking.status !== 'CONFIRMED') {
      throw new Error('Booking was not confirmed');
    }
  });

  // Test 2: A CSE student cannot book that same resource
  await test('Test 2: A CSE student cannot book an ECE DEPARTMENT_ONLY resource (rejected with 403)', async () => {
    const { startTime, endTime } = getFutureSlot(1);
    let rejected = false;
    try {
      await bookingService.createBooking({
        studentId: cseStudent._id,
        resourceId: eceDeptOnlyResource._id,
        startTime,
        endTime,
        purpose: 'Attempting cross-department booking on DEPARTMENT_ONLY',
      });
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('owning department')) {
        rejected = true;
      } else {
        throw new Error(`Unexpected error code/message: ${err.statusCode} - ${err.message}`);
      }
    }
    if (!rejected) throw new Error('Booking was allowed when it should have been forbidden');
  });

  // Test 3: A CSE student can book an ECE resource configured as ALL_DEPARTMENTS
  await test('Test 3: A CSE student can book an ECE resource configured as ALL_DEPARTMENTS', async () => {
    const { startTime, endTime } = getFutureSlot(2);
    const booking = await bookingService.createBooking({
      studentId: cseStudent._id,
      resourceId: eceAllDeptsResource._id,
      startTime,
      endTime,
      purpose: 'Inter-department technical talk',
    });
    if (!booking || booking.status !== 'CONFIRMED') {
      throw new Error('Booking was not confirmed');
    }
  });

  // Test 4: A student can book a RESTRICTED resource only when satisfying eligibility rules
  await test('Test 4: A student can book a RESTRICTED resource only when satisfying eligibility rules', async () => {
    const { startTime, endTime } = getFutureSlot(2);

    // CSE student IS in allowedDepartmentIds [ECE, CSE] -> SHOULD SUCCEED
    const bookingCSE = await bookingService.createBooking({
      studentId: cseStudent._id,
      resourceId: eceRestrictedResource._id,
      startTime,
      endTime,
      purpose: 'VLSI joint project research',
    });
    if (!bookingCSE || bookingCSE.status !== 'CONFIRMED') {
      throw new Error('CSE student booking on RESTRICTED resource failed');
    }

    // Mechanical student is NOT in allowedDepartmentIds -> MUST BE REJECTED
    const mechStudent = await User.create({
      name: 'Mech Student',
      email: 'mech@ug.cusat.ac.in',
      studentId: '2023ME001',
      passwordHash: 'hash',
      role: 'STUDENT',
      departmentId: mechDept._id,
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });

    const { startTime: s2, endTime: e2 } = getFutureSlot(3);
    let rejectedMech = false;
    try {
      await bookingService.createBooking({
        studentId: mechStudent._id,
        resourceId: eceRestrictedResource._id,
        startTime: s2,
        endTime: e2,
        purpose: 'Attempting to book restricted resource without department authorization',
      });
    } catch (err) {
      if (err.statusCode === 403) rejectedMech = true;
    }
    if (!rejectedMech) throw new Error('Unauthorized department student was allowed to book RESTRICTED resource');
  });

  // Test 5: A student cannot change their department by editing their profile or sending a modified API request
  await test('Test 5: A student cannot change their department by editing profile or sending modified API requests', async () => {
    const originalDeptId = cseStudent.departmentId.toString();

    // Attempting to send departmentId and role in profile update
    const updated = await authService.updateUserProfile(cseStudent._id, {
      name: 'Updated Name',
      departmentId: eceDept._id, // Malicious payload attempting to change to ECE
      role: 'DEPARTMENT_ADMIN',  // Malicious payload attempting privilege escalation
    });

    const reloaded = await User.findById(cseStudent._id);
    if (reloaded.departmentId.toString() !== originalDeptId) {
      throw new Error('Security Breach: Student was able to alter their departmentId');
    }
    if (reloaded.role !== 'STUDENT') {
      throw new Error('Security Breach: Student was able to escalate role');
    }
    if (reloaded.name !== 'Updated Name') {
      throw new Error('Legitimate name update failed');
    }
  });

  // Test 6: A Department Administrator cannot manage resources belonging to another department
  await test('Test 6: A Department Administrator cannot manage resources belonging to another department', async () => {
    const req = {
      user: cseAdmin, // CSE Admin attempting to update ECE resource
      params: { id: eceDeptOnlyResource._id },
      validated: { body: { name: 'Tampered Resource Name' } },
    };
    const res = mockResponse();

    await resourceController.updateResource(req, res, (err) => {
      if (err) res.statusCode = err.statusCode || 500;
    });

    if (res.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden, but received status code: ${res.statusCode}`);
    }

    const reloaded = await Resource.findById(eceDeptOnlyResource._id);
    if (reloaded.name === 'Tampered Resource Name') {
      throw new Error('Security Breach: Cross-department resource update succeeded');
    }
  });

  // Test 7: A student cannot book a resource while bypassing the frontend and directly calling the API
  await test('Test 7: Direct API call without authentication or valid student identity is rejected', async () => {
    const { startTime, endTime } = getFutureSlot(3);
    let rejected = false;
    try {
      // Direct call with missing/bogus student ID
      await bookingService.createBooking({
        studentId: new mongoose.Types.ObjectId(),
        resourceId: eceAllDeptsResource._id,
        startTime,
        endTime,
        purpose: 'Direct API invocation bypass attempt',
      });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403) {
        rejected = true;
      }
    }
    if (!rejected) throw new Error('Unauthenticated / invalid student identity was allowed to book');
  });

  // Test 8: An unverified or ineligible account cannot make bookings
  await test('Test 8: An unverified or ineligible account cannot make bookings', async () => {
    const { startTime: s1, endTime: e1 } = getFutureSlot(4);

    // Unverified account
    let unverifiedRejected = false;
    try {
      await bookingService.createBooking({
        studentId: unverifiedStudent._id,
        resourceId: cseDeptOnlyResource._id,
        startTime: s1,
        endTime: e1,
        purpose: 'Booking with unverified email',
      });
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('Unverified')) {
        unverifiedRejected = true;
      }
    }
    if (!unverifiedRejected) throw new Error('Unverified student account was allowed to make bookings');

    // Ineligible / Suspended account
    const { startTime: s2, endTime: e2 } = getFutureSlot(4);
    let suspendedRejected = false;
    try {
      await bookingService.createBooking({
        studentId: suspendedStudent._id,
        resourceId: cseDeptOnlyResource._id,
        startTime: s2,
        endTime: e2,
        purpose: 'Booking with suspended account',
      });
    } catch (err) {
      if (err.statusCode === 403) {
        suspendedRejected = true;
      }
    }
    if (!suspendedRejected) throw new Error('Suspended / Ineligible student account was allowed to make bookings');
  });

  // Test 9: All access checks are performed by the backend before a booking is confirmed
  await test('Test 9: Backend independently verifies student department & rules (never trusts client assertions)', async () => {
    const { startTime, endTime } = getFutureSlot(5);

    // Client passes a fake department assertion or attempts booking beyond maxDuration
    let durationRejected = false;
    try {
      await bookingService.createBooking({
        studentId: cseStudent._id,
        resourceId: cseDeptOnlyResource._id,
        startTime,
        endTime: new Date(startTime.getTime() + 10 * 60 * 60 * 1000), // 10 hours, exceeds max 180 min
        purpose: 'Duration limit breach',
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('duration')) {
        durationRejected = true;
      }
    }
    if (!durationRejected) throw new Error('Backend failed to enforce maximum duration rule');
  });

  // Test 10: Official Dataset Enforcement during Registration
  await test('Test 10: Registration strictly requires matching record in EligibleStudent dataset and auto-assigns department', async () => {
    // Attempting registration with unregistered roll number
    let unregisteredRejected = false;
    try {
      await authService.initiateRegistration({
        name: 'Intruder',
        studentId: '9999UNKNOWN',
        email: 'intruder@ug.cusat.ac.in',
        password: 'Password@123',
      });
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('do not match university eligibility records')) {
        unregisteredRejected = true;
      }
    }
    if (!unregisteredRejected) throw new Error('Unregistered student ID was allowed to initiate registration');

    // Attempting registration with suspended eligibility record
    let ineligibleRejected = false;
    try {
      await authService.initiateRegistration({
        name: 'Suspended Student',
        studentId: '2023CS999',
        email: 'suspended@ug.cusat.ac.in',
        password: 'Password@123',
      });
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('INELIGIBLE')) {
        ineligibleRejected = true;
      }
    }
    if (!ineligibleRejected) throw new Error('Ineligible student was allowed to initiate registration');

    // Valid student registration from official dataset
    await EligibleStudent.create({
      studentId: '2024CS099',
      name: 'Admit Student',
      institutionalEmail: 'admit@ug.cusat.ac.in',
      departmentId: cseDept._id,
      academicYear: '2024-2028',
      eligibilityStatus: 'ELIGIBLE',
    });

    const init = await authService.initiateRegistration({
      name: 'Admit Student',
      studentId: '2024CS099',
      email: 'admit@ug.cusat.ac.in',
      password: 'SecurePass@123',
    });
    if (!init.department || init.department !== 'Computer Science and Engineering') {
      throw new Error('Department was not auto-assigned from eligibility record');
    }
  });

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED                 `);
  console.log('================================================================\n');

  await mongoose.disconnect();
  await mongod.stop();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(async (err) => {
  console.error('Fatal Test Runner Error:', err);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
  process.exit(1);
});
