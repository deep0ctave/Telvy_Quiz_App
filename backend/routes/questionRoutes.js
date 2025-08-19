// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const q = require('../controllers/questionController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validation');
const Joi = require('joi');

const questionSchema = Joi.object({
  question_text: Joi.string().required(),
  question_type: Joi.string().valid('mcq','multiple','truefalse','typed').required(),
  options: Joi.any().optional(),
  correct_answers: Joi.any().optional(),
  time_limit: Joi.number().integer().min(0).optional(),
  difficulty: Joi.string().valid('easy','medium','hard').optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

router.post('/', protect, authorizeRoles('teacher','admin'), validateBody(questionSchema), q.createQuestion);
router.post('/bulk', protect, authorizeRoles('teacher','admin'), q.createBulkQuestions);
router.get('/', protect, q.listQuestions);
router.get('/:id', protect, q.getQuestion);
router.put('/:id', protect, authorizeRoles('teacher','admin'), validateBody(questionSchema), q.updateQuestion);
router.delete('/:id', protect, authorizeRoles('teacher','admin'), q.deleteQuestion);

module.exports = router;
