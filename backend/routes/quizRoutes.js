const express = require('express');
const router = express.Router();
const quiz = require('../controllers/quizController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validation');
const Joi = require('joi');

// Validation schema
const baseQuizSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(null, '').optional(),
  total_time: Joi.number().integer().optional(),
  quiz_type: Joi.string().valid('anytime', 'scheduled'),
  image_url: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string().allow(''),
    Joi.allow(null)
  ).optional(),
  difficulty: Joi.string().valid('easy','medium','hard').optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

// Routes
router.post(
  '/',
  protect,
  authorizeRoles('teacher', 'admin'),
  validateBody(baseQuizSchema),
  quiz.createQuiz
);

router.get('/', protect, quiz.listQuizzes);
router.get('/:id', protect, quiz.getQuiz);

router.put(
  '/:id',
  protect,
  authorizeRoles('teacher', 'admin'),
  validateBody(baseQuizSchema),
  quiz.updateQuiz
);

router.delete('/:id', protect, authorizeRoles('teacher', 'admin'), quiz.deleteQuiz);

router.post(
  '/:id/questions',
  protect,
  authorizeRoles('teacher', 'admin'),
  validateBody(Joi.object({ question_ids: Joi.array().items(Joi.number().integer()).required() })),
  quiz.setQuizQuestions
);

module.exports = router;
