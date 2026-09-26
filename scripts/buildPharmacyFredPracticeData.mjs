import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { evaluateLiteralAst } from "./pharmacyFredLiteralAst.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export { evaluateLiteralAst } from "./pharmacyFredLiteralAst.mjs";

export function buildPharmacyFredPracticeData({
  pharmacyDir = process.env.PHARMACY_SOURCE_DIR || path.resolve(scriptDir, "../../pharmacy"),
  outputPath = process.env.PHARMACY_FRED_OUTPUT_FILE || "../src/lib/pharmacyFredPracticeData.ts",
} = {}) {
  const outputFile = path.resolve(scriptDir, outputPath);
  const sourceFile = path.join(pharmacyDir, "components/FredDispenseModule.tsx");
  if (!fs.existsSync(sourceFile)) throw new Error(`Required Pharmacy source not found: ${sourceFile}`);
  const sourceCommit = execFileSync("git", ["-C", pharmacyDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const source = ts.createSourceFile(sourceFile, fs.readFileSync(sourceFile, "utf8"), ts.ScriptTarget.Latest, true);

let rawScenarios;
for (const statement of source.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(source) !== "SCRIPT_SCENARIOS" || !declaration.initializer) continue;
    if (rawScenarios !== undefined) throw new Error("Duplicate SCRIPT_SCENARIOS declaration in Pharmacy source");
    rawScenarios = evaluateLiteralAst(declaration.initializer);
  }
}

if (!Array.isArray(rawScenarios) || rawScenarios.length !== 6) {
  throw new Error(`Expected the six literal FRED training scenarios; got ${rawScenarios?.length ?? "none"}`);
}

const ids = new Set();
const scenarios = rawScenarios.map((scenario) => {
  if (!scenario.id || ids.has(scenario.id)) throw new Error(`Missing or duplicate FRED scenario ID: ${scenario.id}`);
  ids.add(scenario.id);

  // Retain only practice-script fields. Patient, Medicare, prescriber and DOB fields are intentionally omitted.
  return {
    id: scenario.id,
    type: scenario.type,
    scriptType: scenario.scriptType,
    prescribedDrug: scenario.prescribedDrug,
    pbsCode: scenario.pbsCode,
    aFlagGenericSubstitute: scenario.aFlagGenericSubstitute,
    schedule: scenario.schedule,
    scriptDate: scenario.scriptDate,
    quantity: scenario.quantity,
    repeats: scenario.repeats,
    directions: scenario.directions,
    ...(scenario.isExpiredS8 === true ? { isExpiredS8: true } : {}),
    sourceUrl: `https://github.com/hamedharami-hub/pharmacy/blob/${sourceCommit}/components/FredDispenseModule.tsx`,
    contentReviewStatus: "unreviewed",
  };
});

const code = `// Generated from Pharmacy main at ${sourceCommit}; do not edit by hand.
import type { PharmacyFredPracticeEntry } from "./pharmacyFredPractice";

export const PHARMACY_FRED_PRACTICE_SCENARIOS: PharmacyFredPracticeEntry[] = ${JSON.stringify(scenarios, null, 2)};
`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, code, "utf8");
  return { outputFile, sourceCommit, scenarioCount: scenarios.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildPharmacyFredPracticeData();
  console.log(`Generated ${result.scenarioCount} anonymized FRED practice scripts at ${result.outputFile} from Pharmacy ${result.sourceCommit}.`);
}
