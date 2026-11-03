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

/** The default avatar lives next to the fonts in /public/assets. */
export function avatarUrl(value: string | null | undefined): string {
  const url = value?.trim();

  return url ? url : "/assets/img/default-avatar.png";
}
