export function formatKpoint(value: number): string {
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toLocaleString('vi-VN')} KP`;
}
