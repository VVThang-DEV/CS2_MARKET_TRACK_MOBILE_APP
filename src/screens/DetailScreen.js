import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useData } from "../context/DataContext";
import {
  getSkinPrice,
  formatPrice,
  getPriceRange,
  getAllWearPrices,
} from "../services/priceService";
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from "../constants/theme";
import { PriceChart } from "../components/PriceChart";

const { width } = Dimensions.get("window");

export const DetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { items, isFavorite, toggleFavorite, priceData } = useData();

  const item = items.find((i) => i._id === itemId);
  const isItemFavorite = isFavorite(itemId);

  const [showPriceDetails, setShowPriceDetails] = useState(false);
  // Always default to normal (non-StatTrak) view
  const [showStatTrak, setShowStatTrak] = useState(false);

  // Calculate prices for both versions (only if item has StatTrak)
  const normalPrice = priceData
    ? getSkinPrice(priceData, item?.name, null, false, item?.souvenir)
    : null;

  const statTrakPrice =
    item?.stattrak && priceData
      ? getSkinPrice(priceData, item?.name, null, true, item?.souvenir)
      : null;

  // Use selected version for display (fallback to normal if StatTrak not available)
  const basePrice = showStatTrak && statTrakPrice ? statTrakPrice : normalPrice;

  // Debug price lookups for knives/gloves
  useEffect(() => {
    if (item?.name?.includes("★")) {
      console.log("🔍 DetailScreen knife/glove price lookup:", {
        itemName: item.name,
        normalPrice: normalPrice?.avg,
        statTrakPrice: statTrakPrice?.avg,
        priceDataLoaded: !!priceData,
        priceDataSize: priceData ? Object.keys(priceData).length : 0,
      });
    }
  }, [item?.name, normalPrice, statTrakPrice, priceData]);

  // Debug crates data
  useEffect(() => {
    console.log("=== DetailScreen Crates Debug ===");
    console.log("Item name:", item?.name);
    console.log("Crates array:", item?.crates);
    console.log("Crates type:", typeof item?.crates);
    console.log("Crates is array:", Array.isArray(item?.crates));
    console.log("Crates length:", item?.crates?.length);
    if (item?.crates && item.crates.length > 0) {
      console.log("First crate:", item.crates[0]);
      console.log("First crate type:", typeof item.crates[0]);
    }
    console.log("CrateNames:", item?.crateNames);
    console.log("=================");
  }, [item]);

  // Debug price data
  useEffect(() => {
    console.log("=== DetailScreen Price Debug ===");
    console.log("Item name:", item?.name);
    console.log("StatTrak:", item?.stattrak);
    console.log("Souvenir:", item?.souvenir);
    console.log("priceData loaded:", !!priceData);
    if (priceData) {
      console.log("Total price entries:", Object.keys(priceData).length);
      console.log("Sample keys:", Object.keys(priceData).slice(0, 5));

      if (item?.name) {
        // Try to find exact match
        const exactMatch = priceData[item.name];
        console.log("Exact match for '" + item.name + "':", !!exactMatch);

        // Try to find partial matches
        const weapon = item.name.split("|")[0]?.trim() || "";
        const partialMatches = Object.keys(priceData).filter((k) =>
          k.includes(weapon)
        );
        console.log(
          "Partial matches for '" + weapon + "':",
          partialMatches.slice(0, 3)
        );
      }
    }
    console.log("=================");
  }, [priceData, item]);

  // Animation for favorite button
  const scale = useSharedValue(1);

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const handleToggleFavorite = () => {
    // Animate button
    scale.value = withSpring(0.8, {}, () => {
      scale.value = withSpring(1);
    });

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Toggle favorite
    toggleFavorite(itemId);
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getRarityColor = (color) => {
    if (!color) return COLORS.textMuted;
    return color.startsWith("#") ? color : `#${color}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Favorite Button */}
        <Animated.View
          style={[styles.favoriteButtonWrapper, animatedButtonStyle]}
        >
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isItemFavorite ? "star" : "star-outline"}
              size={28}
              color={isItemFavorite ? COLORS.favorite : COLORS.text}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Badges Row */}
        <View style={styles.badgesRow}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {item.categoryName || item.category}
            </Text>
          </View>

          {/* StatTrak Badge */}
          {item.stattrak && (
            <View style={[styles.categoryBadge, styles.stattrakBadge]}>
              <Text style={styles.categoryText}>StatTrak™</Text>
            </View>
          )}

          {/* Souvenir Badge */}
          {item.souvenir && (
            <View style={[styles.categoryBadge, styles.souvenirBadge]}>
              <Text style={styles.categoryText}>Souvenir</Text>
            </View>
          )}

          {/* Spacer to push price to the right */}
          <View style={{ flex: 1 }} />

          {/* Price Badge */}
          {basePrice && (
            <View style={[styles.categoryBadge, styles.priceBadge]}>
              <Ionicons name="cash" size={14} color={COLORS.success} />
              <Text style={[styles.categoryText, styles.priceText]}>
                {basePrice.isApproximate && "~"}
                {formatPrice(basePrice.avg)}
              </Text>
            </View>
          )}
        </View>

        {/* Weapon Name */}
        {item.weaponName && (
          <Text style={styles.weapon}>{item.weaponName}</Text>
        )}

        {/* Skin Name */}
        <Text style={styles.name}>{item.name}</Text>

        {/* Description */}
        {item.description && (
          <Text style={styles.description}>
            {item.description
              .replace(/\\n/g, "\n")
              .replace(/<i>/g, "")
              .replace(/<\/i>/g, "")
              .replace(/<br>/g, "\n")
              .replace(/<br\/>/g, "\n")}
          </Text>
        )}

        {/* Price Chart with History - includes StatTrak toggle */}
        {basePrice && basePrice.marketHashName && (
          <PriceChart
            marketHashName={basePrice.marketHashName}
            currentPrice={basePrice.avg}
            item={item}
            onStatTrakChange={(value) => setShowStatTrak(value)}
          />
        )}

        {/* Price Details Toggle */}
        {basePrice && (
          <TouchableOpacity
            style={styles.priceToggleButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPriceDetails(!showPriceDetails);
            }}
          >
            <View style={styles.priceToggleHeader}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
              <Text style={styles.priceToggleText}>Price Details</Text>
              <Ionicons
                name={showPriceDetails ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textSecondary}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Price Details List */}
        {showPriceDetails && priceData && (
          <View style={styles.priceDetailsList}>
            {getAllWearPrices(
              priceData,
              item.name,
              item.stattrak,
              item.souvenir
            ).map((wearPrice, index) => (
              <View key={wearPrice.wear} style={styles.priceDetailRow}>
                <View style={styles.wearLabelContainer}>
                  <View
                    style={[
                      styles.wearDot,
                      {
                        backgroundColor:
                          wearPrice.wear === "Factory New"
                            ? "#4CAF50"
                            : wearPrice.wear === "Minimal Wear"
                            ? "#8BC34A"
                            : wearPrice.wear === "Field-Tested"
                            ? "#FFC107"
                            : wearPrice.wear === "Well-Worn"
                            ? "#FF9800"
                            : "#F44336",
                      },
                    ]}
                  />
                  <Text style={styles.wearLabel}>{wearPrice.wear}</Text>
                </View>
                <Text style={styles.wearPrice}>
                  {wearPrice.priceInfo?.isApproximate && "~"}
                  {formatPrice(wearPrice.price)}
                </Text>
              </View>
            ))}
            {getAllWearPrices(
              priceData,
              item.name,
              item.stattrak,
              item.souvenir
            ).length === 0 && (
              <Text style={styles.noPriceText}>No market prices available</Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Wear Condition Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              console.log("Navigating to WearCondition with:", {
                skinId: item.id || item._id,
                skinName: item.name,
                fullItem: item,
              });
              navigation.navigate("WearCondition", {
                skinId: item.id || item._id,
                skinName: item.name,
              });
            }}
            activeOpacity={0.8}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="eye-outline" size={24} color={COLORS.primary} />
              <View style={styles.actionButtonText}>
                <Text style={styles.actionButtonTitle}>Wear Conditions</Text>
                <Text style={styles.actionButtonSubtitle}>
                  Different wear levels
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {/* Pattern Seeds Button */}
          {item.patternName && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("PatternSeed", {
                  skinId: item.id || item._id,
                  skinName: item.name,
                  patternName: item.patternName,
                  skinImage: item.image,
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons
                  name="git-network-outline"
                  size={24}
                  color={COLORS.accent}
                />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Pattern Seeds</Text>
                  <Text style={styles.actionButtonSubtitle}>
                    Explore pattern variations
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          {/* Rarity Card */}
          {item.rarity && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Rarity</Text>
              <View style={styles.rarityContainer}>
                <View
                  style={[
                    styles.rarityDot,
                    { backgroundColor: getRarityColor(item.rarity_color) },
                  ]}
                />
                <Text style={styles.infoValue}>{item.rarity}</Text>
              </View>
            </View>
          )}

          {/* Pattern Card */}
          {item.patternName && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Pattern</Text>
              <Text style={styles.infoValue}>{item.patternName}</Text>
            </View>
          )}
        </View>

        {/* Crates Section */}
        {((item.crateNames && item.crateNames.length > 0) ||
          (item.crates && item.crates.length > 0)) && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="cube-outline" size={18} color={COLORS.primary} />{" "}
              Available in Crates
            </Text>
            <View style={styles.cratesContainer}>
              {(item.crates || item.crateNames || []).map((crate, index) => {
                const crateName =
                  typeof crate === "string" ? crate : crate?.name;
                const crateImage =
                  typeof crate === "object" && crate !== null
                    ? crate.image
                    : null;

                return (
                  <View key={index} style={styles.crateCard}>
                    {crateImage && (
                      <Image
                        source={{ uri: crateImage }}
                        style={styles.crateImage}
                        resizeMode="contain"
                      />
                    )}
                    <View style={styles.crateInfo}>
                      <Ionicons name="cube" size={16} color={COLORS.primary} />
                      <Text style={styles.crateText} numberOfLines={2}>
                        {crateName}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Collections Section */}
        {item.collectionNames && item.collectionNames.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="albums-outline" size={18} color={COLORS.accent} />{" "}
              Collections
            </Text>
            <View style={styles.listContainer}>
              {item.collectionNames.map((collection, index) => (
                <View key={index} style={styles.listItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={COLORS.accent}
                  />
                  <Text style={styles.listItemText}>{collection}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Float Values */}
        {(item.min_float !== 0 || item.max_float !== 1) && (
          <View style={styles.floatSection}>
            <Text style={styles.sectionTitle}>Float Range</Text>
            <View style={styles.floatContainer}>
              <View style={styles.floatItem}>
                <Text style={styles.floatLabel}>Min</Text>
                <Text style={styles.floatValue}>
                  {item.min_float.toFixed(4)}
                </Text>
              </View>
              <View style={styles.floatDivider} />
              <View style={styles.floatItem}>
                <Text style={styles.floatLabel}>Max</Text>
                <Text style={styles.floatValue}>
                  {item.max_float.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Team */}
        {item.team && (
          <View style={styles.teamSection}>
            <Text style={styles.infoLabel}>Team</Text>
            <Text style={styles.infoValue}>{item.team}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
  },
  imageContainer: {
    backgroundColor: COLORS.surface,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  image: {
    width: width,
    height: 300,
  },
  favoriteButtonWrapper: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
  },
  favoriteButton: {
    backgroundColor: COLORS.surface + "F5",
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.md,
    ...SHADOWS.large,
    borderWidth: 2,
    borderColor: COLORS.border + "60",
  },
  content: {
    padding: SPACING.lg,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs / 2,
  },
  categoryText: {
    ...TYPOGRAPHY.bodySecondary,
    color: COLORS.text,
    fontWeight: "600",
  },
  priceBadge: {
    backgroundColor: COLORS.success + "20",
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  priceText: {
    color: COLORS.success,
  },
  weapon: {
    ...TYPOGRAPHY.bodySecondary,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.md,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  actionButtons: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOWS.small,
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  actionButtonSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  infoSection: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  priceContent: {
    alignItems: "flex-start",
  },
  priceValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.success,
    fontWeight: "700",
    marginBottom: SPACING.xs / 2,
  },
  priceRange: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  priceUnavailable: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  infoLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
  },
  rarityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rarityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  floatSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  floatContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  floatItem: {
    flex: 1,
    alignItems: "center",
  },
  floatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  floatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  floatValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.accent,
  },
  teamSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stattrakBadge: {
    backgroundColor: COLORS.primary,
  },
  souvenirBadge: {
    backgroundColor: COLORS.accent,
  },
  listSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.md,
    color: COLORS.text,
    flexDirection: "row",
    alignItems: "center",
  },
  cratesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  crateCard: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  crateImage: {
    width: "100%",
    height: 100,
    backgroundColor: COLORS.surface,
  },
  crateInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  crateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    flex: 1,
    fontWeight: "600",
  },
  listContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listItemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  toggleLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text,
  },
  priceToggleButton: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  priceToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  priceToggleText: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  priceDetailsList: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  priceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wearLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  wearDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  wearLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  wearPrice: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.success,
  },
  noPriceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    padding: SPACING.md,
  },
});
