/**
 * index.js -- основной скрипт запуска сервиса
 **/

const express = require('express');
const rotator = require('file-stream-rotator');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');

const conf = require('./config');
const login = require('./routers/login');
const acount = require('./routers/acount');
const meter = require('./routers/meter');
const allocation = require('./routers/allocation');
const payment = require('./routers/payment');

let app = express();
let logDir = __dirname + '/logs';

fs.existsSync(logDir) || fs.mkdirSync(logDir);
let logStream = rotator.getStream({
	date_format: 'YYYY-MM-DD',
	filename: logDir + '/access-%DATE%.log',
	frequency: 'daily',
	verbose: false
});

app.use(cors());
app.use(morgan('combined', {stream: logStream}));

app.use('/login', login);
app.use('/acount', acount);
app.use('/meter', meter);
app.use('/allocation', allocation);
app.use('/payment', payment);

let port = conf.server.listenPort || 10000;
app.listen(port, () => {
	console.log('Update service start at port ' + port);
});

module.exports = app;




