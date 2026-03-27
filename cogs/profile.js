const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { calculateBuildStreak } = require("../src/utils/github");
const { generateProfileCard } = require("../src/utils/imageRenderer");
const { PROJECT_CATEGORIES, TECH_STACK_OPTIONS } = require("../src/utils/constants");

// In-memory state for UI wizards and explorers
const projectDrafts = new Map(); 
const explorerState = new Map(); // userId -> { currentIndex: 0 }

const setupProfileCommand = {
  name: "setup-profile",
  slashData: new SlashCommandBuilder()
    .setName("setup-profile")
    .setDescription(
      "Link your GitHub and social accounts to set up your developer profile.",
    )
    .addStringOption((opt) =>
      opt
        .setName("linkedin")
        .setDescription("Your LinkedIn Profile URL (Optional)")
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName("x_twitter")
        .setDescription("Your X (Twitter) Username (Optional)")
        .setRequired(false),
    ),

  async slashExecute(interaction, { db, config }) {
    const linkedin = interaction.options.getString("linkedin") || null;
    const x_username = interaction.options.getString("x_twitter") || null;
    const userId = interaction.user.id;

    // Use OAuth! Generate the URL
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&state=${userId}&scope=read:user`;

    // Save partial data giving them an empty github_username until verified
    await db.run(
      `
      INSERT INTO user_profiles (user_id, github_verified, linkedin_url, x_username) 
      VALUES (?, 0, ?, ?) 
      ON CONFLICT(user_id) DO UPDATE SET 
        linkedin_url = excluded.linkedin_url,
        x_username = excluded.x_username,
        updated_at = CURRENT_TIMESTAMP
    `,
      [userId, linkedin, x_username],
    );

    const embed = new EmbedBuilder()
      .setTitle("🐙 Link Your GitHub Account")
      .setDescription(
        "Click the secure link below to authorize CursorSL to read your public GitHub profile. This acts as verification and enables your Build Streaks! 🔥",
      )
      .setColor("#EAB308");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Authorize with GitHub")
        .setURL(oauthUrl),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: [MessageFlags.Ephemeral],
    });
  },
};

const profileImageCommand = {
  name: "profile",
  slashData: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your generated Developer Image Card.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user whose profile you want to view.")
        .setRequired(false),
    ),

  async slashExecute(interaction, { db }) {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userId = targetUser.id;

    const profile = await db.get(
      "SELECT level, github_username, github_verified, featured_builds FROM user_profiles WHERE user_id = ?",
      [userId],
    );

    if (!profile || profile.github_verified === 0) {
      await interaction.editReply({
        content: `${targetUser.id === interaction.user.id ? "You haven't" : "This user hasn't"} fully set up and verified their profile yet! Please run \`/setup-profile\`.`,
      });
      return;
    }

    let featuredBuilds = [];
    if (profile.featured_builds) {
      try {
        featuredBuilds = JSON.parse(profile.featured_builds);
      } catch (e) {
        // eslint-disable-next-line no-empty
      }
    }

    const streak = await calculateBuildStreak(profile.github_username);

    // Generate the Image
    const buffer = await generateProfileCard({
      username: targetUser.username,
      avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
      level: profile.level || 1,
      github: profile.github_username,
      featuredBuilds: featuredBuilds,
      streak: streak,
    });

    const attachment = new AttachmentBuilder(buffer, { name: "profile.png" });
    await interaction.editReply({ files: [attachment] });
  },
};

const profileDetailedCommand = {
  name: "profile-detailed",
  slashData: new SlashCommandBuilder()
    .setName("profile-detailed")
    .setDescription(
      "View a detailed text embed of your professional stats and GitHub streak.",
    )
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user whose stats you want to view.")
        .setRequired(false),
    ),

  async slashExecute(interaction, { db }) {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userId = targetUser.id;

    const profile = await db.get(
      "SELECT * FROM user_profiles WHERE user_id = ?",
      [userId],
    );
    const workflowsCount = await db.get(
      "SELECT COUNT(*) as count FROM workflows WHERE user_id = ?",
      [userId],
    );

    if (!profile || profile.github_verified === 0) {
      await interaction.editReply({
        content: `Profile not verified. Run \`/setup-profile\` first.`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Calculate GitHub Streak live
    const streak = await calculateBuildStreak(profile.github_username);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Details: ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "🏆 Level", value: `${profile.level || 1}`, inline: true },
        {
          name: "💬 XP (Chat/Voice)",
          value: `${profile.chat_xp || 0} / ${profile.voice_xp || 0}`,
          inline: true,
        },
        { name: "🔥 GitHub Streak", value: `${streak} days`, inline: true },
        {
          name: "🚀 Shipped Projects",
          value: `${profile.shipped_count || 0}`,
          inline: true,
        },
        {
          name: "📚 Workflows",
          value: `${workflowsCount.count}`,
          inline: true,
        },
        {
          name: "💻 Stack",
          value: profile.stack || "Not configured",
          inline: false,
        },
      )
      .setColor("#5865F2");

    let socials = `[GitHub](https://github.com/${profile.github_username})`;
    if (profile.linkedin_url)
      socials += ` | [LinkedIn](${profile.linkedin_url})`;
    if (profile.x_username)
      socials += ` | [X/Twitter](https://x.com/${profile.x_username})`;

    embed.addFields({ name: "🔗 Links", value: socials, inline: false });

    await interaction.editReply({ embeds: [embed] });
  },
};

