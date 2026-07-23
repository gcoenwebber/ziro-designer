import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import "./custom.css";

// Ziro Designer docs theme — the stock VitePress theme with our brand tokens
// layered on top (see custom.css). Kept as an extension point for future
// custom components (callouts, version badges, etc.).
export default {
  extends: DefaultTheme,
} satisfies Theme;
