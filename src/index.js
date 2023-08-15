const { initMatrixBot, createRoom, initPuppetClient } = require("./matrix");
const {
  getMatrixRoomId,
  storeMatrixRoomId,
  getTelegramUserId,
  connectDB,
} = require("./mongo");
const telegramBot = require("./telegram");
const { delay, openLink } = require("./utils");

// initialise the bot, connect to the database and listen for messages from telegram
initMatrixBot().then(async (client) => {
  await connectDB();
  telegramBot.on("message", async (msg) => {
    const telegramUserId = msg.from.id;
    const telegramFirstName = msg.from.first_name;
    const puppetUsername = `tele:${telegramUserId}`;
    const puppetPassword = "dummypass";
    const response = await client.registerGuest({
      type: "m.login.dummy",
      username: puppetUsername,
      password: puppetPassword,
    });
    const { user_id, access_token } = response;
    let matrixRoomId = await getMatrixRoomId(telegramUserId);
    if (!matrixRoomId) {
      matrixRoomId = await createRoom(client, telegramFirstName, user_id);
      await storeMatrixRoomId(telegramUserId, matrixRoomId);
    }
    const puppetClient = await initPuppetClient(access_token);
    try {
      await puppetClient.joinRoom(matrixRoomId);
    } catch (err) {
      const consentURI = err.data.consent_uri;
      console.log(`CONSENT URI: ${consentURI}`);
      await delay(30000);
      await puppetClient.joinRoom(matrixRoomId);
    }
    puppetClient.sendMessage(matrixRoomId, {
      body: msg.text,
      displayname: telegramFirstName,
    });
  });
  client.on("Room.timeline", async function (event, room, _) {
    if (event.getType() === "m.room.message") {
      const matrixRoomId = room.roomId;
      const messageSender = event.getSender();
      const messageContent = event.getContent().body;
      const isOwnMessage = messageSender === client.getUserId();
      if (!isOwnMessage) return;
      let telegramUserId = await getTelegramUserId(matrixRoomId);
      if (telegramUserId) {
        telegramBot.sendMessage(telegramUserId, messageContent);
      }
    }
  });
  client.startClient();
});
