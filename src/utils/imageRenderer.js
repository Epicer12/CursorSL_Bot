const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("node:path");
const { getRecentRepos } = require("./github");

/**
 * Generates the Cyber-themed Dev Card for the /profile command.
 * @param {Object} userData
 * @returns {Promise<Buffer>} The PNG buffer
 */
async function generateProfileCard({
  username,
  avatarUrl,
  level,
  github,
  featuredBuilds = [],
  streak = 0,
}) {
  const width = 800;
  const height = 350; // Increased height for better readability
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // --- Background ---
  ctx.fillStyle = "#0A0B10"; // Cyber dark
  ctx.fillRect(0, 0, width, height);

  // Minimal Grid
  ctx.strokeStyle = "#161621";
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Accent corners (moved in by 4px for visibility)
  ctx.strokeStyle = "#00FFAA"; // Neon Cyan/Green
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 24);
  ctx.lineTo(4, 4);
  ctx.lineTo(24, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width - 4, height - 24);
  ctx.lineTo(width - 4, height - 4);
  ctx.lineTo(width - 24, height - 4);
  ctx.stroke();

  // --- Typography Settings ---
  const fontFamily = "'Courier New', Courier, monospace";

  // --- Avatar Rendering ---
  const avatarSize = 100; // Scaled up
  const avatarX = 50;
  const avatarY = 40;

  try {
    const avatarImage = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2,
      true,
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Neon ring
    ctx.strokeStyle = "#00FFAA";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2 + 6,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } catch (error) {
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2,
      true,
    );
    ctx.fill();
  }

  // --- User Info ---
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 40px ${fontFamily}`; // Scaled up
  ctx.fillText(username, 170, 80);

  // GitHub Logo (Local)
  try {
    const ghLogoPath = path.join(process.cwd(), "src", "images", "github.png");
    const ghLogo = await loadImage(ghLogoPath);
    ctx.drawImage(ghLogo, 170, 100, 24, 24);
  } catch (e) {
    // Fallback if local fails
  }

  ctx.fillStyle = "#9CA3AF";
  ctx.font = `italic 20px ${fontFamily}`; // Scaled up
  const githubText = github ? `github.com/${github}` : "Unlinked";
  ctx.fillText(githubText, 205, 120);

  // --- Level Badge & Streak Badge ---
  const badgeX = 640;
  const badgeY = 40;

  // Level Box
  ctx.strokeStyle = "#00FFAA";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, 120, 80, 8);
  ctx.stroke();
  ctx.fillStyle = "#07120F";
  ctx.fill();

  ctx.fillStyle = "#00FFAA";
  ctx.font = `italic bold 26px ${fontFamily}`; // XP logo-like text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("XP", badgeX + 35, badgeY + 42); // Slightly offset for italic

  ctx.font = `bold 36px ${fontFamily}`;
  ctx.fillText(level.toString(), badgeX + 85, badgeY + 42);

  // Streak Box (Side by side with Level)
  if (streak > 0) {
    const sBadgeX = badgeX - 140;
    ctx.strokeStyle = "#FFAA00";
    ctx.beginPath();
    ctx.roundRect(sBadgeX, badgeY, 120, 80, 8);
    ctx.stroke();
    ctx.fillStyle = "#121007";
    ctx.fill();

    // Fire Icon in Badge (40x40, no "STREAK" text)
    try {
      const fireLogoPath = path.join(
        process.cwd(),
        "src",
        "images",
        "fire.png",
      );
      const fireImg = await loadImage(fireLogoPath);
      const fireCanvas = createCanvas(fireImg.width, fireImg.height);
      const fCtx = fireCanvas.getContext("2d");
      fCtx.drawImage(fireImg, 0, 0);
      fCtx.globalCompositeOperation = "source-in";
      fCtx.fillStyle = "#FFAA00";
      fCtx.fillRect(0, 0, fireImg.width, fireImg.height);
      ctx.drawImage(fireCanvas, sBadgeX + 10, badgeY + 20, 40, 40);
    } catch (e) {
      // Fallback
    }

    ctx.fillStyle = "#FFAA00";
    ctx.font = `bold 36px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(streak.toString(), sBadgeX + 85, badgeY + 42);
  }
  ctx.textAlign = "left";

  // --- Projects Section ---
  let projectsToDisplay = featuredBuilds;

  // Automagic Fallback Fetch
  if (!projectsToDisplay || projectsToDisplay.length === 0) {
    if (github) {
      projectsToDisplay = await getRecentRepos(github, 3);
    }
  }

  ctx.fillStyle = "#00FFAA";
  ctx.font = `bold 22px ${fontFamily}`;
  ctx.fillText(">> PROJECTS [SYS.DAT]", 50, 200);

  ctx.font = `18px ${fontFamily}`;
  ctx.fillStyle = "#E5E7EB";

  if (projectsToDisplay && projectsToDisplay.length > 0) {
    let yPos = 235;
    for (let i = 0; i < Math.min(projectsToDisplay.length, 3); i++) {
      ctx.fillStyle = "#3B82F6";
      ctx.fillText(">", 50, yPos);

      ctx.fillStyle = "#E5E7EB";
      let pName = projectsToDisplay[i];
      if (pName.length > 30) pName = pName.substring(0, 28) + "..";
      ctx.fillText(pName, 75, yPos);
      yPos += 35; // Move down for vertical list
    }
  } else {
    ctx.fillStyle = "#6B7280";
    ctx.font = `italic 16px ${fontFamily}`;
    ctx.fillText("NO REPOSITORIES DETECTED", 50, 240);
  }

  // --- Bottom Right Cursor Logo ---
  try {
    const cursorLogoPath = path.join(
      process.cwd(),
      "src",
      "images",
      "cursor.svg",
    );
    const cursorLogo = await loadImage(cursorLogoPath);

    // Restore to smaller brand logo size
    // Shorten height by 5px
    ctx.drawImage(cursorLogo, 620, 270, 160, 45);
  } catch (e) {
    ctx.fillStyle = "#6B7280";
    ctx.font = `18px ${fontFamily}`;
    ctx.fillText("CURSOR_SL", 640, 310);
  }

  return canvas.encode("png");
}

module.exports = {
  generateProfileCard,
};
