const _ = require("lodash");
const {RETRY_QUEUE} = require('../config');
const STATE_SERVICE = require('../services/state.service');
var Mutex = require('async-mutex').Mutex;
const mutex = new Mutex();

// RETRY_BACK_OFF_RECOVERY_CHECK_LOCK
let NODES = [];

async function initBackOffRecovery(nodes) {
    for(let i=0;i<nodes.length;i++){
        let node = {
            name: nodes[i].name,
            url: nodes[i].url,
            _stateIndex: RETRY_QUEUE.start_retry_index,
            interval: RETRY_QUEUE.INTERVALS[RETRY_QUEUE.start_retry_index],
            messages_qty: RETRY_QUEUE.MESSAGES_QTY[RETRY_QUEUE.start_retry_index]
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
    const release = await mutex.acquire();
    try {
        for(let i=0; i<NODES.length; i++){
            if(nodeName.valueOf()===NODES[i].name.valueOf()){
                let newStateIndex = NODES[i]._stateIndex;
                if(retryResponse.valueOf()==='OK'){
                    newStateIndex--;
                    if(newStateIndex < 0) continue;
                }
                if(retryResponse.valueOf()==='BAD'){
                    newStateIndex++;
                    if(newStateIndex === RETRY_QUEUE.INTERVALS.length) continue;
                }
                const direction = newStateIndex < NODES[i]._stateIndex ? "is recovering":"is backing-off";
                console.log(`${NODES[i].name} retry ${direction}:`
                    +`was state_idx=${NODES[i]._stateIndex} interval=${NODES[i].interval}, messages_qty=${NODES[i].messages_qty},`+
                    ` now state_idx=${newStateIndex} interval=${RETRY_QUEUE.INTERVALS[newStateIndex]}, messages_qty=${RETRY_QUEUE.MESSAGES_QTY[newStateIndex]}`);
                NODES[i]._stateIndex = newStateIndex;
                NODES[i].interval = RETRY_QUEUE.INTERVALS[newStateIndex];
                NODES[i].messages_qty = RETRY_QUEUE.MESSAGES_QTY[newStateIndex];

                // propagate changes
                STATE_SERVICE.secondaryRetryParamsHaveChanged(NODES);
            }
        }
    } finally {
        release();
    }
}


module.exports = {
    initBackOffRecovery,
    getRetryParams,
    setRetryState
}