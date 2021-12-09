const axios = require("axios");
const _ = require("lodash");

const constants = require("./constants");

exports.addMsg = async (url, data) => {
  let response = await axios({
    method: "POST",
    baseURL: url,
    url: '/secondary/add-messages',
    data: {data: _.concat([], data)},
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};

exports.getAllMessages = async (url) => {
  let response = await axios({
    method: "GET",
    baseURL: url,
    url: '/secondary/get-all-messages',
    data: {
    },
    headers: {
      "Content-Type": "application/json"
    }
  })
  return response.data.data;
  // return Promise.resolve({value: value + 1});
};

exports.clearDb = async (url) => {
  let response = await axios({
    method: "POST",
    baseURL: url,
    url: '/secondary/clear-db',
    data: {
    },
    headers: {
      "Content-Type": "application/json"
    }
  })
  return response.data;
  // return Promise.resolve({value: value + 1});
};