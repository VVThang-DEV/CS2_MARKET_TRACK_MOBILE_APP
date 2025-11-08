import * as SQLite from "expo-sqlite";

// Initialize SQLite database
let db = null;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("csgo_armory.db");

    // Create items table with all required fields
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY NOT NULL,
        _id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        weapon TEXT,
        weaponName TEXT,
        category TEXT NOT NULL,
        categoryName TEXT,
        pattern TEXT,
        patternName TEXT,
        phase TEXT,
        phaseName TEXT,
        min_float REAL DEFAULT 0,
        max_float REAL DEFAULT 1,
        rarity TEXT,
        rarityName TEXT,
        rarity_color TEXT,
        rarityColor TEXT,
        image TEXT NOT NULL,
        team TEXT,
        isFavorite INTEGER DEFAULT 0,
        stattrak INTEGER DEFAULT 0,
        souvenir INTEGER DEFAULT 0,
        wears TEXT,
        availableWears TEXT,
        crates TEXT,
        crateNames TEXT,
        collections TEXT,
        collectionNames TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_category ON items(category);
      CREATE INDEX IF NOT EXISTS idx_favorite ON items(isFavorite);
      CREATE INDEX IF NOT EXISTS idx_weapon ON items(weapon);
      CREATE INDEX IF NOT EXISTS idx_rarity ON items(rarity);
    `);

    // Create price_data table for current prices
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS price_data (
        market_hash_name TEXT PRIMARY KEY NOT NULL,
        price REAL,
        avg REAL,
        median REAL,
        volume INTEGER,
        lastUpdated TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_price_updated ON price_data(lastUpdated);
    `);

    // Create price_history table for offline tracking
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_hash_name TEXT NOT NULL,
        price REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        date TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_price_history_name ON price_history(market_hash_name);
      CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);
    `);

    // Create app_metadata table for sync status
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Create user_profile table for Steam user data
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
        steamId TEXT PRIMARY KEY NOT NULL,
        personaName TEXT,
        profileUrl TEXT,
        avatar TEXT,
        avatarMedium TEXT,
        avatarFull TEXT,
        personaState INTEGER,
        communityVisibilityState INTEGER,
        realName TEXT,
        countryCode TEXT,
        timeCreated INTEGER,
        lastLogoff INTEGER,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create inventory_items table for user's CS2 items
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steamId TEXT NOT NULL,
        assetId TEXT NOT NULL,
        classId TEXT,
        instanceId TEXT,
        marketHashName TEXT NOT NULL,
        name TEXT,
        type TEXT,
        rarity TEXT,
        weapon TEXT,
        wearName TEXT,
        isStatTrak INTEGER DEFAULT 0,
        isSouvenir INTEGER DEFAULT 0,
        iconUrl TEXT,
        backgroundColor TEXT,
        marketable INTEGER DEFAULT 1,
        tradable INTEGER DEFAULT 1,
        amount INTEGER DEFAULT 1,
        acquiredAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (steamId) REFERENCES user_profile(steamId) ON DELETE CASCADE,
        UNIQUE(steamId, assetId)
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_steam ON inventory_items(steamId);
      CREATE INDEX IF NOT EXISTS idx_inventory_market ON inventory_items(marketHashName);
    `);

    // Create inventory_snapshots table for price tracking
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS inventory_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steamId TEXT NOT NULL,
        totalItems INTEGER NOT NULL,
        totalValue REAL NOT NULL,
        snapshotDate TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (steamId) REFERENCES user_profile(steamId) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_steam ON inventory_snapshots(steamId);
      CREATE INDEX IF NOT EXISTS idx_snapshots_date ON inventory_snapshots(snapshotDate);
    `);

    // Create inventory_item_prices table for historical item prices
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS inventory_item_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshotId INTEGER NOT NULL,
        assetId TEXT NOT NULL,
        marketHashName TEXT NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (snapshotId) REFERENCES inventory_snapshots(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_item_prices_snapshot ON inventory_item_prices(snapshotId);
    `);

    console.log("✅ Database initialized successfully with offline support");
    return db;
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};
