const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const protect = require('../middleware/auth');
const bookmarkController = require('../controllers/bookmarkController');

// Validation rules
const bookmarkValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('url').isURL().withMessage('Please enter a valid URL'),
  body('category').optional().isIn(['work', 'personal', 'learning', 'entertainment']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('description').optional().isLength({ max: 500 }),
  body('tags').optional().isArray()
];

// All routes require authentication
router.use(protect);

// Routes
router.get('/', bookmarkController.getBookmarks);
router.get('/stats', bookmarkController.getStats);
router.post('/', bookmarkValidation, bookmarkController.createBookmark);
router.put('/:id', bookmarkValidation, bookmarkController.updateBookmark);
router.delete('/:id', bookmarkController.deleteBookmark);
router.post('/:id/click', bookmarkController.incrementClick);
router.post('/import', bookmarkController.importBookmarks);

module.exports = router;