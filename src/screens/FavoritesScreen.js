import React, { useState, useMemo } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import { SearchBar } from "../components/SearchBar";
import { FilterPanel } from "../components/FilterPanel";
import { SkinCard } from "../components/SkinCard";
import { useData } from "../context/DataContext";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";

export const FavoritesScreen = ({ navigation }) => {
  const { items, isFavorite } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    categories: [],
    rarities: [],
    wears: [],
    stattrak: null,
  });

  // Get only favorited items
  const favoriteItems = useMemo(() => {
    return items.filter((item) => isFavorite(item._id || item.id));
  }, [items, isFavorite]);

  // Apply all filters to favorites
  const filteredFavorites = useMemo(() => {
    let filtered = favoriteItems;

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
  }, [favoriteItems, searchQuery, filters]);

  const handleItemPress = (item) => {
    navigation.navigate("Detail", { itemId: item.id || item._id });
  };

  const renderItem = ({ item }) => (
    <SkinCard item={item} onPress={() => handleItemPress(item)} />
  );

  const renderEmpty = () => {
    const hasFilters =
      searchQuery ||
      filters.categories.length > 0 ||
      filters.rarities.length > 0 ||
      filters.wears.length > 0 ||
      filters.stattrak !== null;

    if (favoriteItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the star icon on any skin to add it to your favorites
          </Text>
        </View>
      );
    }

    if (hasFilters) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No favorites match your filters</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or search term
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search and Filter Section */}
      {favoriteItems.length > 0 && (
        <View style={styles.topSection}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search favorites..."
            />
          </View>

          {/* Filter Button and Count */}
          <View style={styles.filterContainer}>
            <FilterPanel items={favoriteItems} onFiltersChange={setFilters} />
            <View style={styles.resultBadge}>
              <Text style={styles.resultCount}>
                {filteredFavorites.length}{" "}
                {filteredFavorites.length === 1 ? "favorite" : "favorites"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredFavorites}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={[
          styles.listContent,
          filteredFavorites.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
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
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: SPACING.lg,
    opacity: 0.4,
  },
  emptyText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.sm,
    fontWeight: "700",
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
});