// Helper to render the Unified Builds Dashboard based on mode
async function renderBuildsDashboard(interaction, db, mode = "summary") {
  const userId = interaction.user.id;
  const projects = await db.all("SELECT * FROM user_projects WHERE user_id = ?", [userId]);
  
  const embed = new EmbedBuilder().setTimestamp();
  const rows = [];

  // 1. Selector Row (Always present)
  const selectorRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dashboard_view_selector")
      .setPlaceholder("Switch View Mode")
      .addOptions([
        { label: "Project Repository (Summary)", value: "summary", description: "List all your projects.", emoji: "📦" },
        { label: "Featured Selection", value: "featured", description: "Select 3 projects for your profile card.", emoji: "🌟" },
        { label: "Project Explorer", value: "explorer", description: "Explore details, edit, and ship projects.", emoji: "🔍" },
      ])
  );
  rows.push(selectorRow);

  if (mode === "summary") {
    embed.setTitle("📦 Your Project Repository")
         .setDescription(projects.length > 0 
           ? `You have **${projects.length}** projects:\n${projects.map((p, i) => `${i + 1}. **${p.name}**`).join("\n")}`
           : "Your repository is empty! Add projects to start building your profile.")
         .setColor("#6366F1");
    
    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("add_to_list_btn").setLabel("Add New Project").setStyle(ButtonStyle.Success),
    );
    rows.push(btnRow);

  } else if (mode === "featured") {
    if (projects.length === 0) {
      embed.setTitle("🌟 Featured Selection")
           .setDescription("❌ You need projects in your list before you can feature them.")
           .setColor("#EF4444");
    } else {
      embed.setTitle("🌟 Feature Your Builds")
           .setDescription("Pick up to 3 projects to showcase on your profile card.")
           .setColor("#10B981");
      
      rows.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("feature_select_menu")
          .setPlaceholder("Select your top 3")
          .setMinValues(1)
          .setMaxValues(Math.min(projects.length, 3))
          .addOptions(projects.map(p => ({ label: p.name, value: p.name })))
      ));
    }

  } else if (mode === "explorer") {
    if (projects.length === 0) {
      embed.setTitle("🔍 Project Explorer")
           .setDescription("❌ No projects to explore.")
           .setColor("#EF4444");
    } else {
      let state = explorerState.get(userId) || { currentIndex: 0 };
      if (state.currentIndex >= projects.length) state.currentIndex = 0;
      explorerState.set(userId, state);

      const p = projects[state.currentIndex];
      embed.setTitle(`🔍 Project: ${p.name}`)
           .setDescription(p.description || "No description provided.")
           .addFields(
              { name: "Category", value: p.category || "Uncategorized", inline: true },
              { name: "Stack", value: p.stack || "Not specified", inline: true },
              { name: "Link", value: p.demo_link || "None", inline: false }
           )
           .setColor("#F59E0B");
      
      if (p.logo_url) embed.setThumbnail(p.logo_url);

      embed.setFooter({ text: `Project ${state.currentIndex + 1} of ${projects.length}` });

      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("explorer_prev").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(projects.length <= 1),
        new ButtonBuilder().setCustomId("explorer_next").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled(projects.length <= 1),
        new ButtonBuilder().setCustomId("explorer_edit").setLabel("Edit").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("explorer_ship").setLabel("Ship to Showcase").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("explorer_delete").setLabel("Delete").setStyle(ButtonStyle.Danger),
      );
      rows.push(navRow);
    }
  }

  const options = { embeds: [embed], components: rows, flags: [MessageFlags.Ephemeral] };
  if (interaction.isCommand() || interaction.isModalSubmit()) {
    if (interaction.deferred || interaction.replied) await interaction.editReply(options);
    else await interaction.reply(options);
  } else {
    await interaction.update(options);
  }
}

