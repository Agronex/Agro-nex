import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BellRing,
  CloudSun,
  Download,
  Cog,
  LogOut,
  Palette,
  RefreshCcw,
  Shield,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useUserSettings } from "../contexts/UserSettingsContext";
import {
  deleteChatThread,
  listChatThreads,
  loadChatMessages,
} from "../services/chatService";
import { UserSettings } from "../types";

const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22 },
};

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      {...cardMotion}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 cursor-pointer">
      <div className="min-w-0">
        <div className="font-medium text-gray-800">{label}</div>
        {description && <div className="text-sm text-gray-500 mt-0.5">{description}</div>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
      />
    </label>
  );
}

function SelectRow({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid md:grid-cols-[1fr_220px] gap-3 items-center py-3">
      <div>
        <div className="font-medium text-gray-800">{label}</div>
        {description && <div className="text-sm text-gray-500 mt-0.5">{description}</div>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberRow({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="grid md:grid-cols-[1fr_220px] gap-3 items-center py-3">
      <div>
        <div className="font-medium text-gray-800">{label}</div>
        {description && <div className="text-sm text-gray-500 mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-green-600"
        />
        <div className="w-16 text-right text-sm font-semibold text-gray-700">
          {value}
          {unit}
        </div>
      </div>
    </div>
  );
}

const SettingsPanel: React.FC = () => {
  const { user } = useAuth();
  const { settings, updateSettings, resetSettings } = useUserSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const currentUserLabel = useMemo(() => user?.displayName || user?.email || "AgroNex user", [user]);

  const update = async (next: Partial<UserSettings> | ((current: UserSettings) => UserSettings)) => {
    setStatus(null);
    await updateSettings(next);
    setStatus("Saved");
    window.setTimeout(() => setStatus(null), 1800);
  };

  const exportUserData = async () => {
    if (!user) return;
    setBusy("export");

    try {
      const threads = await listChatThreads(user.uid);
      const history = [];
      for (const thread of threads) {
        const messages = await loadChatMessages(user.uid, thread.id);
        history.push({ thread, messages });
      }

      const payload = {
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        },
        settings,
        chatThreads: history,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "agronex-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const clearData = async () => {
    if (!user) return;
    const ok = window.confirm("Delete your saved chat threads and reset app settings?");
    if (!ok) return;

    setBusy("delete");
    try {
      const threads = await listChatThreads(user.uid);
      await Promise.all(threads.map((thread) => deleteChatThread(user.uid, thread.id)));
      await resetSettings();
      localStorage.removeItem(`agronex_chat_active_thread_${user.uid}`);
      localStorage.removeItem(`agronex_chat_threads_${user.uid}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-sky-600 text-white p-6 md:p-8 shadow-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Smart farm control center
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold">Settings</h2>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-white/85">
              Tune AgroNex for {currentUserLabel}. Changes auto-save instantly.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 text-right">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <div className="text-xs uppercase tracking-widest text-white/70">Status</div>
              <div className="font-semibold">{status || "Ready"}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <SectionCard icon={<Wand2 className="h-5 w-5" />} title="AI assistant" subtitle="Control chat style, memory, and streaming.">
        <ToggleRow
          label="Streaming responses"
          description="Show text as it arrives for a faster, more conversational feel."
          checked={settings.ai.streamingEnabled}
          onChange={(checked) => update((current) => ({ ...current, ai: { ...current.ai, streamingEnabled: checked } }))}
        />
        <ToggleRow
          label="Practical answer bias"
          description="Prefer actionable advice over generic explanations."
          checked={settings.ai.practicalBias}
          onChange={(checked) => update((current) => ({ ...current, ai: { ...current.ai, practicalBias: checked } }))}
        />
        <SelectRow
          label="Response length"
          value={settings.ai.responseLength}
          onChange={(value) => update((current) => ({ ...current, ai: { ...current.ai, responseLength: value as UserSettings["ai"]["responseLength"] } }))}
          options={[
            { value: "short", label: "Short" },
            { value: "balanced", label: "Balanced" },
            { value: "detailed", label: "Detailed" },
          ]}
        />
        <SelectRow
          label="Response tone"
          value={settings.ai.tone}
          onChange={(value) => update((current) => ({ ...current, ai: { ...current.ai, tone: value as UserSettings["ai"]["tone"] } }))}
          options={[
            { value: "professional", label: "Professional" },
            { value: "friendly", label: "Friendly" },
            { value: "coach", label: "Coach-like" },
          ]}
        />
        <NumberRow
          label="Temperature"
          description="Lower is more focused; higher is more creative."
          value={Math.round(settings.ai.temperature * 100)}
          onChange={(value) => update((current) => ({ ...current, ai: { ...current.ai, temperature: value / 100 } }))}
          min={20}
          max={90}
          step={5}
          unit="%"
        />
        <NumberRow
          label="Max tokens"
          description="Upper bound for assistant length."
          value={settings.ai.maxTokens}
          onChange={(value) => update((current) => ({ ...current, ai: { ...current.ai, maxTokens: value } }))}
          min={128}
          max={1200}
          step={32}
        />
        <NumberRow
          label="Memory depth"
          description="How many recent chat messages to keep in context."
          value={settings.ai.memoryDepth}
          onChange={(value) => update((current) => ({ ...current, ai: { ...current.ai, memoryDepth: value } }))}
          min={5}
          max={40}
          step={1}
        />
      </SectionCard>

      <SectionCard icon={<CloudSun className="h-5 w-5" />} title="Weather & location" subtitle="Choose your region and display preferences.">
        <SelectRow
          label="Units"
          description="Set weather display units."
          value={settings.weather.units}
          onChange={(value) => update((current) => ({ ...current, weather: { ...current.weather, units: value as UserSettings["weather"]["units"] } }))}
          options={[
            { value: "metric", label: "Metric (°C, km/h)" },
            { value: "imperial", label: "Imperial (°F, mph)" },
          ]}
        />
        <div className="grid md:grid-cols-2 gap-4 py-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-800">Location label</div>
            <input
              value={settings.weather.locationLabel}
              onChange={(e) => update((current) => ({ ...current, weather: { ...current.weather, locationLabel: e.target.value } }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Chennai, India"
            />
          </label>
          <NumberRow
            label="Refresh interval"
            description="How often weather cards refresh."
            value={settings.weather.refreshMinutes}
            onChange={(value) => update((current) => ({ ...current, weather: { ...current.weather, refreshMinutes: value } }))}
            min={5}
            max={60}
            step={5}
            unit="m"
          />
        </div>
      </SectionCard>

      <SectionCard icon={<BellRing className="h-5 w-5" />} title="Notifications" subtitle="Fine-tune farm alerts and quiet hours.">
        <ToggleRow
          label="Enable notifications"
          checked={settings.notifications.enabled}
          onChange={(checked) => update((current) => ({ ...current, notifications: { ...current.notifications, enabled: checked } }))}
        />
        <ToggleRow
          label="Weather alerts"
          checked={settings.notifications.weatherAlerts}
          onChange={(checked) => update((current) => ({ ...current, notifications: { ...current.notifications, weatherAlerts: checked } }))}
        />
        <ToggleRow
          label="Disease alerts"
          checked={settings.notifications.diseaseAlerts}
          onChange={(checked) => update((current) => ({ ...current, notifications: { ...current.notifications, diseaseAlerts: checked } }))}
        />
        <ToggleRow
          label="Market alerts"
          checked={settings.notifications.marketAlerts}
          onChange={(checked) => update((current) => ({ ...current, notifications: { ...current.notifications, marketAlerts: checked } }))}
        />
        <ToggleRow
          label="Quiet hours"
          description="Pause non-critical notifications during this period."
          checked={settings.notifications.quietHoursEnabled}
          onChange={(checked) => update((current) => ({ ...current, notifications: { ...current.notifications, quietHoursEnabled: checked } }))}
        />
        <div className="grid md:grid-cols-2 gap-4 py-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-800">Quiet start</div>
            <input
              type="time"
              value={settings.notifications.quietHoursStart}
              onChange={(e) => update((current) => ({ ...current, notifications: { ...current.notifications, quietHoursStart: e.target.value } }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-800">Quiet end</div>
            <input
              type="time"
              value={settings.notifications.quietHoursEnd}
              onChange={(e) => update((current) => ({ ...current, notifications: { ...current.notifications, quietHoursEnd: e.target.value } }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        </div>
        <SelectRow
          label="Digest frequency"
          value={settings.notifications.digestFrequency}
          onChange={(value) => update((current) => ({ ...current, notifications: { ...current.notifications, digestFrequency: value as UserSettings["notifications"]["digestFrequency"] } }))}
          options={[
            { value: "never", label: "Never" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
        <ToggleRow
          label="Sound alerts"
          checked={settings.notifications.soundEnabled}
          onChange={(checked) => update((current) => ({ ...current, notifications: { ...current.notifications, soundEnabled: checked } }))}
        />
      </SectionCard>

      <SectionCard icon={<Palette className="h-5 w-5" />} title="Appearance & accessibility" subtitle="Make the app easier on the eyes and smoother to use.">
        <SelectRow
          label="Theme"
          value={settings.appearance.theme}
          onChange={(value) => update((current) => ({ ...current, appearance: { ...current.appearance, theme: value as UserSettings["appearance"]["theme"] } }))}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <SelectRow
          label="Density"
          description="Comfortable or compact spacing."
          value={settings.appearance.density}
          onChange={(value) => update((current) => ({ ...current, appearance: { ...current.appearance, density: value as UserSettings["appearance"]["density"] } }))}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
        <NumberRow
          label="Font scale"
          description="Scale the entire web app text size."
          value={settings.appearance.fontScale}
          onChange={(value) => update((current) => ({ ...current, appearance: { ...current.appearance, fontScale: value } }))}
          min={90}
          max={130}
          step={2}
          unit="%"
        />
        <ToggleRow
          label="High contrast"
          checked={settings.appearance.highContrast}
          onChange={(checked) => update((current) => ({ ...current, appearance: { ...current.appearance, highContrast: checked } }))}
        />
        <ToggleRow
          label="Reduced motion"
          checked={settings.appearance.reducedMotion}
          onChange={(checked) => update((current) => ({ ...current, appearance: { ...current.appearance, reducedMotion: checked } }))}
        />
      </SectionCard>

      <SectionCard icon={<Shield className="h-5 w-5" />} title="Privacy & data" subtitle="Control what AgroNex keeps and what you export.">
        <ToggleRow
          label="Save chat history"
          description="Keep your assistant threads between sessions."
          checked={settings.privacy.saveChatHistory}
          onChange={(checked) => update((current) => ({ ...current, privacy: { ...current.privacy, saveChatHistory: checked } }))}
        />
        <ToggleRow
          label="Allow analytics"
          checked={settings.privacy.allowAnalytics}
          onChange={(checked) => update((current) => ({ ...current, privacy: { ...current.privacy, allowAnalytics: checked } }))}
        />
        <ToggleRow
          label="Share usage data"
          description="Share anonymous usage insights to improve the app."
          checked={settings.privacy.shareUsageData}
          onChange={(checked) => update((current) => ({ ...current, privacy: { ...current.privacy, shareUsageData: checked } }))}
        />
        <NumberRow
          label="Auto-delete data"
          description="0 keeps data indefinitely; otherwise remove old chat history after N days."
          value={settings.privacy.autoDeleteDays}
          onChange={(value) => update((current) => ({ ...current, privacy: { ...current.privacy, autoDeleteDays: value } }))}
          min={0}
          max={365}
          step={1}
          unit="d"
        />
        <div className="flex flex-wrap gap-3 pt-3">
          <button
            onClick={exportUserData}
            disabled={busy === "export"}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-white hover:bg-green-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export my data
          </button>
          <button
            onClick={clearData}
            disabled={busy === "delete"}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Delete my data
          </button>
        </div>
      </SectionCard>

      <SectionCard icon={<Cog className="h-5 w-5" />} title="Session & account" subtitle="Quick controls for this signed-in account.">
        <SelectRow
          label="Default landing view"
          value={settings.session.defaultView}
          onChange={(value) => update((current) => ({ ...current, session: { ...current.session, defaultView: value as UserSettings["session"]["defaultView"] } }))}
          options={[
            { value: "dashboard", label: "Dashboard" },
            { value: "weather", label: "Weather" },
            { value: "disease-detection", label: "Disease detection" },
            { value: "market-prices", label: "Market prices" },
            { value: "yield-prediction", label: "Yield prediction" },
            { value: "farm-logbook", label: "Farm logbook" },
            { value: "community", label: "Community" },
            { value: "settings", label: "Settings" },
          ]}
        />
        <ToggleRow
          label="Remember sidebar state"
          checked={settings.session.rememberSidebarState}
          onChange={(checked) => update((current) => ({ ...current, session: { ...current.session, rememberSidebarState: checked } }))}
        />
        <div className="flex flex-wrap gap-3 pt-3">
          <button
            onClick={resetSettings}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset preferences
          </button>
          <button
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-white hover:bg-black"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </SectionCard>

      <SectionCard icon={<Activity className="h-5 w-5" />} title="Saved state" subtitle="A few active settings are applied globally right away.">
        <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">Chat</div>
            <p>
              Streaming is {settings.ai.streamingEnabled ? "enabled" : "disabled"} and history is
              {settings.privacy.saveChatHistory ? " persisted" : " not persisted"}.
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">Display</div>
            <p>
              Theme: {settings.appearance.theme}. Font scale: {settings.appearance.fontScale}%.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default SettingsPanel;
