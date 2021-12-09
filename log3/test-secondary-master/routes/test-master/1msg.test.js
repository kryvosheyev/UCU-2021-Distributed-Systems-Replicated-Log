const SECONDARY_SERVICE = require("../../services/secondary.service");
const MASTER_SERVICE = require("../../services/master.service");
const TP_SEC1_SERVICE = require("../../services/toxiproxy-secondary-1.service");
const TP_SEC2_SERVICE = require("../../services/toxiproxy-secondary-2.service");
const constants = require("../../services/constants");

let DATA_REQ;
let DATA_RES_MASTER=[];
let DATA_RES_SECONDARY_1=[];

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

beforeAll(async () => {
    jest.setTimeout(20000);
    // await TP_SEC1_SERVICE.setProxy();
    // await TP_SEC2_SERVICE.setProxy();

    await sleep(3000);

    await MASTER_SERVICE.clearDb();
    await SECONDARY_SERVICE.clearDb(constants.SECONDARY1_REST_URL);
    await SECONDARY_SERVICE.clearDb(constants.SECONDARY2_REST_URL);
    DATA_REQ = {
        msg: {
            text: "a"
        }
    };
    const response = await MASTER_SERVICE.addMsg(DATA_REQ);
    console.log("master resp=", response);
    DATA_RES_MASTER = await MASTER_SERVICE.getAllMessages();
    await sleep(1000);
    DATA_RES_SECONDARY_1 = await SECONDARY_SERVICE.getAllMessages(constants.SECONDARY1_REST_URL);
});

afterAll(async () => {
    await sleep(15000);
    // await TP_SEC1_SERVICE.deleteProxy();
    // await TP_SEC2_SERVICE.deleteProxy();
});

describe('check with 1 msg', () => {
    jest.setTimeout(20000);
    test('Master length must be 1, id=[1]', async () => {
        expect(DATA_RES_MASTER.length).toBe(1);
        expect(DATA_RES_MASTER[0]).toHaveProperty("text", "a");
    });

    test('Sec1 length must be 1, id=[1]', async () => {
        expect(DATA_RES_SECONDARY_1.length).toBe(1);
        expect(DATA_RES_SECONDARY_1[0]).toHaveProperty("text", "a");
    });
})



