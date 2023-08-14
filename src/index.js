const { initMatrixBot, createRoom } = require("./matrix");
const { getMatrixRoomId, storeMatrixRoomId, connectDB } = require("./mongo");
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
    client.sendTextMessage(matrixRoomId, msg.text);
  });
});
