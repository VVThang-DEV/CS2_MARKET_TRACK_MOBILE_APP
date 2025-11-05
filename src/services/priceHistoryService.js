/**
 * Price History Service - Track and manage historical price data
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRICE_HISTORY_KEY = "@price_history";
const MAX_HISTORY_DAYS = 30; // Keep 30 days of history
const SIMULATED_HISTORY_KEY = "@simulated_history_v2";

/**
 * Save price snapshot to history
 * @param {Object} priceData - Current price data from CSGOFloat
 */
export const savePriceSnapshot = async (priceData) => {
  try {
    const timestamp = Date.now();
    const history = await getPriceHistory();

    // Add new snapshot
    history.push({
      timestamp,
      date: new Date(timestamp).toISOString(),
      prices: priceData,
    });

    // Keep only last MAX_HISTORY_DAYS
    const cutoffDate = timestamp - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    const filteredHistory = history.filter(
      (snapshot) => snapshot.timestamp > cutoffDate
    );

    await AsyncStorage.setItem(
      PRICE_HISTORY_KEY,
      JSON.stringify(filteredHistory)
    );
    console.log(
      "Price snapshot saved, total snapshots:",
      filteredHistory.length
    );
  } catch (error) {
    console.error("Error saving price snapshot:", error);
  }
};

/**
 * Get all price history
 * @returns {Promise<Array>} Array of price snapshots
 */
export const getPriceHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(PRICE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting price history:", error);
    return [];
  }
};

/**
 * Get price history for a specific skin
 * @param {string} marketHashName - Steam market hash name
 * @returns {Promise<Array>} Array of {date, price} objects
 */
export const getSkinPriceHistory = async (marketHashName) => {
  try {
    const history = await getPriceHistory();

    return history
      .map((snapshot) => {
        const priceInfo = snapshot.prices?.[marketHashName];
        return {
          date: new Date(snapshot.timestamp),
          timestamp: snapshot.timestamp,
          price: priceInfo?.price || priceInfo?.avg || 0,
        };
      })
      .filter((item) => item.price > 0);
  } catch (error) {
    console.error("Error getting skin price history:", error);
    return [];
  }
};

/**
 * Calculate price change percentage
 * @param {Array} priceHistory - Array of price history
 * @returns {Object} {change, percentage, trend}
 */
export const calculatePriceChange = (priceHistory) => {
  if (!priceHistory || priceHistory.length < 2) {
    return { change: 0, percentage: 0, trend: "stable" };
  }

  const oldest = priceHistory[0].price;
  const newest = priceHistory[priceHistory.length - 1].price;
  const change = newest - oldest;
  const percentage = oldest > 0 ? (change / oldest) * 100 : 0;

  let trend = "stable";
  if (percentage > 5) trend = "up";
  else if (percentage < -5) trend = "down";

  return { change, percentage, trend };
};

/**
 * Get price statistics for a period
 * @param {Array} priceHistory - Array of price history
 * @returns {Object} {min, max, avg, current}
 */
export const getPriceStats = (priceHistory) => {
  if (!priceHistory || priceHistory.length === 0) {
    return { min: 0, max: 0, avg: 0, current: 0 };
  }

  const prices = priceHistory.map((item) => item.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const current = prices[prices.length - 1];

  return { min, max, avg, current };
};

/**
 * Generate simulated historical price data for a skin
 * Since CSGOFloat doesn't provide historical data, we simulate it based on current price
 * @param {string} marketHashName - Steam market hash name
 * @param {number} currentPrice - Current price
 * @param {number} daysBack - Number of days to generate (default 30)
 * @returns {Promise<Array>} Array of {date, price, timestamp}
 */
export const generateSimulatedHistory = async (
  marketHashName,
  currentPrice,
  daysBack = 30
) => {
  try {
    // Check if we already have simulated data for this skin
    const existingData = await AsyncStorage.getItem(
      `${SIMULATED_HISTORY_KEY}_${marketHashName}`
    );
    if (existingData) {
      const parsed = JSON.parse(existingData);
      // Return if data is recent (less than 1 day old)
      if (Date.now() - parsed.generatedAt < 24 * 60 * 60 * 1000) {
        return parsed.history;
      }
    }

    const history = [];
    const now = Date.now();

    // Generate realistic price fluctuations
    // Start from 30 days ago with a slightly different price
    let basePrice = currentPrice * (0.85 + Math.random() * 0.3); // ±15% from current

    for (let i = daysBack; i >= 0; i--) {
      const timestamp = now - i * 24 * 60 * 60 * 1000;

      // Add realistic daily volatility (±2-5%)
      const dailyChange = 0.95 + Math.random() * 0.1; // ±5% daily
      basePrice = basePrice * dailyChange;

      // Add trend towards current price (slight attraction)
      const trendFactor = (daysBack - i) / daysBack; // 0 to 1
      const price =
        basePrice * (1 - trendFactor * 0.3) +
        currentPrice * (trendFactor * 0.3);

      history.push({
        date: new Date(timestamp),
        timestamp,
        price: parseFloat(price.toFixed(2)),
      });
    }

    // Store simulated data
    await AsyncStorage.setItem(
      `${SIMULATED_HISTORY_KEY}_${marketHashName}`,
      JSON.stringify({
        history,
        generatedAt: now,
        currentPrice,
      })
    );

    console.log(
      `Generated ${history.length} days of simulated price history for ${marketHashName}`
    );
    return history;
  } catch (error) {
    console.error("Error generating simulated history:", error);
    return [];
  }
};

/**
 * Get enriched price history with simulated data if needed
 * @param {string} marketHashName - Steam market hash name
 * @param {number} currentPrice - Current price
 * @returns {Promise<Array>} Array of {date, price, timestamp}
 */
export const getEnrichedPriceHistory = async (marketHashName, currentPrice) => {
  try {
    // Get real tracked history first
    const realHistory = await getSkinPriceHistory(marketHashName);

    // If we have less than 7 days of real data, supplement with simulated
    if (realHistory.length < 7) {
      console.log(
        `Only ${realHistory.length} real data points, generating simulated history`
      );
      return await generateSimulatedHistory(marketHashName, currentPrice, 30);
    }

    return realHistory;
  } catch (error) {
    console.error("Error getting enriched price history:", error);
    // Fallback to simulated data
    return await generateSimulatedHistory(marketHashName, currentPrice, 30);
  }
};

/**
 * Clear all price history (for testing/debugging)
 */
export const clearPriceHistory = async () => {
  try {
    await AsyncStorage.removeItem(PRICE_HISTORY_KEY);
    console.log("Price history cleared");
  } catch (error) {
    console.error("Error clearing price history:", error);
  }
};