const updateStackCommand = {
  name: "update-stack",
  slashData: new SlashCommandBuilder()
    .setName("update-stack")
    .setDescription(
      "Update your technical stack (e.g., 'React, Supabase, Cursor AI').",
    )
    .addStringOption((option) =>
      option
        .setName("stack")
        .setDescription("List your main tools and languages.")
        .setRequired(true),
    ),

  async slashExecute(interaction, { db }) {
    const stack = interaction.options.getString("stack");
    const userId = interaction.user.id;
    // We only update if the row exists, setup-profile must be run first
    const changes = await db.run(
      "UPDATE user_profiles SET stack = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      [stack, userId],
    );

    if (changes.changes === 0) {
      return interaction.reply({
        content: "Please run `/setup-profile` before updating your stack.",
        flags: [MessageFlags.Ephemeral],
      });
    }
    await interaction.reply({
      content: `Stack updated to: **${stack}**`,
      flags: [MessageFlags.Ephemeral],
    });
  },
};
const buildsManagerCommand = {
  name: "builds",
  slashData: new SlashCommandBuilder()
    .setName("builds")
    .setDescription("Manage your master list of projects and builds."),

  async slashExecute(interaction, { db }) {
    await renderBuildsDashboard(interaction, db, "summary");
  },
};

const shipCommand = {
  name: "ship",
  slashData: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Quickly add a new build/product to your profile."),

  async slashExecute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("add_build_modal")
      .setTitle("Ship a New Product");

    const nameInput = new TextInputBuilder()
      .setCustomId("build_name")
      .setLabel("Product Name")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. CursorSL Bot")
      .setRequired(true)
      .setMaxLength(25);

    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },
};

