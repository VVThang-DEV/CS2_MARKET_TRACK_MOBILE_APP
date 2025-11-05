import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";

/**
 * SkinViewer3D Component
 *
 * Shows the actual in-game skin image - no WebView needed!
 * Just displays the image URL directly from the skin data.
 */
export const SkinViewer3D = ({ url, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  console.log("SkinViewer3D - Image URL:", url);

  const handleImageLoad = () => {
    console.log("Image loaded successfully");
    setLoading(false);
  };

  const handleImageError = () => {
    console.log("Image failed to load");
    setLoading(false);
    setError(true);
    onError && onError();
  };

  if (error || !url) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="image-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>Image unavailable</Text>
        <Text style={styles.errorSubtext}>Unable to load skin image</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading skin image...</Text>
        </View>
      )}
      <Image
        source={{ uri: url }}
        style={styles.image}
        resizeMode="contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: "#1a2332",
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
    zIndex: 1,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  errorSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
