/*
Author: Isaac Grant
Copyright (C) 2013
All rights reserved
*/

// IMPORTS & GLOBAL DECLARATIONS
var exec = require('child_process').exec;
var crypto = require('crypto');
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var db = new sqlite3.Database('ferve.db');


//==============================================
//	INTERNAL & UTILITY FUNCTIONS
//==============================================

function stdExecCallback (error, stdout, stderr) {
	console.log(stdout);
	if (error) {
		console.log(stderr);
		console.log(error);
	}
}

function registerUser (period, student) {
	exec('mkdir /usr/share/nginx/html/' + period, stdExecCallback);
	exec('mkdir /home/' + period, stdExecCallback);
	exec('adduser ' + student + ' --home /home/' + period + '/' + student + ' --gid 503 --create-home --comment "user automatically created with FERVE!!"', stdExecCallback);
	exec('ln --symbolic --target-directory=/usr/share/nginx/html/' + period + ' /home/' + period + '/' + student, stdExecCallback);
}

function deleteUser (period, student) {
	exec('userdel ' + student, stdExecCallback);
	exec('rm -rf /home/' + period + '/' + student, stdExecCallback);
	exec('rm -rf /usr/share/nginx/html/' + period + '/' + student, stdExecCallback);
}

function keyGen (user) {
	var sha = crypto.createHash('sha512');
	var stringToHash = '';
	var salt = new Date().getTime();
	user.split('').forEach(function (element, index, array) {
		if (element !== ' ') {
			if (index !== user.length) {
				stringToHash += element + '' + salt;
			} else {
				stringToHash += element;
			}
		}
	});
	sha.update(stringToHash);
	return sha.digest('hex');
}

function authorize (user, password, callback) {
	function hash (text, salt) {
		var sha = crypto.createHash('sha512');
		var stringToHash = '';
		text.split('').forEach(function (element, index, array) {
			if (element !== ' ') {
				if (index !== text.length) {
					stringToHash += element + '' + salt;
				} else {
					stringToHash += element;
				}
			}
		});
		sha.update(stringToHash);
		return sha.digest('hex');
	}
	db.get("SELECT * FROM users WHERE user='admin'", function (err, rows) {
		if (err) {
			console.log(err);
		}
		if (hash(password, rows.salt) === rows.password) {
			callback(true);
		} else {
			callback(false);
		}
	});
}

function addCookie (cookie) {
	db.run("INSERT INTO cookies VALUES ('" + cookie + "', " + new Date().getTime() + ")");
}

function checkCookie (cookie, callback) {
	db.get("SELECT * FROM cookies WHERE cookie='" + cookie + "'", function (err, row) {
		if (err) {
			console.log(err);
		}
		// this is where cookies are timed out/updated
		// change the second condition to change timeout length (currently 5 minutes)
		if (row !== undefined && new Date().getTime() - row.time < 300000) {
			callback(true);
			db.run("UPDATE cookies SET time=" + new Date().getTime() + " WHERE cookie='" + row.cookie + "'");
		} else {
			callback(false);
		}
	});
}

function verifyAuth (req, res, callback) {
	checkCookie(req.cookies.key, function (matched) {
		if (matched) {
			callback();
		} else {
			res.send('unauthorized');
		}
	});
}

function removeCookie (cookie) {
	db.run("DELETE FROM cookies WHERE cookie='" + cookie + "'");
}

function getUserList (callback) {
	exec('cat /etc/passwd', function (error, stdout, stderr) {
		if (error) {
			console.log(error);
		}
		var userList = [];
		stdout.split('\n').forEach(function (element, index, array) {
			if (element.indexOf('/home') > -1) {
				userList.push(element.split(':')[0]);
			}
		});
		callback(userList);
	});
}

function getStudentPeriod (student, callback) {
	exec('cat /etc/passwd | grep ' + student + ':x', function (error, stdout, stderr) {
		if (error) {
			console.log(error);
		}
		callback(stdout.substr(stdout.indexOf('/home') + 6, stdout.length).substr(0, stdout.indexOf(':')+1));
	});
}


//==============================================
//	ROUTING EXPORTS
//==============================================

exports.login = function (req, res) {
	checkCookie(req.cookies.key, function (matched) {
		if (matched) {
			res.writeHead(303, {
				'Location': '/admin'
			});
			res.end();
		} else {
			res.render('login');
		}
	});
};

exports.loginHandle = function (req, res) {
	authorize(req.body.user, req.body.password, function(authorized) {
		if (authorized) {
			var key = keyGen(req.body.user);
			addCookie(key);
            res.cookie('key', key);
			res.writeHead(303, {
				'Location': '/admin'
			});
			res.end();
		} else {
			res.writeHead(303, {
				'Location': '/login'
			});
			res.end();
		}
	});
};

exports.logout = function (req, res) {
	removeCookie(req.cookies.key);
	res.writeHead(303, {
		'Location': '/'
	});
	res.end();
};

exports.main = function (req, res) {
	verifyAuth(req, res, function () {
		getUserList(function (userList) {
			res.render('main', {'students': userList});
		});
	});
};

exports.addStudent = function (req, res) {
	verifyAuth(req, res, function () {
		registerUser(req.body.period, req.body.studentnum);
		res.writeHead(303, {
			'Location': '/admin'
		});
		res.end();
	});
};

exports.studentDetail = function (req, res) {
	verifyAuth(req, res, function () {
		getStudentPeriod(req.params.student, function (period) {
			res.render('student', {'student': req.params.student, 'period': period});
		});
	});
};

exports.changePeriod = function (req, res) {
	verifyAuth(req, res, function () {
		getStudentPeriod(req.params.student, function (period) {
			res.render('changeperiod', {'student': req.params.student, 'period': period});
		});
	});
};

exports.changePeriodSubmit = function (req, res) {
	verifyAuth(req, res, function () {
		console.log(req.query.newperiod);
		getStudentPeriod(req.params.student, function (period) {
			var symRoot = '/usr/share/nginx/html/%s/';
			var studentHome = '/home/%s/' + req.params.student;
			// move student directory and create new symlink
			exec('usermod --home ' + studentHome.replace('%s', req.query.newperiod) + ' --move-home ' + req.params.student, stdExecCallback);
			fs.exists(symRoot.replace('%s', req.query.newperiod), function (exists) {
				if (!exists) {
					exec('mkdir ' + symRoot.replace('%s', req.query.newperiod), stdExecCallback);
				}
				exec('ln --symbolic --target-directory=' + symRoot.replace(req.query.newperiod) + ' ' + studentHome.replace('%s', req.query.newperiod), stdExecCallback);
			});
			// delete old home
			exec('rm -rf ' + studentHome.replace('%s', period), stdExecCallback);
			exec('rm -rf ' + symRoot.replace('%s', period) + '/' + req.params.student, stdExecCallback);
		});
		res.writeHead(303, {
			'Location': '/admin/' + req.params.student
		});
		res.end();
	});
};

exports.deleteStudent = function (req, res) {
	verifyAuth(req, res, function () {
		res.render('deletestudent', {'student': req.params.student});
	});
};

exports.deleteStudentSubmit = function (req, res) {
	verifyAuth(req, res, function () {
		exec('userdel --remove --force ' + req.params.student, stdExecCallback);
		getStudentPeriod(req.params.student, function (period) {
			exec('rm -rf /usr/share/nginx/html/' + period + '/' + req.params.student, stdExecCallback);
		});
		res.writeHead(303, {
			'Location': '/admin'
		});
		res.end();
	});
};