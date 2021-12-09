const SECONDARY_SERVICE = require("../../services/secondary.service");
const MASTER_SERVICE = require("../../services/master.service");
const TP_SEC1_SERVICE = require("../../services/toxiproxy-secondary-1.service");
const TP_SEC2_SERVICE = require("../../services/toxiproxy-secondary-2.service");
const constants = require("../../services/constants");

let DATA_REQ, DATA_REQ1, DATA_REQ2;
let DATA_RES_MASTER=[];
let DATA_RES_SECONDARY_1=[];

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

beforeAll(async () => {
    jest.setTimeout(10000);
    await sleep(1000);
    DATA_REQ1 = {
        msg: {
            text: "a"
        }, delay: 1000
    };
    let response1 = MASTER_SERVICE.race(DATA_REQ1);
    DATA_REQ2 = {
        msg: {
            text: "b"
        }, delay: 1
    };
    let response2 = MASTER_SERVICE.race(DATA_REQ2);
    await sleep(2000);
    DATA_RES_MASTER = await MASTER_SERVICE.getAllMessages();
});

afterAll(async () => {
});

describe('check race', () => {
    jest.setTimeout(10000);
    test('DATA_RES_MASTER', async () => {
        expect(DATA_RES_MASTER).toBe(1);
    });
})



