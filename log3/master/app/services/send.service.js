const config = require('../config');
const _ = require("lodash");
const {RESPONSE_MESSAGES} = require("../constants");
const UTILS = require('../services/utils');
const HEALTH_CHECK_SERVICE = require('../services/health-check.service');
const STATE_SERVICE = require('../services/state.service');
const BATCH_RETRY_SERVICE = require('../services/batch-retry.service');
const {HEALTH_STATUSES} = require("../constants");
const {RETRY} = require('../config');

var Mutex = require('async-mutex').Mutex;

let pauseIfNodeIsUnhealthyMutexes = {};

const nodesStatesMutex = new Mutex;
let nodesStates = {};
/*
  {
    "s1": {  state: "IS_PAUSED" // "IS_IDLE",  release: release() }
  }
 */
const NODE_IS_IDLE = "NODE_IS_IDLE", NODE_IS_PAUSED = "NODE_IS_PAUSED";

const msgStateMutex = new Mutex();
SEND = [];

// let example = {
//     "1": {"W": 2, successfulWritesQty: 1 },
//     "2": {"W": 2, successfulWritesQty: 1 }
// };

async function initNodeMutexes() {
    let nodes = [...config.secondaries];
    for(let i=0;i<nodes.length;i++){
        node = nodes[i];
        if(!pauseIfNodeIsUnhealthyMutexes[node.name]) {
            pauseIfNodeIsUnhealthyMutexes[node.name] = new Mutex();
        }
        if(!nodesStates[node.name]){
            nodesStates[node.name] = { state: NODE_IS_IDLE }
        }
         /*
          {
            "s1": {  state: "IS_PAUSED" // "IS_IDLE",  release: release() }
          }
         */
    }
}


async function sendMsgToNodes(rLogMsg, N, W, successfulWritesQty , res) {
    await addMsgState(rLogMsg, W, successfulWritesQty, 0);
    let nodes = [...config.secondaries];
    for(let i=0;i<nodes.length;i++){
        node = nodes[i];
        proceedUntilSucceedWhileAvailable(node, rLogMsg, N, res);
    }
}


async function proceedUntilSucceedWhileAvailable(node, rLogMsg, N, res) {
    let retriesQty = 0;
    let need_retrying = true;

    // if W is satisfied, then it means that sending to other node succeeded.
    // If the node is unhealthy, forward this message to batch retry where it will be delivered in batches.
    let msgState = await getMsgState(rLogMsg._id_curr);
    let nodeHealthState = await STATE_SERVICE.getHealthByNodeName(node.name);
    console.log(`${node.name} nodeHealthState=${nodeHealthState}`);
    if (msgState.W <= msgState.successfulWritesQty && nodeHealthState.valueOf() === HEALTH_STATUSES.UNHEALTHY.valueOf()) {
        BATCH_RETRY_SERVICE.addMsgToBatchRetry(rLogMsg, node);
        need_retrying = false;
    }

    while(need_retrying) {
        const release = await pauseIfNodeIsUnhealthyMutexes[node.name].acquire();
        try {
        } finally {
            release();
        }

        console.log(`proceedUntilSucceedWhileAvailable will try to deliver msg.id[${rLogMsg._id_curr}] to ${node.name}`);
        let response = await UTILS.reqToNodeSendMsg(node, node.url, rLogMsg, RETRY.timeout);
        if (response.added && response.added.length === 1 && response.added[0] === rLogMsg._id_curr) {
            let msgState = await incMsgSuccessfulWritesQty(rLogMsg._id_curr);
            if (msgState.W <= msgState.successfulWritesQty) {
                UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.OK)
                console.log(`proceedUntilSucceedWhileAvailable delivered msg.id[${rLogMsg._id_curr}] to ${node.name}`);
            }
            need_retrying = false;
        } else {
            console.log(`proceedUntilSucceedWhileAvailable failed to deliver msg.id[${rLogMsg._id_curr}] to ${node.name}, will try again`);
            // if W is satisfied, then it means that sending to other node succeeded.
            // So, there is no need for urgent retry
            // In this case, forward this message to batch retry where it will be delivered in batches.
            let msgState = await getMsgState(rLogMsg._id_curr);
            if (msgState.W <= msgState.successfulWritesQty) {
                BATCH_RETRY_SERVICE.addMsgToBatchRetry(rLogMsg, node);
                need_retrying = false;
            } else {
                // sleep before next retry, with probably different time interval
                let interval_idx = (retriesQty < RETRY.INTERVALS.length) ? retriesQty : RETRY.INTERVALS.length-1;
                let intervalAfterReq = RETRY.INTERVALS[interval_idx] + Math.round(Math.random() * RETRY.interval_jitter);
                await UTILS.sleep(intervalAfterReq);
                retriesQty++;
            }
        }
    }
}

async function addMsgState(rLogMsg, W, successfulWritesQty ) {
    const release = await msgStateMutex.acquire();
    try {
        SEND[rLogMsg._id_curr] = {W, successfulWritesQty };
        //     "1": {"W": 2, successfulWritesQty: 1 },
    } finally {
        release();
    }
}

async function getMsgState(id) {
    const release = await msgStateMutex.acquire();
    try {
        return SEND[id];
    } finally {
        release();
    }
}

async function incMsgSuccessfulWritesQty(id) {
    const release = await msgStateMutex.acquire();
    try {
        SEND[id].successfulWritesQty++;
        return SEND[id];
    } finally {
        release();
    }
}

async function pauseSend(nodeName){
    /*
    if(!isPaused) {
        pause()
    }
    */
    // console.log(`in pauseSend: before nodesStatesMutex.acquire()`);
    const releaseNodesStates = await nodesStatesMutex.acquire();
    try {
        // console.log(`in pauseSend: nodesStates[nodeName].state=${nodesStates[nodeName].state}`);
        if(nodesStates[nodeName].state.valueOf() === NODE_IS_IDLE){
            // console.log(`in pauseSend: before pauseIfNodeIsUnhealthyMutexes[${nodeName}].acquire`);
            const release = await pauseIfNodeIsUnhealthyMutexes[nodeName].acquire();
            console.log(`in pauseSend: sending to ${nodeName} is paused`);
            nodesStates[nodeName].release = release;
            nodesStates[nodeName].state = NODE_IS_PAUSED;
        }
    } finally {
        releaseNodesStates();
    }
}

async function resumeSend(nodeName){
    /*
    if(isPaused) {
        resume()
    }
    */
    const releaseNodesStates = await nodesStatesMutex.acquire();
    try {
        if(nodesStates[nodeName].state.valueOf() === NODE_IS_PAUSED){
            const release = nodesStates[nodeName].release;
            release();
            nodesStates[nodeName].state = NODE_IS_IDLE;
            console.log(`in resumeSend: sending to ${nodeName} is enabled`);
        }
    } finally {
        releaseNodesStates();
    }
}

module.exports = {
    initNodeMutexes,
    sendMsgToNodes,
    pauseSend,
    resumeSend
}