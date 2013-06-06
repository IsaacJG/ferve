/*
THIS IS NOT A VITAL FILE
it is used as a 'sandbox' for testing things,
setting up the database,
and viewing what is currently in the database
*/
var crypto = require('crypto');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('ferve.db');

function hash (text, salt) {
	var sha = crypto.createHash('sha512');
	var stringToHash = '';
	text.split('').forEach(function (element, index, array) {
		if (element != ' ') {
			if (index != text.length) {
				stringToHash += element + '' + salt;
			} else {
				stringToHash += element;
			}
		}
	});
	sha.update(stringToHash);
	return sha.digest('hex');
}
//db.run("CREATE TABLE cookies (cookie TEXT, time INTEGER)");
db.get("SELECT * FROM users", function (err, row) {
	if (err) {
		console.log(err);
	}
	console.log(row);
});
/*var salt = '' + new Date().getTime();
db.run("UPDATE users SET password='" + hash('rhswebdesign', salt) + "', salt='" + salt + "' WHERE user='admin'");*/
db.get("SELECT * FROM cookies", function (err, row) {
	if (err) {
		console.log(err);
	}
	console.log(row);
});
db.close();