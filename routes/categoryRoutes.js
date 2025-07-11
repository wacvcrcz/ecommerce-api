const express = require('express');
const router = express.Router();
const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} = require('../controllers/categoryController');

const { protect } = require('../middleware/authMiddleware'); 
const { admin } = require('../middleware/adminMiddleware'); 

router.route('/')
    .get(getCategories)
    .post(protect, admin, createCategory);

router.route('/:id')
    .put(protect, admin, updateCategory)
    .delete(protect, admin, deleteCategory);

module.exports = router;