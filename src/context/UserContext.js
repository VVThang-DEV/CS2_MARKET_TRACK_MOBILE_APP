/**
 * User Context - Manages Steam authentication and user state
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loginWithSteam,
  logoutSteam,
  fetchSteamProfile,
} from "../services/steamAuthService";
import {
  saveUserProfile,
  getActiveUserProfile,
  logoutUser,
} from "../database/userOperations";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  /**
   * Check if user has existing session
   */
  const checkExistingSession = async () => {
    try {
      setLoading(true);

      // Check database for active user (will return null if DB not ready)
      const activeUser = await getActiveUserProfile();

      if (activeUser) {
        setUser(activeUser);
        setIsAuthenticated(true);
        console.log("✅ Restored user session:", activeUser.personaName);
      } else {
        // Check AsyncStorage as fallback
        const storedUser = await AsyncStorage.getItem("steamUser");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          console.log("✅ Restored user from storage:", userData.personaName);
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
      // If database error, still try AsyncStorage fallback
      try {
        const storedUser = await AsyncStorage.getItem("steamUser");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          console.log(
            "✅ Restored user from storage (fallback):",
            userData.personaName
          );
        }
      } catch (storageError) {
        console.error("Storage fallback also failed:", storageError);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with Steam
   */
  const login = async () => {
    try {
      setLoading(true);

      const result = await loginWithSteam();

      if (result.success) {
        const profileData = result.profile;

        // Save to database
        await saveUserProfile(profileData);

        // Save to AsyncStorage
        await AsyncStorage.setItem("steamUser", JSON.stringify(profileData));

        setUser(profileData);
        setIsAuthenticated(true);

        console.log("✅ User logged in:", profileData.personaName);
        return { success: true, user: profileData };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      setLoading(true);

      if (user?.steamId) {
        await logoutUser(user.steamId);
      }

      await AsyncStorage.removeItem("steamUser");
      await logoutSteam();

      setUser(null);
      setIsAuthenticated(false);

      console.log("✅ User logged out");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh user profile
   */
  const refreshProfile = async () => {
    try {
      if (!user?.steamId) return;

      const profileData = await fetchSteamProfile(user.steamId);
      await saveUserProfile(profileData);
      await AsyncStorage.setItem("steamUser", JSON.stringify(profileData));

      setUser(profileData);
      console.log("✅ Profile refreshed");
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
