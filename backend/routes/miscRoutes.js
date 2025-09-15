const express = require('express');
const router = express.Router();
const { listSchools } = require('../controllers/miscController');

router.get('/schools', listSchools);

module.exports = router;


