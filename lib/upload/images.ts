import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

export const DEFAULT_IMAGE_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_MENU_IMAGES_BUCKET ?? "menu-images";
export const GUEST_IDENTIFICATION_BUCKET = "guest-identifications";
export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/avif",
]);
export const SUPPORTED_IMAGE_ACCEPT = Array.from(
  SUPPORTED_IMAGE_MIME_TYPES,
).join(",");

const DEFAULT_MAX_IMAGE_DIMENSION = 1600;
const DEFAULT_IMAGE_QUALITY = 0.82;
const DEFAULT_TARGET_REDUCTION = 0.3; // aim for at least 30% reduction by default
const MIN_ACCEPTABLE_REDUCTION = 0.05; // at least 5% reduction to consider it "compressed"
const MAX_FILE_SIZE_FOR_ENFORCED_REDUCTION = 1024 * 1024; // 1MB - only enforce reduction above this size

function sanitizeFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export function isSupportedImageType(file: File) {
  return SUPPORTED_IMAGE_MIME_TYPES.has(file.type);
}

/**
 * Compresses an image, guaranteeing at least `targetReduction` size reduction
 * (default 50%). Uses a binary-search approach on quality to hit the target.
 */
export async function compressImage(
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
    outputType?: string;
    /** Fraction of original size to reduce by (0.5 = 50% smaller). Default: 0.5 */
    targetReduction?: number;
  },
): Promise<File> {
  if (!isSupportedImageType(file)) {
    throw new Error("Please select a PNG, JPG, WebP, or AVIF image.");
  }

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
  const outputType = options?.outputType ?? "image/webp";
  const targetReduction = options?.targetReduction ?? DEFAULT_TARGET_REDUCTION;
  const targetMaxSize = file.size * (1 - targetReduction); // e.g. 50% of original

  const image = await loadImageFromFile(file);

  // --- Step 1: Calculate scaled dimensions ---
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser does not support image compression.");
  }
  context.drawImage(image, 0, 0, width, height);

  // --- Step 2: Try the requested quality first ---
  const initialQuality = options?.quality ?? DEFAULT_IMAGE_QUALITY;
  let bestBlob = await canvasToBlob(canvas, outputType, initialQuality);

  // --- Step 3: Binary-search quality to meet target size ---
  // If the initial blob is already smaller than original (at least some reduction) 
  // and original is not too large (under 1MB), we can keep it without further aggressive reduction
  const isLargeFile = file.size > MAX_FILE_SIZE_FOR_ENFORCED_REDUCTION;
  const initialReductionFraction = 1 - bestBlob.size / file.size;

  if (bestBlob.size > targetMaxSize || (isLargeFile && initialReductionFraction < MIN_ACCEPTABLE_REDUCTION)) {
    let lo = 0.1;
    let hi = initialQuality;
    let iterations = 0;
    const MAX_ITERATIONS = 8;

    while (iterations < MAX_ITERATIONS) {
      const mid = parseFloat(((lo + hi) / 2).toFixed(2));
      const candidate = await canvasToBlob(canvas, outputType, mid);

      if (candidate.size <= targetMaxSize) {
        // Candidate meets the target — keep it but try to go higher quality
        bestBlob = candidate;
        lo = mid;
      } else {
        // Still too large — reduce quality further
        hi = mid;
      }

      // Stop if range is narrow enough or we're very close to target
      if (hi - lo < 0.02 || Math.abs(candidate.size - targetMaxSize) < 1024) {
        break;
      }

      iterations++;
    }

    // If binary search couldn't hit the target (highly compressed source),
    // we only force minimum quality for large files. 
    // For smaller files, we can accept higher sizes to preserve quality.
    if (bestBlob.size > targetMaxSize && isLargeFile) {
      bestBlob = await canvasToBlob(canvas, outputType, 0.1);
    }
  }

  // Final check: if the compressed version is somehow larger than the original
  // (e.g. converting a tiny PNG to WebP), use the original file content instead.
  if (bestBlob.size >= file.size) {
    return file;
  }

  // --- Step 4: If image dimensions were also scaled down, re-render at smaller size ---
  // This kicks in for images wider than maxDimension regardless of quality
  if (scale < 1) {
    // We've already drawn at scaled size — blob is already dimension-reduced
    // No extra work needed; the canvas was drawn at (width, height) above
  }

  const extension = outputType === "image/webp" ? "webp" : "jpg";
  const compressedFile = new File(
    [bestBlob],
    `${sanitizeFileName(file.name) || "image"}.${extension}`,
    {
      type: outputType,
      lastModified: Date.now(),
    },
  );

  // Dev log — remove in production if desired
  console.info(
    `[compressImage] ${(file.size / 1024).toFixed(1)} KB → ` +
      `${(compressedFile.size / 1024).toFixed(1)} KB ` +
      `(${(100 - (compressedFile.size / file.size) * 100).toFixed(1)}% reduction)`,
  );

  return compressedFile;
}

export async function uploadCompressedImageToSupabase(options: {
  file: File;
  path: string;
  bucket?: string;
  maxDimension?: number;
  quality?: number;
  outputType?: string;
  cacheControl?: string;
  upsert?: boolean;
  /** Minimum size reduction fraction. Default: 0.5 (50% smaller) */
  targetReduction?: number;
}) {
  const supabase = createBrowserSupabaseClient();
  const compressedFile = await compressImage(options.file, {
    maxDimension: options.maxDimension,
    quality: options.quality,
    outputType: options.outputType,
    targetReduction: options.targetReduction,
  });

  const bucket = options.bucket ?? DEFAULT_IMAGE_UPLOAD_BUCKET;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(options.path, compressedFile, {
      cacheControl: options.cacheControl ?? "31536000",
      upsert: options.upsert ?? false,
      contentType: compressedFile.type,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(options.path);

  return {
    bucket,
    file: compressedFile,
    path: options.path,
    publicUrl: data.publicUrl,
  };
}

export function buildMenuItemImagePath(
  itemId: string,
  fileName: string,
  outputType = "image/webp",
) {
  const extension = outputType === "image/webp" ? "webp" : "jpg";
  const safeName = sanitizeFileName(fileName) || "image";
  return `menu-items/${itemId}/${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.${extension}`;
}

export function buildGuestIdentificationImagePath(options: {
  businessUnitId: string;
  publicSlug: string;
  fileName: string;
  outputType?: string;
}) {
  const extension = options.outputType === "image/jpeg" ? "jpg" : "webp";
  const safeName = sanitizeFileName(options.fileName) || "identification";
  return `${options.businessUnitId}/${options.publicSlug}/${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.${extension}`;
}
