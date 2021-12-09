const fs = require("fs");
const fsPromises = fs.promises;
const moment = require('moment');
const config = require('../config');
const _ = require("lodash");
const {HEALTH_STATUSES, RESPONSE_MESSAGES} = require("../constants");
const UTILS = require('../services/utils');
const STATE_SERVICE = require('../services/state.service');
const STORAGE_SERVICE = require('../services/master-storage.service');
const SEND_SERVICE = require('../services/send.service');

async function processMessage(msg, W, res) {
    console.log("processMessage...");
    let state = await STATE_SERVICE.getState();
    if(config.isQuorumRequired && !state.hasQuorum){
        res.status(200).send(RESPONSE_MESSAGES.NO_QUORUM);
        return;
    }
    let rLogMsg = await STORAGE_SERVICE.saveMsgAndGetRLogMsg(msg);
    // console.log("saveMsgAndGetRLogMsg.rLogMsg=",rLogMsg);
    let N = 1 + state.secondaries_with_health_data.length;
    await SEND_SERVICE.sendMsgToNodes(rLogMsg, state, N, W, 1, 0, res);
}

module.exports = {
    processMessage
}