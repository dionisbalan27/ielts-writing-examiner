# IELTS Writing Examiner

A full-stack MVP web app for IELTS writing assessment and feedback.

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Storage: local JSON file (demo-ready; PostgreSQL migration planned)

## Features
- Login and registration
- Task selection (Task 1 Academic, Task 1 General, Task 2)
- Essay input and target score selection
- Word count
- IELTS-style scoring logic
- Feedback summary
- Improvement suggestions
- Revised essay example
- Report history per user

## Demo login
- Email: admin@ielts.com
- Password: admin123

## How to run
1. Open terminal in the project folder.
2. Run:
   npm install
3. Start the app:
   npm start
4. Open the browser at:
   http://localhost:3000

## Important note
This project is a working MVP and demo implementation. It is suitable for academic project demonstration, prototyping, and product exploration. It is not production-ready yet. For production usage, it should be upgraded with:
- PostgreSQL or MySQL
- JWT authentication
- real AI integration
- cloud file storage
- PDF/DOCX export
- admin and teacher modules

## Main files
- backend/server.js — backend entry point
- backend/routes.js — API routes
- backend/analysis.js — IELTS-style scoring logic
- backend/dataStore.js — local storage adapter
- public/index.html — app UI
- public/app.js — frontend logic
- public/styles.css — styling
- data/store.json — local data storage
