const fs = require("fs");
const fsPromises = fs.promises;
const moment = require('moment');
const config = require('../config');
const _ = require("lodash");
const {HEALTH_STATUSES} = require("../constants");
let AsyncLock = require('async-lock');

let lock = new AsyncLock();

//  STATE_LOCK
let STATE = {
    secondaries_with_health_data:[],
    
    // available = HEALTHY + SUSPECTED
    availableSecondaries:[],
    unhealthySecondaries:[],
    hasQuorum: false, // init by default

    retry_params:[],
};

async function getState(){
    let state = undefined;
    await lock.acquire("STATE_LOCK", function() {
        state = {...STATE};
        // console.log("STATE_LOCK Done");
    }, function(err, ret) {
        // console.log("STATE_LOCK release")
    }, {});
    return state;
}

function getUnhealthySecondaries(secondaries_with_health_data){
    let nodes = [];
    for(let i=0; i<secondaries_with_health_data.length; i++){
        s=secondaries_with_health_data[i];
        if(s.state.valueOf() === HEALTH_STATUSES.UNHEALTHY){
            nodes.push(s);
        }
    }
    return nodes;
}
function getAvailableSecondaries(secondaries_with_health_data){
    let nodes = [];
    for(let i=0; i<secondaries_with_health_data.length; i++){
        s=secondaries_with_health_data[i];
        if(s.state.valueOf() === HEALTH_STATUSES.HEALTHY || s.state.valueOf() === HEALTH_STATUSES.SUSPECTED){
            nodes.push(s);
        }
    }
    return nodes;
}

async function secondaryHealthHasChanged(nodes) {
    await lock.acquire("STATE_LOCK", function() {
        let state = {...STATE};
        state.secondaries_with_health_data = {...nodes};
        state.availableSecondaries = getAvailableSecondaries(nodes);
        state.unhealthySecondaries = getUnhealthySecondaries(nodes);

        // const secondariesAvailableQty = _.countBy(nodes, o => (o.state.valueOf() === HEALTH_STATUSES.HEALTHY)
        //     || (o.state.valueOf() === HEALTH_STATUSES.SUSPECTED)).true;
        if(state.availableSecondaries.length !== STATE.availableSecondaries.length){
            console.log(`secondariesAvailableQty (HEALTHY+SUSPECTED) was ${STATE.availableSecondaries.length}, now ${state.availableSecondaries.length}`);
        }
        state.hasQuorum = ((state.availableSecondaries.length+1) > Math.floor(nodes.length/2));
        if(state.hasQuorum !== STATE.hasQuorum){
            console.log(`hasQuorum was ${!state.hasQuorum}, now ${state.hasQuorum}`);
        }
        STATE = {...state};
        // console.log("STATE_LOCK Done");
    }, function(err, ret) {
        // console.log("STATE_LOCK release")
    }, {});
};

async function secondaryRetryParamsHaveChanged(nodes) {
    await lock.acquire("STATE_LOCK", function() {
        STATE.retry_params = {...nodes};
        // console.log("STATE_LOCK Done");
    }, function(err, ret) {
        // console.log("STATE_LOCK release")
    }, {});
};

async function isNodeAvailableByNodeName(nodeName) {
    let isAvailable=false;
    await lock.acquire("STATE_LOCK", function() {
        for(let i=0; i<STATE.availableSecondaries.length; i++){
            if(nodeName.valueOf()===STATE.availableSecondaries[i].name.valueOf()){
                isAvailable = true;
            }
        }
        // console.log("STATE_LOCK Done");
    }, function(err, ret) {
        // console.log("STATE_LOCK release")
    }, {});
    return isAvailable;
};

async function getHealthByNodeName(nodeName) {
    let node=undefined;
    await lock.acquire("STATE_LOCK", function() {
        for(let i=0; i<STATE.secondaries_with_health_data.length; i++){
            if(nodeName.valueOf()===STATE.secondaries_with_health_data[i].name.valueOf()){
                node = {...STATE.secondaries_with_health_data[i]};
            }
        }
        // console.log("STATE_LOCK Done");
    }, function(err, ret) {
        // console.log("STATE_LOCK release")
    }, {});
    return node;
};

async function getRetryParamsByNodeName(nodeName) {
    let retry_params=undefined;
    await lock.acquire("STATE_LOCK", function() {
        for(let i=0; i<STATE.retry_params.length; i++){
            if(nodeName.valueOf()===STATE.retry_params[i].name.valueOf()){
                retry_params = {...STATE.retry_params[i]};
            }
        }
        // console.log("STATE_LOCK Done");
    }, function(err, ret) {
        // console.log("STATE_LOCK release")
    }, {});
    return retry_params;
};

// async function saveState(state) {
//     await fsPromises.writeFile(config.CURRENT_STATE_PATH, state, 'utf8');
//     return 1;
// };
//
// async function readState() {
//     const r = await fsPromises.readFile(config.CURRENT_STATE_PATH, 'utf8');
//     return r;
// };

module.exports = {
    // saveState,
    // readState,
    getState,
    getHealthByNodeName,
    isNodeAvailableByNodeName,
    getRetryParamsByNodeName,
    secondaryHealthHasChanged,
    secondaryRetryParamsHaveChanged
}