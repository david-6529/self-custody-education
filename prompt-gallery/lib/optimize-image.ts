const MAX_DIMENSION = 1200;
const QUALITY = 0.65;

export async function optimizeImage(file: File): Promise<File> {
  // Only process image files
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Skip if already small enough
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        // Still convert to WebP for compression
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const name = file.name.replace(/\.[^.]+$/, ".webp");
              resolve(new File([blob], name, { type: "image/webp" }));
            } else {
              resolve(file); // Original is smaller, keep it
            }
          },
          "image/webp",
          QUALITY
        );
        return;
      }

      // Scale down proportionally
      if (width > height) {
        height = Math.round(height * (MAX_DIMENSION / width));
        width = MAX_DIMENSION;
      } else {
        width = Math.round(width * (MAX_DIMENSION / height));
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const name = file.name.replace(/\.[^.]+$/, ".webp");
            resolve(new File([blob], name, { type: "image/webp" }));
          } else {
            resolve(file);
          }
        },
        "image/webp",
        QUALITY
      );
    };
    img.onerror = () => resolve(file); // Fallback to original on error
    img.src = URL.createObjectURL(file);
  });
}
