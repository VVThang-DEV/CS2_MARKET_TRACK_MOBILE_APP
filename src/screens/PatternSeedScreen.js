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
  FlatList,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ImageViewer from "react-native-image-zoom-viewer";
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from "../constants/theme";
import { SkinViewer3D } from "../components/SkinViewer3D";
import {
  fetchSeedImage,
  generate3DViewerUrl,
} from "../services/seedImageService";

const { width } = Dimensions.get("window");

// Special patterns that have significant visual variations
const SPECIAL_PATTERNS = ["Doppler", "Case Hardened", "Fade", "Marble Fade"];

// Generate sample seed numbers for demonstration
const generateSeedSamples = (patternName, count = 20) => {
  const seeds = [];
  const isSpecial = SPECIAL_PATTERNS.some((sp) => patternName?.includes(sp));

  if (isSpecial) {
    // For special patterns, show notable seeds
    if (patternName?.includes("Doppler")) {
      // Doppler phases
      seeds.push(
        { seed: 1, label: "Phase 1", special: true },
        { seed: 100, label: "Phase 2", special: true },
        { seed: 200, label: "Phase 3", special: true },
        { seed: 300, label: "Phase 4", special: true },
        { seed: 400, label: "Ruby", special: true, rare: true },
        { seed: 500, label: "Sapphire", special: true, rare: true },
        { seed: 600, label: "Black Pearl", special: true, rare: true }
      );
    } else if (patternName?.includes("Case Hardened")) {
      // Blue gem seeds
      seeds.push(
        { seed: 1, label: "Seed #1" },
        { seed: 42, label: "Seed #42" },
        { seed: 151, label: "Blue Gem #151", special: true, rare: true },
        { seed: 179, label: "Blue Gem #179", special: true, rare: true },
        { seed: 321, label: "Blue Gem #321", special: true, rare: true },
        { seed: 387, label: "Blue Gem #387", special: true, rare: true },
        { seed: 661, label: "Blue Gem #661", special: true, rare: true },
        { seed: 670, label: "Blue Gem #670", special: true, rare: true }
      );
    } else if (patternName?.includes("Fade")) {
      seeds.push(
        { seed: 1, label: "0% Fade" },
        { seed: 250, label: "50% Fade", special: true },
        { seed: 500, label: "80% Fade", special: true },
        { seed: 750, label: "95% Fade", special: true, rare: true },
        { seed: 1000, label: "100% Fade", special: true, rare: true }
      );
    }
  }

  // Add random seeds
  for (let i = seeds.length; i < count; i++) {
    const seed = Math.floor(Math.random() * 1000);
    seeds.push({ seed, label: `Seed #${seed}` });
  }

  return seeds;
};

