export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

/** Append a one-shot message to an internal path. */
export function withMessage(
  path: string,
  key: "notice" | "error",
  message: string,
): string {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}${key}=${encodeURIComponent(message)}`;
}

/**
 * Only allow redirect targets inside this app. Used for ?next= values after
 * signing in, so a crafted link cannot turn into an open redirect.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }

  return value;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Colours for the initials avatar — one per user, picked by hashing their id,
 * so each member's tile is stable and recognisable across the app.
 */
const AVATAR_COLORS = [
  "#6366F1", // indigo
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EC4899", // pink
  "#10B981", // emerald
  "#475569", // slate
];

function avatarColor(seed: string): string {
  let hash = 5381;

  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** The first letter of the name on a per-user colour, as an inline SVG tile. */
function initialsAvatar(name: string, seed: string): string {
  const letter = (name.trim().charAt(0) || "?").toUpperCase().replace(/[&<>"]/g, "");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    `<rect width="64" height="64" rx="32" fill="${avatarColor(seed)}"/>` +
    `<text x="32" y="33" font-family="Poppins,Arial,Helvetica,sans-serif" font-size="30"` +
    ` font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">` +
    `${letter}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * The user's picture: their uploaded photo when there is one, otherwise an
 * initials tile (first letter of the name, colour derived from the seed —
 * pass the profile id so it stays unique per person).
 */
export function avatarUrl(
  value: string | null | undefined,
  name = "",
  seed = "",
): string {
  const url = value?.trim();

  if (url) {
    return url;
  }

  return initialsAvatar(name, seed || name || "?");
}
