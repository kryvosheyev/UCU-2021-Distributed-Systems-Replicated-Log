const fs = require("fs");
const crypto = require('crypto');
const axios = require('axios');
let CRC32 = require('crc-32');
const moment = require('moment');
const config = require('../config');

let STORAGE = [];

exports.addMsg = (rLogMsg) => {
    STORAGE.push(rLogMsg);
    console.log(`added STORAGE[${STORAGE.length}] = ${JSON.stringify(rLogMsg)}`);
    return 1;
}

exports.getAllMsg = () => {
    return STORAGE;
}

