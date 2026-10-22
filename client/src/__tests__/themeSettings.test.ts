import { describe, expect, it } from "vitest";
import { DEFAULT_USER_SETTINGS } from "../types";
import { applySettingsToDocument } from "../services/userSettingsService";

describe("Theme and User Settings", () => {
  it("defaults to light theme as 1st priority", () => {
    expect(DEFAULT_USER_SETTINGS.appearance.theme).toBe("light");
  });

  it("applies light theme to document element by default", () => {
    applySettingsToDocument(DEFAULT_USER_SETTINGS);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("applies dark theme when explicitly configured", () => {
    applySettingsToDocument({
      ...DEFAULT_USER_SETTINGS,
      appearance: {
        ...DEFAULT_USER_SETTINGS.appearance,
        theme: "dark",
      },
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
