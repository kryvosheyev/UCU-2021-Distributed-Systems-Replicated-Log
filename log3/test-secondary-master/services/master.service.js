const axios = require("axios");
const _ = require("lodash");

const constants = require("./constants");

exports.addMsg = async (body) => {
  let response = await axios({
    method: "POST",
    baseURL: constants.MASTER_REST_URL,
    url: '/master/add-message',
    data: body,
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};

exports.getAllMessages = async () => {
  let response = await axios({
    method: "GET",
    baseURL: constants.MASTER_REST_URL,
    url: '/master/get-all-messages',
    data: {
    },
    headers: {
      "Content-Type": "application/json"
    }
  })
  return response.data.data;
};

exports.race = async (body) => {
  let response = await axios({
    method: "POST",
    baseURL: constants.MASTER_REST_URL,
    url: '/race',
    data: body,
    headers: {
      "Content-Type": "application/json"
    }
  })
  return response.data;
};

exports.raceFixed = async (body) => {
  let response = await axios({
    method: "POST",
    baseURL: constants.MASTER_REST_URL,
    url: '/race-fixed',
    data: body,
    headers: {
      "Content-Type": "application/json"
    }
  })
  return response.data;
};

exports.clearDb = async () => {
  let response = await axios({
    method: "POST",
    baseURL: constants.MASTER_REST_URL,
    url: '/master/clear-db',
    data: {
    },
    headers: {
      "Content-Type": "application/json"
    }
  })
  return response.data;
};