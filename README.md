# CampusSplit MVP

Full-stack student expense sharing app.

## Stack
- React + Vite
- Node.js + Express
- MySQL
- JWT
- Axios

## Setup

### 1. Database
Run `database/schema.sql` in MySQL Workbench.

### 2. Backend
```bash
cd backend
npm install
```

Create `.env` from `.env.example`, set your MySQL password and JWT secret.

Run:
```bash
node server.js
```

Backend: http://localhost:5000

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

Register at `/register`, then login at `/login`.
