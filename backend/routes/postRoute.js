const express = require('express');
const router  = express.Router();
const {
    getFeed, getPostById, getPostsByPlace,
    createPost, deletePost,
    toggleLike,
    getComments, addComment, deleteComment
} = require('../controllers/postCtrl');

const auth    = require('../middleware/auth');
const optAuth = require('../middleware/optAuth');

// Feed tất cả (hỗ trợ ?place_id=X để filter)
router.get('/posts',                  optAuth, getFeed);

// Bài đăng theo địa điểm — PHẢI đặt TRƯỚC /posts/:id
router.get('/posts/place/:id',        optAuth, getPostsByPlace);

// Chi tiết 1 bài
router.get('/posts/:id',              optAuth, getPostById);

// CRUD
router.post('/posts',                 auth, createPost);
router.delete('/posts/:id',           auth, deletePost);

// Like
router.post('/posts/:id/like',        auth, toggleLike);

// Comments
router.get('/posts/:id/comments',              optAuth, getComments);
router.post('/posts/:id/comments',             auth, addComment);
router.delete('/posts/:id/comments/:commentId', auth, deleteComment);

module.exports = router;