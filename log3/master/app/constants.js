module.exports.HEALTH_STATUSES = {
    HEALTHY: "HEALTHY",

    // Do not send batch retries.
    // Try sending individual messages from clients
    SUSPECTED: "SUSPECTED",

    // Do not send anything.
    UNHEALTHY: "UNHEALTHY"
};

module.exports.RESPONSE_MESSAGES = {
    NO_QUORUM: {msg: "No Quorum"},
    OK: {msg: "OK"},
    WRITE_CONCERN_NOT_ACHIEVED: {msg: "writeConcern is not achieved"},
};