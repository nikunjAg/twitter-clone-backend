const fs = require('fs');
const path = require('path');

exports.deleteFile = (filePath) => {
	const pathName = path.join(__dirname, '..', filePath);
	fs.unlink(pathName, (err) => {
		if (err) {
			throw err;
		}
	});
};
