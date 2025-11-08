import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";
import { formatPrice } from "../services/priceService";
import {
  fetchTrendingListings,
  processTrendingListings,
  getTopMovers,
  filterByCategory,
} from "../services/csfloatService";
import { MiniSparkline } from "../components/MiniSparkline";

export const TrendsScreen = ({ navigation }) => {
  const { items } = useData();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingItems, setTrendingItems] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Categories for CS:GO items
  const categories = ["All", "Knife", "Gloves", "Rifle", "Pistol", "SMG"];

  useEffect(() => {
    loadTrendingData();
  }, []);

  const loadTrendingData = async () => {
    try {
      setLoadingTrends(true);

      // Fetch ALL trending listings from CSFloat (no limit)
      const listings = await fetchTrendingListings(0);

      // Process listings into trend data
      const processed = processTrendingListings(listings);

      // Get top 3 movers
      const top3 = getTopMovers(processed, 3);

      setTrendingItems(processed);
      setTopMovers(top3);

      console.log(
        `Loaded ${processed.length} trending items with ${top3.length} top movers`
      );
    } catch (error) {
      console.error("Error loading trending data:", error);
    } finally {
      setLoadingTrends(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrendingData();
  };

  // Filter by category and search query
  const filteredItems = useMemo(() => {
    let filtered = filterByCategory(trendingItems, selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.itemName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [trendingItems, selectedCategory, searchQuery]);

  const renderTopMover = ({ item, index }) => {
    const isPositive = item.priceChange >= 0;
    const rankLabels = ["1st", "2nd", "3rd"];
    const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

    return (
      <View style={styles.topMoverCard}>
        {/* Rank Badge */}
        <View
          style={[styles.rankBadge, { backgroundColor: rankColors[index] }]}
        >
          <Text style={styles.rankBadgeText}>{rankLabels[index]}</Text>
        </View>

        {/* Large Centered Image */}
        <View style={styles.topMoverImageSection}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.topMoverLargeImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.topMoverLargeImagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={48}
                color={COLORS.textMuted}
              />
            </View>
          )}
        </View>

        {/* Item Name */}
        <Text style={styles.topMoverCardName} numberOfLines={2}>
          {item.itemName || item.name}
        </Text>
        <Text style={styles.topMoverCardWear}>{item.wearName}</Text>

        {/* Stats Row */}
        <View style={styles.topMoverStatsRow}>
          {/* Price */}
          <View style={styles.topMoverStat}>
            <Text style={styles.topMoverStatLabel}>Price</Text>
            <Text style={styles.topMoverStatValue}>
              {formatPrice(item.currentPrice)}
            </Text>
          </View>

          {/* Change */}
          <View style={styles.topMoverStat}>
            <Text style={styles.topMoverStatLabel}>Change</Text>
            <View
              style={[
                styles.topMoverChangeBox,
                {
                  backgroundColor: isPositive ? "#10b98120" : "#ef444420",
                },
              ]}
            >
              <Text
                style={[
                  styles.topMoverStatValue,
                  {
                    color: isPositive ? "#10b981" : "#ef4444",
                    fontSize: 16,
                  },
                ]}
              >
                {isPositive ? "+" : ""}
                {item.priceChange.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Volume */}
          <View style={styles.topMoverStat}>
            <Text style={styles.topMoverStatLabel}>Volume</Text>
            <Text style={styles.topMoverStatValue}>{item.volume}</Text>
          </View>
        </View>

        {/* Sparkline */}
        <View style={styles.topMoverSparklineSection}>
          <MiniSparkline
            data={item.priceHistory || []}
            width={140}
            height={50}
            color={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth={2.5}
            showBackground={true}
          />
        </View>
      </View>
    );
  };

  const renderTrendItem = ({ item }) => {
    const isPositive = item.priceChange >= 0;
    const sparklineColor = isPositive ? "#10b981" : "#ef4444";

    // Find matching item in items list for navigation
    const matchingItem = items.find(
      (i) => i.name === item.itemName || item.name.includes(i.name)
    );

    const handlePress = () => {
      if (matchingItem) {
        navigation.navigate("Detail", { itemId: matchingItem._id });
      } else {
        console.log("No matching item found for:", item.name);
      }
    };

    return (
      <TouchableOpacity
        style={styles.trendItem}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        {/* Item Image - Smaller */}
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.trendItemImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.trendItemImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={20} color={COLORS.textMuted} />
          </View>
        )}

        {/* Item Info */}
        <View style={styles.trendItemLeft}>
          <Text style={styles.trendItemName} numberOfLines={1}>
            {item.itemName || item.name}
          </Text>
          <View style={styles.trendItemMeta}>
            <Text style={styles.trendItemWear}>{item.wearName}</Text>
            {item.isStatTrak && (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Ionicons name="stats-chart" size={10} color={COLORS.primary} />
                <Text style={styles.statTrakText}>ST</Text>
              </>
            )}
          </View>
          <View style={styles.volumeRow}>
            <Ionicons
              name="layers-outline"
              size={10}
              color={COLORS.textMuted}
            />
            <Text style={styles.volumeText}>{item.volume} vol</Text>
          </View>
        </View>

        {/* Mini Price Chart */}
        <View style={styles.sparklineContainer}>
          <MiniSparkline
            data={item.priceHistory || []}
            width={60}
            height={30}
            color={sparklineColor}
            strokeWidth={1.5}
          />
        </View>

        {/* Price & Change */}
        <View style={styles.trendItemRight}>
          <Text style={styles.trendItemPrice}>
            {formatPrice(item.currentPrice)}
          </Text>
          <View
            style={[
              styles.changeIndicator,
              {
                backgroundColor: isPositive
                  ? "#10b981" + "15"
                  : "#ef4444" + "15",
              },
            ]}
          >
            <Ionicons
              name={isPositive ? "arrow-up" : "arrow-down"}
              size={12}
              color={isPositive ? "#10b981" : "#ef4444"}
            />
            <Text
              style={[
                styles.changeText,
                { color: isPositive ? "#10b981" : "#ef4444" },
              ]}
            >
              {isPositive ? "+" : ""}
              {item.priceChange.toFixed(1)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  if (loadingTrends && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching trending market data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search skins..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Top Movers Header */}
            <View style={styles.topMoversSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flame" size={20} color="#ff6b35" />
                <Text style={styles.sectionTitle}>Top 3 Biggest Movers</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              </View>

              {/* Horizontal Scroll of Large Cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topMoversScroll}
              >
                {topMovers.map((item, index) => (
                  <View key={item.id}>{renderTopMover({ item, index })}</View>
                ))}
              </ScrollView>
            </View>

            {/* Category Filter */}
            <View style={styles.categorySection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === category &&
                          styles.categoryButtonTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* List Header */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Trending in {selectedCategory}
              </Text>
              <Text style={styles.listCount}>{filteredItems.length} items</Text>
            </View>
          </>
        }
        data={filteredItems}
        renderItem={renderTrendItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="analytics-outline"
              size={64}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>No trending data available</Text>
            <Text style={styles.emptySubtext}>
              Pull to refresh and fetch latest market trends
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  searchSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    padding: 0,
  },
  topMoversSection: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#10b981" + "15",
    borderRadius: BORDER_RADIUS.full,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10b981",
  },
  liveText: {
    ...TYPOGRAPHY.caption,
    color: "#10b981",
    fontWeight: "600",
    fontSize: 10,
  },
  topMoversScroll: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  topMoverCard: {
    width: 200,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  rankBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topMoverImageSection: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  topMoverLargeImage: {
    width: "100%",
    height: "100%",
  },
  topMoverLargeImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topMoverCardName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
    minHeight: 36,
  },
  topMoverCardWear: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  topMoverStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + "40",
  },
  topMoverStat: {
    flex: 1,
    alignItems: "center",
  },
  topMoverStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 9,
    marginBottom: 4,
  },
  topMoverStatValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 13,
  },
  topMoverChangeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  topMoverSparklineSection: {
    width: "100%",
    alignItems: "center",
    paddingTop: SPACING.sm,
  },
  categorySection: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
  },
  listTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "700",
  },
  listCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingBottom: SPACING.md,
  },
  trendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + "30",
    gap: SPACING.sm,
  },
  trendItemImage: {
    width: 50,
    height: 50,
  },
  placeholderImage: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  trendItemLeft: {
    flex: 1,
  },
  trendItemName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 2,
  },
  trendItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  trendItemWear: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  volumeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 9,
  },
  sparklineContainer: {
    width: 60,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  metaDivider: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  statTrakText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  trendItemRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  trendItemPrice: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 13,
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  changeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});
