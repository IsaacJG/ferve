/*
Author: Isaac Grant
Copyright (C) 2013
All rights reserved
*/

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes/routes.js')
  , http = require('http')
  , path = require('path')
  , sqlite3 = require('sqlite3');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.login);
app.post('/login/submit', routes.loginHandle);
app.get('/admin', routes.main);
app.get('/admin/logout', routes.logout);
app.post('/admin/addstudent', routes.addStudent);
app.get('/admin/:student', routes.studentDetail);
app.get('/admin/chper/:student', routes.changePeriod);
app.get('/admin/chper/:student/submit', routes.changePeriodSubmit);
app.get('/admin/del/:student', routes.deleteStudent);
app.get('/admin/del/:student/submit', routes.deleteStudentSubmit);

// flush the cookies db table
var db = new sqlite3.Database('ferve.db');
db.run("DELETE FROM cookies");

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
