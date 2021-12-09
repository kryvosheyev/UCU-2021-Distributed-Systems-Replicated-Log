const SECONDARY_SERVICE = require("../../services/secondary.service");
const TP_SEC1_SERVICE = require("../../services/toxiproxy-secondary-1.service");
const constants = require("../../services/constants");

let DATA_REQ;
let REQ_ACK = [];  //  the ids of successfully saved messages =  [ 6, 5 ]
let DATA_RES=[];

beforeAll(async () => {
    jest.setTimeout(10000);
    // await TP_SEC1_SERVICE.setProxy();
    await SECONDARY_SERVICE.clearDb(constants.SECONDARY1_REST_URL);
    DATA_REQ = [
        { _id_curr: 4, msg: {t: "4"} },
        { _id_curr: 3, msg: {t: "3"} },
        { _id_curr: 4, msg: {t: "4"} },
    ];
    REQ_ACK = await SECONDARY_SERVICE.addMsg(constants.SECONDARY1_REST_URL, DATA_REQ);
    DATA_RES = await SECONDARY_SERVICE.getAllMessages(constants.SECONDARY1_REST_URL);
});
afterAll(async () => {
    // await TP_SEC1_SERVICE.deleteProxy();
});

describe('sent 4,3,4', () => {
    jest.setTimeout(10000);
    test('number of the ids of successfully saved messages must be 2', async () => {
        expect(REQ_ACK.added.length).toBe(2);
    });
    test('msg count must be 0', async () => {
        expect(DATA_RES.length).toBe(0);
    });
});



