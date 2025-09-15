const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// All attempt routes require authentication
router.use(protect);

// Keep only minimal REST endpoints; socket handles start/sync

// Submit attempt
router.post('/:id/submit',
  authorizeRoles('student'),
  attemptController.submitAttempt
);

// Get my attempts (used in dashboard)
router.get('/my',
  authorizeRoles('student'),
  attemptController.getMyAttempts
);

// Get attempt details (for resume/results) — keep AFTER '/my'
router.get('/:id',
  authorizeRoles('student', 'teacher', 'admin'),
  attemptController.getAttempt
);

// Admin/Teacher: list attempts with filters
router.get('/',
  authorizeRoles('teacher','admin'),
  attemptController.adminListAttempts
);

module.exports = router;
