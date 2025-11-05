import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../constants/theme";

/**
 * SkinViewer3D Component
 *
 * LIMITATION: True 3D viewing requires actual CS:GO item inspect links from Steam inventory.
 * Without real inspect links, we show an informative display with seed/wear data.
 *
 * To get real 3D views, you would need:
 * 1. Access to Steam inventory inspect links
 * 2. Integration with services like CSGOFloat that have item databases
 * 3. Real CS:GO items in inventory
 */
export const SkinViewer3D = ({ url, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [webViewError, setWebViewError] = useState(false);

  // Check if WebView is supported on this platform
  const isWebViewSupported = Platform.OS === "ios" || Platform.OS === "android";

  console.log(
    "SkinViewer3D received URL:",
    url ? url.substring(0, 100) + "..." : "null"
  );
  console.log(
    "Platform:",
    Platform.OS,
    "WebView supported:",
    isWebViewSupported
  );

  // Set timeout to stop loading after 3 seconds (HTML is inline, should be fast)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("WebView load timeout - forcing end (3s)");
        setLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const handleError = (syntheticEvent) => {
    const errorMsg =
      syntheticEvent?.nativeEvent?.description || "Unknown error";
    console.log("WebView error occurred:", errorMsg);
    setLoading(false);

    // Check if it's a platform support error
    if (
      errorMsg.includes("does not support") ||
      errorMsg.includes("platform")
    ) {
      setWebViewError(true);
    } else {
      setError(true);
    }
    onError && onError();
  };

  const handleLoadEnd = () => {
    console.log("WebView load ended successfully");
    setLoading(false);
  };

  const handleOpenExternally = async () => {
    try {
      // Extract CSGOFloat URL from the data URL if possible
      if (url.includes("csfloat.com")) {
        const csfloatMatch = url.match(/https:\/\/csfloat\.com[^"']*/);
        if (csfloatMatch) {
          await Linking.openURL(csfloatMatch[0]);
          return;
        }
      }
      // Fallback to general CSGOFloat search
      await Linking.openURL("https://csfloat.com");
    } catch (error) {
      Alert.alert("Error", "Unable to open external link");
    }
  };

  // Extract HTML content from data URL or return HTML directly
  const getHtmlContent = () => {
    console.log("=== SkinViewer3D getHtmlContent ===");
    console.log("URL exists:", !!url);
    console.log("URL type:", typeof url);
    console.log("URL length:", url?.length || 0);
    console.log("URL preview:", url?.substring(0, 200));

    // Return HTML directly if it's not a data URL
    if (url && !url.startsWith("data:text/html")) {
      console.log("✓ Returning direct HTML (length:", url.length, ")");
      return url;
    }

    // Handle data URLs
    if (url && url.startsWith("data:text/html")) {
      try {
        const base64Content = url.split(",")[1];
        if (base64Content) {
          const decoded = decodeURIComponent(escape(atob(base64Content)));
          console.log("✓ Decoded HTML from base64, length:", decoded.length);
          return decoded;
        }
      } catch (error) {
        console.warn("✗ Error decoding base64:", error);
      }
    }

    // Fallback with debugging
    console.warn("✗ Using fallback HTML");
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              background: #1a2332;
              color: #e5e7eb;
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            h1 { color: #f44336; }
            .debug { 
              background: rgba(255,255,255,0.1); 
              padding: 15px; 
              border-radius: 8px; 
              margin-top: 20px;
              font-family: monospace;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>⚠️ Viewer Error</h1>
          <p>Unable to load skin viewer</p>
          <div class="debug">
            <div>URL provided: ${!!url ? "Yes" : "No"}</div>
            <div>URL length: ${url?.length || 0}</div>
            <div>URL starts with data: ${url?.startsWith("data:")}</div>
          </div>
        </body>
      </html>
    `;
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="eye-off" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>3D viewer unavailable</Text>
        <Text style={styles.errorSubtext}>
          Interactive 3D viewing requires Steam inspect links from actual game
          items
        </Text>
        <TouchableOpacity
          style={styles.externalButton}
          onPress={handleOpenExternally}
        >
          <Ionicons name="open-outline" size={20} color={COLORS.primary} />
          <Text style={styles.externalButtonText}>View on CSFloat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const htmlContent = getHtmlContent();
  console.log("=== WebView Source ===");
  console.log("HTML content length:", htmlContent.length);
  console.log("HTML preview:", htmlContent.substring(0, 200));

  // Show fallback UI for unsupported platforms or WebView errors
  if (!isWebViewSupported || webViewError) {
    return (
      <View style={styles.container}>
        <View style={styles.unsupportedContainer}>
          <Ionicons name="desktop-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.unsupportedTitle}>WebView Not Supported</Text>
          <Text style={styles.unsupportedText}>
            Interactive 3D viewing is not available on this platform (
            {Platform.OS}). Please use a mobile device (iOS/Android) for the
            full experience.
          </Text>
          <TouchableOpacity
            style={styles.externalButton}
            onPress={handleOpenExternally}
          >
            <Ionicons name="open-outline" size={20} color={COLORS.primary} />
            <Text style={styles.externalButtonText}>View on CSFloat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading in-game view...</Text>
        </View>
      )}
      <WebView
        source={{
          html: htmlContent,
        }}
        style={styles.webview}
        onLoadEnd={() => {
          console.log("WebView loaded successfully");
          handleLoadEnd();
        }}
        onLoadStart={() => console.log("WebView load started")}
        onError={(syntheticEvent) => {
          console.error("WebView error:", syntheticEvent.nativeEvent);
          handleError(syntheticEvent);
        }}
        onRenderProcessGone={(syntheticEvent) => {
          console.error(
            "WebView render process gone:",
            syntheticEvent.nativeEvent
          );
          handleError(syntheticEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("WebView HTTP error:", nativeEvent);
        }}
        onMessage={(event) => {
          const data = event.nativeEvent.data;
          console.log("WebView message received:", data);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "loaded") {
              console.log("✅ In-game view successfully loaded:", parsed.skin);
            }
          } catch (e) {
            console.log("WebView message (non-JSON):", data);
          }
        }}
        startInLoadingState={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        androidHardwareAccelerationDisabled={false}
        originWhitelist={["*"]}
        scalesPageToFit={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
      />
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.externalButtonSmall}
          onPress={handleOpenExternally}
        >
          <Ionicons name="open-outline" size={16} color={COLORS.primary} />
          <Text style={styles.externalButtonTextSmall}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
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
  },
  webview: {
    flex: 1,
    backgroundColor: "#1a2332",
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
    marginBottom: SPACING.xs,
  },
  errorSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  externalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "20",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  externalButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 2,
  },
  externalButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card + "E0",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  externalButtonTextSmall: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: "600",
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
  },
  unsupportedTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  unsupportedText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
});
