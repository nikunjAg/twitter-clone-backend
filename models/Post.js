const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const postSchema = new Schema(
	{
		content: {
			type: String,
			required: true,
		},
		interactions: {
			likes: {
				type: Number,
				default: 0,
			},
			retweets: {
				type: Number,
				default: 0,
			},
			comments: {
				type: Number,
				default: 0,
			},
		},
		comments: [
			{
				type: Schema.Types.ObjectId,
				required: true,
				ref: 'Post',
			},
		],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
