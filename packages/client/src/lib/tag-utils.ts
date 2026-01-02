import type { ColorName } from "./types";

/**
 * Normalizes a tag string: lowercase and replace spaces with hyphens
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Deterministic color assignment based on string hash
 * Same tag string always gets the same color
 */
export function getTagColor(tag: string): ColorName {
  const colors: ColorName[] = [
    "rose", "pink", "fuchsia", "purple", "violet",
    "indigo", "blue", "sky", "cyan", "teal",
    "emerald", "green", "lime", "yellow", "amber",
    "orange", "red", "warmGray", "coolGray", "slate"
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Map hash to color index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
