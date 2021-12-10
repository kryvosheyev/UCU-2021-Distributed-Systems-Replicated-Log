var express = require('express');
var router = express.Router();
const HEALTH_CHECK_SERVICE = require('../services/health-check.service');

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


module.exports = router;
