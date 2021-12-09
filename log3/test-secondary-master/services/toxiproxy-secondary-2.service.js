const axios = require("axios");
const _ = require("lodash");

const constants = require("./constants");

const PROXY = 'log3_dev_secondary_2';

exports.setProxy = async () => {
  await _populateProxy();
  await _createLatency();
}

exports.updateLatency = async (latency, jitter) => {
  let data = {
    "name": "t_latency",
    "type": "latency",
    "stream": "upstream",
    "toxicity": 1.0,
    "attributes": {
      "latency": latency,
      "jitter": jitter
    }
  };
  let response = await axios({
    method: "POST",
    baseURL: constants.TOXIPROXY_REST_URL,
    url: `/proxies/${PROXY}/toxics/t_latency`,
    data: data,
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};

exports.deleteProxy = async () => {
  let response = await axios({
    method: "DELETE",
    baseURL: constants.TOXIPROXY_REST_URL,
    url: `/proxies/${PROXY}`,
    data: {},
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};

const _populateProxy = async () => {
  let data = [{
    "name": PROXY,
    "listen": "127.0.0.1:5002",
    "upstream": "127.0.0.1:6002",
    "enabled": true
  }];
  let response = await axios({
    method: "POST",
    baseURL: constants.TOXIPROXY_REST_URL,
    url: '/populate',
    data: data,
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};


const _createLatency = async () => {
  let data = {
    "name": "t_latency",
    "type": "latency",
    "stream": "upstream",
    "toxicity": 1.0,
    "attributes": {
      "latency": 1,
      "jitter": 1
    }
  };
  let response = await axios({
    method: "POST",
    baseURL: constants.TOXIPROXY_REST_URL,
    url: `/proxies/${PROXY}/toxics`,
    data: data,
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};


