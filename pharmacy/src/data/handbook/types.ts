export interface OTCDrugInfo {
  name: string;
  brandExamples: string;
  dosing: string;
  pregnancySafety: string;
  breastfeedingSafety: string;
  minAge: string;
  extraInfo?: string;
}

export type OTCMedicine = OTCDrugInfo;

export interface OTCDiseaseGuide {
  id: string;
  condition: string;
  category: string;
  symptoms: string[];
  referralCriteria: string[];
  medicines: OTCDrugInfo[];
  nonPharmAdvice: string[];
  clinicalNotes: string[];
}

