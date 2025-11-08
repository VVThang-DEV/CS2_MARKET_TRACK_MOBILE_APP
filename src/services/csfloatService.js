/**
 * CSFloat Service - Fetch trending listings and market data
 */

import { CSFLOAT_API_KEY } from "@env";
import { fetchSkinsFromAPI } from "./apiService";

const CSFLOAT_PRICE_API = "https://csfloat.com/api/v1/listings/price-list";

/**
 * Fetch all skins data using shared apiService
 * Only includes weapons, knives, and gloves (no stickers, crates, agents, etc.)
 * @returns {Promise<Object>} Map of market_hash_name to skin data
 */
async function fetchAllSkinsData() {
  try {
    console.log("🎯 Loading skins data for trending analysis...");

    // Use shared fetchSkinsFromAPI which already filters to weapons/knives/gloves
    const skins = await fetchSkinsFromAPI();

    console.log(`✅ Loaded ${skins.length} weapon/knife/glove skins`);

    // Create a lookup map by market_hash_name
    const skinsMap = {};
    let entriesCreated = 0;

    skins.forEach((skin) => {
      // Keep the ★ prefix for knives/gloves - CSFloat market hash names include it
      const baseName = skin.name || "";
      const weaponName = skin.weapon?.name || "";
      const category = skin.category?.name || "";

      // Build market hash name for each wear
      if (skin.wears && skin.wears.length > 0) {
        skin.wears.forEach((wear) => {
          const wearName = wear.name;
          const marketHashName = `${baseName} (${wearName})`;

          skinsMap[marketHashName] = {
            ...skin,
            wearName: wearName,
            image: skin.image,
          };
          entriesCreated++;

          // Also add StatTrak version if available
          if (skin.stattrak) {
            const statTrakName = `StatTrak™ ${marketHashName}`;
            skinsMap[statTrakName] = {
              ...skin,
              wearName: wearName,
              image: skin.image,
              isStatTrak: true,
            };
            entriesCreated++;
          }

          // Add Souvenir version if applicable
          if (skin.souvenir) {
            const souvenirName = `Souvenir ${marketHashName}`;
            skinsMap[souvenirName] = {
              ...skin,
              wearName: wearName,
              image: skin.image,
              isSouvenir: true,
            };
            entriesCreated++;
          }
        });
      } else {
        // Items without wears (vanilla knives, gloves without skins, etc.)
        skinsMap[baseName] = {
          ...skin,
          image: skin.image,
        };
        entriesCreated++;

        // Add StatTrak version for items without wears
        if (skin.stattrak) {
          skinsMap[`StatTrak™ ${baseName}`] = {
            ...skin,
            image: skin.image,
            isStatTrak: true,
          };
          entriesCreated++;
        }
      }

      // Debug first 5 entries to check matching
      if (entriesCreated <= 15) {
        const exampleKey = Object.keys(skinsMap)[entriesCreated - 1];
        console.log(
          `📝 Example entry #${entriesCreated}: "${exampleKey}" -> ${
            weaponName || category
          }`
        );
      }
    });

    console.log(
      `✅ Created ${entriesCreated} market hash name entries for price matching`
    );
    console.log(
      `📊 Sample market names: ${Object.keys(skinsMap).slice(0, 5).join(", ")}`
    );
    return skinsMap;
  } catch (error) {
    console.error("💥 Error fetching skins data:", error);
    return {};
  }
}

/**
 * Fetch trending items from CSFloat price list
 * Uses the same endpoint as priceService but processes it for trending analysis
 * @param {number} limit - Number of trending items to return (0 = all items)
 * @returns {Promise<Array>} Array of trending items
 */
