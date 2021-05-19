const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { validationResult } = require('express-validator');
const User = require('../models/User');
const {
	validationErrorHandler,
	populatePostedBy,
	populateTweets,
	populateCommentsData,
	populateQuoteData,
	populateReplyTo,
} = require('./utility');
const { deleteFile } = require('../util/file');

exports.postSignup = (req, res, next) => {
	const {
		name,
		username,
		email,
		password,
		trackingConfirmation,
		confirmPassword,
		dateOfBirth,
	} = req.body;

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return validationErrorHandler(req, errors);
	}

	User.findOne({
		$or: [
			{
				username: username,
			},
			{
				email: email,
			},
		],
	})
		.then((prevUser) => {
			if (prevUser) {
				const err = new Error();
				err.message = `User with this ${
					prevUser.username === username ? 'username' : 'email'
				} already exists`;
				err.statusCode = 422;
				throw err;
			}

			return bcrypt.hash(password, 10);
		})
		.then((hashPassword) => {
			const user = new User({
				name: name,
				username: username,
				email: email,
				password: hashPassword,
				dateOfBirth: dateOfBirth,
				trackingConfirmation: trackingConfirmation,
			});
			return user.save();
		})
		.then((savedUser) => {
			const token = jwt.sign(
				{ username: username, userId: savedUser._id },
				'mySecret',
				{ expiresIn: '1h' }
			);

			res.status(201).json({
				message: 'User created successfully',
				token: token,
				expiresIn: 60 * 60,
				user: {
					...savedUser.toObject(),
					password: null,
					userId: savedUser._id.toString(),
				},
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.postLogin = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return validationErrorHandler(req, errors);
	}

	const { userId, password } = req.body;

	let fetchedUser = null;
	User.findOne({
		$or: [{ username: userId }, { email: userId }],
	})
		.then((dbUser) => {
			if (!dbUser) {
				return res.status(404).json({ message: 'No such user exists' });
			}

			fetchedUser = dbUser;
			return bcrypt.compare(password, dbUser.password).then((result) => {
				if (!result) {
					return res.status(202).json({ messgae: 'Passwords do not match' });
				}

				const token = jwt.sign(
					{
						userId: fetchedUser._id.toString(),
						username: fetchedUser.username,
					},
					'mySecret',
					{ expiresIn: '1h' }
				);

				return res.status(200).json({
					messgae: 'Logged in successfully',
					token: token,
					expiresIn: 60 * 60,
					user: {
						...fetchedUser.toObject(),
						password: null,
						userId: fetchedUser._id.toString(),
					},
				});
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.getUserByToken = (req, res, next) => {
	const { userId } = req;

	User.findById(userId)
		.then((fetchedUser) => {
			const token = jwt.sign(
				{ userId: fetchedUser._id.toString(), username: fetchedUser.username },
				'mySecret',
				{ expiresIn: '1h' }
			);

			res.status(200).json({
				message: 'Token Verified',
				token: token,
				expiresIn: 60 * 60,
				user: {
					...fetchedUser.toObject(),
					password: null,
					userId: fetchedUser._id.toString(),
				},
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.getUser = (req, res, next) => {
	const { username } = req.body;
	const { userId } = req;

	User.findOne({ username: username })
		.populate([
			{ path: 'followers' },
			{ path: 'following' },
			{ ...populateTweets },
			{
				path: 'comments',
				populate: [{ ...populatePostedBy }, { ...populateReplyTo }],
			},
			{
				path: 'quoteTweets',
				populate: [
					{ ...populatePostedBy },
					{
						path: 'quoteData',
						populate: { ...populatePostedBy },
					},
				],
			},
			{
				path: 'retweets',
				populate: [
					{ ...populatePostedBy },
					{
						path: 'quoteData',
						populate: { ...populatePostedBy },
					},
				],
			},
			{
				path: 'likes',
				populate: [
					{ ...populatePostedBy },
					// Not needed as not important here in likes {...populateReplyTo},
					{ path: 'quoteData', populate: { ...populatePostedBy } },
				],
			},
		])
		.then((fetchedUser) => {
			if (!fetchedUser) {
				return res.status(404).json({
					message: 'No such user found',
				});
			}
			res.status(200).json({
				message: 'User fetched successfully',
				user: fetchedUser,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.updateUser = (req, res, next) => {
	const coverImage = req.files.coverImage
		? '/images/' + req.files.coverImage[0].filename
		: null;
	const profileImage = req.files.profileImage
		? '/images/' + req.files.profileImage[0].filename
		: null;

	/* console.log(req.body);
	console.log(req.file);
	console.log(req.files); */

	const { userId } = req;
	const { name, shortBio, location, dateOfBirth } = req.body;

	User.findById(userId)
		.then((fetchedUser) => {
			if (!fetchedUser) {
				return res.status(404).json({
					message: 'No such user found',
				});
			}

			fetchedUser.name = name;
			fetchedUser.shortBio = shortBio;
			fetchedUser.location = location;
			fetchedUser.dateOfBirth = dateOfBirth;
			if (profileImage) {
				if (fetchedUser.profileImage !== '') {
					deleteFile(fetchedUser.profileImage);
				}
				fetchedUser.profileImage = profileImage;
			}
			if (coverImage) {
				if (fetchedUser.coverImage !== '') {
					deleteFile(fetchedUser.coverImage);
				}
				fetchedUser.coverImage = coverImage;
			}

			return fetchedUser.save();
		})
		.then((updatedUser) => {
			return User.populate(updatedUser, [
				{ path: 'followers' },
				{ path: 'following' },
				{ ...populateTweets },
				{
					path: 'comments',
					populate: [{ ...populatePostedBy }, { ...populateReplyTo }],
				},
				{
					path: 'quoteTweets',
					populate: [
						{ ...populatePostedBy },
						{
							path: 'quoteData',
							populate: { ...populatePostedBy },
						},
					],
				},
				{
					path: 'retweets',
					populate: [
						{ ...populatePostedBy },
						{
							path: 'quoteData',
							populate: { ...populatePostedBy },
						},
					],
				},
				{
					path: 'likes',
					populate: [
						{ ...populatePostedBy },
						// Not needed as not important here in likes {...populateReplyTo},
						{ path: 'quoteData', populate: { ...populatePostedBy } },
					],
				},
			]);
		})
		.then((populatedUser) => {
			res.status(200).json({
				message: 'Updated successfully',
				user: { ...populatedUser.toObject(), password: null },
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.toggleFollowUser = (req, res, next) => {
	const { userId: otherUserId } = req.body;
	const { userId } = req;

	let alreadyFollowing = false;
	let otherUser = null;

	User.findById(otherUserId)
		.then((otherUser) => {
			const idx = otherUser.followers.findIndex(
				(u) => u.toString() === userId.toString()
			);

			if (idx === -1) otherUser.followers.unshift(userId);
			else {
				alreadyFollowing = true;
				otherUser.followers = [
					...otherUser.followers.slice(0, idx),
					...otherUser.followers.slice(idx + 1),
				];
			}
			return otherUser.save();
		})
		.then((updatedOtherUser) => {
			otherUser = updatedOtherUser;
			return User.findById(userId);
		})
		.then((currUser) => {
			if (alreadyFollowing)
				currUser.following = currUser.following.filter(
					(u) => u.toString() !== otherUserId.toString()
				);
			else currUser.following.unshift(otherUserId);
			return currUser.save();
		})
		.then((updatedCurrUser) => {
			return res.status(200).json({
				message: `${alreadyFollowing ? 'Stopped' : 'Started'} Following`,
				user: updatedCurrUser,
				otherUser: otherUser,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.getLinks = (req, res, next) => {
	const { username } = req.body;
	const { userId } = req;

	// .select('followers following')
	User.findOne({ username: username })
		.populate([{ path: 'followers' }, { path: 'following' }])
		.then((fetchedUser) => {
			if (!fetchedUser)
				return res.status(404).json({
					message: 'No such user exists',
				});
			res.status(200).json({
				message: 'Connections fetched',
				user: fetchedUser,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

exports.getSearchedUsers = (req, res, next) => {
	const searchString = req.body.search;
	User.find({
		$or: [
			{
				name: {
					$regex: searchString,
					$options: 'i',
				},
			},
			{
				username: {
					$regex: searchString,
					$options: 'i',
				},
			},
		],
	})
		.then((users) => {
			res.status(200).json({
				message: 'users fetched',
				users: users,
			});
		})
		.catch((e) => {
			if (!e.statusCode) e.statusCode = 500;
			next(e);
		});
};

exports.getBookmarkedPosts = (req, res, next) => {
	const { userId } = req;

	User.findById(userId)
		.populate([
			{
				path: 'bookmarkedPosts',
				populate: [
					{ ...populatePostedBy },
					{ ...populateQuoteData },
					{ ...populateReplyTo },
				],
			},
		])
		.then((user) => {
			if (!user)
				return res.status(404).json({ message: 'No such user exists' });
			return res.status(200).json({
				message: 'Bookmarked Posts fetched successfully',
				posts: user.bookmarkedPosts,
			});
		});
};
