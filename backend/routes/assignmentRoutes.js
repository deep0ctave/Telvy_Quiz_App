const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const assignmentController = require('../controllers/assignmentController');

// Assign quiz(s) to student(s)
router.post(
  '/',
  protect,
  authorizeRoles('teacher', 'admin'),
  assignmentController.assignQuizzes
);

// Deassign quiz from a student
router.post(
  '/deassign',
  protect,
  authorizeRoles('teacher', 'admin'),
  assignmentController.deassignQuiz
);

// Student: view my assignments
router.get(
  '/my',
  protect,
  assignmentController.myAssignments
);

// Teacher/Admin: view all assignments
router.get(
  '/',
  protect,
  authorizeRoles('teacher', 'admin'),
  assignmentController.listAssignments
);

// Teacher/Admin: view assignments for a specific quiz
router.get(
  '/quiz/:quizId',
  protect,
  authorizeRoles('teacher', 'admin'),
  assignmentController.assignmentsForQuiz
);

module.exports = router;
