var express = require('express');
const fs = require("fs");
const fsPromises = fs.promises;
const moment = require('moment');
var router = express.Router();
const axios = require("axios");
const asyncModule = require("async");
const config = require('../config');
const SECONDARY_STORAGE = require('../services/secondary-storage');
const UTILS = require('../services/utils');
const _ = require("lodash");

router.post('/add-messages', async (req, res, next) => {
    let body_example = [{
        _id_is_first: true,
        _id_curr:1,
        msg:{ hint: "body must contain data[].msg object with any properties inside. For example, the 1st message can be this.",
            property1: "value of any type: string, array, object, etc.",
            arr: ['a','b'],
            arrOfObjects: [{ "key1": "value1", "key2": "value2"}] }
    }];

    let body = req.body;
    console.log("/secondary/add-messages received body.data=", body.data);

    let msg = body.data ? body.data[0]?.msg : undefined,
        _id_curr = body.data ? body.data[0]?._id_curr : undefined;

    try {
        if(!msg || !_id_curr) {
            let responseBody = body_example;
            console.log("msg=",msg, " _id_curr=", _id_curr);
            console.log("/secondary/add-messages missing msg object. Returning Error 400");
            return res.status(400).send(responseBody);
        }

        //await UTILS.sleepWhileUpdateInProgress();
        const arr = _.concat([], body.data);
        const added = await SECONDARY_STORAGE.addMsg(arr);
        console.log("/secondary/add-messages the ids of successfully saved messages = ", added);
        let responseBody = { added: added };
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/secondary/add-messages: Error - ", err);
        next(err);
    }
});

router.get('/get-all-messages', async (req, res, next) => {
    try {
        console.log("/secondary/get-all-messages was invoked");
        let data = await SECONDARY_STORAGE.getAllMsg();
        console.log("/secondary/get-all-messages returning ", data);
        let responseBody = {data:data};
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/secondary/get-all-messages: Error - ", err);
        next(err);
    }
});

router.post('/clear-db', async (req, res, next) => {
    try {
        console.log("/secondary/clear-db was invoked");
        let responseBody = { SUCCESS: SECONDARY_STORAGE.clearDb() };
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/secondary/clear-db: Error - ", err);
        next(err);
    }
});

router.get('/health-check', async (req, res, next) => {
    try {
        console.log("/secondary/health-check was invoked");
        return res.status(200).send({HEALTH_STATUS:'OK'});
    }
    catch (err) {
        console.log("/secondary/health-check: Error - ", err);
        next(err);
    }
});


module.exports = router;