export async function fetchTrendingListings(limit = 0) {
  try {
    console.log(
      "Fetching ALL price data from CSFloat for trending analysis..."
    );

    // Fetch both price data and skins data in parallel
    const [priceResponse, skinsMap] = await Promise.all([
      fetch(CSFLOAT_PRICE_API, {
        headers: {
          Authorization: `Bearer ${CSFLOAT_API_KEY}`,
        },
      }),
      fetchAllSkinsData(),
    ]);

    if (!priceResponse.ok) {
      console.error(
        `CSFloat API error: ${priceResponse.status} ${priceResponse.statusText}`
      );
      throw new Error(`CSFloat API error: ${priceResponse.status}`);
    }

    const dataArray = await priceResponse.json();
    console.log(`✅ Loaded ${dataArray.length} items from price list`);

    // Log sample market hash names to debug matching
    console.log(`📋 Sample CSFloat market names:`);
    dataArray.slice(0, 10).forEach((item, idx) => {
      console.log(`  ${idx + 1}. "${item.market_hash_name}"`);
    });

    // Merge price data with skins data
    const merged = dataArray.map((priceItem) => ({
      ...priceItem,
      skinData: skinsMap[priceItem.market_hash_name] || null,
    }));

    // Count how many matched
    const matchedCount = merged.filter((m) => m.skinData !== null).length;
    const unmatchedCount = merged.length - matchedCount;
    console.log(
      `🔗 Matched ${matchedCount} out of ${dataArray.length} items with skin data (${unmatchedCount} unmatched)`
    );

    // Debug: Show some unmatched knife/glove items
    const unmatchedKnivesGloves = merged
      .filter((m) => m.skinData === null && m.market_hash_name.includes("★"))
      .slice(0, 5);
    if (unmatchedKnivesGloves.length > 0) {
      console.log("⚠️ Sample unmatched knives/gloves:");
      unmatchedKnivesGloves.forEach((item) =>
        console.log(`  - ${item.market_hash_name}`)
      );
    }

    // Sort by quantity (volume) to find most traded/trending items
    let sorted = merged
      .filter((item) => item.qty > 0 && item.min_price > 0)
      .sort((a, b) => b.qty - a.qty);

    // Only limit if specified (0 means return all)
    if (limit > 0) {
      sorted = sorted.slice(0, limit);
    }

    console.log(`✅ Processed ${sorted.length} trending items with skin data`);
    return sorted;
  } catch (error) {
    console.error("Error fetching trending listings:", error);
    return [];
  }
}

/**
 * Calculate price change percentage
 * For price-list data, we use price spread and volume as trend indicators
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price (if available)
 * @param {number} qty - Trading volume
 * @param {string} marketHashName - Market hash name for consistent seeding
 * @returns {number} Estimated percentage change
 */
export function calculatePriceChangePercent(
  minPrice,
  maxPrice,
  qty,
  marketHashName = ""
) {
  // Calculate price spread as base trend indicator
  const priceSpread =
    maxPrice > minPrice ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

  // Use market hash name to create deterministic "trend" (consistent across refreshes)
  // Simple hash function for seeding
  let hash = 0;
  for (let i = 0; i < marketHashName.length; i++) {
    hash = (hash << 5) - hash + marketHashName.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Normalize hash to range -1 to 1
  const seedValue = ((Math.abs(hash) % 200) - 100) / 100; // -1 to 1

  // Combine spread, volume, and seeded trend
  const volumeBoost = Math.min(qty / 1000, 3); // 0 to 3
  const baseTrend = seedValue * 8; // -8% to +8%
  const spreadBoost = Math.min(priceSpread * 0.5, 5); // Up to 5% from spread

  // Final change: base trend + volume impact + spread impact
  const priceChange = baseTrend + volumeBoost * 2 + spreadBoost;

  // Clamp to reasonable range
  return Math.max(-25, Math.min(25, priceChange));
}

/**
 * Generate mock price history for sparkline
 * @param {number} currentPrice - Current price
 * @param {number} priceChange - Percentage change
 * @param {number} points - Number of data points
 * @returns {Array} Array of price points
 */
function generatePriceHistory(currentPrice, priceChange, points = 7) {
  const history = [];
  const trend = priceChange > 0 ? 1 : -1;

  // Generate realistic-looking price movement
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trendEffect = trend * progress * (Math.abs(priceChange) / 100);
    const randomNoise = (Math.random() - 0.5) * 0.05; // 5% random variation
    const priceMultiplier = 1 - trendEffect + randomNoise;
    history.push(currentPrice * priceMultiplier);
  }

  return history;
}

/**
 * Process price list into trending items with price analysis
 * Only includes items that match our skin database (weapons/knives/gloves)
 * @param {Array} priceListData - Raw CSFloat price list data
 * @returns {Array} Processed trending items
 */
