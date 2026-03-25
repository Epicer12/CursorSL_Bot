const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const shareWorkflowCommand = {
  name: "share-workflow",
  slashData: new SlashCommandBuilder()
    .setName("share-workflow")
    .setDescription("Share a .cursorrules or system prompt with the community.")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription(
          "Title of your workflow (e.g., 'React + Tailwind Rules')",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("The actual rules or prompt content.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Briefly explain what this workflow helps with.")
        .setRequired(false),
    ),

  async slashExecute(interaction, { db, config, logger }) {
    const title = interaction.options.getString("title");
    const content = interaction.options.getString("content");
    const description =
      interaction.options.getString("description") ||
      "No description provided.";
    const userId = interaction.user.id;

    try {
      const result = await db.run(
        "INSERT INTO workflows (user_id, title, description, content) VALUES (?, ?, ?, ?)",
        [userId, title, description, content],
      );

      const embed = new EmbedBuilder()
        .setTitle(`🆕 Workflow Shared: ${title}`)
        .setDescription(description)
        .addFields(
          { name: "Author", value: `<@${userId}>`, inline: true },
          { name: "ID", value: `${result.lastID}`, inline: true },
        )
        .setColor("#00ff99")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // If a workflow channel is configured, post it there too
      if (config.workflowChannelId) {
        const channel = await interaction.client.channels.fetch(
          config.workflowChannelId,
        );
        if (channel) {
          const publicEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .addFields(
              { name: "Author", value: `<@${userId}>` },
              {
                name: "Content Preview",
                value: `\`\`\`${content.slice(0, 500)}${content.length > 500 ? "..." : ""}\`\`\``,
              },
            )
            .setFooter({
              text: `Use /workflow id:${result.lastID} to see full details`,
            })
            .setColor("#00ff99");

          const sentMessage = await channel.send({ embeds: [publicEmbed] });
          await sentMessage.react("🔥");
          await sentMessage.react("⭐");
        }
      }
    } catch (error) {
      logger.error("Failed to share workflow", { error: error.message });
      await interaction.reply({
        content: "Failed to save your workflow. Please try again.",
        ephemeral: true,
      });
    }
  },
};

const workflowsCommand = {
  name: "workflows",
  slashData: new SlashCommandBuilder()
    .setName("workflows")
    .setDescription("List the latest community workflows."),

  async slashExecute(interaction, { db }) {
    const rows = await db.all(
      "SELECT id, title, user_id FROM workflows ORDER BY created_at DESC LIMIT 10",
    );

    if (rows.length === 0) {
      await interaction.reply(
        "No workflows shared yet. Be the first with `/share-workflow`!",
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📚 Community Workflows")
      .setDescription(
        rows
          .map((r) => `**#${r.id}** - ${r.title} (by <@${r.user_id}>)`)
          .join("\n"),
      )
      .setColor("#0099ff");

    await interaction.reply({ embeds: [embed] });
  },
};

const viewWorkflowCommand = {
  name: "workflow",
  slashData: new SlashCommandBuilder()
    .setName("workflow")
    .setDescription("View the full content of a specific workflow.")
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the workflow to view")
        .setRequired(true),
    ),

  async slashExecute(interaction, { db }) {
    const id = interaction.options.getInteger("id");
    const row = await db.get("SELECT * FROM workflows WHERE id = ?", id);

    if (!row) {
      await interaction.reply({
        content: "Workflow not found.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(row.title)
      .setDescription(row.description)
      .addFields(
        { name: "Author", value: `<@${row.user_id}>`, inline: true },
        { name: "Date", value: row.created_at, inline: true },
        {
          name: "Content",
          value: `\`\`\`\n${row.content.slice(0, 1000)}\n\`\`\``,
        },
      )
      .setColor("#00ff99");

    // If content is very long, we might need a button or another way to show it all,
    // but for now 1000 chars is decent for a preview.
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports = {
  name: "workflow",
  commands: [shareWorkflowCommand, workflowsCommand, viewWorkflowCommand],
  async setup({ logger }) {
    logger.info("Workflow cog setup complete");
  },
};
