"use client";

import {
  Camera01Icon,
  Delete02Icon,
  ImageUpload01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImage, isSupportedImageType } from "@/lib/upload/images";
import { cn } from "@/lib/utils";
import SmartImage from "../custom/smart-images";

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreviewImage(src: string | null | undefined) {
  if (!src) return false;
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("blob:") ||
    src.startsWith("data:") ||
    src.startsWith("/")
  );
}

export type ImageUploadProps = {
  id?: string;
  label?: string;
  description?: string;
  value?: string | null;
  onValueChange?: (value: string) => void;
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  capture?: "environment" | "user";
  enableCamera?: boolean;
  previewAlt?: string;
  validateFile?: (file: File) => string | null;
  onValidationError?: (message: string) => void;
  helperText?: string;
  showUrlField?: boolean;
  urlLabel?: string;
  urlPlaceholder?: string;
  className?: string;
  /** Class applied to the preview/dropzone area (controls height). Default: "aspect-video w-full" */
  previewClassName?: string;
  /** Minimum size reduction fraction. Default: 0 (any smaller result is accepted) */
  targetReduction?: number;
};

export function ImageUpload({
  id,
  label = "Image",
  description,
  value,
  onValueChange,
  file,
  onFileChange,
  accept = "image/*",
  disabled = false,
  capture = "environment",
  enableCamera = true,
  previewAlt = "Selected image preview",
  validateFile,
  onValidationError,
  helperText,
  showUrlField = true,
  urlLabel = "Image URL",
  urlPlaceholder = "https://",
  className,
  previewClassName = "aspect-video w-full",
  targetReduction = 0.75,
}: ImageUploadProps) {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const browseInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);
  // Track original vs compressed size for display
  const [sizeInfo, setSizeInfo] = React.useState<{
    original: number;
    compressed: number;
  } | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setSizeInfo(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const resolvedPreview = previewUrl ?? value?.trim() ?? "";
  const showPreview = canPreviewImage(resolvedPreview);

  const handleRemove = React.useCallback(() => {
    onFileChange?.(null);
    onValueChange?.("");
    setLocalError(null);
    setSizeInfo(null);
    if (browseInputRef.current) browseInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, [onFileChange, onValueChange]);

  const handleCandidateFile = React.useCallback(
    async (candidate: File | null) => {
      if (!candidate) {
        onFileChange?.(null);
        setLocalError(null);
        setSizeInfo(null);
        return;
      }

      // Run custom validation on the original file first
      const validationMessage = validateFile?.(candidate) ?? null;
      if (validationMessage) {
        setLocalError(validationMessage);
        onValidationError?.(validationMessage);
        return;
      }

      setLocalError(null);

      // Compress if it's a supported image type, otherwise pass through as-is
      if (isSupportedImageType(candidate)) {
        setIsCompressing(true);
        try {
          const compressed = await compressImage(candidate, {
            targetReduction,
          });
          setSizeInfo({
            original: candidate.size,
            compressed: compressed.size,
          });
          onFileChange?.(compressed);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Image compression failed.";
          setLocalError(message);
          onValidationError?.(message);
        } finally {
          setIsCompressing(false);
        }
      } else {
        onFileChange?.(candidate);
      }
    },
    [onFileChange, onValidationError, validateFile, targetReduction],
  );

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;
      handleCandidateFile(nextFile);
      event.target.value = "";
    },
    [handleCandidateFile],
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      const nextFile = event.dataTransfer.files?.[0] ?? null;
      handleCandidateFile(nextFile);
    },
    [disabled, handleCandidateFile],
  );

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {/* Label */}
      <div>
        <Label htmlFor={`${baseId}-url`} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
      title="hidden"
        ref={browseInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <input
      title="hidden"
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Main dropzone */}
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 transition-all",
          dragActive && "border-primary bg-primary/5",
          (disabled || isCompressing) && "pointer-events-none opacity-50",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        {/* Compressing overlay */}
        {isCompressing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm rounded-xl">
            <svg
              className="size-5 animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <p className="text-xs text-muted-foreground">Compressing…</p>
          </div>
        )}

        {showPreview ? (
          /* ── Preview state ── */
          <div
            className={cn(
              "relative flex items-center justify-center overflow-hidden",
              previewClassName,
            )}
          >
            <SmartImage
              src={resolvedPreview}
              width={640}
              height={384}
              alt={previewAlt}
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover object-center"
            />

            {/* Top gradient fade — appears on hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl" />

            {/* Remove button — top-right corner */}
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              aria-label="Remove image"
              className={cn(
                "absolute top-2.5 right-2.5 z-10",
                "flex items-center gap-1.5 h-7 px-2.5 rounded-lg",
                "bg-black/40 backdrop-blur-md border border-white/10",
                "text-[11px] font-medium text-white/80 hover:text-white",
                "hover:bg-black/60",
                "lg:opacity-0 opacity-100 group-hover:opacity-100",
                "transition-all duration-200",
                "shadow-md",
              )}
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                strokeWidth={2}
                className="size-3"
              />
              Remove
            </button>

            {/* Bottom file info overlay — shows compressed size + savings */}
            {file && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-3">
                <p className="truncate text-xs font-medium text-white">
                  {file.name}
                </p>
                <p className="text-[11px] text-white/60">
                  {formatFileSize(file.size)}
                  {sizeInfo && sizeInfo.original !== sizeInfo.compressed && (
                    <span className="ml-1.5 text-emerald-400">
                      ↓ {formatFileSize(sizeInfo.original)} →{" "}
                      {formatFileSize(sizeInfo.compressed)} (
                      {(
                        100 -
                        (sizeInfo.compressed / sizeInfo.original) * 100
                      ).toFixed(0)}
                      % saved)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-5 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
              <HugeiconsIcon
                icon={ImageUpload01Icon}
                strokeWidth={1.75}
                className="size-5 text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {dragActive ? "Drop to upload" : "Upload an image"}
              </p>
              <p className="text-xs text-muted-foreground">
                Drag and drop, or choose a file
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                className="text-white"
                onClick={() => browseInputRef.current?.click()}
                disabled={disabled}
              >
                <HugeiconsIcon
                  icon={Upload01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                Choose file
              </Button>
              {enableCamera && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                    disabled={disabled}
                    className='lg:hidden'
                >
                  <HugeiconsIcon
                    icon={Camera01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                  Camera
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* URL field */}
      {showUrlField && (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor={`${baseId}-url`}
            className="text-xs text-muted-foreground"
          >
            {urlLabel}
          </Label>
          <Input
            id={`${baseId}-url`}
            value={value ?? ""}
            onChange={(e) => {
              setLocalError(null);
              onValueChange?.(e.target.value);
            }}
            placeholder={urlPlaceholder}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      )}

      {helperText && !localError && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {localError && <p className="text-xs text-destructive">{localError}</p>}
    </div>
  );
}
