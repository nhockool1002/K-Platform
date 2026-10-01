/**
 * K-Point Platform — Design Tokens (JS/TS mirror of globals.css).
 * Dùng khi cần giá trị màu trong code (chart, canvas, inline style) thay vì class Tailwind.
 * Đổi màu ở đây thì phải đổi đồng bộ trong globals.css (`:root`).
 */
export const brandColors = {
  navy: '#1d4e89',
  navyDark: '#13324f',
  blue: '#2f6ca2',
  blueLight: '#4a90c4',
  gold: '#e8a93a',
  goldDark: '#a9760f',
  bgLight: '#eaf1f8',
  bgGoldLight: '#fdf1dd',
} as const;

export const semanticColors = {
  primary: brandColors.navy,
  accent: brandColors.gold,
  muted: '#666666',
  border: '#e2e8f0',
} as const;

export type BrandColor = keyof typeof brandColors;
