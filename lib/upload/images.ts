/**
 * Client-side image compression helpers.
 * Uses the browser Canvas API — must only be called in client components.
 */

export const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

export function isSupportedImageType(file: File): boolean {
  return (SUPPORTED_TYPES as readonly string[]).includes(file.type);
}

export interface CompressOptions {
  /**
   * Maximum output width in pixels. Aspect ratio is preserved.
   * Defaults to 1200.
   */
  maxWidth?: number;
  /**
   * Maximum output height in pixels. Aspect ratio is preserved.
   * Defaults to 1200.
   */
  maxHeight?: number;
  /**
   * JPEG/WebP quality between 0 and 1.
   * Defaults to 0.85.
   */
  quality?: number;
  /**
   * Minimum size reduction as a fraction of original (0–1).
   * If the compressed result isn't this much smaller than the original,
   * the original file is returned unchanged.
   * Defaults to 0.5 (must be at least 50% smaller to use compressed version).
   */
  targetReduction?: number;
}

/**
 * Compresses an image File using an off-screen Canvas element.
 * Returns a new File with the compressed bytes.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    targetReduction = 0.5,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob returned null"));
            return;
          }

          // Only use the compressed version if it's meaningfully smaller.
          if (blob.size >= file.size * (1 - targetReduction)) {
            resolve(file);
            return;
          }

          const ext = outputType === "image/png" ? "png" : "jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.${ext}`, { type: outputType }));
        },
        outputType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}
