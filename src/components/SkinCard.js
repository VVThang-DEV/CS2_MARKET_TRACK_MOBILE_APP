import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from "../constants/theme";
import { useData } from "../context/DataContext";

export const SkinCard = ({ item, onPress }) => {
  const { isFavorite, toggleFavorite } = useData();
  const isItemFavorite = isFavorite(item._id);

  const getRarityColor = (color) => {
    if (!color) return COLORS.textMuted;
    // Handle both formats: with or without #
    const colorStr = color.toString();
    return colorStr.startsWith("#") ? colorStr : `#${colorStr}`;
  };

  const handleFavoritePress = (e) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(item._id);
  };

  const handleCardPress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  // Get first available wear or show "N/A"
  const primaryWear =
    item.availableWears?.[0] || item.wears?.[0]?.name || "N/A";

  // Get crate or collection name
  const crateName = item.crateNames?.[0] || item.crates?.[0]?.name || null;
  const collectionName =
    item.collectionNames?.[0] || item.collections?.[0]?.name || null;
  const source = crateName || collectionName;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handleCardPress}
    >
      {/* Image Container with Gradient Overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Gradient Overlay for depth */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)"]}
          style={styles.imageGradient}
        />

        {/* Watchlist Button - Top Right */}
        <Pressable
          style={[
            styles.favoriteButton,
            isItemFavorite && styles.favoriteButtonActive,
          ]}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isItemFavorite ? "eye" : "eye-outline"}
            size={22}
            color={isItemFavorite ? COLORS.primary : COLORS.textMuted}
          />
        </Pressable>

        {/* Badges on Image */}
        <View style={styles.imageBadges}>
          {item.stattrak && (
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>ST™</Text>
            </View>
          )}
          {item.souvenir && (
            <View style={[styles.specialBadge, styles.souvenirBadge]}>
              <Text style={styles.specialBadgeText}>Souvenir</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Rarity Indicator with Glow */}
        <View style={styles.rarityBarContainer}>
          <LinearGradient
            colors={[getRarityColor(item.rarityColor), "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rarityBar}
          />
        </View>

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Ionicons name="grid-outline" size={10} color={COLORS.textMuted} />
          <Text style={styles.categoryText}>
            {item.categoryName || "Other"}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>

        {/* Weapon */}
        <View style={styles.weaponRow}>
          <Ionicons
            name="flask-outline"
            size={14}
            color={COLORS.textSecondary}
          />
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.weaponName || item.weapon?.name || "Unknown"}
          </Text>
        </View>

        {/* Pattern Name */}
        {item.patternName && (
          <View style={styles.weaponRow}>
            <Ionicons
              name="color-palette-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.patternName}
            </Text>
          </View>
        )}

        {/* Source (Crate or Collection) */}
        {source && (
          <View style={styles.weaponRow}>
            <Ionicons
              name="cube-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.subtitle} numberOfLines={1}>
              {source}
            </Text>
          </View>
        )}

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={[styles.infoBadge, styles.rarityBadge]}>
            <View
              style={[
                styles.rarityDot,
                { backgroundColor: getRarityColor(item.rarityColor) },
              ]}
            />
            <Text style={styles.infoText}>{item.rarityName}</Text>
          </View>
          {primaryWear !== "N/A" && (
            <View style={styles.infoBadge}>
              <Ionicons
                name="layers-outline"
                size={10}
                color={COLORS.textMuted}
              />
              <Text style={styles.infoText}>{primaryWear}</Text>
            </View>
          )}
          {item.phase && (
            <View style={[styles.infoBadge, styles.phaseBadge]}>
              <Text style={styles.phaseText}>
                {item.phase === "Ruby" && "🔴"}
                {item.phase === "Sapphire" && "🔵"}
                {item.phase === "Black Pearl" && "⚫"}
                {item.phase.startsWith("Phase") && "💎"} {item.phase}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    overflow: "hidden",
    ...SHADOWS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.card,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  favoriteButton: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface + "F0",
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.sm,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border + "80",
  },
  favoriteButtonActive: {
    backgroundColor: COLORS.primary + "25",
    borderColor: COLORS.primary + "80",
  },
  imageBadges: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: "row",
    gap: SPACING.xs,
  },
  specialBadge: {
    backgroundColor: COLORS.primary + "F0",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  souvenirBadge: {
    backgroundColor: COLORS.accent + "F0",
    borderColor: COLORS.accent,
  },
  specialBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  content: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  rarityBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  rarityBar: {
    height: "100%",
    width: "100%",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background + "80",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: "flex-start",
    marginBottom: SPACING.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: "700",
    lineHeight: 22,
  },
  weaponRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: 6,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rarityBadge: {
    backgroundColor: COLORS.card,
  },
  phaseBadge: {
    backgroundColor: "#8b5cf620",
    borderColor: "#8b5cf640",
  },
  phaseText: {
    ...TYPOGRAPHY.caption,
    color: "#8b5cf6",
    fontSize: 10,
    fontWeight: "700",
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
});
