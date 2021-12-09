const fs = require("fs");
const crypto = require('crypto');
const axios = require('axios');
let CRC32 = require('crc-32');
const moment = require('moment');
const config = require('../config');

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

async function sleepWhileUpdateInProgress() {
    return new Promise(async (resolve, reject) => {
        let updateInProgressTimeout = Math.round(Math.random() * 3)+1;
        console.log(`Creating fake delay of ${updateInProgressTimeout} seconds...`);
        for (let i = 0; i < updateInProgressTimeout; i++) {
            console.log(`UPDATE IS IN PROGRESS, ${i + 1} seconds passed`);
            await sleep(1000);
        }
        resolve();
    })
};

function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
};

module.exports = {
    sleep,
    isEmpty
}