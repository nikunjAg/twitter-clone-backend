const jwt = require('jsonwebtoken');

const SECRET = 'mySecret';

module.exports = (req, res, next) => {
	const authHeader = req.get('Authorization');

	if (!authHeader) {
		const err = new Error();
		err.statusCode = 422;
		err.message = 'You re not authenticated';
		throw err;
	}

	const authToken = authHeader.split(' ')[1];
	let decodedToken;

	try {
		decodedToken = jwt.verify(authToken, SECRET);
	} catch (err) {
		if (!err.statusCode) err.statusCode = 500;
		err.message = 'You are not authenticated';
		throw err;
	}

	if (!decodedToken) {
		const err = new Error();
		err.statusCode = 422;
		err.message = 'You re not authenticated';
		throw err;
	}

	req.userId = decodedToken.userId;
	req.userName = decodedToken.userName;

	next();
};
