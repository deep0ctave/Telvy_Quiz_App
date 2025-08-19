# 🎯 Quiz System Documentation
## Complete Backend to Frontend Architecture Guide

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Endpoints](#api-endpoints)
5. [Frontend Architecture](#frontend-architecture)
6. [Data Flow Examples](#data-flow-examples)
7. [Quiz Attempt Flow](#quiz-attempt-flow)
8. [Error Handling](#error-handling)
9. [Security Features](#security-features)

---

## 🏗️ System Overview

### **Technology Stack**
- **Backend**: Node.js + Express.js + PostgreSQL
- **Frontend**: React.js + DaisyUI + Tailwind CSS
- **Authentication**: JWT with refresh tokens
- **Database**: PostgreSQL with JSONB for complex data
- **API Communication**: Axios with interceptors

### **User Roles**
- **Admin**: Full system access, user management
- **Teacher**: Quiz creation, assignment management
- **Student**: Quiz taking, result viewing

---

## 🗄️ Database Schema

### **Core Tables**

#### **1. Users Table**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student','teacher','admin')),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  dob DATE,
  email TEXT UNIQUE,
  gender TEXT,
  school TEXT,
  class TEXT,
  section TEXT,
  password_hash TEXT NOT NULL,
  phone TEXT UNIQUE,
  verification_status BOOLEAN DEFAULT FALSE,
  user_state TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### **2. Quizzes Table**
```sql
CREATE TABLE quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_time INTEGER,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('anytime','scheduled')),
  scheduled_at TIMESTAMP NULL,
  number_of_questions INTEGER DEFAULT 0,
  image_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  tags TEXT[],
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### **3. Questions Table**
```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq','multiple','truefalse','typed')),
  options JSONB,           -- Array of options or objects with id/text
  correct_answers JSONB,   -- Array of correct answer IDs or text values
  time_limit INTEGER DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  tags TEXT[],
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### **4. Quiz Questions Mapping**
```sql
CREATE TABLE quiz_questions (
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (quiz_id, question_id)
);
```

#### **5. Assignments Table**
```sql
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  due_at TIMESTAMP,
  status TEXT DEFAULT 'assigned',
  CONSTRAINT unique_assignment UNIQUE (quiz_id, student_id, status)
);
```

#### **6. Attempts Table**
```sql
CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT now(),
  finished_at TIMESTAMP,
  state JSONB,             -- Current quiz state with answers
  score NUMERIC,
  status TEXT DEFAULT 'in_progress',
  last_synced_at TIMESTAMP DEFAULT now()
);
```

---

## 🔐 Authentication & Authorization

### **JWT Token System**
- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (7 days) stored in HTTP-only cookies
- **Auto-refresh**: Automatic token renewal via Axios interceptors

### **Middleware Chain**
```javascript
// Authentication middleware
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Usage in routes
router.post('/', protect, authorizeRoles('teacher', 'admin'), controller.createQuiz);
```

### **Role-Based Access Control**
- **Admin**: All endpoints
- **Teacher**: Quiz/question management, assignments
- **Student**: Quiz taking, profile management

---

## 🌐 API Endpoints

### **Authentication Routes** (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | User registration | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| POST | `/refresh` | Refresh access token | No (uses cookie) |
| POST | `/otp/request` | Request OTP for verification | No |
| POST | `/otp/verify` | Verify OTP | No |

### **User Management Routes** (`/api/users`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/me` | Get current user profile | Yes | All |
| PUT | `/me` | Update current user profile | Yes | All |
| GET | `/` | List all users | Yes | Admin |
| GET | `/:id` | Get user by ID | Yes | Admin/Owner |
| POST | `/` | Create new user | Yes | Admin |
| PUT | `/:id` | Update user | Yes | Admin |
| DELETE | `/:id` | Delete user | Yes | Admin |

### **Question Management Routes** (`/api/questions`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | List all questions | Yes | All |
| GET | `/:id` | Get question by ID | Yes | All |
| POST | `/` | Create new question | Yes | Teacher/Admin |
| POST | `/bulk` | Create multiple questions | Yes | Teacher/Admin |
| PUT | `/:id` | Update question | Yes | Teacher/Admin |
| DELETE | `/:id` | Delete question | Yes | Teacher/Admin |

### **Quiz Management Routes** (`/api/quizzes`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | List all quizzes | Yes | All |
| GET | `/:id` | Get quiz by ID | Yes | All |
| POST | `/` | Create new quiz | Yes | Teacher/Admin |
| PUT | `/:id` | Update quiz | Yes | Teacher/Admin |
| DELETE | `/:id` | Delete quiz | Yes | Teacher/Admin |
| POST | `/:id/questions` | Set quiz questions | Yes | Teacher/Admin |

### **Assignment Management Routes** (`/api/assignments`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/` | Assign quiz to students | Yes | Teacher/Admin |
| POST | `/deassign` | Remove quiz assignment | Yes | Teacher/Admin |
| GET | `/my` | Get my assignments (student) | Yes | Student |
| GET | `/` | List all assignments | Yes | Teacher/Admin |
| GET | `/quiz/:id` | Get assignments for quiz | Yes | Teacher/Admin |

### **Quiz Attempt Routes** (`/api/attempts`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/start` | Start new quiz attempt | Yes | Student |
| PATCH | `/:id/sync` | Sync attempt state | Yes | Student |
| POST | `/:id/submit` | Submit quiz attempt | Yes | Student |
| GET | `/:id` | Get attempt details | Yes | Student |
| GET | `/my` | Get my attempts | Yes | Student |

---

## 🎨 Frontend Architecture

### **Core Components Structure**
```
src/
├── components/
│   ├── layout/
│   │   ├── DrawerLayout.jsx
│   │   ├── DrawerSidebar.jsx
│   │   └── PrivateRoute.jsx
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UserList.jsx
│   │   │   ├── QuestionList.jsx
│   │   │   └── QuizList.jsx
│   │   ├── student/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Quizzes.jsx
│   │   └── Attempts/
│   │       ├── QuizStart.jsx
│   │       ├── LiveAttempt.jsx
│   │       ├── AttemptResult.jsx
│   │       └── AttemptHistory.jsx
│   └── modals/
│       ├── CreateUserModal.jsx
│       ├── EditUserModal.jsx
│       ├── CreateQuestionModal.jsx
│       └── CreateQuizModal.jsx
├── context/
│   └── AuthContext.jsx
├── services/
│   └── api.js
└── utils/
    └── helpers.js
```

### **State Management**
- **AuthContext**: Global authentication state
- **Component State**: Local component state with useState
- **API State**: Server state managed via API calls

### **API Service Layer**
```javascript
// Centralized API configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

// Automatic token refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Auto-refresh token logic
    }
    return Promise.reject(err);
  }
);
```

---

## 🔄 Data Flow Examples

### **1. User Login Flow**
```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as Auth API
    participant D as Database
    
    F->>A: POST /auth/login
    A->>D: Verify credentials
    D-->>A: User data
    A-->>F: Access token + Refresh token
    F->>F: Store token in localStorage
    F->>F: Update AuthContext
```

### **2. Quiz Creation Flow**
```mermaid
sequenceDiagram
    participant T as Teacher
    participant F as Frontend
    participant Q as Quiz API
    participant D as Database
    
    T->>F: Create quiz form
    F->>Q: POST /quizzes
    Q->>D: Insert quiz
    D-->>Q: Quiz ID
    Q-->>F: Quiz data
    F->>Q: POST /quizzes/:id/questions
    Q->>D: Link questions to quiz
    D-->>Q: Success
    Q-->>F: Success response
```

### **3. Quiz Assignment Flow**
```mermaid
sequenceDiagram
    participant T as Teacher
    participant F as Frontend
    participant A as Assignment API
    participant D as Database
    
    T->>F: Select quiz + students
    F->>A: POST /assignments
    A->>D: Create assignment records
    D-->>A: Assignment IDs
    A-->>F: Success response
    F->>F: Update UI
```

---

## 🎯 Quiz Attempt Flow

### **Complete Student Quiz Journey**

#### **1. View Assignments**
```javascript
// Student sees assigned quizzes
GET /api/assignments/my
Response: [
  {
    assignment_id: 8,
    quiz: { id: 2, title: "Math Quiz", ... },
    status: "assigned",
    due_at: "2025-08-20T04:30:00.000Z"
  }
]
```

#### **2. Start Quiz Attempt**
```javascript
// Student starts quiz
POST /api/attempts/start
Body: { quiz_id: 2 }
Response: {
  attempt_id: 1,
  quiz: { id: 2, title: "Math Quiz" },
  questions: [
    {
      id: 1,
      question_text: "What is 2 + 2?",
      question_type: "mcq",
      options: [{ id: "a", text: "3" }, { id: "b", text: "4" }],
      answer: null
    }
  ]
}
```

#### **3. Live Quiz with Auto-Sync**
```javascript
// Auto-sync every 10 seconds + on answer change
PATCH /api/attempts/1/sync
Body: {
  state: {
    quiz_id: 2,
    questions: [
      { id: 1, answer: "4", ... },
      { id: 2, answer: null, ... }
    ]
  }
}
Response: { message: "attempt_synced" }
```

#### **4. Submit Quiz**
```javascript
// Final submission
POST /api/attempts/1/submit
Response: {
  score: 100,
  total_questions: 2,
  correct: 2
}
```

#### **5. View Results**
```javascript
// Get detailed results
GET /api/attempts/1
Response: {
  id: 1,
  score: "100",
  status: "submitted",
  state: {
    questions: [
      {
        id: 1,
        answer: "4",
        correct_answers: ["4"],
        question_text: "What is 2 + 2?"
      }
    ]
  }
}
```

---

## ⚠️ Error Handling

### **Backend Error Responses**
```javascript
// Standard error format
{
  error: "error_code",
  message: "Human readable message",
  details: {} // Optional additional info
}
```

### **Common Error Codes**
- `invalid_credentials`: Login failed
- `unauthorized`: Missing/invalid token
- `forbidden`: Insufficient permissions
- `not_found`: Resource doesn't exist
- `validation_error`: Invalid input data
- `quiz_already_completed`: Attempt already submitted
- `attempt_already_in_progress`: Quiz already started

### **Frontend Error Handling**
```javascript
// Global error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg = error.response?.data?.error || 'An error occurred';
    toast.error(errorMsg);
    return Promise.reject(error);
  }
);
```

---

## 🔒 Security Features

### **Authentication Security**
- **JWT Tokens**: Stateless authentication
- **Refresh Tokens**: HTTP-only cookies for security
- **Token Expiration**: Automatic token rotation
- **Password Hashing**: bcrypt with salt

### **Authorization Security**
- **Role-Based Access**: Middleware protection
- **Resource Ownership**: Users can only access their data
- **Input Validation**: Joi schema validation
- **SQL Injection Protection**: Parameterized queries

### **Data Protection**
- **CORS Configuration**: Controlled cross-origin requests
- **Rate Limiting**: API request throttling
- **Input Sanitization**: XSS protection
- **Secure Headers**: Security middleware

---

## 🚀 Deployment Considerations

### **Environment Variables**
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/quiz_db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000

# Frontend
VITE_API_URL=http://localhost:3000
```

### **Database Setup**
```bash
# Initialize database
node backend/scripts/init_db.js

# Seed with sample data
node backend/scripts/seed_db.js
```

### **Production Checklist**
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Performance monitoring setup

---

## 📊 Performance Optimizations

### **Backend Optimizations**
- **Database Indexing**: Proper indexes on foreign keys
- **Query Optimization**: Efficient JOINs and WHERE clauses
- **Connection Pooling**: PostgreSQL connection management
- **Caching**: Redis for frequently accessed data

### **Frontend Optimizations**
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Tree shaking and minification
- **API Caching**: React Query for data caching
- **Image Optimization**: Compressed images and lazy loading

---

## 🔧 Development Setup

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### **Installation Steps**
```bash
# Clone repository
git clone <repo-url>
cd quiz-system

# Backend setup
cd backend
npm install
cp .env.example .env
# Configure .env file
npm run dev

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
# Configure .env file
npm run dev
```

### **Database Setup**
```bash
# Create database
createdb quiz_db

# Run migrations
node backend/scripts/init_db.js
node backend/scripts/seed_db.js
```

---

## 📝 API Testing

### **Using Postman/Insomnia**
1. **Authentication**: Login to get access token
2. **Set Headers**: `Authorization: Bearer <token>`
3. **Test Endpoints**: Use the API documentation above

### **Sample Test Data**
```javascript
// Login request
POST /api/auth/login
{
  "username": "admin",
  "password": "Password123!"
}

// Create question
POST /api/questions
{
  "question_text": "What is 2 + 2?",
  "question_type": "mcq",
  "options": [
    { "id": "a", "text": "3" },
    { "id": "b", "text": "4" },
    { "id": "c", "text": "5" }
  ],
  "correct_answers": ["b"],
  "difficulty": "easy"
}
```

---

This documentation provides a comprehensive overview of the quiz system architecture, from database design to frontend implementation. For specific implementation details, refer to the individual source files in the codebase.
