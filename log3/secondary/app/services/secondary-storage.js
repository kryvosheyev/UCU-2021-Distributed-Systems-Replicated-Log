const _ = require("lodash");
var Mutex = require('async-mutex').Mutex;
const mutexStream = new Mutex();
const mutexDeduplicated = new Mutex();
const mutexReady = new Mutex();

// first, messages go to STREAM_BUFFER
let STREAM_BUFFER = [];

// then, to DEDUPLICATED_BUFFER
let DEDUPLICATED_BUFFER = [];

// finally, to READY. It keeps correct data
let READY = [];

async function  pushToStreamBuffer(srcArr) {
    const releaseStream = await mutexStream.acquire();
    try {
        let arr = _.concat([], srcArr);
        for (let i = 0; i < arr.length; i++) {
            let foundInStreamBuffer = _.find(STREAM_BUFFER, e => {
                if (e._id_curr === arr[i]._id_curr) {
                    return e;
                }
            });
            if (foundInStreamBuffer) {
                console.log(`skipping duplicate msg with id = ${arr[i]._id_curr}`);
                arr.splice(i, 1);
                i--;
            } else {
                STREAM_BUFFER.push(arr[i]);
                console.log(`added msg with id=${arr[i]._id_curr} to STREAM_BUFFER`);
            }
        }
    } finally {
        releaseStream();
    }
};

async function  moveFromStreamBufferToDeduplicatedBuffer(){
    const releaseStream = await mutexStream.acquire();
    const releaseDeduplicated = await mutexDeduplicated.acquire();
    try {
        for (let i = 0; i < STREAM_BUFFER.length; i++) {
            let foundInDeduplicatedBuffer = _.find(DEDUPLICATED_BUFFER, e => {
                if (e._id_curr === STREAM_BUFFER[i]._id_curr ) {
                    return e;
                }
            });

            // if new_id < last_id, then msg is already in READY
            if ( foundInDeduplicatedBuffer
                || STREAM_BUFFER[i]._id_curr <= READY[READY.length-1]?._id_curr) {
                console.log(`skipping duplicate msg with id = ${STREAM_BUFFER[i]._id_curr}`);
            } else {
                DEDUPLICATED_BUFFER.push(STREAM_BUFFER[i]);
                console.log(`added msg with id=${STREAM_BUFFER[i]._id_curr} to DEDUPLICATED_BUFFER`);
            }
        }
        STREAM_BUFFER = [];
    } finally {
        releaseDeduplicated();
        releaseStream();
    }
};

async function moveFromDeduplicatedBufferToReady() {
    const releaseDeduplicated = await mutexDeduplicated.acquire();
    const releaseReady = await mutexReady.acquire();
    try {
        DEDUPLICATED_BUFFER = _.sortBy(DEDUPLICATED_BUFFER, ['_id_curr']);
        for (let i = 0; i < DEDUPLICATED_BUFFER.length; i++) {
            let foundInReady = _.find(READY, e => {
                if (e._id_curr === DEDUPLICATED_BUFFER[i]._id_curr ) {
                    return e;
                }
            });
            if (foundInReady) {
                DEDUPLICATED_BUFFER.splice(i, 1);
                i--;
                continue;
            }
            if( (DEDUPLICATED_BUFFER[i]._id_is_first && !READY.length)
                || ( DEDUPLICATED_BUFFER[i]._id_curr === (READY[READY.length-1]?._id_curr+1) && READY.length) ) {
                READY.push(DEDUPLICATED_BUFFER[i]);
                console.log(`added msg with id=${DEDUPLICATED_BUFFER[i]._id_curr} to READY`);
                DEDUPLICATED_BUFFER.splice(i, 1);
                i--;
            }
        }
    } finally {
        releaseReady();
        releaseDeduplicated();
    }
};

async function addMsg(arr) {
    let added = [];
    await pushToStreamBuffer(arr);
    console.log(` S(${STREAM_BUFFER.length}), DD(${DEDUPLICATED_BUFFER.length}), R(${READY.length})`);

    await moveFromStreamBufferToDeduplicatedBuffer();
    console.log(` S(${STREAM_BUFFER.length}), DD(${DEDUPLICATED_BUFFER.length}), R(${READY.length})`);

    await moveFromDeduplicatedBufferToReady();
    console.log(` S(${STREAM_BUFFER.length}), DD(${DEDUPLICATED_BUFFER.length}), R(${READY.length})`);

    added = _.map(_.uniqBy(arr, '_id_curr'), '_id_curr');
    console.log("added=",added);
    return added;
}

// async function addMsg(arr) {
//     let added = [];
//     await lock.acquire(`STORAGE_LOCK`, async function() {
//             await pushToStreamBuffer(arr);
//             console.log(`S(${STREAM_BUFFER.length}), DD(${DEDUPLICATED_BUFFER.length}), R(${READY.length})`);
//
//             await moveFromStreamBufferToDeduplicatedBuffer();
//             console.log(`S(${STREAM_BUFFER.length}), DD(${DEDUPLICATED_BUFFER.length}), R(${READY.length})`);
//
//             await moveFromDeduplicatedBufferToReady();
//             console.log(`S(${STREAM_BUFFER.length}), DD(${DEDUPLICATED_BUFFER.length}), R(${READY.length})`);
//
//             // TODO WTF ?  Async-lock BUG !
//             console.log("inside lock");

//             // not working, if put here
//             // added = await _.map(_.uniqBy(arr, '_id_curr'), '_id_curr');
//             // console.log("Done");
//         }, function (err, ret) {
//             // console.log("release")
//         }, {}
//     );
//     console.log("after lock");
//     added = _.map(_.uniqBy(arr, '_id_curr'), '_id_curr');
//     console.log("added=",added);
//     return added;
// }
// output:  "after lock",   then  "inside lock"

async function getAllMsg() {
    const release = await mutexReady.acquire();
    try {
        return _.map(READY, 'msg');
    } finally {
        release();
    }
}

async function clearDb() {
    const releaseStream = await mutexStream.acquire();
    const releaseDeduplicated = await mutexDeduplicated.acquire();
    const releaseReady = await mutexReady.acquire();
    try {
        STREAM_BUFFER = [];
        DEDUPLICATED_BUFFER = [];
        READY = [];
        console.log(`cleared db`);
    } finally {
        releaseReady();
        releaseDeduplicated();
        releaseStream();
    }
}

module.exports = {
    addMsg,
    getAllMsg,
    clearDb
}