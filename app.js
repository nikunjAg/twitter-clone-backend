const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');

const postRoutes = require('./routes/post');
const userRoutes = require('./routes/user');

const PORT = process.env.PORT || 8080;
const app = express();
const MONGO_URI = `mongodb+srv://nikunj:ZvvmPERkdR7Q4@cluster0.vhhko.mongodb.net/twitterclone?retryWrites=true&w=majority`;

const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '-' + file.fieldname + '.png');
	},
});
const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, OPTIONS, PUT, PATCH, DELETE'
	);
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
	multer({ storage: fileStorage, fileFilter: fileFilter }).fields([
		{ name: 'profileImage', maxCount: 1 },
		{ name: 'coverImage', maxCount: 1 },
		{ name: 'images', maxCount: 4 },
	])
);
app.use(bodyParser.json());

app.use('/user', userRoutes);
app.use('/posts', postRoutes);

app.use((err, req, res, next) => {
	console.log(err);
	const { statusCode, message, data } = err;
	res.status(statusCode || 500).json({ message, data });
});

mongoose
	.connect(MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
	})
	.then(() => {
		app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
	})
	.catch((e) => {
		console.log(e);
	});
