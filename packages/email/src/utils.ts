export function sanitizeUrl(url: string): string {
  const lower = url.toLowerCase().trim();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  return url;
}
