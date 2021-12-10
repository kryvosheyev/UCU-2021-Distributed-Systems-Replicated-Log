const _ = require("lodash");
const {HEALTH_STATUSES} = require("../constants");
var Mutex = require('async-mutex').Mutex;
const stateMutex = new Mutex();

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
    const release = await stateMutex.acquire();
    try {
        return {...STATE};
    } finally {
        release();
    }
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
    const release = await stateMutex.acquire();
    try {
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
    } finally {
        release();
    }
};

async function secondaryRetryParamsHaveChanged(nodes) {
    const release = await stateMutex.acquire();
    try {
        STATE.retry_params = {...nodes};
    } finally {
        release();
    }
};

async function isNodeAvailableByNodeName(nodeName) {
    const release = await stateMutex.acquire();
    try {
        let isAvailable=false;
        for(let i=0; i<STATE.availableSecondaries.length; i++){
            if(nodeName.valueOf()===STATE.availableSecondaries[i].name.valueOf()){
                isAvailable = true;
            }
        }
        return isAvailable;
    } finally {
        release();
    }
};

async function getHealthByNodeName(nodeName) {
    const release = await stateMutex.acquire();
    try {
        let node=undefined;
        for(let i=0; i<STATE.secondaries_with_health_data.length; i++){
            if(nodeName.valueOf()===STATE.secondaries_with_health_data[i].name.valueOf()){
                node = {...STATE.secondaries_with_health_data[i]};
            }
        }
        return node;
    } finally {
        release();
    }
};

async function getRetryParamsByNodeName(nodeName) {
    const release = await stateMutex.acquire();
    try {
        let retry_params=undefined;
        for(let i=0; i<STATE.retry_params.length; i++){
            if(nodeName.valueOf()===STATE.retry_params[i].name.valueOf()){
                retry_params = {...STATE.retry_params[i]};
            }
        }
        return retry_params;
    } finally {
        release();
    }
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