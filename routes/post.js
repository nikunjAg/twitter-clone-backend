const express = require('express');

const postController = require('../controller/Post');
const isAuth = require('../middleware/is-Auth');

const router = express.Router();

router.get('/feed', isAuth, postController.getPosts);

router.post('/', isAuth, postController.createPost);

router.get('/:postId', isAuth, postController.getPost);

router.put('/:postId/like', isAuth, postController.likePost);

router.patch('/:postId/retweet', isAuth, postController.retweetPost);

router.delete('/:postId/retweet', isAuth, postController.deleteRetweet);

router.post('/:postId/quote', isAuth, postController.quotePost);

router.post('/:postId/reply', isAuth, postController.replyPost);

router.delete('/:postId', isAuth, postController.deletePost);

router.patch('/:postId/pin', isAuth, postController.pinPost);

router.post('/search', isAuth, postController.getSearchedPosts);

router.patch('/:postId/bookmark', isAuth, postController.bookmarkPost);

module.exports = router;
