# IELTS Writing Examiner

A full-stack MVP web app for IELTS writing assessment and feedback.

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: bcryptjs password hashing + JWT

## Features
- Login and registration
- Task selection (Task 1 Academic, Task 1 General, Task 2)
- Essay input and target score selection
- Word count
- IELTS-style scoring logic
- Feedback summary and improvement suggestions
- Revised essay example
- Report history per user

## Demo login
- Email: admin@ielts.com
- Password: admin123

## How to run
1. Open a terminal in the project folder.
2. Install dependencies:
   `npm install`
3. Create a PostgreSQL database named `ielts_examiner`.
4. Copy `.env.example` to `.env` and set your PostgreSQL password and a long JWT secret.
5. (Optional) Migrate existing JSON data:
   `npm run migrate:json`
6. Start the app:
   `npm start`
7. Open `http://localhost:3000`.

The server creates the required PostgreSQL tables automatically on startup and seeds the demo account. The current scoring engine is a deterministic IELTS-style heuristic, not an official examiner or a replacement for a certified IELTS assessment.

## Remaining production work
- Real AI integration
- Cloud file storage
- PDF/DOCX export
- Admin and teacher modules
- Rate limiting and centralized logging

## Main files
- `backend/server.js` - backend entry point
- `backend/routes.js` - API routes
- `backend/analysis.js` - IELTS-style scoring logic
- `backend/database.js` - PostgreSQL pool and schema initialization
- `backend/auth.js` - JWT authentication middleware
- `.env.example` - required environment variables
- `public/index.html` - app UI
- `public/app.js` - frontend logic
- `public/styles.css` - styling
