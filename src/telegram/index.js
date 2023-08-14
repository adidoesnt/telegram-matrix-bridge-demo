const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

module.exports = bot;
