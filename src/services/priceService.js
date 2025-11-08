/**
 * Price Service - Fetch live CS:GO skin prices from CSGOFloat API
 */

import { CSFLOAT_API_KEY } from "@env";

const CSFLOAT_PRICE_API = "https://csfloat.com/api/v1/listings/price-list";

/**
 * Fetch price data for all skins from CSGOFloat
 * @returns {Promise<Object>} Price data keyed by market_hash_name
 */
export async function fetchPriceData() {
  try {
    console.log("Fetching live prices from CSGOFloat...");
    const response = await fetch(CSFLOAT_PRICE_API, {
      headers: {
        Authorization: `Bearer ${CSFLOAT_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`CSGOFloat API error: ${response.status}`);
    }

    const dataArray = await response.json();

    // Convert array to object keyed by market_hash_name
    const priceMap = {};
    dataArray.forEach((item) => {
      priceMap[item.market_hash_name] = {
        price: item.min_price / 100, // Convert cents to dollars
        min: item.min_price / 100,
        avg: item.min_price / 100,
        max: item.min_price / 100,
        qty: item.qty,
      };
    });

    console.log(`Loaded prices for ${Object.keys(priceMap).length} items`);
    return priceMap;
  } catch (error) {
    console.error("Error fetching price data:", error);
    return null;
  }
}
/**
 * Get price for a specific skin
 * @param {Object} priceData - Full price data from fetchPriceData
 * @param {string} skinName - Full skin name (e.g., "AK-47 | Case Hardened" or "★ Bayonet | Doppler")
 * @param {string} wear - Wear condition (e.g., "Factory New", "Minimal Wear")
 * @param {boolean} stattrak - Whether it's StatTrak™
 * @param {boolean} souvenir - Whether it's Souvenir
 * @returns {Object|null} Price info { avg, min, max, currency }
 */
export function getSkinPrice(
  priceData,
  skinName,
  wear = null,
  stattrak = false,
  souvenir = false
) {
  if (!priceData || !skinName) return null;

  // Keep the ★ prefix for knives/gloves - CSFloat uses it in market hash names
  // DO NOT remove the star - it's needed for proper matching
  let cleanName = skinName;

  // Build market hash name (Steam format)
  let marketHashName = cleanName;

  if (stattrak) {
    marketHashName = `StatTrak™ ${marketHashName}`;
  } else if (souvenir) {
    marketHashName = `Souvenir ${marketHashName}`;
  }

  // Add wear condition if specified
  if (wear) {
    marketHashName = `${marketHashName} (${wear})`;
  }

  // Debug logging for knives/gloves and price lookups
  if (skinName.includes("★")) {
    console.log("🔪 Looking for knife/glove price:", {
      skinName,
      marketHashName,
      wear,
      stattrak,
      hasPrice: !!priceData[marketHashName],
    });

    // If exact match not found, show what similar items exist
    if (!priceData[marketHashName]) {
      const baseWeapon = skinName.split("|")[0].trim();
      const similarItems = Object.keys(priceData)
        .filter((k) => k.includes(baseWeapon))
        .slice(0, 5);
      console.log(
        `  ❌ No exact match. Similar items in priceData:`,
        similarItems
      );
    }
  }

  const priceInfo = priceData[marketHashName];

  if (priceInfo) {
    return {
      avg: priceInfo.avg || priceInfo.price || 0,
      min: priceInfo.min || priceInfo.price || 0,
      max: priceInfo.max || priceInfo.price || 0,
      currency: "USD",
      marketHashName,
      isApproximate: false,
    };
  }

  // If no exact match and no wear was specified, try common wear conditions
  if (!wear) {
    const commonWears = [
      "Field-Tested",
      "Minimal Wear",
      "Factory New",
      "Well-Worn",
      "Battle-Scarred",
    ];
    for (const wearCondition of commonWears) {
      const result = getSkinPrice(
        priceData,
        skinName,
        wearCondition,
        stattrak,
        souvenir
      );
      if (result) {
        return result;
      }
    }
  }

  // FALLBACK: For knives/gloves, try to find any variant of the base weapon + pattern
  // This handles cases where ByMykel has "★ Bayonet | Doppler" but CSFloat has
  // "★ Bayonet | Doppler (Phase 1)", "★ Bayonet | Doppler (Phase 2)", etc.
  // Also handles StatTrak knives which don't exist in CSFloat (use normal price)
  if (skinName.includes("★")) {
    const allKeys = Object.keys(priceData);

    // Extract base weapon and pattern (e.g., "★ Bayonet | Autotronic")
    const baseWeapon = skinName.split("|")[0].trim(); // "★ Bayonet"
    const hasPattern = skinName.includes("|");
    const pattern = hasPattern ? skinName.split("|")[1].trim() : ""; // "Autotronic"

    // Build search pattern: look for same base weapon + pattern + wear condition
    let fallbackKey = null;

    // STRATEGY 1: Try to match with same pattern and StatTrak status
    if (hasPattern && pattern) {
      // For items with pattern (e.g., "★ Bayonet | Autotronic")
      const baseWithPattern = `${baseWeapon} | ${pattern}`; // "★ Bayonet | Autotronic"

      if (wear) {
        // Try exact: same weapon + same pattern + same wear + same StatTrak
        fallbackKey = allKeys.find(
          (key) =>
            key.startsWith(baseWithPattern) &&
            key.includes(`(${wear})`) &&
            (stattrak ? key.includes("StatTrak™") : !key.includes("StatTrak™"))
        );
      } else {
        // Try: same weapon + same pattern + any wear + same StatTrak
        fallbackKey = allKeys.find(
          (key) =>
            key.startsWith(baseWithPattern) &&
            (stattrak ? key.includes("StatTrak™") : !key.includes("StatTrak™"))
        );
      }
    } else {
      // For vanilla knives without pattern (e.g., "★ Karambit")
      if (wear) {
        fallbackKey = allKeys.find(
          (key) =>
            key.startsWith(baseWeapon) &&
            !key.includes("|") && // No pattern
            key.includes(`(${wear})`) &&
            (stattrak ? key.includes("StatTrak™") : !key.includes("StatTrak™"))
        );
      } else {
        fallbackKey = allKeys.find(
          (key) =>
            key.startsWith(baseWeapon) &&
            !key.includes("|") && // No pattern
            (stattrak ? key.includes("StatTrak™") : !key.includes("StatTrak™"))
        );
      }
    }

    // STRATEGY 2: If StatTrak not found, fallback to normal version (knives don't have StatTrak prices)
    if (!fallbackKey && stattrak) {
      console.log(`  ℹ️ StatTrak version not found, trying normal version...`);

      if (hasPattern && pattern) {
        const baseWithPattern = `${baseWeapon} | ${pattern}`;
        if (wear) {
          fallbackKey = allKeys.find(
            (key) =>
              key.startsWith(baseWithPattern) &&
              key.includes(`(${wear})`) &&
              !key.includes("StatTrak™")
          );
        } else {
          fallbackKey = allKeys.find(
            (key) =>
              key.startsWith(baseWithPattern) && !key.includes("StatTrak™")
          );
        }
      } else {
        // Vanilla knife
        if (wear) {
          fallbackKey = allKeys.find(
            (key) =>
              key.startsWith(baseWeapon) &&
              !key.includes("|") &&
              key.includes(`(${wear})`) &&
              !key.includes("StatTrak™")
          );
        } else {
          fallbackKey = allKeys.find(
            (key) =>
              key.startsWith(baseWeapon) &&
              !key.includes("|") &&
              !key.includes("StatTrak™")
          );
        }
      }
    }

    if (fallbackKey) {
      const fallbackPrice = priceData[fallbackKey];
      const isStatTrakFallback = stattrak && !fallbackKey.includes("StatTrak™");
      console.log(
        `⚠️ Using ${
          isStatTrakFallback ? "non-StatTrak " : ""
        }approximate price for ${marketHashName} from ${fallbackKey}`
      );
      return {
        avg: fallbackPrice.avg || fallbackPrice.price || 0,
        min: fallbackPrice.min || fallbackPrice.price || 0,
        max: fallbackPrice.max || fallbackPrice.price || 0,
        currency: "USD",
        marketHashName: fallbackKey,
        isApproximate: true, // Flag this as an approximate match
      };
    }
  }

  return null;
}

/**
 * Format price for display
 * @param {number} price - Price in USD
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return "N/A";
  if (price === 0) return "Free";
  if (price < 0.01) return "<$0.01";
  if (price < 1) return `$${price.toFixed(2)}`;
  if (price < 100) return `$${price.toFixed(2)}`;
  if (price < 1000) return `$${Math.round(price)}`;
  return `$${(price / 1000).toFixed(1)}k`;
}

/**
 * Get price range string
 * @param {Object} priceInfo - Price info from getSkinPrice
 * @returns {string} Formatted range
 */
export function getPriceRange(priceInfo) {
  if (!priceInfo) return "N/A";

  const { min, max, avg } = priceInfo;

  if (min === max || !max) {
    return formatPrice(avg || min);
  }

  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

/**
 * Get all prices for a skin across all wear conditions
 * @param {Object} priceData - Full price data
 * @param {string} skinName - Skin name without wear
 * @param {boolean} stattrak - StatTrak™ version
 * @param {boolean} souvenir - Souvenir version
 * @returns {Array} Array of {wear, price} objects
 */
export function getAllWearPrices(
  priceData,
  skinName,
  stattrak = false,
  souvenir = false
) {
  const wears = [
    "Factory New",
    "Minimal Wear",
    "Field-Tested",
    "Well-Worn",
    "Battle-Scarred",
  ];

  return wears
    .map((wear) => {
      const priceInfo = getSkinPrice(
        priceData,
        skinName,
        wear,
        stattrak,
        souvenir
      );
      return {
        wear,
        priceInfo,
        price: priceInfo?.avg || 0,
      };
    })
    .filter((item) => item.price > 0);
}
