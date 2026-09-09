import { DrugMechanismInfo, CategoryMechanismOverview } from '@/data/mechanismsRegistry';

export interface ClinicalConcept {
  id: string;
  titleFa: string;
  titleEn: string;
  categoryFa: string;
  categoryEn: string;
  categoryType: 'red_flag' | 'toxicity' | 'interaction' | 'dosing' | 'regulatory' | 'clinical';
  badgeColor: string;
  descriptionFa: string;
  descriptionEn: string;
}

export interface ClinicalSubCategory {
  id: string;
  titleFa: string;
  titleEn: string;
  clinicalPearlsFa: string[];
  clinicalPearlsEn: string[];
  schedulingRulesFa: string;
  schedulingRulesEn: string;
  redFlagsFa: string[];
  redFlagsEn: string[];
  conceptIds?: string[];
  mechanismOverview?: CategoryMechanismOverview;
}

export type SubCategory = ClinicalSubCategory;

export interface ClinicalDomainCategory {
  id: string;
  titleFa: string;
  titleEn: string;
  badgeFa: string;
  badgeEn: string;
  iconType: 'steth' | 'heart' | 'brain' | 'endocr' | 'micro' | 'pharm' | 'leaf' | 'sparkle';
  subcategories: ClinicalSubCategory[];
}

export type ClinicalDomain = ClinicalDomainCategory;

export interface Product {
  id: string;
  brandName: string;
  genericName: string;
  schedule: 'Unscheduled' | 'S2' | 'S3' | 'S4' | 'S8';
  packSize: string;
  activeIngredients: string;
  domainId?: string;
  categoryId?: string;
  subcategoryId?: string;
  indications: { fa: string; en: string };
  calLabels: string[]; // e.g. ['CAL 1', 'CAL 12', 'CAL A']
  requiresProjectStop?: boolean;
  counselingPoints: { fa: string; en: string }[];
  conceptIds?: string[];
  mechanism?: DrugMechanismInfo;

  // TGA Pregnancy Category & Clinical Safety
  tgaPregnancyCategory?: 'A' | 'B1' | 'B2' | 'B3' | 'C' | 'D' | 'X';
  pregnancyAdvice?: { fa: string; en: string };

  // Brand Substitution & Bioequivalence / NTI Rules
  aFlagBioequivalent?: boolean; // True if standard A-Flag brand substitution is allowed in Australia
  isNarrowTherapeuticIndex?: boolean; // True if NTI (e.g. Warfarin, Lithium, Carbamazepine, Levothyroxine)
  brandSubstitutionNotice?: { fa: string; en: string }; // Notice explaining substitution rules/warnings
  equivalentBrands?: string[]; // Equivalent generic/brand names in Australia
}

export type TgaPregnancyCategory = 'A' | 'B1' | 'B2' | 'B3' | 'C' | 'D' | 'X';

export interface CalLabelInfo {
  code: string;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  colorClass: string;
}

export interface StateStorageRule {
  state: string;
  nameFa: string;
  nameEn: string;
  s2RuleFa: string;
  s2RuleEn: string;
  s3RuleFa: string;
  s3RuleEn: string;
  isStrictBehindCounterS2: boolean;
}
