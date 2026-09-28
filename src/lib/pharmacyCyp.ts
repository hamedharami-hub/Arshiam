export type PharmacyCypCategory =
  | "strong_inhibitor"
  | "moderate_inhibitor"
  | "strong_inducer"
  | "moderate_inducer"
  | "sensitive_substrate"
  | "narrow_therapeutic_substrate";

export interface PharmacyCypEntry {
  name: string;
  nameFa: string;
  category: PharmacyCypCategory;
  notesFa: string;
  notesEn: string;
}

export interface PharmacyCypEnzyme {
  id: string;
  name: string;
  titleFa: string;
  titleEn: string;
  overviewFa: string;
  overviewEn: string;
  documentId: string;
  inhibitors: PharmacyCypEntry[];
  inducers: PharmacyCypEntry[];
  substrates: PharmacyCypEntry[];
}

export interface PharmacyCypPairInteraction {
  drugA: string;
  drugB: string;
  enzyme: string;
  type: "inhibition_toxicity" | "induction_failure" | "prodrug_activation_failure";
  severity: "high" | "critical" | "moderate";
  titleFa: string;
  titleEn: string;
  clinicalOutcomeFa: string;
  clinicalOutcomeEn: string;
  managementFa: string;
  managementEn: string;
}

export interface PharmacyCypRole {
  enzymeId: string;
  category: PharmacyCypCategory;
  sourceEntry: string;
  notesFa: string;
  notesEn: string;
}

export interface PharmacyCypDrug {
  key: string;
  name: string;
  roles: PharmacyCypRole[];
}

export type CypSignal = "high" | "elevated" | "note";

export interface CypRuleFinding {
  perpetrator: string;
  victim: string;
  enzymeId: string;
  effect: "inhibition" | "induction";
  prodrug: boolean;
  signal: CypSignal;
  perpetratorCategory: PharmacyCypCategory;
  victimCategory: PharmacyCypCategory;
}

export interface CypCheckResult {
  sourcePairs: PharmacyCypPairInteraction[];
  ruleFindings: CypRuleFinding[];
}

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();

/** Splits source group labels such as "Clarithromycin / Erythromycin" or "NSAIDs (Celecoxib, Ibuprofen)". */
export function splitCypEntryName(name: string): string[] {
  const match = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  let base = name;
  const names: string[] = [];
  if (match) {
    base = match[1];
    if (match[2].includes(",")) {
      names.push(...match[2].split(",").map((part) => part.trim()));
      base = "";
    }
  }
  if (base) {
    if (base.includes(" + ")) names.push(base.trim());
    else names.push(...base.split("/").map((part) => part.trim()));
  }
  return names.filter(Boolean);
}

/** Well-known prodrugs whose activation (not exposure) falls when their CYP pathway is inhibited. */
const PRODRUG_KEYS = new Set(["codeine", "tramadol", "tamoxifen", "clopidogrel"]);

export function buildCypDrugIndex(enzymes: readonly PharmacyCypEnzyme[]): PharmacyCypDrug[] {
  const drugs = new Map<string, PharmacyCypDrug>();
  for (const enzyme of enzymes) {
    for (const entry of [...enzyme.inhibitors, ...enzyme.inducers, ...enzyme.substrates]) {
      for (const drugName of splitCypEntryName(entry.name)) {
        const key = normalize(drugName);
        const drug = drugs.get(key) ?? { key, name: drugName, roles: [] };
        if (!drug.roles.some((role) => role.enzymeId === enzyme.id && role.category === entry.category)) {
          drug.roles.push({ enzymeId: enzyme.id, category: entry.category, sourceEntry: entry.name, notesFa: entry.notesFa, notesEn: entry.notesEn });
        }
        drugs.set(key, drug);
      }
    }
  }
  return [...drugs.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function searchCypDrugs(drugs: readonly PharmacyCypDrug[], query: string): PharmacyCypDrug[] {
  const term = normalize(query);
  if (!term) return [...drugs];
  return drugs.filter((drug) => drug.key.includes(term));
}

const isInhibitor = (category: PharmacyCypCategory) => category === "strong_inhibitor" || category === "moderate_inhibitor";
const isInducer = (category: PharmacyCypCategory) => category === "strong_inducer" || category === "moderate_inducer";
const isSubstrate = (category: PharmacyCypCategory) => category === "sensitive_substrate" || category === "narrow_therapeutic_substrate";

function signalFor(perpetrator: PharmacyCypCategory, victim: PharmacyCypCategory): CypSignal {
  const strong = perpetrator === "strong_inhibitor" || perpetrator === "strong_inducer";
  const narrow = victim === "narrow_therapeutic_substrate";
  if (strong && narrow) return "high";
  return strong || narrow ? "elevated" : "note";
}

const pairMatches = (pairName: string, key: string) => {
  const pair = normalize(pairName);
  return pair === key || pair.includes(key) || key.includes(pair);
};

/** Educational pattern check over the source categories only; absence of a finding is not evidence of safety. */
export function checkCypInteractions(
  selected: readonly PharmacyCypDrug[],
  pairs: readonly PharmacyCypPairInteraction[],
): CypCheckResult {
  const ruleFindings: CypRuleFinding[] = [];
  for (const perpetrator of selected) {
    for (const victim of selected) {
      if (perpetrator.key === victim.key) continue;
      for (const pRole of perpetrator.roles) {
        if (!isInhibitor(pRole.category) && !isInducer(pRole.category)) continue;
        for (const vRole of victim.roles) {
          if (vRole.enzymeId !== pRole.enzymeId || !isSubstrate(vRole.category)) continue;
          ruleFindings.push({
            perpetrator: perpetrator.name,
            victim: victim.name,
            enzymeId: pRole.enzymeId,
            effect: isInhibitor(pRole.category) ? "inhibition" : "induction",
            prodrug: PRODRUG_KEYS.has(victim.key),
            signal: signalFor(pRole.category, vRole.category),
            perpetratorCategory: pRole.category,
            victimCategory: vRole.category,
          });
        }
      }
    }
  }
  const order: Record<CypSignal, number> = { high: 0, elevated: 1, note: 2 };
  ruleFindings.sort((a, b) => order[a.signal] - order[b.signal]);

  const sourcePairs = pairs.filter((pair) =>
    selected.some((a) => pairMatches(pair.drugA, a.key)) && selected.some((b) => pairMatches(pair.drugB, b.key)),
  );
  return { sourcePairs, ruleFindings };
}
