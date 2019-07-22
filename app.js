var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const apis = require('./apis/index');

const { SERVER_PORT } = require('./constants');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

apis(app);

app.listen(SERVER_PORT, () => {
  console.log(`listening on port: ${SERVER_PORT}`);
});
