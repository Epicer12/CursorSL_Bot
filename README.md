# 🏝️ CursorSL: The Official Community Bot

Welcome to the (Not-official yet) Discord bot for the **Cursor Community Sri Lanka**! 🇱🇰

This bot is designed to celebrate our "Ships," share our specialized Cursor workflows, and build our professional identities within the community. Built with `discord.js` and a modular "Cog" system, it's designed to be easily extensible by anyone in the community.

---

## 🌟 Key Features

### 🚀 Build Showcase (`/ship`)

The heart of our community. Submit your projects, link your GitHub or live demos, and get community feedback (🔥/💡/🚀). Top builds are automatically pinned monthly!

### 📚 Workflow Showcase (`/share-workflow`)

Got a killer `.cursorrules` file or a hidden system prompt? Share it with the community! Use `/workflows` to browse what others are using to stay productive.

### 🪪 Cursor Profile (`/profile`)

Your professional snapshot in the server. Track your total "Ships," workflows shared, and maintain your "Stack" so others know what technologies you've mastered.

### 📅 Event Management (Luma Sync)

Seamlessly syncs with our Luma events to create Discord announcement countdowns and dedicated event threads.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v20 or higher)
- A Discord Bot Token (from the [Developer Portal](https://discord.com/developers/applications))

### Installation

1.  **Clone & Install**:

    ```bash
    git clone https://github.com/Epicer12/CursorSL_Bot.git
    cd CursorSL_Bot
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env` and fill in the details:

    ```bash
    DISCORD_TOKEN=your_token_here
    CLIENT_ID=your_id_here
    SHOWCASE_CHANNEL_ID=your_channel_id
    WORKFLOW_CHANNEL_ID=your_channel_id
    ```

3.  **Run the Bot**:
    ```bash
    npm start
    ```

---

## 🤝 How to Contribute

We **love** contributions! Whether it's fixing a bug, suggesting a feature, or building a whole new "Cog," here's how you can help:

### The "Cog" System

Our bot is modular. Every feature is a separate "Cog" in the `cogs/` directory.

1.  **Create a Cog**: Add a new `.js` file to `cogs/`.
2.  **Define Commands**: Use the `commands` array to add slash or prefix commands.
3.  **Automatic Loading**: The bot detects and loads new files in `cogs/` automatically on startup.

### Feature Roadmap

- [ ] **Hackathon Mode**: Team registration and live leaderboards.
- [ ] **Project Graveyard**: A place to resurrect abandoned project ideas.
- [ ] **Monthly Recap Generator**: Auto-compiling the month's highlights.

---

## 🏗️ Project Structure

- `src/bot.js` - Main client initialization and event handlers.
- `cogs/` - Feature modules (The best place to contribute!).
- `database/` - SQLite schema and initialization.
- `config.js` - Centralized config and validation.

---

Created with ❤️ by the **Cursor Community Sri Lanka**.
