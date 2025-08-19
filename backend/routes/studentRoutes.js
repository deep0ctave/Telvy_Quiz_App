// src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const student = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// All routes below require student role
router.use(protect, authorizeRoles('student'));

// My assigned quizzes
router.get('/assignments', student.myAssignments);

// Preview quiz before starting (only if assigned)
router.get('/quizzes/:id', student.previewQuiz);

// List all my attempts
router.get('/attempts', student.myAttempts);

// Get results for a quiz
router.get('/results/:quizId', student.myResults);

module.exports = router;
