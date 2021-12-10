const fs = require("fs");
const config = require('../config');
const _ = require("lodash");
const {RESPONSE_MESSAGES} = require("../constants");
const UTILS = require('../services/utils');
const STATE_SERVICE = require('../services/state.service');
const RETRY_QUEUE_SERVICE = require('../services/retry-queue.service');
const {RETRY} = require('../config');

var Mutex = require('async-mutex').Mutex;
const sendMutex = new Mutex();

// +SEND_LOCK
SEND = [];

// let example = {
//     "1": {"W": 2, successfulWritesQty: 1, failedWritesQty: 0 },
//     "2": {"W": 2, successfulWritesQty: 1, failedWritesQty: 0 }
// };


async function sendMsgToNodes(rLogMsg, N, W, successfulWritesQty, failedWritesQty, res) {
    await addMsgState(rLogMsg, W, successfulWritesQty, failedWritesQty, 0);
    for(let i=0;i<config.secondaries.length;i++){
        node = {...config.secondaries[i]};
        proceedUntilSucceedWhileAvailable(node, rLogMsg, N, res);
    }
}


async function proceedUntilSucceedWhileAvailable(node, rLogMsg, N, res) {
    let retriesQty = 0;
    while (true) {
        let isAvailable = await STATE_SERVICE.isNodeAvailableByNodeName(node.name);
        if (!isAvailable) {
            await incMsgFailedWritesQty(rLogMsg._id_curr);
        }

        // N=3, W=2, successfulWritesQty=1, failedWritesQty=0  = nothing
        // N=3, W=2, successfulWritesQty=1, failedWritesQty=1  = nothing
        // N=3, W=2, successfulWritesQty=1, failedWritesQty=2  = fail
        // N=3, W=2, successfulWritesQty=0, failedWritesQty=2  = fail
        let msgState = await getMsgState(rLogMsg._id_curr);
        if ((msgState.W > N - msgState.failedWritesQty) || !isAvailable) {
            UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.WRITE_CONCERN_NOT_ACHIEVED);
            RETRY_QUEUE_SERVICE.addMsgToRetryQueue(rLogMsg, node);
            return;
        }

        let response = await UTILS.reqToNodeSendMsg(node, node.url, rLogMsg, RETRY.timeout);
        if (response.added && response.added.length === 1 && response.added[0] === rLogMsg._id_curr) {
            await incMsgSuccessfulWritesQty(rLogMsg._id_curr);
            msgState = await getMsgState(rLogMsg._id_curr);
            if (msgState.W <= msgState.successfulWritesQty) {
                UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.OK)
            }
            return;
        } else {
            // if node is available, sleep
            let isAvailable = await STATE_SERVICE.isNodeAvailableByNodeName(node.name);
            if (isAvailable) {
                let interval_idx = (retriesQty < RETRY.INTERVALS.length) ? retriesQty : RETRY.INTERVALS.length-1;
                let intervalAfterReq = RETRY.INTERVALS[interval_idx] + Math.round(Math.random() * RETRY.interval_jitter);
                await UTILS.sleep(intervalAfterReq);
            }
            retriesQty++;
        }
    }
}

async function addMsgState(rLogMsg, W, successfulWritesQty, failedWritesQty) {
    const release = await sendMutex.acquire();
    try {
        SEND[rLogMsg._id_curr] = {W, successfulWritesQty, failedWritesQty};
        //     "1": {"W": 2, successfulWritesQty: 1, failedWritesQty: 0},
    } finally {
        release();
    }
}

async function getMsgState(id) {
    const release = await sendMutex.acquire();
    try {
        return SEND[id];
    } finally {
        release();
    }
}

async function incMsgSuccessfulWritesQty(id) {
    const release = await sendMutex.acquire();
    try {
        SEND[id].successfulWritesQty++;
    } finally {
        release();
    }
}

async function incMsgFailedWritesQty(id) {
    const release = await sendMutex.acquire();
    try {
        SEND[id].failedWritesQty++;
    } finally {
        release();
    }
}


module.exports = {
    sendMsgToNodes
}