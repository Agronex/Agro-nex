import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { applySettingsToDocument, cacheSettings, loadUserSettings, readCachedSettings, saveUserSettings } from "../services/userSettingsService";
import { DEFAULT_USER_SETTINGS, UserSettings } from "../types";

interface UserSettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updater: Partial<UserSettings> | ((current: UserSettings) => UserSettings)) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSettings(DEFAULT_USER_SETTINGS);
      setLoading(false);
      return;
    }

    const cached = readCachedSettings(user.uid);
    if (cached) {
      setSettings(cached);
      applySettingsToDocument(cached);
    }

    let cancelled = false;
    setLoading(true);

    loadUserSettings(user.uid)
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        applySettingsToDocument(loaded);
      })
      .catch((error) => {
        console.error("Failed to load user settings:", error);
        if (!cancelled && !cached) {
          setSettings(DEFAULT_USER_SETTINGS);
          applySettingsToDocument(DEFAULT_USER_SETTINGS);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (user) {
      applySettingsToDocument(settings);
      cacheSettings(user.uid, settings);
    }
  }, [settings, user]);

  const updateSettings = useCallback(async (updater: Partial<UserSettings> | ((current: UserSettings) => UserSettings)) => {
    if (!user) return;

    const next = typeof updater === "function"
      ? updater(settings)
      : {
          ...settings,
          ...updater,
          ai: { ...settings.ai, ...updater.ai },
          weather: { ...settings.weather, ...updater.weather },
          notifications: { ...settings.notifications, ...updater.notifications },
          appearance: { ...settings.appearance, ...updater.appearance },
          privacy: { ...settings.privacy, ...updater.privacy },
          session: { ...settings.session, ...updater.session },
        };

    setSettings(next);
    applySettingsToDocument(next);
    await saveUserSettings(user.uid, next);
  }, [settings, user]);

  const resetSettings = useCallback(async () => {
    if (!user) return;
    setSettings(DEFAULT_USER_SETTINGS);
    applySettingsToDocument(DEFAULT_USER_SETTINGS);
    await saveUserSettings(user.uid, DEFAULT_USER_SETTINGS);
  }, [user]);

  const value = useMemo(() => ({ settings, loading, updateSettings, resetSettings }), [settings, loading, updateSettings, resetSettings]);

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return context;
}
