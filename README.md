# IELTS Writing Examiner

A full-stack MVP web app for IELTS writing assessment and feedback.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: bcryptjs password hashing + JWT
- Optional scoring: OpenAI-compatible API with deterministic fallback

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

## Frontend development
Run the API with `npm start`, then run `npm run dev:frontend` in another terminal. Vite serves the React app at `http://localhost:5173` and proxies `/api` to Express. For a production-style run, use `npm run build:frontend` followed by `npm start`.

To enable model-based scoring, add `OPENAI_API_KEY` to `.env`. You can optionally set `OPENAI_MODEL` and `OPENAI_BASE_URL`. Without a key, the app uses its local rubric heuristic and marks reports with `provider: heuristic`.

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
- `frontend/src/App.jsx` - React application flow
- `frontend/src/styles.css` - React UI styling
- `frontend/vite.config.js` - Vite development proxy
