import { describe, it, expect, beforeEach } from "vitest";
import {
  getCrisisResources,
  resolveSupportRegion,
  getStoredSupportRegion,
  setStoredSupportRegion,
  isValidTelNumber,
  REGIONAL_CRISIS_RESOURCES,
  SUPPORT_REGIONS,
  CRISIS_REGION_STORAGE_KEY,
} from "./crisisResources";

describe("crisisResources centralized configuration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("1. Support region resolution and persistence", () => {
    it("defaults to Australia (au) for English language to prevent US-only numbers", () => {
      const region = resolveSupportRegion("en");
      expect(region).toBe("au");
    });

    it("defaults to Iran (ir) for Persian language", () => {
      const region = resolveSupportRegion("fa");
      expect(region).toBe("ir");
    });

    it("persists manual region selection and respects user choice over language default", () => {
      setStoredSupportRegion("au");
      expect(getStoredSupportRegion()).toBe("au");
      expect(resolveSupportRegion("fa")).toBe("au"); // User explicitly chose au while in Persian

      setStoredSupportRegion("ir");
      expect(getStoredSupportRegion()).toBe("ir");
      expect(resolveSupportRegion("en")).toBe("ir"); // User explicitly chose ir while in English

      setStoredSupportRegion("us");
      expect(resolveSupportRegion("en")).toBe("us");

      setStoredSupportRegion("international");
      expect(resolveSupportRegion("en")).toBe("international");
    });

    it("handles corrupt localStorage values safely", () => {
      localStorage.setItem(CRISIS_REGION_STORAGE_KEY, "invalid_country_code");
      expect(getStoredSupportRegion()).toBeNull();
      expect(resolveSupportRegion("en")).toBe("au");
    });
  });

  describe("2. Australia (au) resources validation", () => {
    const auResources = getCrisisResources("au");

    it("includes Triple Zero 000 as immediate emergency danger", () => {
      const emergency = auResources.find((r) => r.phone === "000");
      expect(emergency).toBeDefined();
      expect(emergency?.isEmergency).toBe(true);
      expect(emergency?.name_en).toContain("Triple Zero");
    });

    it("includes Lifeline 13 11 14 available 24/7", () => {
      const lifeline = auResources.find((r) => r.phone === "131114");
      expect(lifeline).toBeDefined();
      expect(lifeline?.displayPhone).toBe("13 11 14");
      expect(lifeline?.available_en).toContain("24/7");
      expect(lifeline?.sms).toBe("0477131114");
    });

    it("includes Beyond Blue and Suicide Call Back Service", () => {
      expect(auResources.some((r) => r.phone === "1300224636")).toBe(true);
      expect(auResources.some((r) => r.phone === "1300659467")).toBe(true);
    });
  });

  describe("3. Iran (ir) resources validation", () => {
    const irResources = getCrisisResources("ir");

    it("includes EMS 115 and Social Emergency 123", () => {
      const ems = irResources.find((r) => r.phone === "115");
      const social = irResources.find((r) => r.phone === "123");
      expect(ems).toBeDefined();
      expect(social).toBeDefined();
      expect(social?.isEmergency).toBe(true);
    });

    it("includes Welfare Counseling 1480 and Police 110", () => {
      expect(irResources.some((r) => r.phone === "1480")).toBe(true);
      expect(irResources.some((r) => r.phone === "110")).toBe(true);
    });
  });

  describe("4. Dialable telephone link integrity", () => {
    it("ensures all phone values across all regions are strictly dialable digits with zero whitespace or text", () => {
      for (const regionMeta of SUPPORT_REGIONS) {
        const list = REGIONAL_CRISIS_RESOURCES[regionMeta.code];
        expect(list.length).toBeGreaterThan(0);

        for (const res of list) {
          if (res.phone) {
            expect(isValidTelNumber(res.phone)).toBe(true);
            expect(res.phone).not.toMatch(/\s/);
            expect(res.phone).not.toMatch(/[a-zA-Z]/);
            expect(res.phone).not.toContain("/");
          }
          if (res.sms) {
            expect(isValidTelNumber(res.sms)).toBe(true);
            expect(res.sms).not.toMatch(/\s/);
          }
        }
      }
    });

    it("identifies invalid phone strings correctly in isValidTelNumber", () => {
      expect(isValidTelNumber("911 / 112")).toBe(false);
      expect(isValidTelNumber("Text HOME to 741741")).toBe(false);
      expect(isValidTelNumber("13 11 14")).toBe(false);
      expect(isValidTelNumber("000")).toBe(true);
      expect(isValidTelNumber("131114")).toBe(true);
      expect(isValidTelNumber("+61477131114")).toBe(true);
      expect(isValidTelNumber("")).toBe(false);
    });
  });
});
