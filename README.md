# 🏝️ CursorSL: The Official Community Bot

Welcome to the (Not-official yet) Discord bot for the **Cursor Community Sri Lanka**! 🇱🇰

This bot is a place to celebrate our "Ships," share our specialized Cursor workflows, and build our professional identities within the community. Built with `discord.js` and a modular "Cog" system, it's designed to be easily extensible.

---

## 🌟 Key Features

### 🚀 Build Showcase (`/ship`)
The heart of our community. Submit your projects, link your GitHub or live demos, and get community feedback (🔥/💡/🚀). 

### 📚 Workflow Showcase (`/share-workflow`)
Share your killer `.cursorrules` or system prompts! Use `/workflows` to browse what others are using to stay productive.

### 🪪 Cursor Profile (`/profile`)
Your professional snapshot in the server. Track your "Ships," workflows shared, and maintain your "Stack" so others know what technologies you've mastered.

---

## 🛠️ Getting Started

### Installation
1.  **Clone & Install**:
    ```bash
    git clone https://github.com/Epicer12/CursorSL_Bot.git
    cd CursorSL_Bot
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env` and fill in the details (Token, Client ID, and Channel IDs).

3.  **Run the Bot**:
    ```bash
    npm start
    ```

---

## 🤝 How to Contribute & CI/CD

We **love** contributions! To keep our code clean and stable, we've implemented some automation:

### ⚙️ CI/CD Pipeline
- **Automated Checks**: Every Pull Request automatically runs a syntax and linting check using GitHub Actions. Your code must pass these checks (✅) before it can be merged.
- **Auto-PRs**: Whenever you push code to a feature branch, a Pull Request to the `dev` branch is automatically opened for you.
- **Branch Protection**: We use `main` and `dev` branches for stable releases. Direct pushes are disabled—please use the PR flow!

### 🗺️ Feature Roadmap
- [ ] **Hackathon Mode**: Team registration and live leaderboards.
- [ ] **Project Graveyard**: A place to resurrect abandoned project ideas.
- [ ] **Monthly Recap Generator**: Auto-compiling the month's highlights into a permanent recap.
- [ ] **Stack Census**: Periodic polls to map the community's tool usage.

---

Created with ❤️ by the **Cursor Community Sri Lanka**.
