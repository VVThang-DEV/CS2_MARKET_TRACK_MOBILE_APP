import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { AppState, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { initDatabase } from "../database/schema";
import {
  getAllItems,
  insertItems,
  toggleFavorite as toggleFavoriteDB,
  isDatabaseEmpty,
  searchItems,
  savePriceData,
  getPriceData,
  savePriceHistory,
  getPriceHistory,
  setMetadata,
  getMetadata,
  cleanOldPriceHistory,
} from "../database/operations";
import { migrateFromAsyncStorage } from "../database/migration";
import { fetchSkinsFromAPI, determineCategory } from "../services/apiService";
import { fetchPriceData } from "../services/priceService";
import {
  savePriceSnapshotToSupabase,
  isSupabaseConfigured,
} from "../services/supabaseService";

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const priceUpdateInterval = useRef(null);
  const appState = useRef(AppState.currentState);

  // Initialize database on mount
  useEffect(() => {
    const initDB = async () => {
      try {
        console.log("🔄 Initializing SQLite database...");
        await initDatabase();
        setDbInitialized(true);
        console.log("✅ Database initialized successfully");

        // Run migration from AsyncStorage (one-time for existing users)
        const migrationResult = await migrateFromAsyncStorage();
        if (migrationResult.migrated) {
          console.log(
            `✅ Migrated ${migrationResult.itemCount} items from AsyncStorage`
          );
        }
      } catch (error) {
        console.error("❌ Database initialization failed:", error);
        setError("Failed to initialize database: " + error.message);
      }
    };
    initDB();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected;
      console.log("Network state:", connected ? "Connected" : "Disconnected");
      setIsConnected(connected);
      setIsOfflineMode(!connected);

      if (connected && error && error.includes("Network")) {
        console.log("Network reconnected, retrying data load...");
        loadData();
      }
    });

    return () => unsubscribe();
  }, [error]);

  // Load initial data after database is initialized
  useEffect(() => {
    if (dbInitialized) {
      loadData();
      loadPrices();
    }
  }, [dbInitialized]);

  // Set up real-time price updates with polling
  // NOTE: Price tracking only works while app is open/active
  // When app is closed or backgrounded for long periods, tracking pauses
  // This is normal React Native behavior - background tasks require special setup
  useEffect(() => {
    if (!dbInitialized) return;

    // Initial price load
    loadPrices();

    // Set up polling interval for price updates (every 30 minutes)
    priceUpdateInterval.current = setInterval(() => {
      if (isConnected) {
        console.log("Auto-refreshing prices (app is active)...");
        loadPrices();
      } else {
        console.log("Offline mode - skipping price refresh");
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Handle app state changes
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log(`App state changed: ${appState.current} -> ${nextAppState}`);

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground, refresh prices to catch up
        if (isConnected) {
          console.log("App became active, refreshing prices to catch up");
          loadPrices();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background
        console.log("App going to background, price tracking will pause");
      }

      appState.current = nextAppState;
    });

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up price update interval");
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current);
      }
      subscription?.remove();
    };
  }, [dbInitialized, isConnected]);

  // Load prices from CSGOFloat with history tracking (local SQLite + Supabase cloud)
  const loadPrices = async () => {
    try {
      if (!isConnected) {
        console.log("📴 Offline mode - loading prices from SQLite cache...");
        const cachedPrices = await getPriceData();
        if (cachedPrices && Object.keys(cachedPrices).length > 0) {
          setPriceData(cachedPrices);
          const lastUpdate = await getMetadata("lastPriceUpdate");
          setLastPriceUpdate(lastUpdate || null);
          console.log("✅ Loaded cached prices from SQLite");
        } else {
          console.log("⚠️ No cached prices available offline");
        }
        return;
      }

      // Online mode - fetch fresh prices
      const prices = await fetchPriceData();
      if (prices) {
        setPriceData(prices);
        const timestamp = Date.now();
        setLastPriceUpdate(timestamp);

        // Save to SQLite for offline access
        await savePriceData(prices);
        await savePriceHistory(prices);
        await setMetadata("lastPriceUpdate", timestamp);

        // Clean old history (keep 30 days)
        await cleanOldPriceHistory(30);

        // Save to Supabase (centralized cloud storage)
        if (isSupabaseConfigured()) {
          try {
            await savePriceSnapshotToSupabase(prices);
            console.log("✅ Price snapshot saved to Supabase successfully!");
          } catch (supabaseError) {
            console.error("❌ Supabase error:", supabaseError.message);
            console.warn("⚠️ Using local storage as fallback");
          }
        }

        console.log("✅ Price data loaded and saved to SQLite");
      }
    } catch (err) {
      console.error("Failed to load price data:", err);
      // Try to load from cache on error
      try {
        const cachedPrices = await getPriceData();
        if (cachedPrices && Object.keys(cachedPrices).length > 0) {
          setPriceData(cachedPrices);
          console.log("⚠️ Using cached prices due to fetch error");
        }
      } catch (cacheError) {
        console.error("Failed to load cached prices:", cacheError);
      }
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("📂 Loading data from SQLite database...");

      // Load items from database
      const dbItems = await getAllItems();
      console.log(`Loaded ${dbItems.length} items from database`);

      // Build favorites map
      const favMap = {};
      dbItems.forEach((item) => {
        if (item.isFavorite) {
          favMap[item._id || item.id] = true;
        }
      });
      setFavorites(favMap);

      // If no items in database, fetch from API
      if (dbItems.length === 0) {
        if (!isConnected) {
          setError(
            "No cached data available. Please connect to internet to download data."
          );
          setIsLoading(false);
          return;
        }
        console.log("💾 No cached data, fetching from API...");
        await syncFromAPI();
      } else {
        setItems(dbItems);
        setIsLoading(false);
        console.log("✅ Data loaded successfully from SQLite!");

        // Sync in background if connected (non-blocking)
        if (isConnected) {
          const lastSync = await getMetadata("lastSync");
          const hoursSinceSync = lastSync
            ? (Date.now() - lastSync) / (1000 * 60 * 60)
            : 999;

          if (hoursSinceSync > 24) {
            console.log("🔄 Background sync - data is older than 24 hours");
            syncFromAPI().catch((err) =>
              console.warn("Background sync failed:", err)
            );
          }
        }
      }
    } catch (err) {
      console.error("Load data error:", err);
      const errorMessage =
        err.message ||
        "Could not load data. Please check your connection and try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const syncFromAPI = async () => {
    try {
      setError(null);

      // Check network connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error(
          "No internet connection. Please check your network and try again."
        );
      }

      console.log("🌐 Syncing data from API...");
      const apiData = await fetchSkinsFromAPI();

      if (!apiData || apiData.length === 0) {
        throw new Error("No data received from API");
      }

      console.log(`Processing ${apiData.length} items from API...`);

      // Process items for database
      const processedItems = apiData.map((skin, index) => {
        const weaponName = skin.weapon?.name || "";
        const category = weaponName
          ? determineCategory(weaponName)
          : skin.category?.name || "Other";
        const rarityName = skin.rarity?.name || "";
        const rarityColor = skin.rarity?.color || "";

        // Debug first few items
        if (index < 3) {
          console.log(`Processing skin ${index}:`, {
            name: skin.name,
            weaponName,
            category,
            rarityName,
            stattrak: skin.stattrak,
          });
        }

        return {
          _id: skin.id,
          id: skin.id,
          name: skin.name || "Unknown",
          description: skin.description || "",
          weapon: weaponName,
          weaponName: weaponName,
          category: category,
          categoryName: category,
          pattern: skin.pattern?.name || "",
          patternName: skin.pattern?.name || "",
          phase: skin.phase || "",
          phaseName: skin.phase || "",
          min_float: skin.min_float || 0,
          max_float: skin.max_float || 1,
          rarity: rarityName,
          rarityName: rarityName,
          rarity_color: rarityColor,
          rarityColor: rarityColor,
          image: skin.image || "",
          team: skin.team?.name || "",
          wears: skin.wears || [],
          availableWears: skin.wears?.map((w) => w.name) || [],
          stattrak: skin.stattrak || false,
          souvenir: skin.souvenir || false,
          crates: skin.crates || [],
          crateNames: skin.crates?.map((c) => c.name) || [],
          collections: skin.collections || [],
          collectionNames: skin.collections?.map((c) => c.name) || [],
        };
      });

      // Save to SQLite database (preserves favorites via COALESCE in insertItems)
      await insertItems(processedItems);
      await setMetadata("lastSync", Date.now());

      // Reload from database to get updated data
      const updatedItems = await getAllItems();
      setItems(updatedItems);
      setIsLoading(false);

      console.log(
        `✅ Successfully synced ${processedItems.length} items to SQLite`
      );
      return processedItems.length;
    } catch (err) {
      console.error("Sync error:", err);
      const errorMessage =
        err.message && err.message.includes("Failed to fetch")
          ? "Network error. Please check your internet connection and try again."
          : err.message || "Could not sync data from API.";
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  };

  const toggleFavorite = useCallback(
    async (itemId) => {
      try {
        const isFav = !!favorites[itemId];
        const newIsFav = !isFav;

        // Update database
        await toggleFavoriteDB(itemId, newIsFav);

        // Update local state
        const newFavorites = { ...favorites };
        if (newIsFav) {
          newFavorites[itemId] = true;
        } else {
          delete newFavorites[itemId];
        }
        setFavorites(newFavorites);

        // Update item in items array
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId || item._id === itemId
              ? { ...item, isFavorite: newIsFav }
              : item
          )
        );
      } catch (err) {
        console.error("Toggle favorite error:", err);
      }
    },
    [favorites]
  );

  const getFavoriteItems = useCallback(() => {
    return items.filter((item) => favorites[item._id || item.id]);
  }, [items, favorites]);

  const retryLoadData = useCallback(async () => {
    console.log("Retrying data load...");
    await loadData();
  }, []);

  const clearStorageAndRetry = useCallback(async () => {
    try {
      console.log(
        "⚠️ This will clear all local data. Please reconnect to internet to re-download."
      );
      setError("This feature requires migration to new storage system.");
    } catch (err) {
      console.error("Error:", err);
    }
  }, []);

  const value = {
    items,
    favorites,
    isLoading,
    error,
    priceData,
    lastPriceUpdate,
    isConnected,
    isOfflineMode,
    syncFromAPI,
    toggleFavorite,
    getFavoriteItems,
    refreshPrices: loadPrices,
    retryLoadData,
    clearStorageAndRetry,
    isFavorite: (itemId) => !!favorites[itemId],
    getPriceHistory, // Expose for price charts
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
