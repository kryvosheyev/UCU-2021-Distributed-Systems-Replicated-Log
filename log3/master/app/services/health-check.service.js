const {HEALTH_STATUSES} = require("../constants");
const _ = require("lodash");
const axios = require('axios');
const {HEALTH_CHECK} = require('../config');
const {SECONDARY_API_HEALTH_CHECK_URL} = require('../config');
const STATE_SERVICE = require('../services/state.service');
let AsyncLock = require('async-lock');

let lock = new AsyncLock();
// HEALTH_CHECK_LOCK

let NODES = [];

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

async function startHealthCheckMonitors(nodes) {
    await sleep(HEALTH_CHECK.start_interval);
    for(let i=0;i<nodes.length;i++){
        let node = {
            name: nodes[i].name,
            url: nodes[i].url,
            _stateIndex: HEALTH_CHECK.start_health_index,
            state: HEALTH_CHECK.HEALTH_SCHEME[HEALTH_CHECK.start_health_index]
        };
        NODES.push(node);
    }
    for(let i=0;i<nodes.length;i++){
        // start async process
        healthCheck(nodes[i].name, nodes[i].url );
    }
}

async function getHealthState(nodeName) {
    for(let i=0; i<NODES.length; i++){
        if(nodeName.valueOf()===NODES[i].name.valueOf()){
            return NODES[i].state;
        }
    }
}

async function getHealthStatesReport() {
    let states=[];
    await lock.acquire("HEALTH_CHECK_LOCK", function() {
        for(let i=0; i<NODES.length; i++){
            states.push(`${NODES[i].name}: ${NODES[i].state}`);
        }
        // console.log("HEALTH_CHECK_LOCK Done");
    }, function(err, ret) {
        // console.log("HEALTH_CHECK_LOCK release")
    }, {});
    return states;
}

async function setHealthState(nodeName, healthResponse){
    await lock.acquire("HEALTH_CHECK_LOCK", function() {
        for(let i=0; i<NODES.length; i++){
            if(nodeName.valueOf()===NODES[i].name.valueOf()){
                let newStateIndex = NODES[i]._stateIndex;
                if(healthResponse.valueOf()==='OK'){
                    newStateIndex--;
                    if(newStateIndex < 0) continue;
                }
                if(healthResponse.valueOf()==='BAD'){
                    newStateIndex++;
                    if(newStateIndex === HEALTH_CHECK.HEALTH_SCHEME.length) continue;
                }
                const direction = newStateIndex < NODES[i]._stateIndex ? "is improving":"is degrading";
                console.log(`${NODES[i].name} health ${direction}: was ${NODES[i].state}(${NODES[i]._stateIndex}), now ${HEALTH_CHECK.HEALTH_SCHEME[newStateIndex]}(${newStateIndex})`);
                NODES[i]._stateIndex = newStateIndex;
                NODES[i].state = HEALTH_CHECK.HEALTH_SCHEME[NODES[i]._stateIndex];
                STATE_SERVICE.secondaryHealthHasChanged(NODES);
            }
        }
        // console.log("HEALTH_CHECK_LOCK Done");
    }, function(err, ret) {
        // console.log("HEALTH_CHECK_LOCK release")
    }, {});
}

async function healthCheck(nodeName, nodeUrl) {
    while (true) {
        let result = await reqToNode(nodeUrl, HEALTH_CHECK.timeout);
        await setHealthState(nodeName, result.HEALTH_STATUS);
        let intervalAfterReq = HEALTH_CHECK.interval + Math.round(Math.random() * HEALTH_CHECK.interval_jitter);
        await sleep(intervalAfterReq);
    }

    async function reqToNode(url, timeout) {
        try{
            let response = await axios({
                method: 'get',
                url: SECONDARY_API_HEALTH_CHECK_URL,
                baseURL: url,
                timeout: timeout,
                data: {}
            });
            if (response.data && response.data.HEALTH_STATUS === 'OK')     {
                return {HEALTH_STATUS:'OK'};
            } else {
                return {HEALTH_STATUS:'BAD'};
            }
        } catch (err){
            return {HEALTH_STATUS:'BAD'}
        }
    }
}

module.exports = {
    startHealthCheckMonitors,
    getHealthState,
    getHealthStatesReport
}