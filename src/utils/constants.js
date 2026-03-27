/**
 * Constants for the CursorSL Project Ecosystem.
 */

const PROJECT_CATEGORIES = [
  { label: "🌐 Web App", value: "web" },
  { label: "🤖 AI / Machine Learning", value: "ai" },
  { label: "📱 Mobile App", value: "mobile" },
  { label: "🎮 Game", value: "game" },
  { label: "📟 Discord Bot", value: "bot" },
  { label: "🛠️ Developer Tool / CLI", value: "tool" },
  { label: "📁 Other", value: "other" },
];

const TECH_STACK_OPTIONS = [
  { label: "Cursor AI", value: "cursor" },
  { label: "React / Next.js", value: "react" },
  { label: "Node.js / Express", value: "node" },
  { label: "Python", value: "python" },
  { label: "Supabase / Firebase", value: "backend_as_service" },
  { label: "Tailwind CSS", value: "tailwind" },
  { label: "TypeScript", value: "typescript" },
  { label: "PostgreSQL / SQLite", value: "database" },
  { label: "Rust / C++", value: "low_level" },
  { label: "Docker / Cloud", value: "devops" },
];

module.exports = {
  PROJECT_CATEGORIES,
  TECH_STACK_OPTIONS,
};
