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
const PROCESS_SERVICE = require('../services/process.service');
const {RETRY} = require('../config');


router.post('/add-message', async (req, res, next) => {
    let body_example = {
        msg: {
            hint: "body must contain msg object, which can have any properties inside. Seee examples below:",
            property1: "value of any type: string, array, object, etc.",
            arr: ['item1'],
            arrOfObjects: [{ "value1": "it's the first item in the array of objects"}]
        },
        options: {writeConcern:2}
    };

    let body = req.body;
    console.log("/master/add-message received body=", body);

    let { msg, options } = body;

    try {
        if (!msg || UTILS.isEmpty(msg)) {
            responseBody = { ...body_example };
            console.log("/master/add-message  missing msg object. Returning Error 400");
            return res.status(400).send(responseBody);
        }

        let writeConcern=RETRY.default_write_concern;
        if (options && options.writeConcern) {
            if(options.writeConcern < 1 || options.writeConcern > (config.secondaries.length+1)){
                console.log("/master/add-message  incorrect writeConcern value");
                res.status(400).send({msg: 'incorrect writeConcern value'});
            }
            writeConcern = options.writeConcern;
        }

        await PROCESS_SERVICE.processMessage(msg, writeConcern, res);
    }
    catch (err) {
        console.log("/master/add-message: Error - ", err);
        next(err);
    }

});

router.get('/get-all-messages', async (req, res, next) => {
    try {
        let data = await STORAGE_SERVICE.getAllMsg();
        console.log("/master/get-all-messages returning ", data);
        let responseBody = {data:data};
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/master/get-all-messages: Error - ", err);
        next(err);
    }
});


router.post('/clear-db', async (req, res, next) => {
    try {
        console.log("/master/clear-db was invoked");
        let responseBody = { SUCCESS: STORAGE_SERVICE.clearDb() };
        return res.status(200).send(responseBody);
    }
    catch (err) {
        console.log("/master/clear-db: Error - ", err);
        next(err);
    }
});

module.exports = router;
