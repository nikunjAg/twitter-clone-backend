const express = require('express');

const postController = require('../controller/Post');

const router = express.Router();

router.get('/feed', postController.getPosts);

router.get('/:postId', postController.getPost);

router.post('/', postController.createPost);

router.put('/:postId', postController.updatePost);

router.delete('/:postId', postController.deletePost);

router.post('/comment', postController.postComment);

module.exports = router;
