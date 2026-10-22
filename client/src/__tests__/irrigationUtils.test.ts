import { describe, expect, it } from "vitest";
import { getRainDetails } from "../utils/irrigationUtils";

describe("getRainDetails", () => {
  it("uses inclusive rainfall boundaries", () => {
    expect(getRainDetails({ rainfall: 1 } as never)).toBe("minimal expected rainfall");
    expect(getRainDetails({ rainfall: 5 } as never)).toBe("slight rain expected");
    expect(getRainDetails({ rainfall: 10 } as never)).toBe("moderate rain expected");
    expect(getRainDetails({ rainfall: 11 } as never)).toBe("heavy rain expected");
  });
});
