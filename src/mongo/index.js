const mongoose = require("mongoose");
require("dotenv").config();

// connect to database
async function connectDB() {
  const DB_URI = process.env.DB_URI;
  try {
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("connected to DB");
  } catch (err) {
    console.log(err);
  }
}

const chatSchema = new mongoose.Schema({
  telegramUserId: { type: String, required: true },
  matrixRoomId: { type: String, required: true },
});

const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);

// use the telegram user id to query the database and check for an existing mapping
async function getMatrixRoomId(telegramUserId) {
  let matrixRoomId;
  const chat = await Chat.findOne({
    telegramUserId,
  });
  if (chat) matrixRoomId = chat.matrixRoomId;
  return matrixRoomId;
}

async function getTelegramUserId(matrixRoomId) {
  let telegramUserId;
  const chat = await Chat.findOne({
    matrixRoomId,
  });
  if (chat) telegramUserId = chat.telegramUserId;
  return telegramUserId;
}

// store a new telegram user id to matrix room id mapping
async function storeMatrixRoomId(telegramUserId, matrixRoomId) {
  const chat = new Chat({
    telegramUserId,
    matrixRoomId,
  });
  await chat.save();
}

module.exports = {
  Chat,
  connectDB,
  getMatrixRoomId,
  getTelegramUserId,
  storeMatrixRoomId,
};
