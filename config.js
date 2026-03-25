const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID"];

for (const key of requiredEnv) {
  if (!process.env[key] || process.env[key].trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  prefix: process.env.BOT_PREFIX || "!",
  logLevel: process.env.LOG_LEVEL || "info",
  databasePath: process.env.DB_PATH || path.resolve(process.cwd(), "database", "cursorsl.db"),
  showcaseChannelId: process.env.SHOWCASE_CHANNEL_ID,
  workflowChannelId: process.env.WORKFLOW_CHANNEL_ID,
  moderatorRoleId: process.env.MODERATOR_ROLE_ID,
};
