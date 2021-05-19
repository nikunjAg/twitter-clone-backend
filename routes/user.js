const express = require('express');
const { body } = require('express-validator');

const userController = require('../controller/User');
const isAuth = require('../middleware/is-Auth');

const router = express.Router();

router.post(
	'/signup',
	[
		body('name').trim().isLength({ min: 3 }).withMessage({
			message: 'Name should be at least 3 chars long',
		}),
		body('username').trim().isLength({ min: 4 }).matches(/^@/).withMessage({
			message: 'Username should starts with @ and also 3+ chars long',
		}),
		body('email').trim().isEmail().withMessage({
			message: 'Please enter a valid email',
		}),
		body('password')
			.isLength({ min: 6 })
			.withMessage({ message: 'Password should be at least 6 chars long.' }),
		body('confirmPassword').custom((value, { req }) => {
			if (value !== req.body.password) {
				throw new Error('Both passwords do not match');
			}
			return true;
		}),
		body('dateOfBirth')
			.not()
			.isEmpty()
			.isDate()
			.withMessage({ message: 'Please enter a valid Date Of Birth' }),
		body('trackingConfirmation')
			.isBoolean()
			.withMessage({ message: 'Please enter a valid value for tracking' }),
	],
	userController.postSignup
);

router.post(
	'/login',
	[
		body('userId').not().isEmpty().withMessage({
			message: 'Please enter a valid username, or email, or mobile number',
		}),
		body('password')
			.not()
			.isEmpty()
			.isLength({ min: 6 })
			.withMessage({ message: 'Please enter a valid password' }),
	],
	userController.postLogin
);

router.post('/verifyToken', isAuth, userController.getUserByToken);

router.post('/', isAuth, userController.getUser);

router.patch(
	'/',
	[
		body('name').trim().isLength({ min: 3 }).withMessage({
			message: 'Name should be at least 3 chars long',
		}),
		body('shortBio').trim(),
		body('location').trim(),
		body('dateOfBirth')
			.notEmpty()
			.isDate()
			.withMessage({ message: 'Please enter a valid Date Of Birth' }),
	],
	isAuth,
	userController.updateUser
);

router.put('/follow', isAuth, userController.toggleFollowUser);

router.post('/links', isAuth, userController.getLinks);

router.post('/search', isAuth, userController.getSearchedUsers);

router.get('/bookmarks', isAuth, userController.getBookmarkedPosts);

module.exports = router;
