const path = require("node:path");
const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");

const config = require("../config");
const { createLogger } = require("./utils/logger");
const { initializeDatabase } = require("../database/db");
const { loadCogs } = require("./loaders/cogLoader");

async function main() {
  const logger = createLogger(config.logLevel);
  logger.info("Boot sequence started");

  const db = await initializeDatabase(config.databasePath, logger);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const botContext = {
    client,
    db,
    config,
    logger,
  };

  const {
    loadedCogs,
    slashCommandBuilders,
    prefixCommandRegistry,
    aliasRegistry,
  } = await loadCogs({
    cogsDir: path.resolve(process.cwd(), "cogs"),
    context: botContext,
    logger,
  });

  client.prefixCommands = new Collection(prefixCommandRegistry);
  client.commandAliases = new Collection(aliasRegistry);

  client.once(Events.ClientReady, async (readyClient) => {
    try {
      if (config.guildId) {
        await readyClient.application.commands.set(
          slashCommandBuilders,
          config.guildId,
        );
        logger.info("Slash commands registered to guild", {
          guildId: config.guildId,
          count: slashCommandBuilders.length,
        });
      } else {
        await readyClient.application.commands.set(slashCommandBuilders);
        logger.info("Global slash commands registered", {
          count: slashCommandBuilders.length,
        });
      }
    } catch (error) {
      logger.error("Failed slash command registration", {
        error: error.message,
      });
    }

    logger.info("Bot started", {
      userTag: readyClient.user.tag,
      cogsLoaded: loadedCogs.length,
      cogs: loadedCogs.join(", "),
    });
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = client.prefixCommands.get(interaction.commandName);
    if (!command || typeof command.slashExecute !== "function") {
      return;
    }

    try {
      await command.slashExecute(interaction, botContext);
    } catch (error) {
      logger.error("Slash command failed", {
        command: interaction.commandName,
        error: error.message,
      });
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Something went wrong while running that command.",
          ephemeral: true,
        });
      }
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) {
      return;
    }

    const raw = message.content.slice(config.prefix.length).trim();
    if (!raw) {
      return;
    }

    const [inputName, ...args] = raw.split(/\s+/);
    const commandName = client.commandAliases.get(inputName) || inputName;
    const command = client.prefixCommands.get(commandName);

    if (!command || typeof command.prefixExecute !== "function") {
      return;
    }

    try {
      await command.prefixExecute({ message, args }, botContext);
    } catch (error) {
      logger.error("Prefix command failed", {
        command: commandName,
        error: error.message,
      });
      await message.reply("Something went wrong while running that command.");
    }
  });

  client.on(Events.Error, (error) => {
    logger.error("Discord client error", { error: error.message });
  });

  process.on("SIGINT", async () => {
    logger.warn("Shutdown requested");
    await db.close();
    client.destroy();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.warn("Shutdown requested");
    await db.close();
    client.destroy();
    process.exit(0);
  });

  await client.login(config.token);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Fatal startup error",
      error: error.message,
    }),
  );
  process.exit(1);
});
