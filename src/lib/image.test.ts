import { describe, expect, it } from "vitest";
import { processDogPhoto, validatePhotoFile } from "./image";

function makeFile(name: string, type: string, bytes: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("validatePhotoFile", () => {
  it("accepts a small image file", () => {
    expect(validatePhotoFile(makeFile("dog.jpg", "image/jpeg", 50_000))).toBeNull();
  });

  it("rejects non-image files", () => {
    expect(validatePhotoFile(makeFile("dog.pdf", "application/pdf", 1_000))).toMatch(
      /image file/i,
    );
  });

  it("rejects files with no type", () => {
    expect(validatePhotoFile(makeFile("dog", "", 1_000))).toMatch(/image file/i);
  });

  it("rejects images over 10 MB", () => {
    expect(
      validatePhotoFile(makeFile("dog.png", "image/png", 11 * 1024 * 1024)),
    ).toMatch(/too large/i);
  });
});

describe("processDogPhoto", () => {
  it("rejects invalid files before attempting to decode", async () => {
    await expect(
      processDogPhoto(makeFile("notes.txt", "text/plain", 100)),
    ).rejects.toThrow(/image file/i);
  });
});
