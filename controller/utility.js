const validationErrorHandler = (res, errors) => {
	return res.status(422).json({
		message: 'Validation Error',
		error: errors.array({ onlyFirstError: true }),
	});
};

const populatePostedBy = {
	path: 'postedBy',
	select: 'name username profileImage',
};

const populateTweets = {
	path: 'tweets',
	populate: { ...populatePostedBy },
};

const populateReplyTo = {
	path: 'replyTo',
	populate: [
		{
			...populatePostedBy,
		},
		{
			path: 'quoteData',
			select: '-pinned',
			populate: { ...populatePostedBy },
		},
	],
};

const populateQuoteData = {
	path: 'quoteData',
	select: '-pinned',
	populate: [
		{ ...populatePostedBy },
		{
			path: 'quoteData',
			select: '-pinned',
			populate: { ...populatePostedBy },
		},
		{ ...populateReplyTo },
	],
};

const populateCommentsData = {
	path: 'comments',
	select: '-retweetData',
	populate: [
		{ ...populatePostedBy },
		{
			path: 'replyTo',
			populate: { ...populatePostedBy },
		},
	],
};

module.exports = {
	validationErrorHandler,
	populatePostedBy,
	populateTweets,
	populateCommentsData,
	populateQuoteData,
	populateReplyTo,
};
