const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PHOTO_SIZE = 96;

/**
 * Pre-decode validation, factored out so it can be unit-tested without a
 * real canvas/image decoder (jsdom has neither).
 */
export function validatePhotoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Image is too large (max 10 MB)";
  }
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image file"));
    img.src = url;
  });
}

/**
 * Center-crop the chosen image to a square, downscale to PHOTO_SIZE, and
 * return it as a compact JPEG data URL suitable for storing in SQLite.
 */
export async function processDogPhoto(file: File): Promise<string> {
  const validationError = validatePhotoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (side <= 0) {
      throw new Error("Could not read that image file");
    }
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process the image");
    }
    ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
