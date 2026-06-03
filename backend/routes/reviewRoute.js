// routes/reviewRoute.js
const express = require('express');
const router = express.Router();
const { getReviewsByPlace, getLatestReviews, getMyReviews, addReview, deleteReview } = require('../controllers/reviewCtrl');
const authMiddleware = require('../middleware/auth');

router.get('/reviews/latest', getLatestReviews);
router.get('/reviews/place/:id', getReviewsByPlace);
router.get('/reviews/my', authMiddleware, getMyReviews);
router.post('/reviews', authMiddleware, addReview);
router.delete('/reviews/:id', authMiddleware, deleteReview);

module.exports = router;