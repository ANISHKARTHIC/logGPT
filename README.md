# LogGPT - Hardware & IoT Components Room Management System

<div align="center">
  <img src="docs/Logo.png.png" alt="250" width="122" />
  <p><strong>A production-grade SaaS application for managing hardware and IoT components in educational/lab environments.</strong></p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
  ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
</div>

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access & refresh tokens
- Role-based access control (Admin / Student)
- Secure password hashing with bcrypt
- Session management

### 📦 Inventory Management
- Full CRUD operations for components
- Category-based organization (Microcontrollers, Sensors, Displays, etc.)
- Real-time availability tracking
- Grid and list view modes
- Search and filter capabilities

### 📋 Transaction System
- Request/Issue/Return workflow
- Pending request approval system
- Due date tracking
- Overdue item alerts
- Transaction history

### 🤖 LogGPT AI Assistant
- Natural language queries about inventory
- "Who has ESP32?" style questions
- Component availability checks
- Powered by OpenAI GPT

### 📊 Dashboard & Analytics
- Role-specific dashboards
- Real-time statistics
- Recent activity feed
- Top borrowed components

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 14)                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  App Router │ shadcn/ui │ Tailwind │ Zustand │ Framer   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REST API (FastAPI)                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │   Auth │ Components │ Transactions │ Chat │ Dashboard   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (MongoDB Atlas)                    │
│   ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐   │
│   │  Users   │ │Components│ │ Transactions │ │ Chat History │   │
│   └──────────┘ └──────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key (optional, for AI features)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Run the server
uvicorn main:app --reload
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```env
MONGODB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/loggpt
DATABASE_NAME=loggpt
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=sk-your-openai-api-key  # Optional
```

## 📁 Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── auth/           # JWT authentication
│   │   ├── models/         # Pydantic models
│   │   ├── routes/         # API endpoints
│   │   ├── config.py       # Settings
│   │   ├── database.py     # MongoDB connection
│   │   └── main.py         # FastAPI app
│   ├── main.py             # Entry point
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/    # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── transactions/
│   │   │   ├── chat/
│   │   │   ├── users/
│   │   │   └── settings/
│   │   ├── login/
│   │   └── register/
│   ├── components/
│   │   ├── layout/         # Sidebar, AuthGuard
│   │   └── ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   ├── store.ts        # Zustand stores
│   │   ├── types.ts        # TypeScript types
│   │   └── utils.ts        # Utilities
│   └── package.json
│
└── README.md
```

## 🎨 UI Components

Built with [shadcn/ui](https://ui.shadcn.com/) - a collection of re-usable components built using Radix UI and Tailwind CSS.

- Button, Input, Label
- Card, Badge
- Dialog, Dropdown Menu
- Select, Tabs
- Toast notifications
- Dark mode support

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Components
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/components` | List components |
| POST | `/api/components` | Create component (Admin) |
| GET | `/api/components/{id}` | Get component |
| PUT | `/api/components/{id}` | Update component (Admin) |
| DELETE | `/api/components/{id}` | Delete component (Admin) |
| GET | `/api/components/categories` | Get categories |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create request |
| POST | `/api/transactions/{id}/approve` | Approve request (Admin) |
| POST | `/api/transactions/{id}/reject` | Reject request (Admin) |
| POST | `/api/transactions/{id}/return` | Record return (Admin) |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message to LogGPT |
| GET | `/api/chat/history` | Get chat history |
| DELETE | `/api/chat/history` | Clear chat history |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get statistics |
| GET | `/api/dashboard/activity` | Get recent activity |

## 🔒 Security

- Password hashing with bcrypt
- JWT tokens with expiration
- CORS configuration
- Role-based route protection
- Input validation with Pydantic

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📝 License

MIT License - feel free to use this project for your own purposes.


<div align="center">
  <p>Built with ❤️ for hardware labs everywhere</p>
</div>



