const API_BASE_URL = "https://bymykel.github.io/CSGO-API/api/en";
const RAW_GITHUB_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";
const FETCH_TIMEOUT = 30000; // 30 seconds timeout

/**
 * Fetch with timeout wrapper
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = async (url, timeout = FETCH_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - server took too long to respond");
    }
    throw error;
  }
};

/**
 * Fetches CS:GO skins data from the public API
 * Uses multiple fallback endpoints
 * @returns {Promise<Array>} Array of skin objects with proper structure
 */
export const fetchSkinsFromAPI = async () => {
  try {
    console.log("🔍 Fetching skins from bymykel API...");

    // Try multiple endpoints in order of preference
    // Using skins.json (grouped) for trending to get ~2,013 unique skins
    // Phase data will be fetched separately from ungrouped API
    const endpoints = [
      `${RAW_GITHUB_URL}/skins.json`, // Grouped API for unique skins
      `${API_BASE_URL}/skins.json`,
      `${RAW_GITHUB_URL}/skins_not_grouped.json`, // Fallback
      `${API_BASE_URL}/skins_not_grouped.json`,
    ];

    let lastError;
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Trying endpoint: ${endpoint}`);
        const response = await fetchWithTimeout(endpoint);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Successfully fetched ${data.length} skins from API`);

        // Log first item to debug structure
        if (data.length > 0) {
          console.log("📦 Sample skin structure:", {
            id: data[0].id,
            name: data[0].name,
            category: data[0].category?.name,
            weapon: data[0].weapon?.name,
            hasImage: !!data[0].image,
          });
        }

        // Filter to ONLY exclude non-weapon items (stickers, cases, agents, etc.)
        // Accept ALL weapons/knives/gloves regardless of count
        const excludedCategories = [
          "Sticker",
          "Graffiti",
          "Patch",
          "Agent",
          "Music Kit",
          "Container",
          "Tool",
          "Key",
          "Pass",
          "Gift",
          "Tag",
        ];

        const filteredSkins = data.filter((skin) => {
          const category = skin.category?.name;

          // Reject if it's in the excluded list
          if (excludedCategories.includes(category)) {
            return false;
          }

          // Accept if it's a weapon category (Pistol, Rifle, SMG, etc.)
          // OR if it has a weapon property (means it's a gun skin)
          // OR if it's Knives/Gloves
          const isWeapon =
            skin.weapon?.name || category === "Knives" || category === "Gloves";

          return isWeapon;
        });

        console.log(
          `🎯 Filtered to ${filteredSkins.length} weapon/knife/glove skins (from ${data.length} total items)`
        );

        // Return filtered data
        return filteredSkins;
      } catch (error) {
        console.log(`❌ Failed: ${endpoint} - ${error.message}`);
        lastError = error;
      }
    }

    console.error("❌ All API endpoints failed. Last error:", lastError);
    throw lastError;
  } catch (error) {
    console.error("💥 Error fetching skins from API:", error);
    throw error;
  }
};
/**
 * Syncs API data to RealmDB
 * @param {Realm} realm - Realm database instance
 * @returns {Promise<number>} Number of items synced
 */
export const syncDataToRealm = async (realm) => {
  try {
    console.log("🔄 Syncing weapon/knife/glove data to RealmDB...");
    const apiData = await fetchSkinsFromAPI();

    realm.write(() => {
      // Get existing items to preserve favorite status
      const existingItems = realm.objects("Item");
      const favoriteMap = new Map();

      existingItems.forEach((item) => {
        if (item.isFavorite) {
          favoriteMap.set(item._id, true);
        }
      });

      // Clear existing data
      realm.delete(existingItems);

      // Insert new data
      apiData.forEach((skin) => {
        // Determine category from weapon type
        const category = determineCategory(
          skin.weapon?.name || skin.category?.name || "Other"
        );

        const itemData = {
          _id: skin.id,
          name: skin.name || "Unknown",
          description: skin.description || "",
          weapon: skin.weapon?.name || "",
          category: category,
          pattern: skin.pattern?.name || "",
          min_float: skin.min_float || 0,
          max_float: skin.max_float || 1,
          rarity: skin.rarity?.name || "",
          rarity_color: skin.rarity?.color || "",
          image: skin.image || "",
          team: skin.team?.name || "",
          isFavorite: favoriteMap.has(skin.id) || false,
          createdAt: new Date(),
        };

        realm.create("Item", itemData);
      });
    });

    console.log(
      `✅ Synced ${apiData.length} weapon/knife/glove items to RealmDB`
    );
    return apiData.length;
  } catch (error) {
    console.error("💥 Error syncing data to Realm:", error);
    throw error;
  }
};

/**
 * Determines the category based on weapon name
 */
export const determineCategory = (weaponName) => {
  const name = weaponName.toLowerCase();

  if (
    name.includes("knife") ||
    name.includes("bayonet") ||
    name.includes("karambit")
  ) {
    return "Knife";
  } else if (
    name.includes("ak-47") ||
    name.includes("m4a4") ||
    name.includes("m4a1") ||
    name.includes("aug") ||
    name.includes("sg 553") ||
    name.includes("famas") ||
    name.includes("galil") ||
    name.includes("awp") ||
    name.includes("ssg 08") ||
    name.includes("scar-20") ||
    name.includes("g3sg1")
  ) {
    return "Rifle";
  } else if (
    name.includes("glock") ||
    name.includes("usp") ||
    name.includes("p2000") ||
    name.includes("p250") ||
    name.includes("five-seven") ||
    name.includes("tec-9") ||
    name.includes("cz75") ||
    name.includes("desert eagle") ||
    name.includes("dual berettas") ||
    name.includes("r8 revolver")
  ) {
    return "Pistol";
  } else if (
    name.includes("mac-10") ||
    name.includes("mp9") ||
    name.includes("mp7") ||
    name.includes("mp5") ||
    name.includes("ump-45") ||
    name.includes("p90") ||
    name.includes("pp-bizon")
  ) {
    return "SMG";
  } else if (
    name.includes("nova") ||
    name.includes("xm1014") ||
    name.includes("mag-7") ||
    name.includes("sawed-off")
  ) {
    return "Shotgun";
  } else if (name.includes("m249") || name.includes("negev")) {
    return "Machine Gun";
  } else if (
    name.includes("gloves") ||
    name.includes("glove") ||
    name.includes("wraps") ||
    name.includes("hand wraps") ||
    name.includes("handwraps")
  ) {
    return "Gloves";
  } else {
    return "Other";
  }
};

/**
 * Checks if data needs to be synced (database is empty)
 * @param {Realm} realm - Realm database instance
 * @returns {boolean} True if sync is needed
 */
export const needsInitialSync = (realm) => {
  const items = realm.objects("Item");
  return items.length === 0;
};
