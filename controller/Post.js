const { validationResult } = require('express-validator');
const { isValidObjectId } = require('mongoose');

const Post = require('../models/Post');
const User = require('../models/User');
const { deleteFile } = require('../util/file');
const {
	validationErrorHandler,
	populatePostedBy,
	populateReplyTo,
	populateCommentsData,
	populateQuoteData,
} = require('./utility');

exports.getPosts = (req, res, next) => {
	const { userId } = req;

	User.findById(userId)
		.then((fetchedUser) => {
			if (!fetchedUser) {
				return res.status(404).json({ message: 'No such user exists.' });
			}

			const feedPostsAuthorsIds = [
				...fetchedUser.following.toObject(),
				fetchedUser._id,
			];

			Post.find({ postedBy: { $in: feedPostsAuthorsIds } })
				.populate([
					{ ...populatePostedBy },
					{ ...populateReplyTo },
					{ ...populateQuoteData },
				])
				.sort({ createdAt: -1 })
				.then((posts) => {
					res.status(200).json({
						message: 'Posts fetched',
						posts: posts,
					});
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
		.populate([
			{ ...populatePostedBy },
			{ ...populateQuoteData },
			{ ...populateReplyTo },
			{ ...populateCommentsData },
		])
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
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return validationErrorHandler(res, errors);
	}

	const { content } = req.body;
	const { userId } = req;

	const images = [];

	if (req.files && req.files.images) {
		for (let image of req.files.images) {
			images.push('/images/' + image.filename);
		}
	}

	const post = new Post({
		content: content,
		images: images,
		postedBy: req.userId,
	});

	let createdPost = null;
	post
		.save()
		.then((savedPost) => {
			return Post.populate(savedPost, { ...populatePostedBy });
		})
		.then((populatedPost) => {
			createdPost = populatedPost;
			return User.findById(userId);
		})
		.then((currUser) => {
			currUser.tweets.unshift(createdPost._id);
			return currUser.save();
		})
		.then((updatedUser) => {
			res
				.status(201)
				.json({ message: 'Post created successfully', post: createdPost });
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.likePost = (req, res, next) => {
	const { postId } = req.params;
	const userId = req.userId;

	let wantsToLike = false;

	User.findById(userId)
		.then((user) => {
			if (!user) {
				const error = new Error('No such user found.');
				error.statusCode = 404;
				throw error;
			}
			const postIdx = user.likes.findIndex(
				(p) => p.toString() === postId.toString()
			);
			if (postIdx === -1) {
				// User wants to like the post
				wantsToLike = true;
				user.likes = [postId].concat(user.likes);
			} else {
				// User wants to unlike the post
				user.likes = [
					...user.likes.slice(0, postIdx),
					...user.likes.slice(postIdx + 1),
				];
			}
			return user.save();
		})
		.then((updatedUser) => {
			return Post.findById(postId).populate([
				{ ...populatePostedBy },
				{ ...populateReplyTo },
				{ ...populateQuoteData },
			]);
		})
		.then((post) => {
			if (wantsToLike) post.likes = [userId].concat(post.likes);
			else
				post.likes = post.likes.filter(
					(u) => u.toString() !== userId.toString()
				);
			return post.save();
		})
		.then((updatedPost) => {
			res.status(200).json({
				message: `Post ${wantsToLike ? 'Liked' : 'Disliked'}`,
				post: updatedPost,
				result: wantsToLike ? 'LIKE_POST' : 'DISLIKE_POST',
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.retweetPost = (req, res, next) => {
	const { postId } = req.params;
	const userId = req.userId;

	let originalPost = null;

	Post.findById(postId)
		.then((fetchedPost) => {
			const idx = fetchedPost.retweets.findIndex(
				(u) => u.toString() === userId.toString()
			);
			if (idx === -1) fetchedPost.retweets.unshift(userId);
			return fetchedPost.save();
		})
		.then((updatedPost) => {
			return Post.populate(updatedPost, [
				{ ...populatePostedBy },
				{ ...populateQuoteData },
				{ ...populateReplyTo },
			]);
		})
		.then((populatedPost) => {
			originalPost = populatedPost;
			return User.findById(userId);
		})
		.then((currUser) => {
			const idx = currUser.retweets.findIndex(
				(p) => p.toString() === postId.toString()
			);
			if (idx === -1) currUser.retweets.unshift(postId);
			return currUser.save();
		})
		.then((updatedUser) => {
			return res
				.status(200)
				.json({ message: 'Retweet Success', post: originalPost });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.deleteRetweet = (req, res, next) => {
	const { postId } = req.params;
	const { userId } = req;

	User.findById(userId)
		.then((currUser) => {
			currUser.retweets = currUser.retweets.filter(
				(p) => p.toString() !== postId.toString()
			);
			return currUser.save();
		})
		.then((updatedCurrUser) => {
			return Post.findById(postId).populate([
				{ ...populatePostedBy },
				{ ...populateQuoteData },
				{ ...populateReplyTo },
			]);
		})
		.then((populatedPost) => {
			populatedPost.retweets = populatedPost.retweets.filter(
				(u) => u.toString() !== userId.toString()
			);
			return populatedPost.save();
		})
		.then((updatedPopulatedPost) => {
			return res.status(200).json({
				message: 'Retweet deleted',
				post: updatedPopulatedPost,
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.quotePost = (req, res, next) => {
	const { content } = req.body;
	const { postId } = req.params;
	const { userId } = req;
	const images = [];
	if (req.files && req.files.images) {
		for (let image of req.files.images) {
			images.push('/images/' + image.filename);
		}
	}

	let createdQuote = null;

	const post = new Post({
		content: content,
		images: images,
		postedBy: userId,
		quoteData: postId,
		isQuotePost: true,
	});

	post
		.save()
		.then((createdPost) => {
			return Post.populate(createdPost, [
				{ ...populatePostedBy },
				{ ...populateQuoteData },
			]);
		})
		.then((populatedCreatedPost) => {
			createdQuote = populatedCreatedPost;
			return User.findById(userId);
		})
		.then((currUser) => {
			currUser.quoteTweets.unshift(createdQuote._id);
			return currUser.save();
		})
		.then((updatedCurrUser) => {
			return Post.findById(postId).populate([
				{ ...populatePostedBy },
				{ ...populateQuoteData },
				{ ...populateReplyTo },
			]);
		})
		.then((parentPost) => {
			parentPost.quotePosts.unshift(createdQuote._id);
			return parentPost.save();
		})
		.then((updatedParentPost) => {
			return res.status(201).json({
				message: 'Quote Created',
				post: createdQuote,
				parentPost: updatedParentPost,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.replyPost = (req, res, next) => {
	const { postId } = req.params;
	const { content } = req.body;
	const { userId } = req;
	const images = [];
	if (req.files && req.files.images) {
		for (let image of req.files.images) {
			images.push('/images/' + image.filename);
		}
	}

	let replyPost = null;
	const post = new Post({
		content: content,
		images: images,
		replyTo: postId,
		postedBy: userId,
	});

	post
		.save()
		.then((savedPost) => {
			return Post.populate(savedPost, [
				{ ...populatePostedBy },
				{ ...populateReplyTo },
			]);
		})
		.then((populatePost) => {
			replyPost = populatePost;
			return User.findById(userId);
		})
		.then((currUser) => {
			currUser.comments.unshift(replyPost._id);
			return currUser.save();
		})
		.then((updatedUser) => {
			return Post.findById(postId).populate([
				{ ...populatePostedBy },
				{ ...populateQuoteData },
				{ ...populateReplyTo },
			]);
		})
		.then((parentPost) => {
			parentPost.comments.unshift(replyPost._id);
			const idx = parentPost.commentedBy.findIndex(
				(u) => u.toString() === req.userId.toString()
			);
			if (idx === -1) parentPost.commentedBy.unshift(req.userId);
			return parentPost.save();
		})
		.then((updatedParentPost) => {
			return res.status(201).json({
				message: 'Replied successfully',
				post: replyPost,
				parentPost: updatedParentPost,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.deletePost = (req, res, next) => {
	const { postId } = req.params;
	const { userId } = req;

	Post.findOneAndRemove({ _id: postId, postedBy: userId })
		.then((deletedPost) => {
			for (let postImage of deletedPost.images) {
				deleteFile(postImage);
			}
			res.status(200).json({
				message: 'Post deleted successfully',
				deletedPost,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

// Works as a toggler
exports.pinPost = (req, res, next) => {
	const { postId } = req.params;
	const { userId } = req;

	let newPinnedPost = null;
	let oldPinnedPostId = null;

	Post.findById(postId)
		.populate([
			{ ...populatePostedBy },
			{ ...populateQuoteData },
			{ ...populateReplyTo },
		])
		.then((toBePinnedPost) => {
			if (toBePinnedPost.postedBy._id.toString() !== userId.toString()) {
				return res.status(401).json({
					message: 'Not authorized',
				});
			}
			newPinnedPost = toBePinnedPost;
			toBePinnedPost.pinned = true;
			toBePinnedPost
				.save()
				.then((pinnedPost) => {
					newPinnedPost = pinnedPost;
					return User.findById(userId);
				})
				.then((currUser) => {
					oldPinnedPostId = currUser.pinnedTweet;
					currUser.pinnedTweet = newPinnedPost._id;
					return currUser.save();
				})
				.then((updatedUser) => {
					return Post.findById(oldPinnedPostId).populate([
						{ ...populatePostedBy },
						{ ...populateQuoteData },
						{ ...populateReplyTo },
					]);
				})
				.then((oldPinnedPost) => {
					if (oldPinnedPost._id.toString() !== newPinnedPost._id.toString()) {
						oldPinnedPost.pinned = false;
					}
					return oldPinnedPost.save();
				})
				.then((oldUpdatedPost) => {
					res.status(200).json({
						message: 'Your Tweet has been pinned to your profile',
						post: newPinnedPost,
						oldPinnedPost: oldUpdatedPost,
						pinnedPostId: newPinnedPost._id.toString(),
					});
				});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.getSearchedPosts = (req, res, next) => {
	const searchString = req.body.search;
	Post.find({
		content: {
			$regex: searchString,
			$options: 'i',
		},
	})
		.populate([
			{ ...populatePostedBy },
			{ ...populateQuoteData },
			{ ...populateReplyTo },
		])
		.then((posts) => {
			res.status(200).json({
				message: 'Posts fetched',
				posts: posts,
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.bookmarkPost = (req, res, next) => {
	const { userId } = req;
	const { postId } = req.params;

	User.findById(userId)
		.then((user) => {
			if (!user) {
				return res.status(404).json({ message: 'No such user exists' });
			}

			const idx = user.bookmarkedPosts.findIndex(
				(p) => p.toString() === postId.toString()
			);
			let message = '';
			if (idx !== -1) {
				user.bookmarkedPosts = [
					...user.bookmarkedPosts.slice(0, idx),
					...user.bookmarkedPosts.slice(idx + 1),
				];
				message = 'Bookmark removed from post successfully';
			} else {
				user.bookmarkedPosts.unshift(postId);
				message = 'Bookmark added to post successfully';
			}

			user.save().then((updatedUser) => {
				return res
					.status(200)
					.json({ message, bookmarkedPosts: updatedUser.bookmarkedPosts });
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};
