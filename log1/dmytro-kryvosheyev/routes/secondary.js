var express = require('express');
const fs = require("fs");
const moment = require('moment');
var router = express.Router();
const axios = require("axios");
const asyncModule = require("async");
const config = require('../config');
const SECONDARY_STORAGE = require('../services/secondary-storage');
const UTILS = require('../services/utils');


router.post('/add-message', async (req, res, next) => {
    let body_example = {
        inc_id: 1,
        msg: {
            hint: "body must contain inc_id and msg object.",
            property1: "value of any type: string, array, object, etc.",
            arr: ['item1', 'item2'],
            arrOfObjects: [{ "value1": "it's the first item in the array of objects"}]
        },
        // options: {}   // will need for log 2, log 3
    };

    let body = req.body;
    console.log("/secondary/add-message received body=", body);

    let { msg, inc_id } = body;

    try {
        if (!msg || UTILS.isEmpty(msg)) {
            responseBody = { ...body_example };
            console.log("/secondary/add-message  missing msg object. Returning Error 400");
            return res.status(400).send(responseBody);
        }
        if (!inc_id || inc_id<1) {
            responseBody = { ...body_example };
            console.log(`/secondary/add-message invalid inc_id. Returning Error 400. Received inc_id=${inc_id}`);
            return res.status(400).send(responseBody);
        }

        await UTILS.sleepWhileUpdateInProgress();
        SECONDARY_STORAGE.addMsg(msg);
        console.log("/secondary/add-message successfully processed the msg");
        responseBody = { responseMsg: "your message has been successfully processed." };
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/secondary/add-message: Error - ", err);
        next(err);
    }

});

router.get('/get-all-messages', async (req, res, next) => {
    try {
        console.log("/secondary/get-all-messages was invoked");
        responseBody = { messages: SECONDARY_STORAGE.getAllMsg() };
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/secondary/get-all-messages: Error - ", err);
        next(err);
    }

});

module.exports = router;
