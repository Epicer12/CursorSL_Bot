const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const profileCommand = {
  name: "profile",
  aliases: ["me"],
  slashData: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your CursorSL professional profile.")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user whose profile you want to view.")
        .setRequired(false)),

  async slashExecute(interaction, { db }) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userId = targetUser.id;

    const profile = await db.get(
      "SELECT stack, shipped_count, challenge_wins FROM user_profiles WHERE user_id = ?",
      userId
    );

    const workflowsCount = await db.get(
      "SELECT COUNT(*) as count FROM workflows WHERE user_id = ?",
      userId
    );

    if (!profile && workflowsCount.count === 0) {
      await interaction.reply({
        content: targetUser.id === interaction.user.id
          ? "You don't have a profile yet! Start by shipping a project with `/ship` or sharing a workflow with `/share-workflow`."
          : `${targetUser.username} hasn't started their journey yet.`,
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🪪 Cursor Profile: ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "💻 Stack", value: profile?.stack || "Not set (Use /update-stack)", inline: false },
        { name: "🚀 Shipped Projects", value: `${profile?.shipped_count || 0}`, inline: true },
        { name: "📚 Workflows Shared", value: `${workflowsCount.count}`, inline: true },
        { name: "🏆 Challenge Wins", value: `${profile?.challenge_wins || 0}`, inline: true }
      )
      .setColor("#5865F2")
      .setFooter({ text: "Cursor Community Sri Lanka" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // Prefix version for completeness
  async prefixExecute({ message, args }, { db }) {
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;

    const profile = await db.get(
      "SELECT stack, shipped_count, challenge_wins FROM user_profiles WHERE user_id = ?",
      userId
    );

    const workflowsCount = await db.get(
      "SELECT COUNT(*) as count FROM workflows WHERE user_id = ?",
      userId
    );

    if (!profile && workflowsCount.count === 0) {
      await message.reply(targetUser.id === message.author.id
        ? "You don't have a profile yet! Start by shipping a project with `/ship` or sharing a workflow with `/share-workflow`."
        : `${targetUser.username} hasn't started their journey yet.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🪪 Cursor Profile: ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "💻 Stack", value: profile?.stack || "Not set", inline: false },
        { name: "🚀 Shipped Projects", value: `${profile?.shipped_count || 0}`, inline: true },
        { name: "📚 Workflows Shared", value: `${workflowsCount.count}`, inline: true },
        { name: "🏆 Challenge Wins", value: `${profile?.challenge_wins || 0}`, inline: true }
      )
      .setColor("#5865F2")
      .setFooter({ text: "Cursor Community Sri Lanka" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};

const updateStackCommand = {
  name: "update-stack",
  slashData: new SlashCommandBuilder()
    .setName("update-stack")
    .setDescription("Update your technical stack (e.g., 'React, Python, Cursor AI').")
    .addStringOption(option =>
      option.setName("stack")
        .setDescription("List your main tools and languages.")
        .setRequired(true)),
  
  async slashExecute(interaction, { db }) {
    const stack = interaction.options.getString("stack");
    const userId = interaction.user.id;

    await db.run(
      "INSERT INTO user_profiles (user_id, stack) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET stack = ?, updated_at = CURRENT_TIMESTAMP",
      [userId, stack, stack]
    );

    await interaction.reply({ content: `Stack updated to: **${stack}**`, ephemeral: true });
  }
};

module.exports = {
  name: "profile",
  commands: [profileCommand, updateStackCommand],
  async setup({ logger }) {
    logger.info("Profile cog setup complete");
  },
};
