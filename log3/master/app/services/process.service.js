const fs = require("fs");
const config = require('../config');
const _ = require("lodash");
const STATE_SERVICE = require('../services/state.service');
const STORAGE_SERVICE = require('../services/master-storage.service');
const SEND_SERVICE = require('../services/send.service');

async function processMessage(msg, W, res) {
    console.log("processMessage...");
    let state = await STATE_SERVICE.getState();
    if(config.isQuorumRequired && !state.hasQuorum){
        res.status(400).send(RESPONSE_MESSAGES.NO_QUORUM);
        return;
    }
    let rLogMsg = await STORAGE_SERVICE.saveMsgAndGetRLogMsg(msg);
    // console.log("saveMsgAndGetRLogMsg.rLogMsg=",rLogMsg);
    let N = 1 + config.secondaries.length;
    await SEND_SERVICE.sendMsgToNodes(rLogMsg, N, W, 1, 0, res);
}

module.exports = {
    processMessage
}