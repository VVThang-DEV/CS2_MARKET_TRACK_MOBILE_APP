/**
 * Supabase Service - Centralized price history storage
 *
 * ✅ BENEFITS OVER MOCKAPI:
 * - No 100-resource limit (500 MB database on free tier)
 * - Real-time subscriptions (live updates without polling)
 * - PostgreSQL database (much faster & more powerful)
 * - Better error handling and reliability
 * - Professional grade (used by production apps)
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://supabase.com and create account
 * 2. Create new project (choose region close to you)
 * 3. Wait ~2 minutes for database provisioning
 * 4. Go to Project Settings → API
 * 5. Copy your Project URL and anon public key
 * 6. Update SUPABASE_URL and SUPABASE_ANON_KEY below
 *
 * DATABASE SCHEMA:
 * Table: price_snapshots
 * Columns:
 *   - id: bigint (auto-generated primary key)
 *   - created_at: timestamptz (auto-generated)
 *   - timestamp: bigint (unix timestamp in ms)
 *   - prices: jsonb (price data object)
 */

import { createClient } from "@supabase/supabase-js";

// ✅ Supabase Credentials Configured
const SUPABASE_URL = "https://gwgeymysoskmjmosmtdh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z2V5bXlzb3NrbWptb3NtdGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjkxNzQsImV4cCI6MjA3NzkwNTE3NH0.VKUTTJEu0e11aKw5PLGNT43xhL0pdK8XM52FGklEx9w";

// Initialize Supabase client
let supabase = null;

/**
 * Initialize Supabase connection
 * Call this once when app starts
 */
export const initSupabase = () => {
  if (
    SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL" ||
    SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
  ) {
    console.warn(
      "⚠️ Supabase not configured. Please update SUPABASE_URL and SUPABASE_ANON_KEY in supabaseService.js"
    );
    return false;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // We don't need auth sessions for this use case
      },
    });
    console.log("✅ Supabase initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize Supabase:", error);
    return false;
  }
};

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = () => {
  return (
    supabase !== null &&
    SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
    SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
  );
};

/**
 * Create the price_snapshots table and helper functions
 * Run this ONCE after setting up your Supabase project
 * Or create the table manually in Supabase SQL Editor
 *
 * PERFORMANCE TIP: If queries are slow, run this in Supabase SQL Editor:
 *
 * -- Increase statement timeout for large JSONB queries
 * ALTER DATABASE postgres SET statement_timeout = '30s';
 *
 * -- Add GIN index for faster JSONB queries (optional, for large datasets)
 * CREATE INDEX IF NOT EXISTS idx_price_snapshots_prices_gin
 * ON price_snapshots USING GIN (prices);
 *
 * -- Add partial index for timestamp queries
 * CREATE INDEX IF NOT EXISTS idx_price_snapshots_timestamp_recent
 * ON price_snapshots(timestamp DESC)
 * WHERE timestamp > (EXTRACT(epoch FROM NOW() - INTERVAL '90 days') * 1000);
 */
export const createPriceSnapshotsTable = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }

  // First create the table
  const { error: tableError } = await supabase.rpc(
    "create_price_snapshots_table",
    {
      sql: `
      CREATE TABLE IF NOT EXISTS price_snapshots (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        timestamp BIGINT NOT NULL,
        prices JSONB NOT NULL
      );
      
      -- Add index for faster timestamp queries
      CREATE INDEX IF NOT EXISTS idx_price_snapshots_timestamp 
      ON price_snapshots(timestamp DESC);
      
      -- Add GIN index for JSONB queries
      CREATE INDEX IF NOT EXISTS idx_price_snapshots_prices_gin
      ON price_snapshots USING GIN (prices);
    `,
    }
  );

  if (tableError) {
    console.error("❌ Failed to create table:", tableError);
    throw tableError;
  }

  // Create helper function for efficient price history queries
  const { error: funcError } = await supabase.rpc(
    "create_price_history_function",
    {
      sql: `
      CREATE OR REPLACE FUNCTION get_price_history(market_hash_name TEXT, days_back INT DEFAULT 30)
      RETURNS TABLE("timestamp" BIGINT, price NUMERIC)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        cutoff_time BIGINT;
      BEGIN
        cutoff_time := (EXTRACT(epoch FROM NOW() - INTERVAL '1 day' * days_back) * 1000)::BIGINT;
        
        RETURN QUERY
        SELECT 
          ps."timestamp",
          (ps.prices->market_hash_name->>'price')::NUMERIC as price
        FROM price_snapshots ps
        WHERE ps."timestamp" >= cutoff_time
          AND ps.prices ? market_hash_name
          AND (ps.prices->market_hash_name->>'price')::NUMERIC > 0
        ORDER BY ps."timestamp" ASC
        LIMIT 1000;
      END;
      $$;
    `,
    }
  );

  if (funcError) {
    console.warn(
      "⚠️ Could not create helper function (may already exist):",
      funcError.message
    );
  }

  console.log("✅ price_snapshots table and functions created successfully");
};

