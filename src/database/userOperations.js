/**
 * User Profile and Inventory Database Operations
 */

import { getDatabase } from "./schema";
import {
  syncUserProfileToSupabase,
  syncInventoryToSupabase,
  syncSnapshotToSupabase,
} from "../services/supabaseInventoryService";

/**
 * Save or update user profile (with Supabase sync)
 * @param {Object} profile - User profile data
 * @returns {Promise<void>}
 */
export async function saveUserProfile(profile) {
  try {
    const db = getDatabase();

    await db.runAsync(
      `INSERT OR REPLACE INTO user_profile 
      (steamId, personaName, profileUrl, avatar, avatarMedium, avatarFull, 
       personaState, communityVisibilityState, realName, countryCode, 
       timeCreated, lastLogoff, isActive, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [
        profile.steamId,
        profile.personaName,
        profile.profileUrl,
        profile.avatar,
        profile.avatarMedium,
        profile.avatarFull,
        profile.personaState,
        profile.communityVisibilityState,
        profile.realName || null,
        profile.countryCode || null,
        profile.timeCreated || null,
        profile.lastLogoff || null,
      ]
    );

    console.log("✅ User profile saved to SQLite:", profile.personaName);

    // Sync to Supabase in background (don't await to not block)
    syncUserProfileToSupabase(profile).catch((err) =>
      console.warn("Background sync failed:", err)
    );
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
}

/**
 * Get active user profile
 * @returns {Promise<Object|null>}
 */
export async function getActiveUserProfile() {
  try {
    const db = getDatabase();

    const result = await db.getFirstAsync(
      `SELECT * FROM user_profile WHERE isActive = 1 LIMIT 1`
    );

    return result || null;
  } catch (error) {
    // If database is not initialized, return null gracefully
    if (error.message && error.message.includes("Database not initialized")) {
      console.log("Database not initialized yet, skipping user profile check");
      return null;
    }
    console.error("Error getting active user profile:", error);
    return null;
  }
}

/**
 * Logout user (set inactive)
 * @param {string} steamId - Steam ID
 * @returns {Promise<void>}
 */
export async function logoutUser(steamId) {
  try {
    const db = getDatabase();

    await db.runAsync(
      `UPDATE user_profile SET isActive = 0 WHERE steamId = ?`,
      [steamId]
    );

    console.log("✅ User logged out");
  } catch (error) {
    console.error("Error logging out user:", error);
    throw error;
  }
}

/**
 * Save inventory items to database (with Supabase sync)
 * @param {string} steamId - Steam ID
 * @param {Array} items - Inventory items
 * @returns {Promise<void>}
 */
export async function saveInventoryItems(steamId, items) {
  try {
    const db = getDatabase();

    // Clear existing inventory for this user
    await db.runAsync(`DELETE FROM inventory_items WHERE steamId = ?`, [
      steamId,
    ]);

    // Insert new items
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO inventory_items 
        (steamId, assetId, classId, instanceId, marketHashName, name, type, 
         rarity, weapon, wearName, isStatTrak, isSouvenir, iconUrl, 
         backgroundColor, marketable, tradable, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          steamId,
          item.assetId,
          item.classId,
          item.instanceId,
          item.marketHashName,
          item.name,
          item.type,
          item.rarity,
          item.weapon,
          item.wearName,
          item.isStatTrak ? 1 : 0,
          item.isSouvenir ? 1 : 0,
          item.iconUrl,
          item.backgroundColor,
          item.marketable ? 1 : 0,
          item.tradable ? 1 : 0,
          item.amount,
        ]
      );
    }

    console.log(`✅ Saved ${items.length} inventory items to SQLite`);

    // Sync to Supabase in background
    syncInventoryToSupabase(steamId, items).catch((err) =>
      console.warn("Background inventory sync failed:", err)
    );
  } catch (error) {
    console.error("Error saving inventory items:", error);
    throw error;
  }
}

/**
 * Get user's inventory items
 * @param {string} steamId - Steam ID
 * @returns {Promise<Array>}
 */
export async function getUserInventory(steamId) {
  try {
    const db = getDatabase();

    const items = await db.getAllAsync(
      `SELECT * FROM inventory_items WHERE steamId = ? ORDER BY acquiredAt DESC`,
      [steamId]
    );

    return items || [];
  } catch (error) {
    console.error("Error getting user inventory:", error);
    return [];
  }
}

/**
 * Create inventory snapshot (with Supabase sync)
 * @param {string} steamId - Steam ID
 * @param {Array} items - Inventory items with prices
 * @param {Object} priceData - Price data map
 * @returns {Promise<number>} Snapshot ID
 */
export async function createInventorySnapshot(steamId, items, priceData) {
  try {
    const db = getDatabase();

    // Calculate total value
    let totalValue = 0;
    const itemPrices = [];

    items.forEach((item) => {
      const price = priceData[item.marketHashName]?.price || 0;
      totalValue += price * item.amount;
      itemPrices.push({
        assetId: item.assetId,
        marketHashName: item.marketHashName,
        price: price,
      });
    });

    // Create snapshot
    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString().split("T")[0];

    const result = await db.runAsync(
      `INSERT INTO inventory_snapshots 
      (steamId, totalItems, totalValue, snapshotDate, timestamp)
      VALUES (?, ?, ?, ?, ?)`,
      [steamId, items.length, totalValue, date, timestamp]
    );

    const snapshotId = result.lastInsertRowId;

    // Save individual item prices
    for (const itemPrice of itemPrices) {
      await db.runAsync(
        `INSERT INTO inventory_item_prices 
        (snapshotId, assetId, marketHashName, price)
        VALUES (?, ?, ?, ?)`,
        [
          snapshotId,
          itemPrice.assetId,
          itemPrice.marketHashName,
          itemPrice.price,
        ]
      );
    }

    console.log(
      `✅ Created inventory snapshot (SQLite): ${
        items.length
      } items, $${totalValue.toFixed(2)}`
    );

    // Sync to Supabase in background
    const snapshotData = {
      steamId,
      totalItems: items.length,
      totalValue,
      snapshotDate: date,
      timestamp,
    };

    syncSnapshotToSupabase(snapshotData, itemPrices).catch((err) =>
      console.warn("Background snapshot sync failed:", err)
    );

    return snapshotId;
  } catch (error) {
    console.error("Error creating inventory snapshot:", error);
    throw error;
  }
}

/**
 * Get inventory snapshots
 * @param {string} steamId - Steam ID
 * @param {number} limit - Max number of snapshots
 * @returns {Promise<Array>}
 */
export async function getInventorySnapshots(steamId, limit = 30) {
  try {
    const db = getDatabase();

    const snapshots = await db.getAllAsync(
      `SELECT * FROM inventory_snapshots 
      WHERE steamId = ? 
      ORDER BY timestamp DESC 
      LIMIT ?`,
      [steamId, limit]
    );

    return snapshots || [];
  } catch (error) {
    console.error("Error getting inventory snapshots:", error);
    return [];
  }
}

/**
 * Get latest snapshot
 * @param {string} steamId - Steam ID
 * @returns {Promise<Object|null>}
 */
export async function getLatestSnapshot(steamId) {
  try {
    const db = getDatabase();

    const snapshot = await db.getFirstAsync(
      `SELECT * FROM inventory_snapshots 
      WHERE steamId = ? 
      ORDER BY timestamp DESC 
      LIMIT 1`,
      [steamId]
    );

    return snapshot || null;
  } catch (error) {
    console.error("Error getting latest snapshot:", error);
    return null;
  }
}

/**
 * Calculate inventory value change
 * @param {string} steamId - Steam ID
 * @returns {Promise<Object>}
 */
export async function calculateInventoryChange(steamId) {
  try {
    const db = getDatabase();

    // Get latest and previous snapshots
    const snapshots = await db.getAllAsync(
      `SELECT * FROM inventory_snapshots 
      WHERE steamId = ? 
      ORDER BY timestamp DESC 
      LIMIT 2`,
      [steamId]
    );

    if (snapshots.length < 2) {
      return {
        currentValue: snapshots[0]?.totalValue || 0,
        previousValue: 0,
        change: 0,
        changePercent: 0,
      };
    }

    const current = snapshots[0];
    const previous = snapshots[1];

    const change = current.totalValue - previous.totalValue;
    const changePercent =
      previous.totalValue > 0 ? (change / previous.totalValue) * 100 : 0;

    return {
      currentValue: current.totalValue,
      previousValue: previous.totalValue,
      change,
      changePercent,
      currentDate: current.snapshotDate,
      previousDate: previous.snapshotDate,
    };
  } catch (error) {
    console.error("Error calculating inventory change:", error);
    return {
      currentValue: 0,
      previousValue: 0,
      change: 0,
      changePercent: 0,
    };
  }
}

/**
 * Get inventory statistics
 * @param {string} steamId - Steam ID
 * @returns {Promise<Object>}
 */
export async function getInventoryStats(steamId) {
  try {
    const db = getDatabase();

    // Get total items
    const itemCount = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM inventory_items WHERE steamId = ?`,
      [steamId]
    );

    // Get latest snapshot
    const latestSnapshot = await getLatestSnapshot(steamId);

    // Get rarity breakdown
    const rarityBreakdown = await db.getAllAsync(
      `SELECT rarity, COUNT(*) as count 
      FROM inventory_items 
      WHERE steamId = ? 
      GROUP BY rarity 
      ORDER BY count DESC`,
      [steamId]
    );

    // Get StatTrak count
    const statTrakCount = await db.getFirstAsync(
      `SELECT COUNT(*) as count 
      FROM inventory_items 
      WHERE steamId = ? AND isStatTrak = 1`,
      [steamId]
    );

    return {
      totalItems: itemCount?.count || 0,
      totalValue: latestSnapshot?.totalValue || 0,
      lastUpdated: latestSnapshot?.snapshotDate || null,
      rarityBreakdown: rarityBreakdown || [],
      statTrakItems: statTrakCount?.count || 0,
    };
  } catch (error) {
    console.error("Error getting inventory stats:", error);
    return {
      totalItems: 0,
      totalValue: 0,
      lastUpdated: null,
      rarityBreakdown: [],
      statTrakItems: 0,
    };
  }
}
