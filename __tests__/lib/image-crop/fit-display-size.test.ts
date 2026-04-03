import { describe, expect, it } from "vitest";

import { fitImageDisplaySize } from "@/lib/image-crop/fit-display-size";

describe("fitImageDisplaySize", () => {
  it("вписывает широкое фото по высоте", () => {
    const { width, height } = fitImageDisplaySize(2000, 1000, 400, 200);
    expect(height).toBe(200);
    expect(width).toBe(400);
  });

  it("вписывает высокое фото по ширине", () => {
    const { width, height } = fitImageDisplaySize(1000, 2000, 400, 200);
    expect(width).toBe(100);
    expect(height).toBe(200);
  });
});
