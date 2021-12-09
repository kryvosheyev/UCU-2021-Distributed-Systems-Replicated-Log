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

exports.sleepWhileUpdateInProgress = () => {
    return new Promise(async (resolve, reject) => {
        let updateInProgressTimeout = Math.round(Math.random() * 10)+1;
        console.log(`Creating fake delay of ${updateInProgressTimeout} seconds...`);
        for (let i = 0; i < updateInProgressTimeout; i++) {
            console.log(`UPDATE IS IN PROGRESS, ${i + 1} seconds passed`);
            await sleep(1000);
            continue;
        }
        resolve();
    })
};

exports.isEmpty = (obj) => {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
};


exports.sendPostHTTP = (baseUrl, url, body) => {
    return new Promise(async (resolve, reject) => {
        console.log(`Start sendPostHTTP to url=${baseUrl+url}`);
        try {
            let response = await axios({
                method: 'post',
                url: url,
                baseURL: baseUrl,
                data: body
            });
            resolve(response);
        }
        catch (err) {
            reject(err);
        }
    })
};