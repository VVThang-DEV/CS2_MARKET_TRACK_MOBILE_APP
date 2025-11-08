import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ListScreen } from "../screens/ListScreen";
import { DetailScreen } from "../screens/DetailScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { TrendsScreen } from "../screens/TrendsScreen";
import { WearConditionScreen } from "../screens/WearConditionScreen";
import { PatternSeedScreen } from "../screens/PatternSeedScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { InventoryScreen } from "../screens/InventoryScreen";
import { COLORS } from "../constants/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigator for the List flow (List + Detail)
const ListStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="ListHome"
        component={ListScreen}
        options={{
          title: "CS2 Market Tracker",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{
          title: "Skin Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="WearCondition"
        component={WearConditionScreen}
        options={{
          title: "Wear Conditions",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="PatternSeed"
        component={PatternSeedScreen}
        options={{
          title: "Pattern Seeds",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for the Trends flow
const TrendsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="TrendsHome"
        component={TrendsScreen}
        options={{
          title: "Market Trends",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{
          title: "Skin Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="WearCondition"
        component={WearConditionScreen}
        options={{
          title: "Wear Conditions",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="PatternSeed"
        component={PatternSeedScreen}
        options={{
          title: "Pattern Seeds",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for the Favorites flow (Favorites + Detail)
const FavoritesStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="FavoritesHome"
        component={FavoritesScreen}
        options={{
          title: "Watchlist",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{
          title: "Skin Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="WearCondition"
        component={WearConditionScreen}
        options={{
          title: "Wear Conditions",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="PatternSeed"
        component={PatternSeedScreen}
        options={{
          title: "Pattern Seeds",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for the Profile flow
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          title: "My Inventory",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
};

// Bottom tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "List") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Favorites") {
            iconName = focused ? "eye" : "eye-outline";
          } else if (route.name === "Trends") {
            iconName = focused ? "trending-up" : "trending-up-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === "ios" ? 20 : 5, // Extra padding for iPhone notch/home indicator
          paddingTop: 5,
          height: Platform.OS === "ios" ? 85 : 60, // Taller on iOS to accommodate safe area
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 5,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true, // Hide tab bar when keyboard is visible
      })}
    >
      <Tab.Screen
        name="List"
        component={ListStack}
        options={{
          title: "Armory",
        }}
      />
      <Tab.Screen
        name="Trends"
        component={TrendsStack}
        options={{
          title: "Trends",
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesStack}
        options={{
          title: "Watchlist",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: "Profile",
        }}
      />
    </Tab.Navigator>
  );
};

// Main navigation component
export const AppNavigator = () => {
  const navigationTheme = {
    dark: true,
    colors: {
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.accent,
    },
    fonts: {
      regular: {
        fontFamily: "System",
        fontWeight: "400",
      },
      medium: {
        fontFamily: "System",
        fontWeight: "500",
      },
      bold: {
        fontFamily: "System",
        fontWeight: "700",
      },
      heavy: {
        fontFamily: "System",
        fontWeight: "900",
      },
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <TabNavigator />
    </NavigationContainer>
  );
};
