import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Polyline,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
} from "react-native-svg";
import { COLORS } from "../constants/theme";

/**
 * Mini Sparkline Chart Component
 * Shows a small trend line for price movement with gradient background
 */
export const MiniSparkline = ({
  data = [],
  width = 60,
  height = 30,
  color = COLORS.primary,
  strokeWidth = 2,
  showBackground = true,
}) => {
  if (!data || data.length < 2) {
    // Not enough data, show flat line
    return (
      <View style={[styles.container, { width, height }]}>
        <Svg width={width} height={height}>
          <Polyline
            points={`0,${height / 2} ${width},${height / 2}`}
            fill="none"
            stroke={COLORS.border}
            strokeWidth={1}
          />
        </Svg>
      </View>
    );
  }

  // Normalize data to fit in the chart
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1; // Avoid division by zero

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  // Create polygon points for gradient fill (area under the line)
  const polygonPoints = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .concat([`${width},${height}`, `0,${height}`]) // Bottom-right and bottom-left corners
    .join(" ");

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Background gradient fill */}
        {showBackground && (
          <Polygon points={polygonPoints} fill="url(#gradientFill)" />
        )}

        {/* Main line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
