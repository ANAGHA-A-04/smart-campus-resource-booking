# CampusSync — Smart Campus Resource Booking System

A full-stack web application for CUSAT that allows students to book classrooms, laboratories, equipment, and sports facilities. Features department-based access control, student eligibility verification, and real-time availability tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, React Hook Form, Axios, Lucide Icons |
| Backend | Node.js, Express.js, MongoDB (Mongoose) |
| Auth | JWT (HttpOnly cookies), OTP email verification |
| Email | Nodemailer (Gmail SMTP / Ethereal for dev) |
| Validation | Zod (frontend), Joi (backend) |

---

## Project Structure

```
resourcebooking/
+-- backend/          # Express.js REST API
¦   +-- src/
¦   ¦   +-- config/       # DB connection, environment variables
¦   ¦   +-- controllers/  # Route handlers
¦   ¦   +-- middleware/   # Auth, validation, error handling
¦   ¦   +-- models/       # Mongoose models
¦   ¦   +-- routes/       # API route definitions
¦   ¦   +-- services/     # Business logic (auth, booking, email)
¦   ¦   +-- validators/   # Joi schemas
¦   +-- scripts/
¦   ¦   +-- seedFullDemo.js   # Database seeder
¦   +-- tests/
¦   ¦   +-- accessControl.test.js
¦   +-- .env.example      # Copy this to .env and fill values
¦   +-- package.json
¦
+-- frontend/         # React + Vite SPA
¦   +-- src/
¦   ¦   +-- components/   # Reusable UI components
¦   ¦   +-- context/      # Auth context
¦   ¦   +-- pages/        # Page components (auth, student, admin)
¦   ¦   +-- services/     # Axios API service layer
¦   +-- package.json
¦
+-- .gitignore
+-- README.md
```

---

## Prerequisites

- **Node.js** v18 or higher ? https://nodejs.org
- **npm** v9 or higher (comes with Node.js)
- **MongoDB Atlas** account (free tier works) ? https://cloud.mongodb.com

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/resourcebooking.git
cd resourcebooking
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/campus_booking?retryWrites=true&w=majority
JWT_SECRET=<any-long-random-string>

# Gmail SMTP (see instructions below)
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
```

#### Gmail SMTP Setup (for OTP emails to work)

1. Go to your Google Account ? **Security** ? enable **2-Step Verification**
2. Go to https://myaccount.google.com/apppasswords
3. Create a new App Password ? select "Mail" and "Windows Computer"
4. Copy the 16-character password ? paste it as `SMTP_PASS` in `.env`
5. Set `SMTP_USER` to your Gmail address

> **Dev mode without SMTP:** If you leave `SMTP_USER` as placeholder, the system automatically uses Ethereal (fake email). OTPs are printed in the backend console when `DEV_LOG_OTP=true`.

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

No additional configuration needed for local development.

### 4. Seed the Database

```bash
cd backend
node scripts/seedFullDemo.js
```

This creates all departments, admin users, sample resources, student eligibility records, and demo bookings.

### 5. Run the Application

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Server starts at: `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
App opens at: `http://localhost:5173`

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| CSE Dept Admin | `admin@ug.cusat.ac.in` | `Admin@12345` |
| ECE Dept Admin | `eceadmin@ug.cusat.ac.in` | `Admin@12345` |
| Sports Admin | `sports@ug.cusat.ac.in` | `Sports@12345` |
| CSE Student | `student@ug.cusat.ac.in` | `Student@12345` |
| ECE Student | `ecestudent@ug.cusat.ac.in` | `Ece@12345` |

### Valid Roll Numbers for Registration Testing

| Roll No | Name | Dept | Email |
|---|---|---|---|
| `20223517` | Anand Krishna | CSE | `student@ug.cusat.ac.in` |
| `20223518` | Sneha Paul | CSE | `snehap@ug.cusat.ac.in` |
| `20223519` | Vivek Sharma | CSE | `viveks@ug.cusat.ac.in` |
| `20224101` | Rahul Nair | ECE | `ecestudent@ug.cusat.ac.in` |
| `20224115` | Pooja Menon | ECE | `poojam@ug.cusat.ac.in` |
| `20225201` | Meera Raj | IT | `itstudent@ug.cusat.ac.in` |

---

## Key Features

- **Student Eligibility Verification** — Students can only register if their roll number + email matches the official roster uploaded by the department admin
- **Auto Department Assignment** — Department is automatically assigned from the roster; students cannot tamper with it
- **Role-based Access Control** — STUDENT / DEPARTMENT_ADMIN / SPORTS_ADMIN roles with separate dashboards
- **Resource Access Policies** — ALL_DEPARTMENTS / DEPARTMENT_ONLY / RESTRICTED (specific depts only)
- **Timetable Conflict Detection** — Bookings are blocked if they overlap with scheduled classes
- **OTP Email Verification** — Required on registration; real emails via Gmail SMTP
- **Student Roster Management** — Department admins can add/remove students, upload CSV batches year-wise, toggle eligibility

---

## Available npm Scripts

### Backend (`cd backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start development server with nodemon (auto-restart) |
| `npm start` | Start production server |
| `npm run seed` | Seed demo data into MongoDB |
| `npm test` | Run access control test suite |

### Frontend (`cd frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |

---

## Environment Variables Reference

All variables are in `backend/.env`. Copy from `backend/.env.example`.

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | ? Yes |
| `JWT_SECRET` | Long random string for signing JWTs | ? Yes |
| `SMTP_HOST` | SMTP server host (default: smtp.gmail.com) | For emails |
| `SMTP_PORT` | SMTP port (default: 587) | For emails |
| `SMTP_USER` | Gmail address | For emails |
| `SMTP_PASS` | Gmail App Password (16 chars) | For emails |
| `EMAIL_FROM` | Display name + address for sent emails | For emails |
| `DEV_LOG_OTP` | Print OTP to console in dev mode | Dev only |
| `INSTITUTION_EMAIL_DOMAINS` | Allowed student email domains | Optional |
| `OTP_EXPIRY_MINUTES` | OTP validity window (default: 10) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |

---

## Important Notes for MongoDB Atlas

1. Go to **MongoDB Atlas ? Network Access**
2. Click **+ ADD IP ADDRESS**
3. Click **ADD CURRENT IP ADDRESS** ? Confirm
4. Wait ~30 seconds for the change to become active

> Your IP changes every time you connect to a different network. If you get a connection error, re-whitelist your IP.

---

## Contributing

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Commit: `git commit -m "feat: describe your change"`
4. Push: `git push origin feature/your-feature-name`
5. Open a Pull Request on GitHub

> ?? **Never commit your `.env` file.** It contains database credentials and secret keys. The `.gitignore` already excludes it.
