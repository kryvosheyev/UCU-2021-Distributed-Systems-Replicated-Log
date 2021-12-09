const SECONDARY_SERVICE = require("../../services/secondary.service");
const TP_SEC1_SERVICE = require("../../services/toxiproxy-secondary-1.service");
const constants = require("../../services/constants");

let DATA_REQ;
let DATA_RES=[];

const sleep = (ms) => {
    return new Promise(resolve =>
        setTimeout(() => {
            resolve();
        }, ms));
};

beforeAll(async () => {
    jest.setTimeout(10000);
    // await TP_SEC1_SERVICE.setProxy();
    await SECONDARY_SERVICE.clearDb(constants.SECONDARY1_REST_URL);
    DATA_REQ = {
        _id_is_first: true,
        _id_curr: 1,
        msg: {
            t:"1",
            hint: "body must contain msg object, which can have any properties inside. For example, the 1st message can be this.",
            property1: "value of any type: string, array, object, etc.",
            arr: ['a', 'b'],
            arrOfObjects: [{"key1": "value1", "key2": "value2"}]
        }
    };
    await SECONDARY_SERVICE.addMsg(constants.SECONDARY1_REST_URL, DATA_REQ);
    DATA_RES = await SECONDARY_SERVICE.getAllMessages(constants.SECONDARY1_REST_URL);
});

afterAll(async () => {
    // await TP_SEC1_SERVICE.deleteProxy();
});


describe('check with 1 msg', () => {
    jest.setTimeout(10000);
  test('length must be 1', async () => {
    expect(DATA_RES.length).toBe(1);
  });

  test('t must be = 1', async () => {
    expect(DATA_RES[0].t).toBe("1");
  });
})



