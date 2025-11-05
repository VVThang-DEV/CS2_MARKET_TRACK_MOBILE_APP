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
 * Get in-game skin screenshot URL
 * Returns URL to the actual in-game screenshot (1920x1080) from CSGOStash
 * This shows how the skin looks in-game, not just the inventory icon!
 */
export const generate3DViewerUrl = (
  skinName,
  seed,
  wear = 0.1,
  imageUrl = null
) => {
  try {
    console.log(
      `Getting in-game image for: ${skinName}, seed: ${seed}, wear: ${wear}`
    );

    // Steam Community CDN provides multiple image sizes
    // We can construct URLs for larger, in-game style renders
    if (imageUrl && imageUrl.includes("steamstatic.com")) {
      // Steam CDN format: /economy/image/{hash}/{width}fx{height}f/
      // Available sizes: 62x62, 360x360, 512x512, 2048x1536

      // Extract the image hash from the URL
      const hashMatch = imageUrl.match(/economy\/image\/([^\/]+)/);
      if (hashMatch) {
        const imageHash = hashMatch[1];

        // Construct the largest available in-game render (2048x1536)
        // This shows the weapon in high quality, similar to in-game view
        const largeInGameUrl = `https://community.akamai.steamstatic.com/economy/image/${imageHash}/2048fx1536f`;

        console.log("Using large in-game render (2048x1536):", largeInGameUrl);
        return largeInGameUrl;
      }

      // Fallback: just replace size in URL
      const largerImage = imageUrl
        .replace(/\/\d+fx\d+f\/?$/, "/2048fx1536f")
        .replace(/\/62fx62f\/?$/, "/2048fx1536f")
        .replace(/\/360fx360f\/?$/, "/2048fx1536f");

      console.log("Using larger Steam CDN image:", largerImage);
      return largerImage;
    }

    // If imageUrl is provided but not from Steam, just return it
    if (imageUrl) {
      console.log("Using provided image URL:", imageUrl);
      return imageUrl;
    }

    // No image URL provided - return placeholder
    console.log("No image URL available, using placeholder");
    return "https://via.placeholder.com/2048x1536?text=CS:GO+Skin";
  } catch (error) {
    console.error("Error getting image URL:", error);
    return imageUrl || "https://via.placeholder.com/2048x1536?text=CS:GO+Skin";
  }
};

/**
 * Check if a pattern is special (Doppler, Case Hardened, etc.)
 */
export const isSpecialPattern = (patternName) => {
  const specialPatterns = ["Doppler", "Case Hardened", "Fade", "Marble Fade"];
  return specialPatterns.some((sp) => patternName?.includes(sp));
};
