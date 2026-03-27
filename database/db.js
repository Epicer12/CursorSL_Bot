const path = require("node:path");
const fs = require("node:fs/promises");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

async function initializeDatabase(databasePath, logger) {
  const resolvedPath = path.resolve(databasePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

  const db = await open({
    filename: resolvedPath,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      stack TEXT,
      shipped_count INTEGER NOT NULL DEFAULT 0,
      challenge_wins INTEGER NOT NULL DEFAULT 0,
      github_username TEXT UNIQUE,
      github_verified BOOLEAN DEFAULT 0,
      verification_token TEXT,
      featured_builds TEXT,
      linkedin_url TEXT,
      x_username TEXT,
      chat_xp INTEGER DEFAULT 0,
      voice_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS build_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      message_id TEXT,
      channel_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      luma_url TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      thread_id TEXT,
      announcement_message_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      upvotes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      demo_link TEXT,
      category TEXT,
      stack TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration for Profile V2 & V3 (adding columns to existing tables)
  const columns = await db.all("PRAGMA table_info(user_profiles)");
  const columnNames = columns.map((c) => c.name);

  if (!columnNames.includes("github_username")) {
    logger.info("Migrating database for Profile V2...");
    const alterQueries = [
      "ALTER TABLE user_profiles ADD COLUMN github_username TEXT",
      "ALTER TABLE user_profiles ADD COLUMN github_verified BOOLEAN DEFAULT 0",
      "ALTER TABLE user_profiles ADD COLUMN verification_token TEXT",
      "ALTER TABLE user_profiles ADD COLUMN featured_builds TEXT",
      "ALTER TABLE user_profiles ADD COLUMN linkedin_url TEXT",
      "ALTER TABLE user_profiles ADD COLUMN x_username TEXT",
      "ALTER TABLE user_profiles ADD COLUMN chat_xp INTEGER DEFAULT 0",
      "ALTER TABLE user_profiles ADD COLUMN voice_xp INTEGER DEFAULT 0",
      "ALTER TABLE user_profiles ADD COLUMN level INTEGER DEFAULT 1",
    ];

    for (const query of alterQueries) {
      try {
        await db.exec(query);
      } catch (e) {
        logger.warn("Migration step failed or already applied", {
          query,
          error: e.message,
        });
      }
    }
  }

  // Migration for user_projects rich metadata
  const projectColumns = await db.all("PRAGMA table_info(user_projects)");
  const projectColumnNames = projectColumns.map((c) => c.name);

  if (!projectColumnNames.includes("logo_url")) {
    logger.info("Migrating user_projects for Rich Metadata...");
    const alterQueries = [
      "ALTER TABLE user_projects ADD COLUMN description TEXT",
      "ALTER TABLE user_projects ADD COLUMN logo_url TEXT",
      "ALTER TABLE user_projects ADD COLUMN demo_link TEXT",
      "ALTER TABLE user_projects ADD COLUMN category TEXT",
      "ALTER TABLE user_projects ADD COLUMN stack TEXT",
    ];

    for (const query of alterQueries) {
      try {
        await db.exec(query);
      } catch (e) {
        // Silently skip if already exists
      }
    }
  }

  logger.info("Database initialized", { databasePath: resolvedPath });
  return db;
}

module.exports = { initializeDatabase };
