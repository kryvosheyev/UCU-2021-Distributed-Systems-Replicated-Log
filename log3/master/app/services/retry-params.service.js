const {HEALTH_STATUSES} = require("../constants");
const _ = require("lodash");
const axios = require('axios');
const {HEALTH_CHECK} = require('../config');
const {RETRY} = require('../config');
const {SECONDARY_API_HEALTH_CHECK_URL} = require('../config');
const STATE_SERVICE = require('../services/state.service');
let AsyncLock = require('async-lock');

let lock = new AsyncLock();

// RETRY_BACK_OFF_RECOVERY_CHECK_LOCK
let NODES = [];

async function initBackOffRecovery(nodes) {
    for(let i=0;i<nodes.length;i++){
        let node = {
            name: nodes[i].name,
            url: nodes[i].url,
            _stateIndex: RETRY.start_retry_index,
            interval: RETRY.INTERVALS[RETRY.start_retry_index],
            messages_qty: RETRY.MESSAGES_QTY[RETRY.start_retry_index]
        };
        NODES.push(node);
    }
}

async function getRetryParams(nodeName) {
    for(let i=0; i<NODES.length; i++){
        if(nodeName.valueOf()===NODES[i].name.valueOf()){
            return {
                interval: NODES[i].interval,
                messages_qty: NODES[i].messages_qty
            };
        }
    }
}

async function setRetryState(nodeName, retryResponse){
    await lock.acquire("RETRY_BACK_OFF_RECOVERY_CHECK_LOCK", function() {
        for(let i=0; i<NODES.length; i++){
            if(nodeName.valueOf()===NODES[i].name.valueOf()){
                let newStateIndex = NODES[i]._stateIndex;
                if(retryResponse.valueOf()==='OK'){
                    newStateIndex--;
                    if(newStateIndex < 0) continue;
                }
                if(retryResponse.valueOf()==='BAD'){
                    newStateIndex++;
                    if(newStateIndex === RETRY.INTERVALS.length) continue;
                }
                const direction = newStateIndex < NODES[i]._stateIndex ? "is recovering":"is backing-off";
                console.log(`${NODES[i].name} retry ${direction}:`
                    +`was state_idx=${NODES[i]._stateIndex} interval=${NODES[i].interval}, messages_qty=${NODES[i].messages_qty},`+
                    ` now state_idx=${newStateIndex} interval=${RETRY.INTERVALS[newStateIndex]}, messages_qty=${RETRY.MESSAGES_QTY[newStateIndex]}`);
                NODES[i]._stateIndex = newStateIndex;
                NODES[i].interval = RETRY.INTERVALS[newStateIndex];
                NODES[i].messages_qty = RETRY.MESSAGES_QTY[newStateIndex];

                // propagate changes
                STATE_SERVICE.secondaryRetryParamsHaveChanged(NODES);
            }
        }
        // console.log("HEALTH_CHECK_LOCK Done");
    }, function(err, ret) {
        // console.log("HEALTH_CHECK_LOCK release")
    }, {});
}


module.exports = {
    initBackOffRecovery,
    getRetryParams,
    setRetryState
}