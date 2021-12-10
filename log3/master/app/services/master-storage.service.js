const _ = require("lodash");
var Mutex = require('async-mutex').Mutex;
const storageMutex = new Mutex();

let STORAGE=[];
let _id_curr = 0;

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

async function getAllMsg() {
    const release = await storageMutex.acquire();
    try {
        return _.map(STORAGE, 'msg');
    } finally {
        release();
    }
}

async function clearDb() {
    const release = await storageMutex.acquire();
    try {
        STORAGE = [];
        _id_curr = 0;
        console.log(`cleared db`);
    } finally {
        release();
    }
}

module.exports = {
    saveMsgAndGetRLogMsg,
    getAllMsg,
    clearDb,
}