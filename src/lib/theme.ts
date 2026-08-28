export type Theme = "forest" | "walnut" | "lamp" | "dusk";

export const THEME_LABELS: Record<Theme, string> = {
  forest: "Forest",
  walnut: "Walnut",
  lamp: "Lamp",
  dusk: "Dusk",
};

export type ThemePreference = Theme | "auto";

export const THEME_PREFERENCE_ORDER: ThemePreference[] = ["forest", "walnut", "lamp", "dusk", "auto"];

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  ...THEME_LABELS,
  auto: "Auto",
};

export const AUTO_THEME_FOR_SCHEME = { light: "forest", dark: "dusk" } as const satisfies Record<
  "light" | "dark",
  Theme
>;

export const THEME_SWATCH: Record<Theme, [string, string]> = {
  forest: ["#fbf7ee", "#4c6b45"],
  walnut: ["#faf2e4", "#8a5a2e"],
  lamp: ["#1f160f", "#cf9c52"],
  dusk: ["#1b1611", "#8fae6f"],
};
