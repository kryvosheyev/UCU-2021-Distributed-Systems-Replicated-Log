const fs = require("fs");
const fsPromises = fs.promises;
const moment = require('moment');
const config = require('../config');
const _ = require("lodash");
const {HEALTH_STATUSES, RESPONSE_MESSAGES} = require("../constants");
const UTILS = require('../services/utils');
const STATE_SERVICE = require('../services/state.service');
const RETRY_PARAMS_SERVICE = require('../services/retry-params.service');
let AsyncLock = require('async-lock');

let lock = new AsyncLock();

// OUT_LOCK
let OUT = {};

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

async function hasMessagesInRetryQueue(nodeName) {
    let hasMessages = false;
    await lock.acquire(`OUT_LOCK_${nodeName}`, function() {
        // console.log(`OUT[${nodeName}].length=${OUT[nodeName].length}`);
        hasMessages = (OUT[nodeName].length > 0);
        // console.log("Done");
    }, function(err, ret) {
        // console.log("release")
    }, {});
    return hasMessages;
}

async function startRetryMonitors(nodes) {
    for(let i=0;i<nodes.length;i++){
        OUT[nodes[i].name]= [];
        retryMonitor(nodes[i])
    }
}

async function retryMonitor(node) {
    let nodeName = node.name;
    while(true) {
        let hasMessages = await hasMessagesInRetryQueue(nodeName);
        if (!hasMessages) {
            await sleep(config.RETRY.empty_buffer_check_interval);
            continue;
        }

        const isAvailable = await STATE_SERVICE.isNodeAvailableByNodeName(nodeName);
        if (!isAvailable) {
            console.log(`retryMonitor has messages for ${nodeName}, but node is unavailable`);
            await sleep(config.RETRY.sleep_interval_if_not_available);
            continue;
        }

        // if we are here, then health is OK && buffer has messages for this node.
        let retry_params = await RETRY_PARAMS_SERVICE.getRetryParams(nodeName);
        let intervalAfterRetry = retry_params.interval + Math.round(Math.random() * config.RETRY.interval_jitter);
        await sleep(intervalAfterRetry);

        // console.log(`nodeName ${nodeName}, retry_params.messages_qty = ${retry_params.messages_qty}`);
        let messages = await getNMessagesFromRetryQueue(nodeName, retry_params.messages_qty);
        messageIds = _.map(_.uniqBy(messages, '_id_curr'), '_id_curr');
        console.log(`RETRY is sending to nodeName(${nodeName}) messages with ids[${messageIds}]`);
        let response = await UTILS.reqToNodeSendMsg(node, node.url, messages, config.RETRY.timeout);
        if(response.added && response.added.length) {
            await RETRY_PARAMS_SERVICE.setRetryState(nodeName, 'OK');
            await deleteMessagesFromRetryQueue(nodeName, response.added);
        } else {
            await RETRY_PARAMS_SERVICE.setRetryState(nodeName, 'BAD');
        }
    }
}

async function getNMessagesFromRetryQueue(nodeName, n) {
    let messages = [];
    await lock.acquire(`OUT_LOCK_${nodeName}`, function() {
        if(OUT[nodeName].length) {
            messages = OUT[nodeName].slice(0,n);
        } else {
            messages = [];
        }
        // console.log("Done");
    }, function(err, ret) {
        // console.log("release")
    }, {});
    return messages;
}

async function deleteMessagesFromRetryQueue(nodeName, ids) {
    await lock.acquire(`OUT_LOCK_${nodeName}`, function() {
        for (let i = 0; i < OUT[nodeName].length; i++) {
            if (ids.includes(OUT[nodeName][i]._id_curr)) {
                OUT[nodeName].splice(i, 1);
                i--;
            }
        }
        // console.log("Done");
    }, function(err, ret) {
        // console.log("release")
    }, {});
}

async function addMsgToRetryQueue(rLogMsg, nodes) {
    nodes = _.concat([], nodes);
    let nodeNames = _.map(_.uniqBy(nodes, 'name'), 'name');
    console.log(`addMsgToRetryQueue: add msg(#${rLogMsg._id_curr} to nodes[${nodeNames}])`);

    // put to OUT
    await lock.acquire("OUT_LOCK", function() {
        for(let i=0; i<nodeNames.length; i++){
            OUT[nodeNames[i]].push(rLogMsg)
        }
        // console.log("Done");
    }, function(err, ret) {
        // console.log("release")
    }, {});
}

module.exports = {
    startRetryMonitors,
    addMsgToRetryQueue,
}