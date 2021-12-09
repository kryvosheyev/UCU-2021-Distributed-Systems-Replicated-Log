const SECONDARY_SERVICE = require("../../services/secondary.service");
const TP_SEC1_SERVICE = require("../../services/toxiproxy-secondary-1.service");
const constants = require("../../services/constants");

let DATA_REQ;
let REQ_ACK = [];  //  the ids of successfully saved messages =  [ 6, 5 ]
let DATA_RES=[];

beforeAll(async () => {
    jest.setTimeout(10000);
    // await TP_SEC1_SERVICE.setProxy();
    // await TP_SEC1_SERVICE.updateLatency(1000,500);

    await SECONDARY_SERVICE.clearDb(constants.SECONDARY1_REST_URL);
    DATA_REQ = [
        { _id_curr: 4, msg: {t: "4"} },
        { _id_curr: 2, msg: {t: "2"} },
        { _id_is_first: true, _id_curr: 1, msg: {t: "1"} },
    ];
    REQ_ACK = await SECONDARY_SERVICE.addMsg(constants.SECONDARY1_REST_URL, DATA_REQ);
    DATA_RES = await SECONDARY_SERVICE.getAllMessages(constants.SECONDARY1_REST_URL);
});
afterAll(async () => {
    // await TP_SEC1_SERVICE.deleteProxy();
});

describe('missing 3rd message, sent 4,2,1', () => {
    jest.setTimeout(10000);
    test('(4,2,1): REQ_ACK number of the ids of successfully saved messages must be 3', async () => {
        expect(REQ_ACK.added.length).toBe(3);
    });
    test('(4,2,1) => msg length must be 2', async () => {
        expect(DATA_RES.length).toBe(2);
    });
    test('(4,2,1) => msg[0].t=1, msg[1].t=2]', async () => {
        expect(DATA_RES[0]).toHaveProperty("t", "1");
        expect(DATA_RES[1]).toHaveProperty("t", "2");
    });
    test('(4,2,1), then send (3,3)+(3): msg length must be 4, ids=[1,2,3,4] ', async () => {
        DATA_REQ = [
            { _id_curr: 3, msg: {t: "3"} },
            { _id_curr: 3, msg: {t: "3"} }
        ];
        REQ_ACK = await SECONDARY_SERVICE.addMsg(constants.SECONDARY1_REST_URL, DATA_REQ);
        DATA_REQ = [
            { _id_curr: 3, msg: {t: "3"} }
        ];
        REQ_ACK = await SECONDARY_SERVICE.addMsg(constants.SECONDARY1_REST_URL, DATA_REQ);
        DATA_RES = await SECONDARY_SERVICE.getAllMessages(constants.SECONDARY1_REST_URL);
        expect(DATA_RES.length).toBe(4);
        expect(DATA_RES[0]).toHaveProperty("t", "1");
        expect(DATA_RES[1]).toHaveProperty("t", "2");
        expect(DATA_RES[2]).toHaveProperty("t", "3");
        expect(DATA_RES[3]).toHaveProperty("t", "4");
    });
});



