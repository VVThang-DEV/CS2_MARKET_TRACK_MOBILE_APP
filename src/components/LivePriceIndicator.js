import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";
import { useData } from "../context/DataContext";

export const LivePriceIndicator = () => {
  const { lastPriceUpdate } = useData();

  if (!lastPriceUpdate) return null;

  const timeSinceUpdate = Math.floor((Date.now() - lastPriceUpdate) / 1000);
  const isLive = timeSinceUpdate < 60; // Consider "live" if updated within last minute

  const getTimeText = () => {
    if (timeSinceUpdate < 60) return "Just now";
    if (timeSinceUpdate < 3600)
      return `${Math.floor(timeSinceUpdate / 60)}m ago`;
    return `${Math.floor(timeSinceUpdate / 3600)}h ago`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.dot, isLive && styles.dotLive]} />
      <Text style={styles.text}>
        {isLive ? "Live" : "Updated"} • {getTimeText()}
      </Text>
      <Ionicons name="sync" size={14} color={COLORS.textMuted} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  dotLive: {
    backgroundColor: "#10b981",
  },
  text: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
