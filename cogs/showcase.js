const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const showcaseCommand = {
  name: "showcase",
  slashData: new SlashCommandBuilder()
    .setName("showcase")
    .setDescription("Ship your project to the community showcase!")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The name of your project.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("A link to your project (GitHub, Live Demo, etc.)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Tell us about what you built!")
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("A screenshot or demo gif of your project.")
        .setRequired(false),
    ),

  async slashExecute(interaction, { db, config, logger }) {
    const title = interaction.options.getString("title");
    const link = interaction.options.getString("link");
    const description =
      interaction.options.getString("description") ||
      "A new project joined the CursorSL showcase!";
    const image = interaction.options.getAttachment("image");
    const userId = interaction.user.id;

    if (!config.showcaseChannelId) {
      await interaction.reply({
        content: "Showcase channel is not configured. Please contact an admin.",
        ephemeral: true,
      });
      return;
    }

    // Enforce one-time submission rule
    const existing = await db.get(
      "SELECT id FROM build_submissions WHERE user_id = ? AND (link = ? OR title = ?)",
      [userId, link, title],
    );

    if (existing) {
      return interaction.reply({
        content:
          "❌ You have already showcased this project! Each product can only be shipped to the community showcase once.",
        ephemeral: true,
      });
    }

    try {
      const channel = await interaction.client.channels.fetch(
        config.showcaseChannelId,
      );
      if (!channel) {
        await interaction.reply({
          content: "Showcase channel not found.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const embed = new EmbedBuilder()
        .setTitle(`🚀 New Ship: ${title}`)
        .setURL(link)
        .setDescription(description)
        .addFields(
          { name: "Maker", value: `<@${userId}>`, inline: true },
          { name: "Link", value: `[Project Link](${link})`, inline: true },
        )
        .setColor("#ff0066")
        .setTimestamp();

      if (image) {
        embed.setImage(image.url);
      }

      const sentMessage = await channel.send({ embeds: [embed] });
      await sentMessage.react("🔥");
      await sentMessage.react("💡");
      await sentMessage.react("🚀");

      // Save to database
      await db.run(
        "INSERT INTO build_submissions (user_id, title, description, link, message_id, channel_id) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, title, description, link, sentMessage.id, channel.id],
      );

      // Update user stats
      await db.run(
        "INSERT INTO user_profiles (user_id, shipped_count) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET shipped_count = shipped_count + 1, updated_at = CURRENT_TIMESTAMP",
        [userId],
      );

      await interaction.editReply(
        `Congratulations! Your project **${title}** has been shipped to <#${config.showcaseChannelId}>!`,
      );
    } catch (error) {
      logger.error("Failed to ship project", { error: error.message });
      if (interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while shipping your project.",
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while shipping your project.",
          ephemeral: true,
        });
      }
    }
  },
};

module.exports = {
  name: "showcase",
  commands: [showcaseCommand],
  async setup({ logger }) {
    logger.info("Showcase cog setup complete");
  },
};
