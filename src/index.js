const { initMatrixBot, createRoom } = require("./matrix");
const {
  getMatrixRoomId,
  storeMatrixRoomId,
  getTelegramUserId,
  connectDB,
} = require("./mongo");
const telegramBot = require("./telegram");

// initialise the bot, connect to the database and listen for messages from telegram
initMatrixBot().then(async (client) => {
  await connectDB();
  telegramBot.on("message", async (msg) => {
    const telegramUserId = msg.from.id;
    const telegramFirstName = msg.from.first_name;
    let matrixRoomId = await getMatrixRoomId(telegramUserId);
    if (!matrixRoomId) {
      matrixRoomId = await createRoom(client, telegramFirstName);
      await storeMatrixRoomId(telegramUserId, matrixRoomId);
    }
    client.sendEvent(matrixRoomId, "m.room.message", {
      displayname: telegramFirstName,
      msgtype: "m.text",
      format: "org.matrix.custom.html",
      formatted_body: `<p><strong>[telegram] ${telegramFirstName}:</strong> ${msg.text}</p>`,
      body: `[telegram] ${msg.text}`,
    });
  });
  client.on("Room.timeline", async function (event, room, _) {
    if (event.getType() === "m.room.message") {
      const matrixRoomId = room.roomId;
      const messageContent = event.getContent().body;
      const isTelegram = messageContent.includes("[telegram]");
      if (isTelegram) return;
      let telegramUserId = await getTelegramUserId(matrixRoomId);
      if (telegramUserId) {
        telegramBot.sendMessage(telegramUserId, messageContent);
      }
    }
  });
  client.startClient();
});
