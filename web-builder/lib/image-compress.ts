// Browser-only image compressor. Loads a File through an Image + Canvas,
// resizes to a max dimension, and re-encodes to WebP. Returns the smaller of
// the original vs the optimized output so we never make a file bigger.
//
// Skips SVG (vector — no gain) and anything the browser can't decode.

export interface CompressOptions {
  maxDim?: number; // max width/height in pixels
  quality?: number; // 0..1 WebP quality
}

export interface CompressResult {
  file: File; // the file to upload (may be the original)
  originalSize: number;
  compressedSize: number;
  changed: boolean; // true if we returned a different file than input
}

export async function compressImage(
  file: File,
  { maxDim = 2048, quality = 0.85 }: CompressOptions = {}
): Promise<CompressResult> {
  const originalSize = file.size;

  // Skip formats where compression hurts or is pointless
  if (file.type === "image/svg+xml") {
    return { file, originalSize, compressedSize: originalSize, changed: false };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // Unsupported / corrupt — upload as-is rather than block the user
    return { file, originalSize, compressedSize: originalSize, changed: false };
  }

  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { file, originalSize, compressedSize: originalSize, changed: false };
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality)
  );
  if (!blob) {
    return { file, originalSize, compressedSize: originalSize, changed: false };
  }

  // If the "optimized" output is not meaningfully smaller, keep the original.
  // Threshold picks up real wins (10%+) and avoids churn on already-tight files.
  if (blob.size >= originalSize * 0.9) {
    return { file, originalSize, compressedSize: originalSize, changed: false };
  }

  const newName = file.name.replace(/\.(png|jpe?g|webp)$/i, "") + ".webp";
  const newFile = new File([blob], newName, { type: "image/webp", lastModified: Date.now() });

  return {
    file: newFile,
    originalSize,
    compressedSize: blob.size,
    changed: true,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
