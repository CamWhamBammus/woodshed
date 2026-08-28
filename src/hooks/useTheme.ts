"use client";

import { useEffect, useState } from "react";
import { AUTO_THEME_FOR_SCHEME, THEME_PREFERENCE_ORDER, type Theme, type ThemePreference } from "@/lib/theme";

const STORAGE_KEY = "woodshed:theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return !!value && (THEME_PREFERENCE_ORDER as string[]).includes(value);
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== "auto") return preference;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? AUTO_THEME_FOR_SCHEME.dark : AUTO_THEME_FOR_SCHEME.light;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("forest");
  const [theme, setThemeState] = useState<Theme>("forest");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialPreference = isThemePreference(stored) ? stored : "forest";
    const initialTheme = resolveTheme(initialPreference);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferenceState(initialPreference);
    setThemeState(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    if (preference !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const next = resolveTheme("auto");
      setThemeState(next);
      document.documentElement.dataset.theme = next;
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [preference]);

  const setTheme = (next: ThemePreference) => {
    const resolved = resolveTheme(next);
    setPreferenceState(next);
    setThemeState(resolved);
    document.documentElement.dataset.theme = resolved;
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { theme, preference, setTheme };
}