module.exports = {
  name: "profile",
  commands: [
    setupProfileCommand,
    profileImageCommand,
    profileDetailedCommand,
    updateStackCommand,
    buildsManagerCommand,
    shipCommand,
  ],
  async setup({ client, db, logger }) {
      client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

      const userId = interaction.user.id;
      const relevantIds = [
        "add_to_list_btn", "remove_from_list_btn", "add_project_step1_modal", "add_project_step2_category",
        "add_project_step3_stack", "feature_select_menu", "delete_project_menu", "add_build_modal",
        "dashboard_view_selector", "explorer_prev", "explorer_next", "explorer_edit", "explorer_ship", "explorer_delete"
      ];

      if (interaction.customId && !relevantIds.includes(interaction.customId)) return;

      try {
        // --- BUTTONS ---
        if (interaction.isButton()) {
          if (interaction.customId === "add_to_list_btn") {
            const modal = new ModalBuilder().setCustomId("add_project_step1_modal").setTitle("Step 1: Project Details");
            modal.addComponents(
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_name").setLabel("Project Name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(25)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_desc").setLabel("Description").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(100)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_link").setLabel("Demo / Repo Link").setStyle(TextInputStyle.Short).setRequired(false)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_logo").setLabel("Logo URL").setStyle(TextInputStyle.Short).setRequired(false)),
            );
            await interaction.showModal(modal);
          } else if (interaction.customId === "explorer_prev" || interaction.customId === "explorer_next") {
            const projects = await db.all("SELECT id FROM user_projects WHERE user_id = ?", [userId]);
            let state = explorerState.get(userId) || { currentIndex: 0 };
            if (interaction.customId === "explorer_prev") state.currentIndex = (state.currentIndex - 1 + projects.length) % projects.length;
            else state.currentIndex = (state.currentIndex + 1) % projects.length;
            explorerState.set(userId, state);
            await renderBuildsDashboard(interaction, db, "explorer");
          } else if (interaction.customId === "explorer_delete") {
            const projects = await db.all("SELECT id, name FROM user_projects WHERE user_id = ?", [userId]);
            const state = explorerState.get(userId) || { currentIndex: 0 };
            const p = projects[state.currentIndex];
            await db.run("DELETE FROM user_projects WHERE id = ?", [p.id]);
            await interaction.reply({ content: `🗑️ Deleted project **${p.name}**`, flags: [MessageFlags.Ephemeral] });
            await renderBuildsDashboard(interaction, db, "explorer");
          } else if (interaction.customId === "explorer_edit") {
            const projects = await db.all("SELECT * FROM user_projects WHERE user_id = ?", [userId]);
            const state = explorerState.get(userId) || { currentIndex: 0 };
            const p = projects[state.currentIndex];

            const modal = new ModalBuilder().setCustomId("add_project_step1_modal").setTitle(`Edit: ${p.name}`);
            modal.addComponents(
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_name").setLabel("Project Name").setStyle(TextInputStyle.Short).setValue(p.name).setRequired(true).setMaxLength(25)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_desc").setLabel("Description").setStyle(TextInputStyle.Paragraph).setValue(p.description || "").setRequired(false).setMaxLength(100)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_link").setLabel("Demo / Repo Link").setStyle(TextInputStyle.Short).setValue(p.demo_link || "").setRequired(false)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project_logo").setLabel("Logo URL").setStyle(TextInputStyle.Short).setValue(p.logo_url || "").setRequired(false)),
            );
            await interaction.showModal(modal);
          } else if (interaction.customId === "explorer_ship") {
             // Quick integration with showcase logic (calling from here requires interaction with showcase channel)
             // We'll just suggest they use /showcase for now or implement direct ship if possible.
             await interaction.reply({ content: "🚀 Use `/showcase` for now to share this with the community! (Direct ship coming soon)", flags: [MessageFlags.Ephemeral] });
          }
        }

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
          if (interaction.customId === "dashboard_view_selector") {
            await renderBuildsDashboard(interaction, db, interaction.values[0]);
          } else if (interaction.customId === "add_project_step2_category") {
            const draft = projectDrafts.get(userId);
            if (!draft) return interaction.reply({ content: "Session expired.", flags: [MessageFlags.Ephemeral] });
            draft.category = interaction.values[0];
            const row = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("add_project_step3_stack")
                .setPlaceholder("Select Tech Stack")
                .setMinValues(1)
                .setMaxValues(5)
                .addOptions(TECH_STACK_OPTIONS.map(s => ({ label: s.label, value: s.value })))
            );
            await interaction.update({ content: `✅ Category: **${draft.category}**\n**Step 3: Tech Stack**`, components: [row] });
          } else if (interaction.customId === "add_project_step3_stack") {
            const draft = projectDrafts.get(userId);
            if (!draft) return interaction.reply({ content: "Session expired.", flags: [MessageFlags.Ephemeral] });
            draft.stack = interaction.values.join(", ");
            // Upsert Logic (Check name/id for update vs insert)
            // If the modal was an "Edit", we should ideally have the ID. 
            // For now, if Name matches, we update.
            const existing = await db.get("SELECT id FROM user_projects WHERE user_id = ? AND name = ?", [userId, draft.name]);
            if (existing) {
              await db.run("UPDATE user_projects SET description = ?, demo_link = ?, logo_url = ?, category = ?, stack = ? WHERE id = ?", [draft.description, draft.demo_link, draft.logo_url, draft.category, draft.stack, existing.id]);
            } else {
              await db.run("INSERT INTO user_projects (user_id, name, description, demo_link, logo_url, category, stack) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, draft.name, draft.description, draft.demo_link, draft.logo_url, draft.category, draft.stack]);
            }
            projectDrafts.delete(userId);
            await interaction.update({ content: `🎊 **Success!** Project **${draft.name}** saved.`, components: [] });
            await renderBuildsDashboard(interaction, db, "summary");
          } else if (interaction.customId === "feature_select_menu") {
            await db.run("UPDATE user_profiles SET featured_builds = ? WHERE user_id = ?", [JSON.stringify(interaction.values), userId]);
            await interaction.reply({ content: `✅ Featured projects updated!`, flags: [MessageFlags.Ephemeral] });
          }
        }

        // --- MODAL SUBMIT ---
        if (interaction.isModalSubmit()) {
           if (interaction.customId === "add_project_step1_modal") {
             const name = interaction.fields.getTextInputValue("project_name");
             // Duplicate check for new projects (unless it's an edit - but Modal ID is same)
             // We'll check if the project exists in projectDrafts or DB
             const project = {
               name,
               description: interaction.fields.getTextInputValue("project_desc") || null,
               demo_link: interaction.fields.getTextInputValue("project_link") || null,
               logo_url: interaction.fields.getTextInputValue("project_logo") || null,
             };
             projectDrafts.set(userId, project);
             const row = new ActionRowBuilder().addComponents(
               new StringSelectMenuBuilder()
                 .setCustomId("add_project_step2_category")
                 .setPlaceholder("Select Category")
                 .addOptions(PROJECT_CATEGORIES.map(c => ({ label: c.label, value: c.value })))
             );
             await interaction.reply({ content: `✅ Details for **${name}** saved.\n**Step 2: Category**`, components: [row], flags: [MessageFlags.Ephemeral] });
           }
        }
      } catch (err) {
        logger.error("Interaction handler error", { error: err.message });
      }
    });

    logger.info(
      "Profile V2 cog setup complete (Verification, Images, Streaks active)",
    );
  },
};
