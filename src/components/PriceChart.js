import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Switch,
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

// Wear condition mappings
const WEAR_CONDITIONS = [
  { key: "FN", label: "Factory New", suffix: "(Factory New)" },
  { key: "MW", label: "Minimal Wear", suffix: "(Minimal Wear)" },
  { key: "FT", label: "Field-Tested", suffix: "(Field-Tested)" },
  { key: "WW", label: "Well-Worn", suffix: "(Well-Worn)" },
  { key: "BS", label: "Battle-Scarred", suffix: "(Battle-Scarred)" },
];

export const PriceChart = ({
  marketHashName,
  currentPrice,
  item,
  onStatTrakChange,
}) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d"); // 7d, 14d, 30d
  const [selectedWear, setSelectedWear] = useState(null);
  const [isStatTrak, setIsStatTrak] = useState(false);
  const [chartWidth, setChartWidth] = useState(1);
  const [displayPrice, setDisplayPrice] = useState(currentPrice);
  const scrollViewRef = useRef(null);

  // Determine available wears from item data
  const availableWears =
    item?.availableWears || item?.wears?.map((w) => w.name) || [];
  const hasStatTrak = item?.stattrak !== undefined;

  useEffect(() => {
    loadPriceHistory();
  }, [marketHashName, period, selectedWear, isStatTrak]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);

      // Build market hash name with wear and StatTrak
      let queryName = marketHashName;

      // Add StatTrak prefix if enabled
      if (isStatTrak && !queryName.includes("StatTrak™")) {
        queryName = `StatTrak™ ${queryName}`;
      } else if (!isStatTrak && queryName.includes("StatTrak™")) {
        queryName = queryName.replace("StatTrak™ ", "");
      }

      // Replace wear condition if selected
      if (selectedWear) {
        // Remove existing wear condition
        WEAR_CONDITIONS.forEach((wear) => {
          queryName = queryName.replace(` ${wear.suffix}`, "");
        });
        // Add selected wear condition
        const wearSuffix = WEAR_CONDITIONS.find(
          (w) => w.key === selectedWear
        )?.suffix;
        if (wearSuffix && !queryName.includes(wearSuffix)) {
          queryName = `${queryName} ${wearSuffix}`;
        }
      }

      console.log(`Loading price history for: ${queryName}`);

      // Try Supabase first (centralized cloud history)
      let history = [];
      try {
        console.log("Attempting to load price history from Supabase...");
        history = await getSkinPriceHistoryFromSupabase(queryName);
        console.log(`✅ Loaded ${history.length} points from Supabase`);
      } catch (supabaseError) {
        console.warn("⚠️ Supabase unavailable, falling back to local storage");
        // Fallback to local storage if Supabase fails
        history = await getSkinPriceHistory(queryName);
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
        `Displaying ${filtered.length} price points for ${queryName} (period: ${period})`
      );

      // Adjust chart width based on data points for better zoom
      const dataPoints = filtered.length;
      const minWidth = width - SPACING.xl * 4 - 40;
      // Improved zoom: more aggressive scaling for better visibility
      let zoomFactor = 1;
      if (dataPoints > 50) {
        zoomFactor = 3.5;
      } else if (dataPoints > 30) {
        zoomFactor = 2.8;
      } else if (dataPoints > 15) {
        zoomFactor = 2.2;
      } else if (dataPoints > 7) {
        zoomFactor = 1.5;
      }
      setChartWidth(minWidth * zoomFactor);

      setPriceHistory(filtered);

      // Update display price based on latest data point
      if (filtered.length > 0) {
        setDisplayPrice(filtered[filtered.length - 1].price);
      } else {
        setDisplayPrice(currentPrice);
      }
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
      {/* Wear Condition Selector */}
      {availableWears.length > 0 && (
        <View style={styles.wearSelectorContainer}>
          <Text style={styles.selectorLabel}>Wear Condition:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.wearScroll}
          >
            <TouchableOpacity
              style={[
                styles.wearButton,
                !selectedWear && styles.wearButtonActive,
              ]}
              onPress={() => setSelectedWear(null)}
            >
              <Text
                style={[
                  styles.wearButtonText,
                  !selectedWear && styles.wearButtonTextActive,
                ]}
              >
                Default
              </Text>
            </TouchableOpacity>
            {WEAR_CONDITIONS.map((wear) => {
              const isAvailable = availableWears.some(
                (w) => w.includes(wear.label) || w.includes(wear.key)
              );
              if (!isAvailable) return null;

              return (
                <TouchableOpacity
                  key={wear.key}
                  style={[
                    styles.wearButton,
                    selectedWear === wear.key && styles.wearButtonActive,
                  ]}
                  onPress={() => setSelectedWear(wear.key)}
                >
                  <Text
                    style={[
                      styles.wearButtonText,
                      selectedWear === wear.key && styles.wearButtonTextActive,
                    ]}
                  >
                    {wear.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* StatTrak Toggle */}
      {hasStatTrak && (
        <View style={styles.statTrakContainer}>
          <Ionicons
            name="stats-chart"
            size={18}
            color={isStatTrak ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={styles.statTrakLabel}>StatTrak™</Text>
          <Switch
            value={isStatTrak}
            onValueChange={(value) => {
              setIsStatTrak(value);
              // Notify parent component about StatTrak toggle
              if (onStatTrakChange) {
                onStatTrakChange(value);
              }
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary + "60" }}
            thumbColor={isStatTrak ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      )}

      {/* Price Change Header */}
      <View style={styles.header}>
        <View style={styles.priceInfo}>
          <Text style={styles.currentPrice}>
            {formatPrice(displayPrice || currentPrice || 0)}
          </Text>
          {priceHistory.length >= 2 && (
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor:
                    (calculatePriceChange(priceHistory).trend === "up"
                      ? "#10b981"
                      : calculatePriceChange(priceHistory).trend === "down"
                      ? "#ef4444"
                      : COLORS.primary) + "20",
                },
              ]}
            >
              <Ionicons
                name={
                  calculatePriceChange(priceHistory).trend === "up"
                    ? "trending-up"
                    : calculatePriceChange(priceHistory).trend === "down"
                    ? "trending-down"
                    : "remove"
                }
                size={16}
                color={
                  calculatePriceChange(priceHistory).trend === "up"
                    ? "#10b981"
                    : calculatePriceChange(priceHistory).trend === "down"
                    ? "#ef4444"
                    : COLORS.primary
                }
              />
              <Text
                style={[
                  styles.changeText,
                  {
                    color:
                      calculatePriceChange(priceHistory).trend === "up"
                        ? "#10b981"
                        : calculatePriceChange(priceHistory).trend === "down"
                        ? "#ef4444"
                        : COLORS.primary,
                  },
                ]}
              >
                {calculatePriceChange(priceHistory).percentage >= 0 ? "+" : ""}
                {calculatePriceChange(priceHistory).percentage.toFixed(2)}%
              </Text>
            </View>
          )}
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {["7d", "14d", "30d"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart with Horizontal Scroll for Zoom */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        ref={scrollViewRef}
        style={styles.chartScrollContainer}
        contentContainerStyle={styles.chartScrollContent}
      >
        <View style={[styles.chartContainer, { width: chartWidth }]}>
          {priceHistory.length >= 2 ? (
            <LineChart
              data={priceHistory.map((item, index) => ({
                value: item.price,
                label:
                  index % Math.ceil(priceHistory.length / 5) === 0
                    ? new Date(item.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "",
                labelTextStyle: { color: COLORS.textMuted, fontSize: 10 },
              }))}
              width={chartWidth}
              height={200}
              color={
                calculatePriceChange(priceHistory).trend === "up"
                  ? "#10b981"
                  : calculatePriceChange(priceHistory).trend === "down"
                  ? "#ef4444"
                  : COLORS.primary
              }
              thickness={2.5}
              startFillColor={
                calculatePriceChange(priceHistory).trend === "up"
                  ? "#10b981"
                  : calculatePriceChange(priceHistory).trend === "down"
                  ? "#ef4444"
                  : COLORS.primary
              }
              endFillColor={
                calculatePriceChange(priceHistory).trend === "up"
                  ? "#10b981"
                  : calculatePriceChange(priceHistory).trend === "down"
                  ? "#ef4444"
                  : COLORS.primary
              }
              startOpacity={0.4}
              endOpacity={0.1}
              initialSpacing={15}
              endSpacing={15}
              spacing={Math.max(20, chartWidth / priceHistory.length)}
              noOfSections={5}
              yAxisColor={COLORS.border}
              xAxisColor={COLORS.border}
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
              yAxisOffset={getPriceStats(priceHistory).min * 0.95}
              hideDataPoints={priceHistory.length > 20}
              dataPointsColor={
                calculatePriceChange(priceHistory).trend === "up"
                  ? "#10b981"
                  : calculatePriceChange(priceHistory).trend === "down"
                  ? "#ef4444"
                  : COLORS.primary
              }
              dataPointsRadius={3}
              curved
              isAnimated
              animationDuration={800}
              areaChart
              hideRules={false}
              rulesColor={COLORS.border + "20"}
              rulesType="solid"
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Stats */}
      {priceHistory.length >= 2 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>
              {formatPrice(getPriceStats(priceHistory).min)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={styles.statValue}>
              {formatPrice(getPriceStats(priceHistory).avg)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>
              {formatPrice(getPriceStats(priceHistory).max)}
            </Text>
          </View>
        </View>
      )}

      {/* Real Data Notice */}
      {priceHistory.length >= 2 && (
        <View style={styles.noticeContainer}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
          <Text style={[styles.noticeText, { color: "#10b981" }]}>
            Real-time price data • {priceHistory.length} data points tracked
          </Text>
          <Text style={styles.zoomHint}>← Swipe to zoom chart →</Text>
        </View>
      )}
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
  wearSelectorContainer: {
    marginBottom: SPACING.md,
  },
  selectorLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    fontWeight: "600",
  },
  wearScroll: {
    gap: SPACING.xs,
  },
  wearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wearButtonActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  wearButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 11,
  },
  wearButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  statTrakContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  statTrakLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    fontWeight: "600",
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
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  periodButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  chartScrollContainer: {
    marginVertical: SPACING.md,
  },
  chartScrollContent: {
    paddingRight: SPACING.lg,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
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
  zoomHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
    fontStyle: "italic",
    marginTop: SPACING.xs,
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
