const fs = require("fs");
const config = require('../config');
const _ = require("lodash");
const UTILS = require('../services/utils');
const STATE_SERVICE = require('../services/state.service');
const BATCH_RETRY_PARAMS_SERVICE = require('../services/batch-retry-params.service');
var Mutex = require('async-mutex').Mutex;
let mutexOUT_LOCK = new Mutex();
let mutexes = {};

// OUT_LOCK
let OUT = {};

async function hasMessagesInBatchRetry(nodeName) {
    const release = await mutexes[nodeName].acquire();
    try {
        return (OUT[nodeName].length > 0);
    } finally {
        release();
    }
}

async function startRetryMonitors() {
    let nodes = [...config.secondaries];
    for(let i=0;i<nodes.length;i++){
        OUT[nodes[i].name]= [];
        mutexes[nodes[i].name]= new Mutex();
        retryMonitor(nodes[i])
    }
}

async function retryMonitor(node) {
    let nodeName = node.name;
    while(true) {
        let hasMessages = await hasMessagesInBatchRetry(nodeName);
        if (!hasMessages) {
            await UTILS.sleep(config.BATCH_RETRY.empty_buffer_check_interval);
            continue;
        }

        const isAvailable = await STATE_SERVICE.isNodeAvailableByNodeName(nodeName);
        if (!isAvailable) {
            // console.log(`BATCH retryMonitor has messages for ${nodeName}, but node is unavailable`);
            await UTILS.sleep(config.BATCH_RETRY.sleep_interval_if_not_available);
            continue;
        }

        // if we are here, then health is OK && buffer has messages for this node.
        let retry_params = await BATCH_RETRY_PARAMS_SERVICE.getRetryParams(nodeName);
        let intervalAfterRetry = retry_params.interval + Math.round(Math.random() * config.BATCH_RETRY.interval_jitter);
        await UTILS.sleep(intervalAfterRetry);

        // console.log(`nodeName ${nodeName}, retry_params.messages_qty = ${retry_params.messages_qty}`);
        let messages = await getNMessagesFromBatchRetry(nodeName, retry_params.messages_qty);
        messageIds = _.map(_.uniqBy(messages, '_id_curr'), '_id_curr');
        console.log(`BATCH RETRY is sending to nodeName(${nodeName}) messages with ids[${messageIds}]`);
        let response = await UTILS.reqToNodeSendMsg(node, node.url, messages, config.BATCH_RETRY.timeout);
        if(response.added && response.added.length) {
            console.log(`BATCH RETRY successfully delivered ${response.added.length} msg to node=${node.name}`);
            await BATCH_RETRY_PARAMS_SERVICE.setRetryState(nodeName, 'OK');
            await deleteMessagesFromBatchRetry(nodeName, response.added);
        } else {
            await BATCH_RETRY_PARAMS_SERVICE.setRetryState(nodeName, 'BAD');
        }
    }
}

async function getNMessagesFromBatchRetry(nodeName, n) {
    const release = await mutexes[nodeName].acquire();
    try {
        return (OUT[nodeName].length) ? OUT[nodeName].slice(0,n) : [];
    } finally {
        release();
    }
}

async function deleteMessagesFromBatchRetry(nodeName, ids) {
    const release = await mutexes[nodeName].acquire();
    try {
        for (let i = 0; i < OUT[nodeName].length; i++) {
            if (ids.includes(OUT[nodeName][i]._id_curr)) {
                OUT[nodeName].splice(i, 1);
                i--;
            }
        }
    } finally {
        release();
    }
}

async function addMsgToBatchRetry(rLogMsg, nodes) {
    nodes = _.concat([], nodes);
    let nodeNames = _.map(_.uniqBy(nodes, 'name'), 'name');
    console.log(`addMsgToBatchRetry: add msg(#${rLogMsg._id_curr} to nodes[${nodeNames}])`);

    // put to OUT
    const release = await mutexOUT_LOCK.acquire();
    try {
        for(let i=0; i<nodeNames.length; i++){
            OUT[nodeNames[i]].push(rLogMsg)
        }
    } finally {
        release();
    }
}

module.exports = {
    startRetryMonitors,
    addMsgToBatchRetry,
}