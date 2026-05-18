import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_USER_SETTINGS, UserSettings } from "../types";

const SETTINGS_DOC = "app";

function settingsDocPath(uid: string) {
  return doc(db, "users", uid, "settings", SETTINGS_DOC);
}

function normalizeSettings(raw: Partial<UserSettings> | undefined): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...raw,
    ai: { ...DEFAULT_USER_SETTINGS.ai, ...raw?.ai },
    weather: { ...DEFAULT_USER_SETTINGS.weather, ...raw?.weather },
    notifications: { ...DEFAULT_USER_SETTINGS.notifications, ...raw?.notifications },
    appearance: { ...DEFAULT_USER_SETTINGS.appearance, ...raw?.appearance },
    privacy: { ...DEFAULT_USER_SETTINGS.privacy, ...raw?.privacy },
    session: { ...DEFAULT_USER_SETTINGS.session, ...raw?.session },
  };
}

export function getSettingsCacheKey(uid: string) {
  return `agronex_settings_${uid}`;
}

export function readCachedSettings(uid: string): UserSettings | null {
  try {
    const raw = localStorage.getItem(getSettingsCacheKey(uid));
    if (!raw) return null;
    return normalizeSettings(JSON.parse(raw) as Partial<UserSettings>);
  } catch {
    return null;
  }
}

export function cacheSettings(uid: string, settings: UserSettings): void {
  try {
    localStorage.setItem(getSettingsCacheKey(uid), JSON.stringify(settings));
  } catch {
    // Cache only; ignore storage errors.
  }
}

export async function loadUserSettings(uid: string): Promise<UserSettings> {
  const snapshot = await getDoc(settingsDocPath(uid));
  const settings = normalizeSettings(snapshot.exists() ? (snapshot.data() as Partial<UserSettings>) : undefined);
  cacheSettings(uid, settings);
  return settings;
}

export async function saveUserSettings(uid: string, settings: UserSettings): Promise<UserSettings> {
  const normalized = normalizeSettings(settings);
  await setDoc(
    settingsDocPath(uid),
    {
      ...normalized,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  cacheSettings(uid, normalized);
  return normalized;
}

export function applySettingsToDocument(settings: UserSettings): void {
  const root = document.documentElement;
  root.style.setProperty("--agronex-font-scale", `${settings.appearance.fontScale}%`);
  root.dataset.theme = settings.appearance.theme;
  root.dataset.contrast = settings.appearance.highContrast ? "high" : "normal";
  root.dataset.density = settings.appearance.density;
  root.dataset.reducedMotion = settings.appearance.reducedMotion ? "true" : "false";
}

export function isQuietHours(settings: UserSettings, now = new Date()): boolean {
  if (!settings.notifications.quietHoursEnabled) return false;
  const [startHour, startMinute] = settings.notifications.quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = settings.notifications.quietHoursEnd.split(":").map(Number);
  const current = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}
