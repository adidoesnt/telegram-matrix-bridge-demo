const { initMatrixBot, createRoom, initPuppetClient } = require("./matrix");
const {
  getMatrixRoomId,
  storeMatrixRoomId,
  getTelegramUserId,
  connectDB,
} = require("./mongo");
const telegramBot = require("./telegram");
const { delay } = require("./utils");

// initialise the bot, connect to the database and listen for messages from telegram
initMatrixBot().then(async (client) => {
  await connectDB();
  // listen for telegram messages
  telegramBot.on("message", async (msg) => {
    const telegramUserId = msg.from.id;
    const telegramFirstName = msg.from.first_name;
    const puppetUsername = `tele:${telegramUserId}`;
    const puppetPassword = "dummypass";

    // register puppet user
    const response = await client.registerGuest({
      type: "m.login.dummy",
      username: puppetUsername,
      password: puppetPassword,
    });
    const { user_id, access_token } = response;

    // fetch or create matrix room depending on existence
    let matrixRoomId = await getMatrixRoomId(telegramUserId);
    if (!matrixRoomId) {
      matrixRoomId = await createRoom(client, telegramFirstName, user_id);
      await storeMatrixRoomId(telegramUserId, matrixRoomId);
    }

    // initialise puppet client using guest access token
    const puppetClient = await initPuppetClient(access_token);

    // workaround for consent not given error
    try {
      await puppetClient.joinRoom(matrixRoomId);
    } catch (err) {
      const consentURI = err.data.consent_uri;
      console.log(`CONSENT URI: ${consentURI}`);
      await delay(30000);
      await puppetClient.joinRoom(matrixRoomId);
    }
    
    // send message to matrix room
    puppetClient.sendMessage(matrixRoomId, {
      body: msg.text,
      msgtype: "m.text",
      displayname: telegramFirstName,
    });
  });

  // listen for messages from the matrix room
  client.on("Room.timeline", async function (event, room, _) {
    if (event.getType() === "m.room.message") {
      const matrixRoomId = room.roomId;
      const messageSender = event.getSender();
      const messageContent = event.getContent().body;

      // prevent echo loop by ensuring the message is from the matrix client
      const isOwnMessage = messageSender === client.getUserId();
      if (!isOwnMessage) return;

      // send message to the telegram user associated with the room that triggered the event
      let telegramUserId = await getTelegramUserId(matrixRoomId);
      if (telegramUserId) {
        telegramBot.sendMessage(telegramUserId, messageContent);
      }
    }
  });

  // start the matrix client
  client.startClient();
});
