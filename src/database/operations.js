import { getDatabase } from "./schema";

/**
 * Parse JSON fields from database rows
 */
const parseItemRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    isFavorite: Boolean(row.isFavorite),
    stattrak: Boolean(row.stattrak),
    souvenir: Boolean(row.souvenir),
    wears: row.wears ? JSON.parse(row.wears) : [],
    availableWears: row.availableWears ? JSON.parse(row.availableWears) : [],
    crates: row.crates ? JSON.parse(row.crates) : [],
    crateNames: row.crateNames ? JSON.parse(row.crateNames) : [],
    collections: row.collections ? JSON.parse(row.collections) : [],
    collectionNames: row.collectionNames ? JSON.parse(row.collectionNames) : [],
  };
};

/**
 * Get all items from the database
 */
export const getAllItems = async () => {
  const db = getDatabase();
  const result = await db.getAllAsync("SELECT * FROM items ORDER BY name");
  return result.map(parseItemRow);
};

/**
 * Get item by ID
 */
export const getItemById = async (id) => {
  const db = getDatabase();
  const result = await db.getFirstAsync("SELECT * FROM items WHERE id = ?", [
    id,
  ]);
  return parseItemRow(result);
};

/**
 * Get all favorite items
 */
export const getFavoriteItems = async () => {
  const db = getDatabase();
  const result = await db.getAllAsync(
    "SELECT * FROM items WHERE isFavorite = 1 ORDER BY name"
  );
  return result.map(parseItemRow);
};

/**
 * Get unique categories
 */
