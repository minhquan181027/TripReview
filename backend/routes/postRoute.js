const express = require('express');
const router  = express.Router();
const {
    getFeed, getPostById,
    createPost, deletePost,
    toggleLike,
    getComments, addComment, deleteComment
} = require('../controllers/postCtrl');

const auth     = require('../middleware/auth');
const optAuth  = require('../middleware/optAuth');   // middleware tùy chọn (không bắt buộc đăng nhập)

// Feed (ai cũng xem được, nhưng nếu có token thì biết đã like chưa)
router.get('/posts',         optAuth, getFeed);
router.get('/posts/:id',     optAuth, getPostById);

// CRUD post (phải đăng nhập)
router.post('/posts',        auth, createPost);
router.delete('/posts/:id',  auth, deletePost);

// Like
router.post('/posts/:id/like', auth, toggleLike);

// Comments
router.get('/posts/:id/comments',              optAuth, getComments);
router.post('/posts/:id/comments',             auth, addComment);
router.delete('/posts/:id/comments/:commentId', auth, deleteComment);

module.exports = router;