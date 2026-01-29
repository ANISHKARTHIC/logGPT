# LogGPT - Hardware & IoT Components Room Management System

## Project Overview
LogGPT is a production-grade SaaS application for managing hardware and IoT components in an educational/lab environment.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Authentication**: JWT + Refresh Tokens
- **AI**: OpenAI GPT integration for intelligent queries

## Architecture
- Monorepo structure with `/frontend` and `/backend` directories
- RESTful API design with async MongoDB operations
- Role-based access control (Admin, Student)
- Real-time updates via polling/WebSocket

## Development Guidelines
- Follow Next.js App Router conventions
- Use TypeScript for type safety
- Implement proper error handling
- Follow shadcn/ui component patterns
- Use Tailwind CSS for styling with dark mode support

## Running the Project
1. Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
2. Frontend: `cd frontend && npm install && npm run dev`