/**
 * Test the optimized price history function
 * @param {string} marketHashName - Test item name
 * @returns {Promise<Object>} Test results
 */
export const testOptimizedPriceHistory = async (
  marketHashName = "AK-47 | Redline (Field-Tested)"
) => {
  console.log("🧪 Testing optimized price history function...");

  const results = {
    optimizedFunction: false,
    fallbackMethod: false,
    optimizedTime: 0,
    fallbackTime: 0,
    dataPoints: 0,
  };

  try {
    // Test optimized function
    const startTime = Date.now();
    const { data, error } = await supabase.rpc("get_price_history", {
      market_hash_name: marketHashName,
      days_back: 7, // Test with 7 days for faster results
    });

    if (!error && data) {
      results.optimizedTime = Date.now() - startTime;
      results.optimizedFunction = true;
      results.dataPoints = data.length;
      console.log(
        `✅ Optimized function works! Retrieved ${data.length} points in ${results.optimizedTime}ms`
      );
    } else {
      console.log("❌ Optimized function failed:", error?.message);
    }
  } catch (error) {
    console.log("❌ Optimized function error:", error.message);
  }

  // Test fallback method
  try {
    const startTime = Date.now();
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const { data, error } = await supabase
      .from("price_snapshots")
      .select("timestamp, prices")
      .gte("timestamp", cutoffTime)
      .order("timestamp", { ascending: true })
      .limit(50);

    if (!error && data) {
      const history = data
        .map((snapshot) => {
          const priceInfo = snapshot.prices?.[marketHashName];
          return priceInfo
            ? {
                date: new Date(snapshot.timestamp),
                timestamp: snapshot.timestamp,
                price: priceInfo?.price || priceInfo?.avg || 0,
              }
            : null;
        })
        .filter((item) => item !== null && item.price > 0);

      results.fallbackTime = Date.now() - startTime;
      results.fallbackMethod = true;
      console.log(
        `✅ Fallback method works! Retrieved ${history.length} points in ${results.fallbackTime}ms`
      );
    }
  } catch (error) {
    console.log("❌ Fallback method error:", error.message);
  }

  console.log("\n📊 Test Results:");
  console.log(
    `  Optimized Function: ${results.optimizedFunction ? "✅" : "❌"} (${
      results.optimizedTime
    }ms)`
  );
  console.log(
    `  Fallback Method: ${results.fallbackMethod ? "✅" : "❌"} (${
      results.fallbackTime
    }ms)`
  );
  console.log(`  Data Points: ${results.dataPoints}`);

  if (results.optimizedFunction && results.fallbackMethod) {
    const speedup =
      results.fallbackTime > 0
        ? (results.fallbackTime / results.optimizedTime).toFixed(1)
        : "∞";
    console.log(`  Speed Improvement: ${speedup}x faster`);
  }

  return results;
};

/**
 * Save price snapshot to Supabase
 * @param {Object} priceData - Object with market hash names as keys
 * @returns {Promise<Object>} Saved snapshot
 */
