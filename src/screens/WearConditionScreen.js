import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import Slider from "@react-native-community/slider";
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

const { width } = Dimensions.get("window");

const WEAR_CONDITIONS = [
  {
    id: 0,
    name: "Factory New",
    shortName: "FN",
    range: [0, 0.07],
    color: "#00ff00",
  },
  {
    id: 1,
    name: "Minimal Wear",
    shortName: "MW",
    range: [0.07, 0.15],
    color: "#7fff00",
  },
  {
    id: 2,
    name: "Field-Tested",
    shortName: "FT",
    range: [0.15, 0.38],
    color: "#ffff00",
  },
  {
    id: 3,
    name: "Well-Worn",
    shortName: "WW",
    range: [0.38, 0.45],
    color: "#ff7f00",
  },
  {
    id: 4,
    name: "Battle-Scarred",
    shortName: "BS",
    range: [0.45, 1.0],
    color: "#ff0000",
  },
];

export const WearConditionScreen = ({ route, navigation }) => {
  const { skinId, skinName } = route.params;
  const [wearValue, setWearValue] = useState(0);
  const [wearVariants, setWearVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWear, setCurrentWear] = useState(WEAR_CONDITIONS[0]);

  useEffect(() => {
    fetchWearVariants();
  }, [skinId]);

  useEffect(() => {
    const wear =
      WEAR_CONDITIONS.find(
        (w) => wearValue >= w.range[0] && wearValue < w.range[1]
      ) || WEAR_CONDITIONS[4];
    setCurrentWear(wear);
  }, [wearValue]);

  const fetchWearVariants = async () => {
    try {
      setLoading(true);
      const endpoints = [
        "https://bymykel.github.io/CSGO-API/api/en/skins_not_grouped.json",
        "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins_not_grouped.json",
      ];

      let data = [];

      // Ensure skin ID has 'skin-' prefix for matching
      const normalizedSkinId = skinId.toString().startsWith("skin-")
        ? skinId.toString()
        : `skin-${skinId}`;
      console.log("Looking for skin ID:", normalizedSkinId);

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const allSkins = await response.json();
            console.log(`Fetched ${allSkins.length} total skins from API`);

            // Match against skin_id field which includes 'skin-' prefix
            data = allSkins.filter(
              (skin) => skin.skin_id?.toString() === normalizedSkinId
            );
            if (data.length > 0) {
              console.log(
                `Found ${data.length} wear variants for skin ${normalizedSkinId}`
              );
              console.log("Sample variant:", JSON.stringify(data[0], null, 2));
              break;
            } else {
              console.log(
                "No variants found, checking first skin structure:",
                JSON.stringify(allSkins[0], null, 2)
              );
            }
          }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error.message);
        }
      }

      setWearVariants(data);
    } catch (error) {
      console.error("Error fetching wear variants:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentVariant = () => {
    if (wearVariants.length === 0) {
      console.log("No wear variants available");
      return null;
    }

    console.log(
      `Looking for wear: ${currentWear.name} in ${wearVariants.length} variants`
    );
    const variant = wearVariants.find((v) => v.wear?.name === currentWear.name);

    if (!variant) {
      console.log("No exact match found, using first variant");
      console.log(
        "Available wears:",
        wearVariants.map((v) => v.wear?.name).join(", ")
      );
    }

    return variant || wearVariants[0];
  };

  const selectWear = (wear) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const midpoint = (wear.range[0] + wear.range[1]) / 2;
    setWearValue(midpoint);
  };

  const handleSliderChange = (value) => {
    setWearValue(value);
  };

  const handleSliderComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const currentVariant = getCurrentVariant();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading wear conditions...</Text>
      </View>
    );
  }

  if (!currentVariant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={COLORS.textMuted}
        />
        <Text style={styles.errorText}>No wear data available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with skin name */}
        <LinearGradient
          colors={[COLORS.surface, COLORS.background]}
          style={styles.header}
        >
          <Text style={styles.skinName} numberOfLines={2}>
            {skinName}
          </Text>
          <Text style={styles.headerSubtitle}>Interactive Wear Preview</Text>
        </LinearGradient>

        {/* Main Image Display with Gradient */}
        <View style={styles.imageSection}>
          <LinearGradient
            colors={[COLORS.card, COLORS.surface]}
            style={styles.imageGradientBg}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentVariant.image }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Wear Info Card with Gradient */}
        <View style={styles.wearInfoCard}>
          <LinearGradient
            colors={[currentWear.color + "20", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.wearInfoGradient}
          >
            <View style={styles.wearHeader}>
              <View style={styles.wearTitleRow}>
                <View
                  style={[
                    styles.wearDot,
                    { backgroundColor: currentWear.color },
                  ]}
                >
                  <View style={styles.wearDotInner} />
                </View>
                <View>
                  <Text style={styles.wearName}>{currentWear.name}</Text>
                  <Text style={styles.wearRange}>
                    {currentWear.range[0].toFixed(2)} -{" "}
                    {currentWear.range[1].toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.floatBadge}>
                <Text style={styles.floatLabel}>FLOAT VALUE</Text>
                <Text style={styles.floatValue}>{wearValue.toFixed(4)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* PROMINENT Slider Section */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Ionicons name="move" size={24} color={COLORS.primary} />
            <Text style={styles.sliderTitle}>
              Drag to Preview Wear Condition
            </Text>
          </View>

          <LinearGradient
            colors={[COLORS.surface, COLORS.card]}
            style={styles.sliderContainerGradient}
          >
            <View style={styles.sliderInnerContainer}>
              {/* Enhanced Slider */}
              <View style={styles.sliderTrackContainer}>
                {/* Color gradient background for track */}
                <LinearGradient
                  colors={[
                    "#00ff00",
                    "#7fff00",
                    "#ffff00",
                    "#ff7f00",
                    "#ff0000",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sliderGradientTrack}
                />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={wearValue}
                  onValueChange={handleSliderChange}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor={currentWear.color}
                />
              </View>

              {/* Enhanced Scale markers */}
              <View style={styles.scaleContainer}>
                {[0.0, 0.25, 0.5, 0.75, 1.0].map((value) => (
                  <View key={value} style={styles.scaleItem}>
                    <View style={styles.scaleTick} />
                    <Text style={styles.scaleText}>{value.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              {/* Wear condition labels */}
              <View style={styles.wearLabelsContainer}>
                {WEAR_CONDITIONS.map((wear, index) => (
                  <View
                    key={wear.id}
                    style={[
                      styles.wearLabel,
                      {
                        left: `${((wear.range[0] + wear.range[1]) / 2) * 100}%`,
                        opacity: currentWear.id === wear.id ? 1 : 0.4,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.wearLabelText,
                        currentWear.id === wear.id &&
                          styles.wearLabelTextActive,
                      ]}
                    >
                      {wear.shortName}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Select Wear Buttons */}
        <View style={styles.quickSelectSection}>
          <View style={styles.quickSelectHeader}>
            <Ionicons name="flash" size={20} color={COLORS.accent} />
            <Text style={styles.quickSelectTitle}>Quick Select Condition</Text>
          </View>
          <View style={styles.wearButtonsGrid}>
            {wearVariants.map((variant) => {
              const wear = WEAR_CONDITIONS.find(
                (w) => w.name === variant.wear?.name
              );
              if (!wear) return null;

              const isActive = currentWear.name === variant.wear?.name;

              return (
                <TouchableOpacity
                  key={variant.id}
                  style={[
                    styles.wearButton,
                    isActive && styles.wearButtonActive,
                  ]}
                  onPress={() => selectWear(wear)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isActive
                        ? [wear.color + "40", wear.color + "20"]
                        : [COLORS.surface, COLORS.surface]
                    }
                    style={styles.wearButtonGradient}
                  >
                    <View
                      style={[
                        styles.wearButtonDot,
                        { backgroundColor: wear.color },
                        isActive && styles.wearButtonDotActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.wearButtonText,
                        isActive && styles.wearButtonTextActive,
                      ]}
                    >
                      {wear.shortName}
                    </Text>
                    <Text
                      style={[
                        styles.wearButtonLabel,
                        isActive && styles.wearButtonLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {wear.name}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <LinearGradient
            colors={[COLORS.primary + "20", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.infoCard}
          >
            <View style={styles.infoIconContainer}>
              <Ionicons
                name="information-circle"
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>About Wear Conditions</Text>
              <Text style={styles.infoText}>
                Wear float values range from 0.00 (Factory New) to 1.00
                (Battle-Scarred). Lower values indicate less wear and better
                cosmetic condition. Drag the slider above to see real-time wear
                changes!
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
  },
  backButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  skinName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    fontWeight: "800",
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl * 2,
  },
  imageSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  imageGradientBg: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  imageContainer: {
    width: "100%",
    height: 320,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  wearInfoCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wearInfoGradient: {
    padding: SPACING.lg,
  },
  wearHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wearTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
  },
  wearDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  wearDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },
  wearName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "700",
  },
  wearRange: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  floatBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  floatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  floatValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "800",
    fontFamily: "monospace",
    marginTop: 2,
  },
  sliderSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sliderTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: "700",
    flex: 1,
  },
  sliderContainerGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  sliderInnerContainer: {
    gap: SPACING.md,
  },
  sliderTrackContainer: {
    position: "relative",
    height: 50,
    justifyContent: "center",
  },
  sliderGradientTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.8,
  },
  slider: {
    width: "100%",
    height: 50,
  },
  scaleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xs,
  },
  scaleItem: {
    alignItems: "center",
    gap: 4,
  },
  scaleTick: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 1,
  },
  scaleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  wearLabelsContainer: {
    position: "relative",
    height: 24,
    marginTop: SPACING.sm,
  },
  wearLabel: {
    position: "absolute",
    transform: [{ translateX: -15 }],
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wearLabelText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  wearLabelTextActive: {
    color: COLORS.text,
    fontWeight: "800",
  },
  quickSelectSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  quickSelectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  quickSelectTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "700",
  },
  wearButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  wearButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    minWidth: (width - SPACING.md * 2 - SPACING.sm * 2) / 3,
    flex: 1,
    ...SHADOWS.medium,
  },
  wearButtonGradient: {
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
  },
  wearButtonActive: {
    ...SHADOWS.large,
  },
  wearButtonDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  wearButtonDotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  wearButtonText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "800",
    marginBottom: SPACING.xs,
  },
  wearButtonTextActive: {
    color: COLORS.primary,
  },
  wearButtonLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "500",
  },
  wearButtonLabelActive: {
    color: COLORS.text,
    fontWeight: "700",
  },
  infoSection: {
    marginHorizontal: SPACING.md,
  },
  infoCard: {
    flexDirection: "row",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    lineHeight: 20,
    fontWeight: "400",
  },
});
