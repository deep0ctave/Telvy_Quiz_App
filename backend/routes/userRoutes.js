// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const users = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');


// Specific route for /me - must come before /:id
router.get('/me', protect, users.getProfile);
router.put('/me', protect, users.updateProfile);

router.get('/', protect, authorizeRoles('admin'), users.listUsers);

// Parameterized route for /:id
router.get('/:id', protect, users.getUser);
router.post('/', protect, authorizeRoles('admin'), users.createUser);
router.put('/:id', protect, users.updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), users.deleteUser);

module.exports = router;
