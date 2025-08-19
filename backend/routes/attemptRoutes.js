const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// All attempt routes require authentication
router.use(protect);

// Student: Start a new attempt
router.post('/start',
  authorizeRoles('student'),
  attemptController.startAttempt
);

// Student: Sync attempt state
router.patch('/:id/sync',
  authorizeRoles('student'),
  attemptController.syncAttempt
);

// Student: Submit attempt
router.post('/:id/submit',
  authorizeRoles('student'),
  attemptController.submitAttempt
);

// Student: Get my attempts
router.get('/my',
  authorizeRoles('student'),
  attemptController.getMyAttempts
);

// Student/Teacher/Admin: Get attempt details
router.get('/:id',
  authorizeRoles('student', 'teacher', 'admin'),
  attemptController.getAttempt
);

// Teacher/Admin: Reset attempt
router.post('/reset',
  authorizeRoles('teacher', 'admin'),
  attemptController.resetAttempt
);

module.exports = router;
