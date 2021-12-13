var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const cors = require('cors');
const HEALTH_CHECK_SERVICE = require('./services/health-check.service');
const BATCH_RETRY_PARAMS_SERVICE = require('./services/batch-retry-params.service');
const BATCH_RETRY_SERVICE = require('./services/batch-retry.service');
const SEND_SERVICE = require('./services/send.service');

SEND_SERVICE.initNodeMutexes().then(
    console.log("initNodeMutexes done")
);
HEALTH_CHECK_SERVICE.startHealthCheckMonitors().then(
    console.log("startHealthCheckMonitors done")
);
BATCH_RETRY_PARAMS_SERVICE.initBackOffRecovery().then(
    console.log("initBackOffRecovery done")
);
BATCH_RETRY_SERVICE.startRetryMonitors().then(
    console.log("startRetryMonitors done")
);


var indexRouter = require('./routes/index');
var masterRouter = require('./routes/master');

var app = express();

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "DELETE, PUT, GET, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/master', masterRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (req, res, next) {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });
});





module.exports = app;
