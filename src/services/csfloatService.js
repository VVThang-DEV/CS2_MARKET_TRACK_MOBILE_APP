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
      // Build market hash name for each wear
      if (skin.wears && skin.wears.length > 0) {
        skin.wears.forEach((wear) => {
          const wearName = wear.name;
          const marketHashName = `${skin.name} (${wearName})`;
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
        });
      } else {
        // Items without wears (knives, gloves, etc.)
        skinsMap[skin.name] = {
          ...skin,
          image: skin.image,
        };
        entriesCreated++;

        // Add StatTrak version for items without wears
        if (skin.stattrak) {
          skinsMap[`StatTrak™ ${skin.name}`] = {
            ...skin,
            image: skin.image,
            isStatTrak: true,
          };
          entriesCreated++;
        }
      }
    });

    console.log(
      `✅ Created ${entriesCreated} market hash name entries for price matching`
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

    // Merge price data with skins data
    const merged = dataArray.map((priceItem) => ({
      ...priceItem,
      skinData: skinsMap[priceItem.market_hash_name] || null,
    }));

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
 * For price-list data, we estimate trend based on volume and price volatility
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price (if available)
 * @param {number} qty - Trading volume
 * @returns {number} Estimated percentage change
 */
export function calculatePriceChangePercent(minPrice, maxPrice, qty) {
  // Since price-list doesn't have historical data, we estimate based on volume
  // High volume items are considered "trending"
  // We'll use a random variation to simulate market movement for demo
  const baseChange = (Math.random() - 0.5) * 20; // -10% to +10%
  const volumeBoost = Math.min(qty / 1000, 5); // More volume = bigger potential moves
  return baseChange * (1 + volumeBoost / 5);
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

  const processed = priceListData
    .map((item) => {
      // Skip items without skin data (not in our filtered list)
      if (!item.skinData) {
        itemsFiltered++;
        return null;
      }

      const currentPrice = item.min_price / 100; // Convert cents to dollars
      const maxPrice = item.max_price ? item.max_price / 100 : currentPrice;
      const avgPrice = (currentPrice + maxPrice) / 2;

      // Estimate price change based on volume and price spread
      const priceSpread = ((maxPrice - currentPrice) / currentPrice) * 100;
      const priceChange = calculatePriceChangePercent(
        currentPrice,
        maxPrice,
        item.qty
      );

      // Generate price history for sparkline
      const priceHistory = generatePriceHistory(avgPrice, priceChange, 7);

      // Extract item details from market_hash_name
      const marketHashName = item.market_hash_name || "";
      const isStatTrak = marketHashName.includes("StatTrak™");
      const isSouvenir = marketHashName.includes("Souvenir");

      // Extract wear condition
      const wearMatch = marketHashName.match(/\((.*?)\)$/);
      const wearName = wearMatch ? wearMatch[1] : "";

      // Get item name without wear
      const itemName = marketHashName.replace(/\s*\(.*?\)$/, "");

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
    const name = item.name.toLowerCase();

    switch (category) {
      case "Knife":
        return name.includes("★") || name.includes("knife");
      case "Gloves":
        return name.includes("gloves") || name.includes("wraps");
      case "Rifle":
        return (
          name.includes("ak-47") ||
          name.includes("m4a4") ||
          name.includes("m4a1") ||
          name.includes("awp") ||
          name.includes("aug") ||
          name.includes("sg 553") ||
          name.includes("famas") ||
          name.includes("galil")
        );
      case "Pistol":
        return (
          name.includes("glock") ||
          name.includes("usp") ||
          name.includes("p2000") ||
          name.includes("p250") ||
          name.includes("desert eagle") ||
          name.includes("deagle")
        );
      case "SMG":
        return (
          name.includes("mp9") ||
          name.includes("mac-10") ||
          name.includes("p90") ||
          name.includes("ump")
        );
      default:
        return true;
    }
  });
}
