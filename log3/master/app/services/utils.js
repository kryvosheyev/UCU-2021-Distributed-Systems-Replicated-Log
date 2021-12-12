const fs = require("fs");
const crypto = require('crypto');
const axios = require('axios');
let CRC32 = require('crc-32');
const moment = require('moment');
const _ = require("lodash");
const config = require('../config');
const {SECONDARY_API_ADD_MESSAGE_URL} = require('../config');

async function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

async function sleepWhileUpdateInProgress() {
    return new Promise(async (resolve, reject) => {
        let updateInProgressTimeout = Math.round(Math.random() * 10)+1;
        console.log(`Creating fake delay of ${updateInProgressTimeout} seconds...`);
        for (let i = 0; i < updateInProgressTimeout; i++) {
            console.log(`UPDATE IS IN PROGRESS, ${i + 1} seconds passed`);
            await sleep(1000);
            continue;
        }
        resolve();
    })
}

function isEmpty(obj){
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function sendResponse(res, status, body){
    if(!res.headersSent) {
        console.log("sending response to client=", body);
        res.status(status).send(body);
    } else {
        //console.log("headersSent already for status=", status, " body=", body);
    }
}

async function  sendPostHTTP(baseUrl, url, body) {
    return new Promise(async (resolve, reject) => {
        console.log(`Start sendPostHTTP to url=${baseUrl+url}`);
        try {
            let response = await axios({
                method: 'post',
                url: url,
                baseURL: baseUrl,
                data: body
            });
            resolve(response);
        }
        catch (err) {
            reject(err);
        }
    })
};

async function reqToNodeSendMsg(node, url, data, timeout) {
    return new Promise(async (resolve, reject) => {
        try {
            // console.log("url=", url, " ")
            let response = await axios({
                method: 'post',
                url: SECONDARY_API_ADD_MESSAGE_URL,
                baseURL: url,
                timeout: timeout,
                data: {data: _.concat([], data)}
            });
            // REQ_ACK, returned { added:[]} with array of ids like [3,4]
            // console.log("response.data=",response.data);
            if (response.data && response.data.added && response.data.added.length) {
                resolve({node:node, added:response.data.added});
            } else {
                resolve({node:node, added:[]});
            }
        } catch (err) {
            // console.log(`reqToNodeSendMsg failed to send msg to node=${node.name}`);
            resolve({node:node, added:[]})
        }
    })
}

module.exports = {
    sleepWhileUpdateInProgress,
    isEmpty,
    sendPostHTTP,
    reqToNodeSendMsg,
    sendResponse,
    sleep
}