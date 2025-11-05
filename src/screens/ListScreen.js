import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SearchBar } from "../components/SearchBar";
import { FilterPanel } from "../components/FilterPanel";
import { SkinCard } from "../components/SkinCard";
import { LivePriceIndicator } from "../components/LivePriceIndicator";
import { useData } from "../context/DataContext";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";

export const ListScreen = ({ navigation }) => {
  const { items, isLoading, error, syncFromAPI } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    rarities: [],
    wears: [],
    stattrak: null,
  });

  // Apply all filters
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.weaponName?.toLowerCase().includes(query) ||
          item.weapon?.name?.toLowerCase().includes(query) ||
          item.categoryName?.toLowerCase().includes(query) ||
          item.patternName?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter((item) =>
        filters.categories.includes(item.categoryName || item.category?.name)
      );
    }

    // Rarity filter
    if (filters.rarities.length > 0) {
      filtered = filtered.filter((item) =>
        filters.rarities.includes(item.rarityName || item.rarity?.name)
      );
    }

    // Wear filter
    if (filters.wears.length > 0) {
      filtered = filtered.filter((item) => {
        const itemWears =
          item.availableWears || item.wears?.map((w) => w.name) || [];
        return filters.wears.some((wear) => itemWears.includes(wear));
      });
    }

    // StatTrak filter
    if (filters.stattrak !== null) {
      filtered = filtered.filter((item) => item.stattrak === filters.stattrak);
    }

    return filtered;
  }, [items, searchQuery, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncFromAPI();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleItemPress = (item) => {
    navigation.navigate("Detail", { itemId: item.id || item._id });
  };

  const renderItem = ({ item }) => (
    <SkinCard item={item} onPress={() => handleItemPress(item)} />
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    const hasFilters =
      searchQuery ||
      filters.categories.length > 0 ||
      filters.rarities.length > 0 ||
      filters.wears.length > 0 ||
      filters.stattrak !== null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {hasFilters
            ? "No skins found matching your filters"
            : "No skins available"}
        </Text>
        {hasFilters && (
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or search term
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading CS:GO Skins...</Text>
        <Text style={styles.loadingSubtext}>Fetching from API...</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>Pull to refresh</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Section */}
      <View style={styles.topSection}>
        {/* Live Price Indicator */}
        <View style={styles.livePriceContainer}>
          <LivePriceIndicator />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search skins, weapons, patterns..."
          />
        </View>

        {/* Filter Button and Count */}
        <View style={styles.filterContainer}>
          <FilterPanel items={items} onFiltersChange={setFilters} />
          <View style={styles.resultBadge}>
            <Text style={styles.resultCount}>
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "skin" : "skins"}
            </Text>
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSection: {
    backgroundColor: COLORS.surface,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  livePriceContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    alignItems: "flex-end",
  },
  searchContainer: {
    padding: SPACING.md,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  resultBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 12,
  },
  listContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    color: COLORS.text,
    fontWeight: "700",
  },
  loadingSubtext: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  errorText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    textAlign: "center",
    fontWeight: "700",
  },
  errorSubtext: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    marginTop: SPACING.xl * 2,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.sm,
    fontWeight: "600",
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
