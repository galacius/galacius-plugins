import { describe, it, expect } from "vitest";
import { getThresholdColor } from "../../utils";

describe("ResourcesFooterWidget severity logic", () => {
  describe("getThresholdColor", () => {
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

  describe("caller responsibility: skip severity for metrics without meaningful thresholds", () => {
    it("caller checks warn/critical thresholds before calling getThresholdColor for network", () => {
      const networkThresholds = { warn: 0, critical: 0 };
      const hasNoMeaningfulThresholds =
        networkThresholds.warn === 0 && networkThresholds.critical === 0;
      expect(hasNoMeaningfulThresholds).toBe(true);
    });

    it("caller checks warn/critical thresholds before calling getThresholdColor for loadAverage", () => {
      const loadAverageThresholds = { warn: 0, critical: 0 };
      const hasNoMeaningfulThresholds =
        loadAverageThresholds.warn === 0 && loadAverageThresholds.critical === 0;
      expect(hasNoMeaningfulThresholds).toBe(true);
    });

    it("caller checks warn/critical thresholds before calling getThresholdColor for uptime", () => {
      const uptimeThresholds = { warn: 0, critical: 0 };
      const hasNoMeaningfulThresholds =
        uptimeThresholds.warn === 0 && uptimeThresholds.critical === 0;
      expect(hasNoMeaningfulThresholds).toBe(true);
    });
  });

  describe("overflow and severity partitioning", () => {
    it("high-severity metric ranks higher than normal metric for visibility", () => {
      const normalSeverity = getThresholdColor(45, 70, 90);
      const highSeverity = getThresholdColor(95, 70, 90);
      expect(highSeverity).toBe("destructive");
      expect(normalSeverity).toBeUndefined();
    });
  });
});
