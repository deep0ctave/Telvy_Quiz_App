// src/app.js
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes'); // ✅ NEW
const miscRoutes = require('./routes/miscRoutes');
const healthRoutes = require('./routes/healthRoutes');
const studentRoutes = require('./routes/studentRoutes');

const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '2mb' }));

// Configure CORS properly for credentials
const allowedOrigins = (
  process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,https://happy-smoke-0f7647710.2.azurestaticapps.net'
).split(',').map(o => o.trim()).filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  const requestOrigin = req.headers.origin;
  
  // Log CORS requests for debugging
  console.log(`CORS Request: ${req.method} ${req.path} from origin: ${requestOrigin}`);
  
  if (allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  } else if (requestOrigin) {
    console.log(`CORS blocked origin: ${requestOrigin}. Allowed origins:`, allowedOrigins);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cookieParser());

// Root route for health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Telvy Quiz App API is running!', 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/assignments', assignmentRoutes); // ✅ NEW
app.use('/api/misc', miscRoutes);
app.use('/api/student', studentRoutes);

// health
app.use('/api/health', healthRoutes);

// swagger
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// global error handler
app.use(errorHandler);

module.exports = app;
