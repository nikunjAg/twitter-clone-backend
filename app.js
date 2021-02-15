const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const postRoutes = require('./routes/post');

const PORT = process.env.PORT || 8080;
const app = express();
const MONGO_URI = `mongodb+srv://nikunj:ZvvmPERkdR7Q4@cluster0.vhhko.mongodb.net/twitterclone?retryWrites=true&w=majority`;

app.use(bodyParser.json());
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, OPTIONS, PUT, PATCH, DELETE'
	);
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

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