export const savePriceSnapshotToSupabase = async (priceData) => {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase not configured, skipping save");
    return null;
  }

  try {
    const timestamp = Date.now();

    console.log("📤 Saving price snapshot to Supabase...");
    console.log(`  - Timestamp: ${timestamp}`);
    console.log(`  - Date: ${new Date(timestamp).toISOString()}`);
    console.log(`  - Items: ${Object.keys(priceData).length}`);

    const { data, error } = await supabase
      .from("price_snapshots")
      .insert([
        {
          timestamp,
          prices: priceData,
        },
      ])
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    console.log("✅ Price snapshot saved to Supabase successfully!");
    console.log(`  - Snapshot ID: ${data[0].id}`);
    return data[0];
  } catch (error) {
    console.error("❌ Error saving to Supabase:", error.message);
    throw error;
  }
};

/**
 * Fetch all price snapshots from Supabase
 * @param {number} limit - Maximum number of snapshots to fetch (default: 50)
 * @returns {Promise<Array>} Array of price snapshots
 */
export const fetchPriceSnapshots = async (limit = 50) => {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase not configured");
    return [];
  }

  try {
    console.log(`📥 Fetching up to ${limit} price snapshots from Supabase...`);

    const { data, error } = await supabase
      .from("price_snapshots")
      .select("id, timestamp, created_at")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} price snapshots from Supabase`);
    return data;
  } catch (error) {
    console.error("❌ Error fetching from Supabase:", error.message);
    return [];
  }
};

/**
 * Get price history for a specific skin from Supabase
 * @param {string} marketHashName - Steam market hash name
 * @param {number} days - Number of days to fetch (default: 30)
 * @returns {Promise<Array>} Array of {date, price, timestamp}
 */
export const getSkinPriceHistoryFromSupabase = async (
  marketHashName,
  days = 30
) => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // Try to use the optimized RPC function first
    try {
      const { data, error } = await supabase.rpc("get_price_history", {
        market_hash_name: marketHashName,
        days_back: days,
      });

      if (!error && data) {
        const history = data.map((row) => ({
          date: new Date(row.timestamp),
          timestamp: row.timestamp,
          price: parseFloat(row.price),
        }));

        console.log(
          `✅ Retrieved ${history.length} price points for ${marketHashName} from Supabase (optimized)`
        );
        return history;
      }
    } catch (rpcError) {
      console.warn(
        "⚠️ Optimized query failed, falling back to standard query:",
        rpcError.message
      );
    }

    // Fallback with more aggressive optimization
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Strategy 1: Try to use JSONB operator to extract only needed field
    // This runs on database side, not client side - MUCH faster
    try {
      const { data, error } = await supabase
        .from("price_snapshots")
        .select(
          `
          timestamp,
          prices->${marketHashName} as price_data
        `
        )
        .gte("timestamp", cutoffTime)
        .order("timestamp", { ascending: true })
        .limit(100) // Limit to last 100 data points
        .abortSignal(AbortSignal.timeout(10000)); // 10 second timeout

      if (!error && data && data.length > 0) {
        const history = data
          .map((snapshot) => {
            const priceInfo = snapshot.price_data;
            if (!priceInfo) return null;

            return {
              date: new Date(snapshot.timestamp),
              timestamp: snapshot.timestamp,
              price: priceInfo?.price || priceInfo?.avg || 0,
            };
          })
          .filter((item) => item !== null && item.price > 0);

        if (history.length > 0) {
          console.log(
            `✅ Retrieved ${history.length} price points for ${marketHashName} from Supabase (JSONB operator)`
          );
          return history;
        }
      }
    } catch (jsonbError) {
      console.warn("⚠️ JSONB query failed:", jsonbError.message);
    }

    // Strategy 2: Fetch fewer snapshots with smaller limit
    console.log("⚠️ Using minimal fallback query...");
    const { data, error } = await supabase
      .from("price_snapshots")
      .select("timestamp, prices")
      .gte("timestamp", cutoffTime)
      .order("timestamp", { ascending: true })
      .limit(50) // Reduced from 200 to 50 to prevent timeout
      .abortSignal(AbortSignal.timeout(8000)); // 8 second timeout

    if (error) throw error;

    // Extract price for this specific item from each snapshot
    const history = data
      .map((snapshot) => {
        const priceInfo = snapshot.prices?.[marketHashName];
        if (!priceInfo) return null;

        return {
          date: new Date(snapshot.timestamp),
          timestamp: snapshot.timestamp,
          price: priceInfo?.price || priceInfo?.avg || 0,
        };
      })
      .filter((item) => item !== null && item.price > 0);

    console.log(
      `✅ Retrieved ${history.length} price points for ${marketHashName} from Supabase (minimal fallback)`
    );
    return history;
  } catch (error) {
    // Check if it's a timeout error
    if (error.message?.includes("timeout") || error.code === "57014") {
      console.warn("⚠️ Supabase query timeout - falling back to local storage");
    } else {
      console.error("❌ Error getting price history from Supabase:", error);
    }
    // Return empty array to trigger fallback to local storage
    return [];
  }
};

/**
 * Delete old snapshots to manage storage
 * @param {number} daysToKeep - Keep snapshots newer than this many days
 * @returns {Promise<number>} Number of snapshots deleted
 */
export const cleanupOldSnapshots = async (daysToKeep = 30) => {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  try {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    const { data, error } = await supabase
      .from("price_snapshots")
      .delete()
      .lt("timestamp", cutoffTime)
      .select();

    if (error) throw error;

    const deletedCount = data?.length || 0;
    console.log(
      `🗑️ Cleaned up ${deletedCount} old snapshots (older than ${daysToKeep} days)`
    );
    return deletedCount;
  } catch (error) {
    console.error("❌ Error cleaning up snapshots:", error);
    return 0;
  }
};

/**
 * Get storage statistics
 * @returns {Promise<Object>} Stats object with count and size info
 */
export const getStorageStats = async () => {
  if (!isSupabaseConfigured()) {
    return { count: 0, oldestDate: null, newestDate: null };
  }

  try {
    const { data, error, count } = await supabase
      .from("price_snapshots")
      .select("timestamp", { count: "exact" })
      .order("timestamp", { ascending: true })
      .limit(1);

    if (error) throw error;

    const { data: newest } = await supabase
      .from("price_snapshots")
      .select("timestamp")
      .order("timestamp", { ascending: false })
      .limit(1);

    return {
      count: count || 0,
      oldestDate: data?.[0]?.timestamp ? new Date(data[0].timestamp) : null,
      newestDate: newest?.[0]?.timestamp ? new Date(newest[0].timestamp) : null,
    };
  } catch (error) {
    console.error("❌ Error getting storage stats:", error);
    return { count: 0, oldestDate: null, newestDate: null };
  }
};

/**
 * Test Supabase connection
 * @returns {Promise<Object>} Test results
 */
export const testSupabaseConnection = async () => {
  const results = {
    configured: isSupabaseConfigured(),
    canConnect: false,
    canRead: false,
    canWrite: false,
    errors: [],
  };

  if (!results.configured) {
    results.errors.push("Supabase credentials not configured");
    return results;
  }

  try {
    // Test connection
    const { error: pingError } = await supabase
      .from("price_snapshots")
      .select("count", { count: "exact", head: true });

    if (pingError) {
      results.errors.push(`Connection failed: ${pingError.message}`);
      return results;
    }

    results.canConnect = true;
    results.canRead = true;

    // Test write
    const testSnapshot = {
      timestamp: Date.now(),
      prices: { "test-item": { price: 1.23 } },
    };

    const { data, error: writeError } = await supabase
      .from("price_snapshots")
      .insert([testSnapshot])
      .select();

    if (writeError) {
      results.errors.push(`Write failed: ${writeError.message}`);
    } else {
      results.canWrite = true;

      // Clean up test data
      await supabase.from("price_snapshots").delete().eq("id", data[0].id);
    }
  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Supabase Connection Test Results:");
  console.log(`  Configured: ${results.configured ? "✅" : "❌"}`);
  console.log(`  Can Connect: ${results.canConnect ? "✅" : "❌"}`);
  console.log(`  Can Read: ${results.canRead ? "✅" : "❌"}`);
  console.log(`  Can Write: ${results.canWrite ? "✅" : "❌"}`);
  if (results.errors.length > 0) {
    console.log(`  Errors: ${results.errors.length}`);
    results.errors.forEach((err, i) => console.log(`    ${i + 1}. ${err}`));
  }
  console.log("=".repeat(50) + "\n");

  return results;
};

// Initialize Supabase on import
initSupabase();