export const getCategories = async () => {
  const db = getDatabase();
  const result = await db.getAllAsync(
    "SELECT DISTINCT category FROM items ORDER BY category"
  );
  return result.map((row) => row.category);
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (id, isFavorite) => {
  const db = getDatabase();
  await db.runAsync("UPDATE items SET isFavorite = ? WHERE id = ?", [
    isFavorite ? 1 : 0,
    id,
  ]);
};

/**
 * Insert or update items into database (upsert)
 */
export const insertItems = async (items) => {
  const db = getDatabase();

  for (const item of items) {
    // Serialize JSON fields
    const wearsJson = JSON.stringify(item.wears || []);
    const availableWearsJson = JSON.stringify(item.availableWears || []);
    const cratesJson = JSON.stringify(item.crates || []);
    const crateNamesJson = JSON.stringify(item.crateNames || []);
    const collectionsJson = JSON.stringify(item.collections || []);
    const collectionNamesJson = JSON.stringify(item.collectionNames || []);

    await db.runAsync(
      `INSERT OR REPLACE INTO items (
        id, _id, name, description, weapon, weaponName, category, categoryName,
        pattern, patternName, phase, phaseName, min_float, max_float, rarity, rarityName,
        rarity_color, rarityColor, image, team, isFavorite, stattrak, souvenir,
        wears, availableWears, crates, crateNames, collections, collectionNames,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        COALESCE((SELECT isFavorite FROM items WHERE id = ?), ?),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item._id || item.id,
        item.name,
        item.description || "",
        item.weapon || "",
        item.weaponName || item.weapon || "",
        item.category,
        item.categoryName || item.category,
        item.pattern || "",
        item.patternName || item.pattern || "",
        item.phase || "",
        item.phaseName || item.phase || "",
        item.min_float || 0,
        item.max_float || 1,
        item.rarity || "",
        item.rarityName || item.rarity || "",
        item.rarity_color || "",
        item.rarityColor || item.rarity_color || "",
        item.image,
        item.team || "",
        item.id, // For COALESCE subquery WHERE clause
        item.isFavorite ? 1 : 0, // For COALESCE default value
        item.stattrak ? 1 : 0,
        item.souvenir ? 1 : 0,
        wearsJson,
        availableWearsJson,
        cratesJson,
        crateNamesJson,
        collectionsJson,
        collectionNamesJson,
        item.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }
};

/**
 * Check if database is empty
 */
export const isDatabaseEmpty = async () => {
  const db = getDatabase();
  const result = await db.getFirstAsync("SELECT COUNT(*) as count FROM items");
  return result.count === 0;
};

/**
 * Search items
 */
export const searchItems = async (query, category = "All") => {
  const db = getDatabase();
  let sql = "SELECT * FROM items WHERE 1=1";
  const params = [];

  if (category !== "All") {
    sql += " AND category = ?";
    params.push(category);
  }

  if (query && query.trim()) {
    sql += " AND (name LIKE ? OR weapon LIKE ? OR category LIKE ?)";
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += " ORDER BY name";

  const result = await db.getAllAsync(sql, params);
  return result.map((row) => ({
    ...row,
    isFavorite: Boolean(row.isFavorite),
  }));
};

/**
 * Search favorite items
 */
export const searchFavorites = async (query, category = "All") => {
  const db = getDatabase();
  let sql = "SELECT * FROM items WHERE isFavorite = 1";
  const params = [];

  if (category !== "All") {
    sql += " AND category = ?";
    params.push(category);
  }

  if (query && query.trim()) {
    sql += " AND (name LIKE ? OR weapon LIKE ? OR category LIKE ?)";
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += " ORDER BY name";

  const result = await db.getAllAsync(sql, params);
  return result.map(parseItemRow);
};

/**
 * Save price data to database
 */
export const savePriceData = async (priceData) => {
  const db = getDatabase();
  const timestamp = new Date().toISOString();

  for (const [marketHashName, priceInfo] of Object.entries(priceData)) {
    await db.runAsync(
      `INSERT OR REPLACE INTO price_data (
        market_hash_name, price, avg, median, volume, lastUpdated
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        marketHashName,
        priceInfo.price || priceInfo.avg || 0,
        priceInfo.avg || 0,
        priceInfo.median || 0,
        priceInfo.volume || 0,
        timestamp,
      ]
    );
  }
};

/**
 * Get price data from database
 */
export const getPriceData = async () => {
  const db = getDatabase();
  const result = await db.getAllAsync("SELECT * FROM price_data");

  const priceData = {};
  result.forEach((row) => {
    priceData[row.market_hash_name] = {
      price: row.price,
      avg: row.avg,
      median: row.median,
      volume: row.volume,
    };
  });

  return priceData;
};

/**
 * Save price history snapshot
 */
export const savePriceHistory = async (priceData) => {
  const db = getDatabase();
  const timestamp = Date.now();
  const date = new Date(timestamp).toISOString();

  for (const [marketHashName, priceInfo] of Object.entries(priceData)) {
    const price = priceInfo.price || priceInfo.avg || 0;
    if (price > 0) {
      await db.runAsync(
        `INSERT INTO price_history (market_hash_name, price, timestamp, date)
         VALUES (?, ?, ?, ?)`,
        [marketHashName, price, timestamp, date]
      );
    }
  }
};

/**
 * Get price history for a specific item
 */
export const getPriceHistory = async (marketHashName, daysBack = 30) => {
  const db = getDatabase();
  const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  const result = await db.getAllAsync(
    `SELECT price, timestamp, date 
     FROM price_history 
     WHERE market_hash_name = ? AND timestamp >= ?
     ORDER BY timestamp ASC`,
    [marketHashName, cutoffTime]
  );

  return result.map((row) => ({
    price: row.price,
    timestamp: row.timestamp,
    date: new Date(row.timestamp),
  }));
};

/**
 * Clean old price history (keep last 30 days)
 */
export const cleanOldPriceHistory = async (daysToKeep = 30) => {
  const db = getDatabase();
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  await db.runAsync("DELETE FROM price_history WHERE timestamp < ?", [
    cutoffTime,
  ]);
};

/**
 * Set app metadata
 */
export const setMetadata = async (key, value) => {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_metadata (key, value, updatedAt)
     VALUES (?, ?, ?)`,
    [key, JSON.stringify(value), new Date().toISOString()]
  );
};

/**
 * Get app metadata
 */
export const getMetadata = async (key) => {
  const db = getDatabase();
  const result = await db.getFirstAsync(
    "SELECT value FROM app_metadata WHERE key = ?",
    [key]
  );
  return result ? JSON.parse(result.value) : null;
};
