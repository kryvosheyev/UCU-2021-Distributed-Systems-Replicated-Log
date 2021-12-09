var express = require('express');
const fs = require("fs");
const axios = require("axios");
const moment = require('moment');
var router = express.Router();
const asyncModule = require("async");
const config = require('../config');
const UTILS = require('../services/utils');

router.post('/add-message', async (req, res, next) => {
    let body_example = {
        msg: {
            hint: "body must contain msg object, which can have any properties inside. Seee examples below:",
            property1: "value of any type: string, array, object, etc.",
            arr: ['item1'],
            arrOfObjects: [{ "value1": "it's the first item in the array of objects"}]
        },
        // options: {}   // will need for log 2, log 3
    };

    let body = req.body;
    let listOfSecondaries = config.secondaries;
    let promises = [];

    console.log("/master/add-message received body=", body);

    let { msg } = body;

    try {
        if (!msg || UTILS.isEmpty(msg)) {
            responseBody = { ...body_example };
            console.log("/master/add-message  missing msg object. Returning Error 400");
            return res.status(400).send(responseBody);
        }

        listOfSecondaries.forEach(secondary => {
            let data = { inc_id:2, msg:msg};
            promises.push(UTILS.sendPostHTTP(secondary.url, config.SECONDARY_API_ADD_MESSAGE_URL, data));
        });
        let results = await Promise.all(promises);
        console.log("/master/add-message finished to send to secondaries", listOfSecondaries);
        for (let i = 0; i < results.length; i++) {
            console.log(results[i].data);
        }

        console.log("/master/add-message successfully processed the msg");
        responseBody = { responseMsg: "your message has been successfully processed." };
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/master/add-message: Error - ", err);
        next(err);
    }

});

router.post('/test-call-secondary', async (req, res, next) => {
    try {
        let url = 'http://127.0.0.1:6000';
        await axios({
            method: 'post',
            url: '/secondary/add-message',
            baseURL: url,
            data: { inc_id:2, msg:{ value: 'test value'}}
        });
        return res.status(200).send({a: 'OK'});
    } catch (err) {
        console.log("/master/test-call-secondary: Error - ", err);
        next(err);
    }

});

module.exports = router;
