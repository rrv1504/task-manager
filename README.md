# Task Manager

A MERN stack task manager with authentication, private tasks, due dates, priorities, categories, completion tracking, and a focus timer.

## Features

- User registration and login with JWT authentication
- Private task dashboard for each logged-in user
- Create, edit, delete, and complete tasks
- Add task title, description, due date, priority, and category
- Create custom categories from the task form
- Track time spent on tasks with a focus timer
- Filter tasks by all, active, today, overdue, and completed
- Search tasks by title, description, or category
- View completion rate, overdue count, daily progress, and task summary stats
- Responsive React dashboard UI

## Tech Stack

- Frontend: React, Vite, Lucide React
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JSON Web Token and bcryptjs

## Folder Structure

```text
Task Manager/
  backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    server.js
  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
      utils/
  README.md
```

## Environment Variables

Create environment files from the examples before running the app.

Backend: `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/task-manager
JWT_SECRET=your_strong_secret_key
CLIENT_URL=http://localhost:5173
```

Frontend: `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

## Run Locally

Install and start the backend:

```bash
cd backend
npm install
npm run dev
```

Install and start the frontend in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the app:

```text
http://localhost:5173
```

The backend API runs on:

```text
http://localhost:5000
```

## Build Frontend

```bash
cd frontend
npm run build
```

## API Routes

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
```

Tasks:

```text
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

