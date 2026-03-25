const fs = require("node:fs/promises");
const path = require("node:path");

async function loadCogs({ cogsDir, context, logger }) {
  const resolvedDir = path.resolve(cogsDir);
  const files = await fs.readdir(resolvedDir, { withFileTypes: true });
  const cogFiles = files
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(resolvedDir, entry.name));

  const loadedCogs = [];
  const slashCommandBuilders = [];
  const prefixCommandRegistry = new Map();
  const aliasRegistry = new Map();

  for (const filePath of cogFiles) {
    try {
      // eslint-disable-next-line no-undef
      const cog = require(filePath);
      if (!cog || !cog.name || typeof cog.setup !== "function") {
        throw new Error("Invalid cog contract: expected { name, setup }");
      }

      const commands = Array.isArray(cog.commands) ? cog.commands : [];
      for (const command of commands) {
        if (!command || !command.name) {
          throw new Error(`Invalid command in cog ${cog.name}: missing name`);
        }

        prefixCommandRegistry.set(command.name, command);
        for (const alias of command.aliases || []) {
          aliasRegistry.set(alias, command.name);
        }

        if (typeof command.slashData?.toJSON === "function") {
          slashCommandBuilders.push(command.slashData);
        }
      }

      await cog.setup(context);
      loadedCogs.push(cog.name);
      logger.info("Cog loaded", { cog: cog.name, filePath });
    } catch (error) {
      logger.error("Failed to load cog", { filePath, error: error.message });
    }
  }

  return {
    loadedCogs,
    slashCommandBuilders,
    prefixCommandRegistry,
    aliasRegistry,
  };
}

module.exports = { loadCogs };
