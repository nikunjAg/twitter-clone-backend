const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const postSchema = new Schema(
	{
		content: {
			type: String,
		},
		images: [{type: String, default: ''}],
		postedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		pinned: { type: Boolean, default: false },
		likes: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		retweets: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		quotePosts: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Post',
			},
		],
		quoteData: {
			type: Schema.Types.ObjectId,
			ref: 'Post',
			default: null,
		},
		comments: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Post',
			},
		],
		commentedBy: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		replyTo: {
			type: Schema.Types.ObjectId,
			ref: 'Post',
		},
		isQuotePost: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

/* postSchema.pre('remove', function (next) {
	const replyTo = this.replyTo ? this.replyTo._id : this.replyTo;
	if (replyTo)
		this.model('Post')
			.findById(replyTo)
			.then((parentPost) => {
				parentPost.comments = parentPost.comments.filter(
					(c) => c.toString() !== this._id.toString()
				);
				return parentPost.save();
			});
}); */

module.exports = mongoose.model('Post', postSchema);
