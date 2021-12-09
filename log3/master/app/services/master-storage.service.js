const fs = require("fs");
const crypto = require('crypto');
const axios = require('axios');
let CRC32 = require('crc-32');
const _ = require("lodash");
const moment = require('moment');
const config = require('../config');
let AsyncLock = require('async-lock');
let lock = new AsyncLock();

var Mutex = require('async-mutex').Mutex;
const storageMutex = new Mutex();

// var ReadWriteLock = require('rwlock');
// var rwlock = new ReadWriteLock();

let STORAGE=[];
let _id_curr = 0;

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

async function saveMsgAndGetRLogMsg(msg){
    const release = await storageMutex.acquire();
    try {
        let rLogMsg = {};
        _id_curr++;
        rLogMsg = {
            _id_curr: _id_curr,
            msg: msg
        };
        if (!STORAGE.length) {
            rLogMsg._id_is_first = true
        }
        STORAGE.push(rLogMsg);
        console.log("saveMsgAndGetRLogMsg rLogMsg=", rLogMsg);
        return rLogMsg;
    } finally {
        release();
    }
}

// async function saveMsgAndGetRLogMsg(msg){
//     let rLogMsg = {};
//     await lock.acquire("STORAGE_LOCK", async function () {
//         _id_curr++;
//         rLogMsg = {
//             _id_curr: _id_curr,
//             msg: msg
//         };
//         if (!STORAGE.length) {
//             rLogMsg._id_is_first = true
//         }
//         STORAGE.push(msg);
//     }, function (err, ret) {
//         // console.log("STORAGE_LOCK release")
//     }, {});
//     console.log("saveMsgAndGetRLogMsg rLogMsg=", rLogMsg);
//     return rLogMsg;
// }

// async function race(msg, delay){
//     let rLogMsg={};
//     _id_curr++;
//     await sleep(delay);
//     rLogMsg = {
//         _id_curr:_id_curr,
//         msg: msg
//     };
//     if(!STORAGE.length){
//         rLogMsg._id_is_first = true
//     }
//     STORAGE.push(msg);
//     return rLogMsg;
// }

async function getAllMsg() {
    const release = await storageMutex.acquire();
    try {
        return _.map(STORAGE, 'msg');
    } finally {
        release();
    }
}

async function clearDb() {
    await lock.acquire("STORAGE_LOCK", function() {
        STORAGE = [];
        _id_curr = 0;
        console.log(`cleared db`);
        // console.log("STORAGE_LOCK Done");
    }, function(err, ret) {
        // console.log("STORAGE_LOCK release")
    }, {});
}

module.exports = {
    saveMsgAndGetRLogMsg,
    getAllMsg,
    clearDb,
}