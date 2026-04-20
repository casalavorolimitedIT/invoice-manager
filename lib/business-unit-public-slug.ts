const SLUG_PATTERN = /[^a-z0-9]+/g;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(SLUG_PATTERN, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function derivePublicGuestFormSlug(input: {
  name?: string | null;
  code?: string | null;
  explicitSlug?: string | null;
}) {
  const explicit = slugify(input.explicitSlug ?? "");
  if (explicit) return explicit;

  const code = slugify(input.code ?? "");
  const name = slugify(input.name ?? "");

  if (code && name) return `${code}-${name}`.slice(0, 80);
  return code || name;
}

export function normalizePublicGuestFormSlug(input: {
  name?: string | null;
  code?: string | null;
  explicitSlug?: string | null;
  fallbackSlug?: string | null;
}) {
  const slug = derivePublicGuestFormSlug(input) || slugify(input.fallbackSlug ?? "");

  if (!slug || slug.length < 3) {
    throw new Error("Public guest form slug must be at least 3 characters.");
  }

  return slug;
}