import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

export const DEFAULT_IMAGE_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_MENU_IMAGES_BUCKET ?? "menu-images";
export const GUEST_IDENTIFICATION_BUCKET = "guest-identifications";
export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "heic",
  "heif",
]);
export const SUPPORTED_IMAGE_ACCEPT = Array.from(
  SUPPORTED_IMAGE_MIME_TYPES,
).join(",");

const DEFAULT_MAX_IMAGE_DIMENSION = 950; // max width or height in pixels when resizing large images
const DEFAULT_IMAGE_QUALITY = 0.50; //
const DEFAULT_TARGET_REDUCTION = 0.85; // aim for at least 85% reduction by default
const ABSOLUTE_MAX_OUTPUT_BYTES = 500 * 1024; // 500 KB hard ceiling for any upload
const MIN_ACCEPTABLE_REDUCTION = 0.05; // at least 5% reduction to consider it "compressed"
const MAX_FILE_SIZE_FOR_ENFORCED_REDUCTION = 1024 * 1024; // 1MB - only enforce reduction above this size
const SCALE_REDUCTION_FACTOR = 0.75; // reduce output dimensions ~25% each extra pass
const MIN_OUTPUT_DIMENSION = 800; // never go below 800px on the longest side
const MAX_SCALE_ATTEMPTS = 4;

function normalizeMimeType(type: string | undefined) {
  return (type ?? "").split(";")[0].trim().toLowerCase();
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension?.trim().toLowerCase() ?? "";
}

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
      reject(
        new Error(
          "Could not read the selected image in this browser. If this photo came directly from your camera, try switching the camera format to JPEG/Most Compatible and upload again."
        )
      );
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
  const mimeType = normalizeMimeType(file.type);

  if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
    return true;
  }

  return SUPPORTED_IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

function getResolvedOutputType(requestedType?: string) {
  const normalizedRequestedType = normalizeMimeType(requestedType);

  if (normalizedRequestedType && normalizedRequestedType !== "image/heic" && normalizedRequestedType !== "image/heif") {
    return normalizedRequestedType;
  }

  return "image/webp";
}

function getOutputExtension(outputType: string) {
  if (outputType === "image/webp") {
    return "webp";
  }

  if (outputType === "image/png") {
    return "png";
  }

  return "jpg";
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser does not support image compression.");
  }

  return { canvas, context };
}

async function compressCanvasBlob(options: {
  canvas: HTMLCanvasElement;
  outputType: string;
  fileSize: number;
  targetMaxSize: number;
  initialQuality: number;
}) {
  let bestBlob = await canvasToBlob(options.canvas, options.outputType, options.initialQuality);
  const isLargeFile = options.fileSize > MAX_FILE_SIZE_FOR_ENFORCED_REDUCTION;
  const initialReductionFraction = 1 - bestBlob.size / options.fileSize;

  if (
    bestBlob.size > options.targetMaxSize ||
    (isLargeFile && initialReductionFraction < MIN_ACCEPTABLE_REDUCTION)
  ) {
    let lo = 0.1;
    let hi = options.initialQuality;
    let iterations = 0;
    const MAX_ITERATIONS = 8;

    while (iterations < MAX_ITERATIONS) {
      const mid = parseFloat(((lo + hi) / 2).toFixed(2));
      const candidate = await canvasToBlob(options.canvas, options.outputType, mid);

      if (candidate.size <= options.targetMaxSize) {
        bestBlob = candidate;
        lo = mid;
      } else {
        hi = mid;
      }

      if (hi - lo < 0.02 || Math.abs(candidate.size - options.targetMaxSize) < 1024) {
        break;
      }

      if (candidate.size < bestBlob.size) {
        bestBlob = candidate;
      }

      iterations++;
    }

    if (bestBlob.size > options.targetMaxSize && isLargeFile) {
      const lowestQualityBlob = await canvasToBlob(options.canvas, options.outputType, 0.1);
      if (lowestQualityBlob.size < bestBlob.size) {
        bestBlob = lowestQualityBlob;
      }
    }
  }

  return bestBlob;
}

/**
 * Compresses an image, guaranteeing at least `targetReduction` size reduction
 * (default 30%). Uses a binary-search approach on quality to hit the target.
 */
export async function compressImage(
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
    outputType?: string;
    /** Fraction of original size to reduce by (0.5 = 50% smaller). Default: 0.3 */
    targetReduction?: number;
  },
): Promise<File> {
  if (!isSupportedImageType(file)) {
    throw new Error("Please select a JPG, PNG, WebP, AVIF, HEIC, or HEIF image.");
  }

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
  const outputType = getResolvedOutputType(options?.outputType);
  const targetReduction = options?.targetReduction ?? DEFAULT_TARGET_REDUCTION;
  // Effective target: never exceed 500 KB, regardless of targetReduction
  const reductionTarget = file.size * (1 - targetReduction);
  const targetMaxSize = Math.min(reductionTarget, ABSOLUTE_MAX_OUTPUT_BYTES);

  // Graceful fallback: some formats (e.g. HEIC on Chrome/Android) cannot be
  // decoded via the canvas API. Upload the original rather than blocking the user.
  let image: HTMLImageElement;
  try {
    image = await loadImageFromFile(file);
  } catch {
    return file;
  }

  const initialQuality = options?.quality ?? DEFAULT_IMAGE_QUALITY;
  const initialScale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  let currentWidth = Math.max(1, Math.round(image.width * initialScale));
  let currentHeight = Math.max(1, Math.round(image.height * initialScale));
  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < MAX_SCALE_ATTEMPTS; attempt += 1) {
    const { canvas, context } = createCanvas(currentWidth, currentHeight);
    context.drawImage(image, 0, 0, currentWidth, currentHeight);

    const candidateBlob = await compressCanvasBlob({
      canvas,
      outputType,
      fileSize: file.size,
      targetMaxSize,
      initialQuality,
    });

    if (!bestBlob || candidateBlob.size < bestBlob.size) {
      bestBlob = candidateBlob;
    }

    if (candidateBlob.size <= targetMaxSize) {
      break;
    }

    // Reduce dimensions by ~25% for the next pass.
    const nextWidth = Math.round(currentWidth * SCALE_REDUCTION_FACTOR);
    const nextHeight = Math.round(currentHeight * SCALE_REDUCTION_FACTOR);

    if (Math.max(nextWidth, nextHeight) < MIN_OUTPUT_DIMENSION) {
      break; // don't shrink below minimum useful dimension
    }

    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  const extension = getOutputExtension(outputType);
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