export function processTrendingListings(priceListData) {
  if (!priceListData || priceListData.length === 0) return [];

  let itemsWithImages = 0;
  let itemsWithoutImages = 0;
  let itemsFiltered = 0;
  let matchedCategories = {};

  const processed = priceListData
    .map((item) => {
      // Skip items without skin data (not in our filtered list)
      if (!item.skinData) {
        itemsFiltered++;
        return null;
      }

      // Track which categories are matching
      const skinCategory = item.skinData?.category?.name || "Unknown";
      matchedCategories[skinCategory] =
        (matchedCategories[skinCategory] || 0) + 1;

      const currentPrice = item.min_price / 100; // Convert cents to dollars
      const maxPrice = item.max_price ? item.max_price / 100 : currentPrice;
      const avgPrice = (currentPrice + maxPrice) / 2;

      // Estimate price change based on volume and price spread
      const priceSpread = ((maxPrice - currentPrice) / currentPrice) * 100;
      const marketHashName = item.market_hash_name || "";
      const priceChange = calculatePriceChangePercent(
        currentPrice,
        maxPrice,
        item.qty,
        marketHashName // Pass hash name for consistent results
      );

      // Generate price history for sparkline
      const priceHistory = generatePriceHistory(avgPrice, priceChange, 7);

      // Extract item details from market_hash_name
      const isStatTrak = marketHashName.includes("StatTrak™");
      const isSouvenir = marketHashName.includes("Souvenir");

      // Extract wear condition
      const wearMatch = marketHashName.match(/\((.*?)\)$/);
      const wearName = wearMatch ? wearMatch[1] : "";

      // Get item name without wear
      const itemName = marketHashName
        .replace(/\s*\(.*?\)$/, "")
        .replace(/^(StatTrak™|Souvenir)\s+/, "");

      // Track image availability
      const hasImage = !!item.skinData?.image;
      if (hasImage) {
        itemsWithImages++;
      } else {
        itemsWithoutImages++;
      }

      return {
        id: `${item.market_hash_name}-${item.qty}`,
        name: marketHashName,
        itemName: itemName,
        wearName: wearName,
        currentPrice: avgPrice,
        referencePrice: currentPrice, // Use min as reference
        priceChange: priceChange,
        priceChangeAbs: Math.abs(priceChange),
        image: item.skinData?.image || null, // Get image from skin data
        watchers: Math.floor(item.qty / 10), // Estimate watchers from quantity
        volume: item.qty,
        rarity:
          item.skinData?.rarity?.name ||
          (marketHashName.includes("★") ? "Extraordinary" : "Classified"),
        rarityColor: item.skinData?.rarity?.color || "#eb4b4b",
        description: item.skinData?.description || "",
        type: "listing",
        isStatTrak: isStatTrak,
        isSouvenir: isSouvenir,
        minPrice: currentPrice,
        maxPrice: maxPrice,
        priceSpread: priceSpread,
        category: item.skinData?.category?.name || "Unknown",
        weapon: item.skinData?.weapon?.name || "",
        priceHistory: priceHistory, // Add price history for sparkline
      };
    })
    .filter((item) => item !== null && item.currentPrice > 0) // Remove null items
    .sort((a, b) => {
      // Sort by combination of price change and volume
      const scoreA = a.priceChangeAbs * Math.log(a.volume + 1);
      const scoreB = b.priceChangeAbs * Math.log(b.volume + 1);
      return scoreB - scoreA;
    });

  console.log(
    `📊 Processed ${processed.length} weapon/knife/glove items (filtered out ${itemsFiltered} non-skin items)`
  );
  console.log(
    `📊 Image stats: ${itemsWithImages} with images, ${itemsWithoutImages} without images`
  );
  console.log(`📊 Category breakdown:`, matchedCategories);

  return processed;
}
/**
 * Get top movers (biggest price changes)
 * @param {Array} processedListings - Processed trending items
 * @param {number} count - Number of top movers to return
 * @returns {Array} Top movers
 */
export function getTopMovers(processedListings, count = 3) {
  return processedListings.slice(0, count);
}

/**
 * Filter listings by category
 * @param {Array} listings - Processed listings
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered listings
 */
export function filterByCategory(listings, category) {
  if (category === "All" || !category) return listings;

  return listings.filter((item) => {
    // Use the category property that was set during processing
    const itemCategory = item.category || "";
    const weaponName = (item.weapon || "").toLowerCase();

    switch (category) {
      case "Knife":
        return (
          itemCategory === "Knives" || // ByMykel uses "Knives" (plural)
          itemCategory === "Knife" ||
          weaponName.includes("knife") ||
          weaponName.includes("bayonet") ||
          weaponName.includes("karambit") ||
          item.name.includes("★")
        );
      case "Gloves":
        return (
          itemCategory === "Gloves" ||
          weaponName.includes("gloves") ||
          weaponName.includes("wraps") ||
          weaponName.includes("hand wraps")
        );
      case "Rifle":
        return (
          itemCategory === "Rifle" ||
          [
            "ak-47",
            "m4a4",
            "m4a1",
            "awp",
            "aug",
            "sg 553",
            "famas",
            "galil",
            "scar-20",
            "g3sg1",
          ].some((rifle) => weaponName.includes(rifle))
        );
      case "Pistol":
        return (
          itemCategory === "Pistol" ||
          [
            "glock",
            "usp",
            "p2000",
            "p250",
            "five-seven",
            "tec-9",
            "cz75",
            "desert eagle",
            "dual berettas",
            "r8 revolver",
          ].some(
            (pistol) =>
              weaponName.includes(pistol) || weaponName.includes("deagle")
          )
        );
      case "SMG":
        return (
          itemCategory === "SMG" ||
          ["mac-10", "mp9", "mp7", "mp5", "ump-45", "p90", "pp-bizon"].some(
            (smg) => weaponName.includes(smg)
          )
        );
      default:
        return true;
    }
  });
}
