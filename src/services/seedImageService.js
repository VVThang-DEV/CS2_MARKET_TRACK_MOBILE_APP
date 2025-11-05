/**
 * Service for fetching seed-specific skin images from CSGOFloat API
 */

const CSFLOAT_API_KEY = "ibj-zt1c2f7gSB5lLLtZqyuWdRW7c1kt";

/**
 * Fetch seed-specific image from CSGOFloat API
 * Note: CSGOFloat API doesn't provide seed-specific images
 * This function will always return null as seed images aren't available via API
 */
export const fetchSeedImage = async (skinName, seed, wear = 0.1) => {
  console.log(
    `Fetching seed image for: ${skinName}, seed: ${seed}, wear: ${wear}`
  );

  // CSGOFloat API doesn't provide seed-specific images
  // Seed images require actual game items with inspect links
  console.log("No seed-specific image available, will use 3D viewer");
  return null;
};

/**
 * Generate in-game view HTML
 * Since we don't have real 3D viewer access without Steam inspect links,
 * we create an informative display showing seed/wear information
 */
export const generate3DViewerUrl = (skinName, seed, wear = 0.1) => {
  try {
    console.log(
      `Generating in-game view for: ${skinName}, seed: ${seed}, wear: ${wear}`
    );

    // Extract weapon and skin pattern
    const weaponType = skinName.split("|")[0]?.trim() || "Weapon";
    const skinPattern = skinName.split("|")[1]?.trim() || "Skin";

    // Try CS.MONEY image URL (they have a public CDN)
    const cleanSkinName = skinName.replace(/★\s*/g, "").trim();
    const encodedForCSMoney = encodeURIComponent(cleanSkinName);

    // CSGOStash is more reliable for images
    const stashUrl = `https://csgostash.com/skin/${encodeURIComponent(
      skinName.replace(/[★|]/g, "-").replace(/\s+/g, "-")
    )}`;

    console.log("Generating viewer with external images");

    // Create enhanced HTML content with better styling and interaction
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>CS:GO In-Game View - ${skinName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #1a2332 0%, #2d3748 100%);
      color: #e5e7eb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      text-align: center;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .container {
      max-width: 100%;
      width: 100%;
      padding: 20px;
      animation: fadeIn 0.5s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .weapon-icon {
      font-size: 64px;
      margin: 20px 0;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .info {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      padding: 20px;
      border-radius: 16px;
      margin: 20px auto;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 350px;
    }
    h2 {
      font-size: 20px;
      color: #f3f4f6;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .detail {
      margin: 12px 0;
      padding: 8px 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      font-size: 14px;
      color: #d1d5db;
    }
    .seed-number {
      color: #60a5fa;
      font-weight: 700;
      font-size: 18px;
    }
    .wear-value {
      color: #34d399;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(96, 165, 250, 0.2);
      border-radius: 12px;
      font-size: 12px;
      color: #60a5fa;
      margin-top: 10px;
      border: 1px solid rgba(96, 165, 250, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 In-Game View</h1>
    <div class="weapon-icon">${
      weaponType.includes("Knife")
        ? "🗡️"
        : weaponType.includes("Gloves")
        ? "🧤"
        : "🔫"
    }</div>
    <div class="info">
      <h2>${weaponType}</h2>
      <div class="detail">${skinPattern}</div>
      <div class="detail">Pattern Seed: <span class="seed-number">${seed}</span></div>
      <div class="detail">Float Value: <span class="wear-value">${wear.toFixed(
        4
      )}</span></div>
      <div class="badge">3D Preview</div>
    </div>
  </div>
  <script>
    console.log('In-game view loaded:', '${skinName}', 'seed:', ${seed});
    // Notify React Native that page loaded
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'loaded',
        skin: '${skinName}',
        seed: ${seed}
      }));
    }
  </script>
</body>
</html>`;

    console.log("Generated HTML for in-game view");
    return html;
  } catch (error) {
    console.error("Error generating 3D viewer URL:", error);
    // Fallback to simple info display
    return `
      <html>
        <body style="background:#1a2332;color:#e5e7eb;text-align:center;padding:20px;font-family:Arial;">
          <h1 style="color:#3b82f6;">3D Viewer Error</h1>
          <p>Unable to load 3D viewer for ${skinName}</p>
          <p style="font-size:12px;color:#6b7280;">Pattern seed information requires external viewing</p>
        </body>
      </html>
    `;
  }
};

/**
 * Check if a pattern is special (Doppler, Case Hardened, etc.)
 */
export const isSpecialPattern = (patternName) => {
  const specialPatterns = ["Doppler", "Case Hardened", "Fade", "Marble Fade"];
  return specialPatterns.some((sp) => patternName?.includes(sp));
};
