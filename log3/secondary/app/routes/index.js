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


router.get('/health', async (req, res, next) => {
    try {
        // console.log("/health was invoked");
        return res.status(200).send({HEALTH_STATUS:'OK'});
    }
    catch (err) {
        console.log("/health Error - ", err);
        next(err);
    }
});


module.exports = router;
