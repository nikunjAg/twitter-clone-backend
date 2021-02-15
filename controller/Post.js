const Post = require('../models/Post');

exports.getPosts = (req, res, next) => {
	Post.find()
		.then((posts) => {
			res.status(200).send({
				message: 'Posts fetched',
				posts: posts,
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.getPost = (req, res, next) => {
	const { postId } = req.params;

	Post.findById(postId)
		.then((fetchedPost) => {
			if (!fetchedPost) {
				const error = new Error();
				error.statusCode = 404;
				error.message = 'No such post found';
				throw error;
			}

			res.status(200).json({
				message: 'Posts fetched',
				post: fetchedPost,
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.createPost = (req, res, next) => {
	const post = new Post({
		content: '<div>Hello, Twitter</div>',
	});

	post
		.save()
		.then((savedPost) => {
			res.status(201).json({ message: 'Post created successfully' });
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.updatePost = (req, res, next) => {
	const { postId } = req.params;
	const { content } = req.body;
	const { likes, retweets, comments } = req.body.interactions;

	Post.findById(postId)
		.then((fetchedPost) => {
			if (!fetchedPost) {
				const error = new Error();
				error.statusCode = 404;
				error.message = 'No such post found.';
				throw error;
			}

			fetchedPost.content = content;
			fetchedPost.interactions = { likes, comments, retweets };
			return fetchedPost.save();
		})
		.then((updatedPost) => {
			res.status(200).json({
				message: 'Post updated successfully',
				post: updatedPost,
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.deletePost = (req, res, next) => {
	const { postId } = req.params;

	Post.findById(postId)
		.then((fetchedPost) => {
			if (!fetchedPost) {
				const error = new Error();
				error.statusCode = 404;
				error.message = 'No such post found.';
				throw error;
			}

			// Validate wheather the user is authorized to delete this post or not
			return Post.findByIdAndRemove(postId);
		})
		.then((result) => {
			res.status(200).json({ message: 'Post deleted successfully' });
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.postComment = (req, res, next) => {
	const { parentPostId } = req.body;
	let fetchedParentPost = null;
	Post.findById(parentPostId)
		.then((parentPost) => {
			if (!parentPost) {
				const error = new Error();
				error.statusCode = 404;
				error.message = 'No such post exists.';
				throw error;
			}
			const post = new Post({ content: '<div>Comment Post</div>' });
			return post.save().then((commentPost) => {
				parentPost.comments.push(commentPost);
				return parentPost.save();
			});
		})
		.then((updatedParentPost) => {
			res
				.status(201)
				.send({ message: 'Commented Successfully', post: updatedParentPost });
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};
