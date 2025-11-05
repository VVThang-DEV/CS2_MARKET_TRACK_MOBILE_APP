import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";
import {
  getSkinPriceHistory,
  calculatePriceChange,
  getPriceStats,
} from "../services/priceHistoryService";
import { getSkinPriceHistoryFromSupabase } from "../services/supabaseService";
import { formatPrice } from "../services/priceService";

const { width } = Dimensions.get("window");

export const PriceChart = ({ marketHashName, currentPrice }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d"); // 7d, 14d, 30d

  useEffect(() => {
    loadPriceHistory();
  }, [marketHashName, period]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);

      // Try Supabase first (centralized cloud history)
      let history = [];
      try {
        console.log("Attempting to load price history from Supabase...");
        history = await getSkinPriceHistoryFromSupabase(marketHashName);
        console.log(`✅ Loaded ${history.length} points from Supabase`);
      } catch (supabaseError) {
        console.warn("⚠️ Supabase unavailable, falling back to local storage");
        // Fallback to local storage if Supabase fails
        history = await getSkinPriceHistory(marketHashName);
        console.log(`Loaded ${history.length} points from local storage`);
      }

      // Filter by period
      const now = Date.now();
      const periodMs = {
        "7d": 7 * 24 * 60 * 60 * 1000,
        "14d": 14 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };

      const filtered = history.filter(
        (item) => now - item.timestamp <= periodMs[period]
      );

      console.log(
        `Displaying ${filtered.length} REAL price points for period ${period}`
      );
      setPriceHistory(filtered);
    } catch (error) {
      console.error("Error loading price history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading price history...</Text>
      </View>
    );
  }

  if (priceHistory.length < 2) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Ionicons
            name="analytics-outline"
            size={48}
            color={COLORS.textMuted}
          />
          <Text style={styles.noDataText}>Building Price History</Text>
          <Text style={styles.noDataSubtext}>
            {priceHistory.length > 0
              ? `${priceHistory.length} data point collected. Need at least 2 points to show trends.`
              : "Price tracking starts now. Data points are collected every 5 minutes."}
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Check back in a few hours to see your price chart
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const priceChange = calculatePriceChange(priceHistory);
  const stats = getPriceStats(priceHistory);

  // Prepare data for chart
  const chartData = priceHistory.map((item, index) => ({
    value: item.price,
    label:
      index === 0 || index === priceHistory.length - 1
        ? new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
    labelTextStyle: { color: COLORS.textMuted, fontSize: 10 },
  }));

  const lineColor =
    priceChange.trend === "up"
      ? "#10b981"
      : priceChange.trend === "down"
      ? "#ef4444"
      : COLORS.primary;

  return (
    <View style={styles.container}>
      {/* Price Change Header */}
      <View style={styles.header}>
        <View style={styles.priceInfo}>
          <Text style={styles.currentPrice}>
            {formatPrice(currentPrice || stats.current)}
          </Text>
          <View
            style={[styles.changeBadge, { backgroundColor: lineColor + "20" }]}
          >
            <Ionicons
              name={
                priceChange.trend === "up"
                  ? "trending-up"
                  : priceChange.trend === "down"
                  ? "trending-down"
                  : "remove"
              }
              size={16}
              color={lineColor}
            />
            <Text style={[styles.changeText, { color: lineColor }]}>
              {priceChange.percentage >= 0 ? "+" : ""}
              {priceChange.percentage.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {["7d", "14d", "30d"].map((p) => (
            <Text
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              {p}
            </Text>
          ))}
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={width - SPACING.xl * 4 - 40}
          height={180}
          color={lineColor}
          thickness={2.5}
          startFillColor={lineColor}
          endFillColor={lineColor}
          startOpacity={0.4}
          endOpacity={0.1}
          initialSpacing={10}
          endSpacing={10}
          spacing={priceHistory.length > 15 ? 30 : 40}
          noOfSections={4}
          yAxisColor={COLORS.border}
          xAxisColor={COLORS.border}
          yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
          yAxisOffset={stats.min * 0.95}
          hideDataPoints={priceHistory.length > 10}
          dataPointsColor={lineColor}
          dataPointsRadius={3}
          curved
          isAnimated
          animationDuration={800}
          areaChart
          hideRules
          adjustToWidth
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Min</Text>
          <Text style={styles.statValue}>{formatPrice(stats.min)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg</Text>
          <Text style={styles.statValue}>{formatPrice(stats.avg)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Max</Text>
          <Text style={styles.statValue}>{formatPrice(stats.max)}</Text>
        </View>
      </View>

      {/* Real Data Notice */}
      <View style={styles.noticeContainer}>
        <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
        <Text style={[styles.noticeText, { color: "#10b981" }]}>
          Real-time price data • {priceHistory.length} data points tracked
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  priceInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  currentPrice: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "700",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  changeText: {
    ...TYPOGRAPHY.body,
    fontWeight: "700",
  },
  periodSelector: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  periodButton: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  periodButtonActive: {
    color: COLORS.primary,
    backgroundColor: COLORS.primary + "20",
    fontWeight: "700",
  },
  chartContainer: {
    marginVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
    width: "100%",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  noDataText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  noticeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  noDataSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + "15",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
