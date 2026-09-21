import { describe, it, expect } from "vitest";
import { getThresholdColor } from "../../utils";

describe("ResourcesFooterWidget severity logic", () => {
  describe("getThresholdColor - ascending (higher-is-worse)", () => {
    it("returns undefined for values below warning threshold", () => {
      const result = getThresholdColor(45, 70, 90);
      expect(result).toBeUndefined();
    });

    it("returns warning for values between warn and critical thresholds", () => {
      const result = getThresholdColor(75, 70, 90);
      expect(result).toBe("warning");
    });

    it("returns destructive for values at or above critical threshold", () => {
      const result = getThresholdColor(95, 70, 90);
      expect(result).toBe("destructive");
    });

    it("handles edge case: value equals warn threshold", () => {
      const result = getThresholdColor(70, 70, 90);
      expect(result).toBe("warning");
    });

    it("handles edge case: value equals critical threshold", () => {
      const result = getThresholdColor(90, 70, 90);
      expect(result).toBe("destructive");
    });

    it("correctly prioritizes destructive over warning", () => {
      const warning = getThresholdColor(75, 70, 90);
      const critical = getThresholdColor(95, 70, 90);
      expect(critical).toBe("destructive");
      expect(warning).toBe("warning");
      expect(critical).not.toBe(warning);
    });
  });

  describe("getThresholdColor - descending (lower-is-worse, battery)", () => {
    it("returns destructive for critically low battery (5%)", () => {
      const result = getThresholdColor(5, 20, 10, true);
      expect(result).toBe("destructive");
    });

    it("returns warning for low battery between critical and warn (15%)", () => {
      const result = getThresholdColor(15, 20, 10, true);
      expect(result).toBe("warning");
    });

    it("returns undefined for healthy battery above warn (25%)", () => {
      const result = getThresholdColor(25, 20, 10, true);
      expect(result).toBeUndefined();
    });

    it("returns undefined for fully-charged battery (100%)", () => {
      const result = getThresholdColor(100, 20, 10, true);
      expect(result).toBeUndefined();
    });

    it("handles edge case: battery at critical threshold (10%)", () => {
      const result = getThresholdColor(10, 20, 10, true);
      expect(result).toBe("destructive");
    });

    it("handles edge case: battery at warn threshold (20%)", () => {
      const result = getThresholdColor(20, 20, 10, true);
      expect(result).toBe("warning");
    });

    it("inverts logic correctly: ascending mode would show 100% as destructive, descending shows it as healthy", () => {
      const ascendingResult = getThresholdColor(100, 20, 10, false);
      const descendingResult = getThresholdColor(100, 20, 10, true);
      expect(ascendingResult).toBe("destructive");
      expect(descendingResult).toBeUndefined();
    });

    it("inverts logic correctly: ascending mode would show 5% as healthy, descending shows it as destructive", () => {
      const ascendingResult = getThresholdColor(5, 20, 10, false);
      const descendingResult = getThresholdColor(5, 20, 10, true);
      expect(ascendingResult).toBeUndefined();
      expect(descendingResult).toBe("destructive");
    });
  });

  describe("default parameter behavior", () => {
    it("defaults to ascending mode when lowerIsWorse is not specified", () => {
      const withoutParam = getThresholdColor(95, 70, 90);
      const withParamFalse = getThresholdColor(95, 70, 90, false);
      expect(withoutParam).toBe(withParamFalse);
      expect(withoutParam).toBe("destructive");
    });
  });
});
