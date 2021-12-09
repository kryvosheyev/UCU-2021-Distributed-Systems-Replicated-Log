var express = require('express');
const fs = require("fs");
const axios = require("axios");
const moment = require('moment');
var router = express.Router();
const asyncModule = require("async");
const config = require('../config');
const UTILS = require('../services/utils');
const STATE_SERVICE = require('../services/state.service');
const STORAGE_SERVICE = require('../services/master-storage.service');
const HEALTH_CHECK_SERVICE = require('../services/health-check.service');
let AsyncLock = require('async-lock');

router.get('/health', async (req, res, next) => {
    try {
        console.log("/health was invoked on master");
        let healthStatus = await HEALTH_CHECK_SERVICE.getHealthStatesReport();
        return res.status(200).send(healthStatus);
    }
    catch (err) {
        console.log("/health: Error - ", err);
        next(err);
    }
});

router.get('/test-variable', async (req, res, next) => {
    try {
        console.log("/test-variable was invoked on master");
        let STORAGE_LOCK = false;

        const sleep = (ms) => {
            return new Promise(resolve =>
                setTimeout(() => {
                    resolve();
                }, ms));
        };

        async function printLock(){
            while(true){
                await sleep(1000);
                let dt = moment(new Date).format("HH:mm:ss");
                console.log(dt, "STORAGE_LOCK=", STORAGE_LOCK);
                await invertLock();
            }
        }

        async function invertLock(){
            STORAGE_LOCK = !STORAGE_LOCK;
        }

        res.status(200).send({});
        await printLock();
    }
    catch (err) {
        console.log("/test-variable: Error - ", err);
        next(err);
    }
});


router.get('/async-lock', async (req, res, next) => {
    try {
        console.log("/test-variable was invoked on master");
        let lock = new AsyncLock();

        function operation1() {
            console.log("Execute operation1");
            lock.acquire("key1", function(done) {
                console.log("lock1 enter")
                setTimeout(function() {
                    console.log("lock1 Done")
                    done();
                }, 3000)
            }, function(err, ret) {
                console.log("lock1 release")
            }, {});
        }

        function operation2() {
            console.log("Execute operation2");
            lock.acquire("key1", function(done) {
                console.log("lock2 enter")
                setTimeout(function() {
                    console.log("lock2 Done")
                    done();
                }, 1000)
            }, function(err, ret) {
                console.log("lock2 release")
            }, {});
        }

        function operation3() {
            console.log("Execute operation3");
            lock.acquire("key1", function(done) {
                console.log("lock3 enter")
                setTimeout(function() {
                    console.log("lock3 Done")
                    done();
                }, 1)
            }, function(err, ret) {
                console.log("lock3 release")
            }, {});
        }

        operation1(); operation2(); operation3();

        res.status(200).send({});
    }
    catch (err) {
        console.log("/test-variable: Error - ", err);
        next(err);
    }
});

// router.post('/race', async (req, res, next) => {
//     try {
//         let body = req.body;
//         console.log("/master/add-message received body=", body);
//
//         let { msg, delay } = body;
//         console.log("body=", body);
//
//         let rLogMsg = await STORAGE_SERVICE.race(msg, delay);
//         console.log("rLogMsg=",rLogMsg);
//         return res.status(200).send({});
//     }
//     catch (err) {
//         console.log("/race: Error - ", err);
//         next(err);
//     }
// });


module.exports = router;