export const PatternSeedScreen = ({ route, navigation }) => {
  const { skinId, skinName, patternName, skinImage } = route.params;
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [currentImage, setCurrentImage] = useState(skinImage);
  const [view3D, setView3D] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);

  const isSpecialPattern = SPECIAL_PATTERNS.some((sp) =>
    patternName?.includes(sp)
  );
  const seedSamples = generateSeedSamples(patternName, 20);

  useEffect(() => {
    if (seedSamples.length > 0) {
      setSelectedSeed(seedSamples[0]);
    }
  }, []);

  // Fetch seed-specific image when seed changes
  useEffect(() => {
    if (selectedSeed) {
      loadSeedImage(selectedSeed.seed);
    }
  }, [selectedSeed]);

  const loadSeedImage = async (seed) => {
    setLoading(true);
    try {
      const seedImage = await fetchSeedImage(skinName, seed, 0.1);
      if (seedImage) {
        setCurrentImage(seedImage);
        setView3D(false);
      } else {
        // No seed-specific image available, use 2D fallback
        console.log(
          "No seed-specific image available, using original skin image"
        );
        setCurrentImage(skinImage);
        setView3D(false);
      }
    } catch (error) {
      console.error("Error loading seed image:", error);
      setCurrentImage(skinImage); // Fallback to original
      setView3D(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedSelect = (seed) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSeed(seed);
  };

  const toggle3DView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newView3D = !view3D;
    console.log(`Toggling 3D view: ${view3D} -> ${newView3D}`);
    if (newView3D && selectedSeed) {
      const url = generate3DViewerUrl(skinName, selectedSeed.seed, 0.1);
      console.log("Generated 3D viewer URL length:", url?.length);
    }
    setView3D(newView3D);
  };

  const renderSeedItem = ({ item }) => {
    const isSelected = selectedSeed?.seed === item.seed;

    return (
      <TouchableOpacity
        style={[
          styles.seedCard,
          isSelected && styles.seedCardSelected,
          item.rare && styles.seedCardRare,
        ]}
        onPress={() => handleSeedSelect(item)}
        activeOpacity={0.7}
      >
        {item.rare && (
          <View style={styles.rareBadge}>
            <Ionicons name="diamond" size={12} color={COLORS.favorite} />
          </View>
        )}

        <View style={styles.seedImagePlaceholder}>
          <Ionicons
            name="grid-outline"
            size={32}
            color={isSelected ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        <Text
          style={[styles.seedLabel, isSelected && styles.seedLabelSelected]}
        >
          {item.label}
        </Text>

        {item.special && (
          <View style={styles.specialBadge}>
            <Text style={styles.specialBadgeText}>SPECIAL</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.background]}
        style={styles.header}
      >
        <Text style={styles.skinName} numberOfLines={2}>
          {skinName}
        </Text>
        <Text style={styles.headerSubtitle}>
          {patternName} {isSpecialPattern && "⭐ Special Pattern"}
        </Text>
      </LinearGradient>

      {/* Main Image Display */}
      <View style={styles.imageSection}>
        <LinearGradient
          colors={[COLORS.card, COLORS.surface]}
          style={styles.imageGradientBg}
        >
          <View
            style={[styles.imageContainer, view3D && styles.imageContainer3D]}
          >
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : view3D && selectedSeed ? (
              <View style={styles.developmentPlaceholder}>
                <Ionicons
                  name="construct-outline"
                  size={64}
                  color={COLORS.primary}
                />
                <Text style={styles.developmentTitle}>3D Viewer</Text>
                <Text style={styles.developmentText}>
                  Interactive 3D viewer is still being developed.
                </Text>
                <Text style={styles.developmentSubtext}>
                  Use 2D view to zoom and inspect the skin details.
                </Text>
                <TouchableOpacity
                  style={styles.switchTo2DButton}
                  onPress={() => setView3D(false)}
                >
                  <Ionicons
                    name="image-outline"
                    size={20}
                    color={COLORS.text}
                  />
                  <Text style={styles.switchTo2DText}>Switch to 2D View</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setZoomVisible(true)}
                activeOpacity={0.9}
                style={styles.imageWrapper}
              >
                <Image
                  source={{ uri: currentImage }}
                  style={styles.image}
                  resizeMode="contain"
                />
                <View style={styles.zoomHint}>
                  <Ionicons
                    name="expand-outline"
                    size={16}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.zoomHintText}>Tap to zoom</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* 3D Toggle Button */}
          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={toggle3DView}
            activeOpacity={0.8}
          >
            <Ionicons
              name={view3D ? "image-outline" : "cube-outline"}
              size={20}
              color={COLORS.text}
            />
            <Text style={styles.viewToggleText}>{view3D ? "2D" : "3D"}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Seed Info Card */}
        {selectedSeed && (
          <View style={styles.seedInfoCard}>
            <LinearGradient
              colors={[COLORS.primary + "20", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.seedInfoGradient}
            >
              <View style={styles.seedInfoContent}>
                <View style={styles.seedInfoLeft}>
                  <Ionicons
                    name="git-network-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                  <View>
                    <Text style={styles.seedInfoLabel}>Pattern Seed</Text>
                    <Text style={styles.seedInfoValue}>
                      #{selectedSeed.seed}
                    </Text>
                  </View>
                </View>

                {selectedSeed.rare && (
                  <View style={styles.rareTag}>
                    <Ionicons
                      name="diamond"
                      size={14}
                      color={COLORS.favorite}
                    />
                    <Text style={styles.rareTagText}>RARE</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}
      </View>
      {/* Closing imageSection */}

      {/* Pattern Info */}
      {isSpecialPattern && (
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.infoText}>
            This is a special pattern with unique variations. Different seeds
            can significantly affect the skin's appearance and value.
          </Text>
        </View>
      )}

      {/* View Mode Info */}
      <View style={styles.warningBox}>
        <Ionicons
          name={view3D ? "cube" : "image"}
          size={18}
          color={COLORS.primary}
        />
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>
            {view3D ? "3D Viewer Mode" : "Image View Mode"}
          </Text>
          <Text style={styles.warningText}>
            {view3D
              ? "Interactive 3D viewer for pattern inspection. Tap the toggle to switch to 2D image view."
              : "Select different seeds to see pattern variations. Tap the 3D button to enable interactive viewing."}
          </Text>
        </View>
      </View>

      {/* Seeds Grid */}
      <View style={styles.seedsSection}>
        <View style={styles.seedsHeader}>
          <Ionicons name="grid" size={20} color={COLORS.primary} />
          <Text style={styles.seedsTitle}>Pattern Seeds</Text>
          <View style={styles.seedsCount}>
            <Text style={styles.seedsCountText}>{seedSamples.length}</Text>
          </View>
        </View>

        <FlatList
          data={seedSamples}
          renderItem={renderSeedItem}
          keyExtractor={(item) => item.seed.toString()}
          numColumns={4}
          contentContainerStyle={styles.seedsList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>

      {/* Image Zoom Modal */}
      <Modal visible={zoomVisible} transparent={true}>
        <ImageViewer
          imageUrls={[{ url: currentImage }]}
          enableSwipeDown={true}
          onSwipeDown={() => setZoomVisible(false)}
          onCancel={() => setZoomVisible(false)}
          backgroundColor="rgba(0, 0, 0, 0.95)"
          renderHeader={() => (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setZoomVisible(false)}
            >
              <Ionicons name="close-circle" size={40} color={COLORS.text} />
            </TouchableOpacity>
          )}
          renderIndicator={() => null}
          saveToLocalByLongPress={false}
        />
      </Modal>
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
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  skinName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  imageSection: {
    padding: SPACING.md,
  },
  imageGradientBg: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  imageContainer: {
    width: "100%",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer3D: {
    height: 400,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  zoomHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background + "E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  zoomHintText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: COLORS.background + "CC",
    borderRadius: BORDER_RADIUS.full,
  },
  viewToggleButton: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface + "F5",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border + "60",
    ...SHADOWS.medium,
    zIndex: 10,
  },
  viewToggleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 12,
  },
  seedInfoCard: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  seedInfoGradient: {
    padding: SPACING.md,
  },
  seedInfoContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seedInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  seedInfoLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  seedInfoValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "700",
  },
  rareTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.favorite + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.favorite + "40",
  },
  rareTagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.favorite,
    fontWeight: "700",
    fontSize: 10,
  },
  infoBox: {
    flexDirection: "row",
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + "15",
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: SPACING.xs / 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  warningText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    lineHeight: 16,
    fontSize: 11,
  },
  seedsSection: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  seedsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  seedsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    flex: 1,
  },
  seedsCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 28,
    alignItems: "center",
  },
  seedsCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 11,
  },
  seedsList: {
    paddingBottom: SPACING.xl,
  },
  seedCard: {
    flex: 1,
    margin: SPACING.xs,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    minHeight: 100,
    ...SHADOWS.small,
  },
  seedCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "15",
    ...SHADOWS.medium,
  },
  seedCardRare: {
    borderColor: COLORS.favorite + "60",
  },
  rareBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: COLORS.favorite + "20",
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  seedImagePlaceholder: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  seedLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "500",
  },
  seedLabelSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  specialBadge: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.accent + "20",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  specialBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  developmentPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  developmentTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: SPACING.md,
  },
  developmentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  developmentSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  switchTo2DButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    ...SHADOWS.medium,
  },
  switchTo2DText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "600",
  },
});
