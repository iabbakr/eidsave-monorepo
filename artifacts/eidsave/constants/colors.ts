/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: "#1A1A1A",
    tint: "#1A6B3A",
    background: "#F8F6F1",
    foreground: "#1A1A1A",
    card: "#FFFFFF",
    cardForeground: "#1A1A1A",
    primary: "#1A6B3A",
    primaryForeground: "#FFFFFF",
    secondary: "#F0EBE0",
    secondaryForeground: "#1A1A1A",
    muted: "#EDE8DE",
    mutedForeground: "#6B6357",
    accent: "#C9942A",
    accentForeground: "#FFFFFF",
    destructive: "#D94040",
    destructiveForeground: "#FFFFFF",
    success: "#2D9E5A",
    successForeground: "#FFFFFF",
    border: "#DDD6C8",
    input: "#DDD6C8",
    gold: "#C9942A",
  },
  dark: {
    text: "#F0EDE6",
    tint: "#4CAF7D",
    background: "#0D1B12",
    foreground: "#F0EDE6",
    card: "#162C1E",
    cardForeground: "#F0EDE6",
    primary: "#4CAF7D",
    primaryForeground: "#0D1B12",
    secondary: "#1F3829",
    secondaryForeground: "#F0EDE6",
    muted: "#1A2E20",
    mutedForeground: "#9BA89F",
    accent: "#D4A843",
    accentForeground: "#0D1B12",
    destructive: "#E05555",
    destructiveForeground: "#FFFFFF",
    success: "#3DBF6E",
    successForeground: "#0D1B12",
    border: "#223D2D",
    input: "#223D2D",
    gold: "#D4A843",
  },
  radius: 12,
};

export default colors;
