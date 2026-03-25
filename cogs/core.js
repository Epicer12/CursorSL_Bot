const { SlashCommandBuilder } = require("discord.js");

const pingCommand = {
  name: "ping",
  aliases: ["p"],
  slashData: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether CursorSL Bot is responsive."),
  async prefixExecute({ message }) {
    await message.reply("Pong! CursorSL Bot is online.");
  },
  async slashExecute(interaction) {
    await interaction.reply("Pong! CursorSL Bot is online.");
  },
};

module.exports = {
  name: "core",
  commands: [pingCommand],
  async setup({ logger }) {
    logger.info("Core cog setup complete");
  },
};
