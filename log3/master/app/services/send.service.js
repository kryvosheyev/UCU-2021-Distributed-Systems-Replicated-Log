const fs = require("fs");
const fsPromises = fs.promises;
const moment = require('moment');
const config = require('../config');
const _ = require("lodash");
const {HEALTH_STATUSES, RESPONSE_MESSAGES} = require("../constants");
const UTILS = require('../services/utils');
const STATE_SERVICE = require('../services/state.service');
const RETRY_SERVICE = require('../services/retry.service');
const {SECONDARY_API_ADD_MESSAGE_URL} = require('../config');
let AsyncLock = require('async-lock');

let lock = new AsyncLock();

async function sendMsgToNodes(rLogMsg, state, N, W, successfulWritesQty, failedWritesQty, res) {
    if(state.unhealthySecondaries.length){
        RETRY_SERVICE.addMsgToRetryQueue(rLogMsg, state.unhealthySecondaries);
        failedWritesQty += state.unhealthySecondaries.length;
    }
    if(W<=successfulWritesQty){
        UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.OK)
    }
    if(W > (successfulWritesQty + state.availableSecondaries.length - failedWritesQty)) {
        UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.WRITE_CONCERN_NOT_ACHIEVED);
    }
    for(let i=0;i<state.availableSecondaries.length;i++){
        // console.log(`state.availableSecondaries[${i}]...`);
        node = {...state.availableSecondaries[i]};
        UTILS.reqToNodeSendMsg(node, state.availableSecondaries[i].url, rLogMsg, config.msg_timeout)
            .then(function (response) {
                lock.acquire(`sendMsgToNodes(_curr_id=${rLogMsg._id_curr})`, function() {
                    console.log(`SEND: node(${response.node.name}) ACK_ED msg(#${rLogMsg._id_curr})`);

                    if(response.added && response.added.length===1 && response.added[0] === rLogMsg._id_curr){
                        successfulWritesQty++;
                    } else {
                        failedWritesQty++;
                        RETRY_SERVICE.addMsgToRetryQueue(rLogMsg, response.node);
                    }
                    if(W<=successfulWritesQty){
                        UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.OK)
                    }
                    // N=3, W=2, successfulWritesQty=1, failedWritesQty=0  = nothing
                    // N=3, W=2, successfulWritesQty=1, failedWritesQty=1  = nothing
                    // N=3, W=2, successfulWritesQty=1, failedWritesQty=2  = fail
                    // N=3, W=2, successfulWritesQty=0, failedWritesQty=2  = fail
                    if(W > N-failedWritesQty) {
                        UTILS.sendResponse(res, 200, RESPONSE_MESSAGES.WRITE_CONCERN_NOT_ACHIEVED);
                    }
                    // console.log("sendMsgToNodes_curr_id${rLogMsg._curr_id} lock Done");
                }, function(err, ret) {
                    // console.log("sendMsgToNodes_curr_id${rLogMsg._curr_id} release")
                }, {});
            })
    }
}

module.exports = {
    sendMsgToNodes
}