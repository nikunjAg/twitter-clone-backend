const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
	{
		name: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		trackingConfirmation: { type: Boolean, default: 'true' },
		shortBio: { type: String, default: '' },
		coverImage: { type: String, default: '' },
		profileImage: { type: String, default: '' },
		dateOfBirth: { type: Date, default: Date.now },
		pinnedTweet: { type: Schema.Types.ObjectId, default: null },
		tweets: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		bookmarkedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		quoteTweets: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		comments: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		likes: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		retweets: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
