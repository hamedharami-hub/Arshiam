import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheGet, cacheSet, getPendingOps } from "./offlineQueue";
import { getDocsCacheKey, getFoldersCacheKey } from "./knowledgeService";
import { getLeitnerCardsCacheKey } from "./leitnerService";
import { PHARMACY_ROOT_FOLDER_ID, PHARMACY_SEED_CARDS, PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_FOLDERS } from "./pharmacySeedData";
import { PHARMACY_SEED_DOCUMENTS as LEGACY_DOCUMENTS } from "./pharmacyLegacySeedData";
import { PHARMACY_SEED_UPGRADE_CARD_BASELINES, PHARMACY_SEED_UPGRADE_DOCUMENT_BASELINES } from "./pharmacySeedUpgradeBaseline";
import { applyPharmacyClinicalEditorialOverrides } from "./pharmacyClinicalEditorialOverrides";
import { comparePharmacySeed, getPharmacyImportStatus, importPharmacyKnowledge, isPharmacyImported, normalizePharmacySeedData } from "./pharmacyImportService";
import { sanitizeKnowledgeHtml } from "./knowledgeHtmlSanitizer";
import { PHARMACY_CLINICAL_ENTITIES } from "./pharmacyClinicalGraph.generated";

const remote = vi.hoisted(() => ({
  knowledge_folders: new Map<string, Record<string, unknown>>(),
  knowledge_documents: new Map<string, Record<string, unknown>>(),
  leitner_cards: new Map<string, Record<string, unknown>>(),
  failId: "",
}));
type MockCollection = "knowledge_folders" | "knowledge_documents" | "leitner_cards";

vi.mock("./offlineQueue", async (importOriginal) => {
  const original = await importOriginal<typeof import("./offlineQueue")>();
  return { ...original, getPendingOps: vi.fn(async () => []) };
});

vi.mock("./firebaseStore", () => ({
  firebaseStore: {
    from: (table: MockCollection) => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [...remote[table].values()], error: null }),
      }),
    }),
  },
}));

vi.mock("./firestoreSync", () => ({
  saveEntityToFirestore: vi.fn(async (_userId: string, table: MockCollection, id: string, data: Record<string, unknown>) => {
    if (id === remote.failId) return false;
    const hasUndefined = (value: unknown): boolean => value === undefined ||
      (value !== null && typeof value === "object" && Object.values(value).some(hasUndefined));
    if (hasUndefined(data)) return false;
    remote[table].set(id, data);
    return true;
  }),
}));

describe("pharmacyImportService", () => {
  const userId = "test-pharmacy-user-123";

  beforeEach(async () => {
    vi.mocked(getPendingOps).mockResolvedValue([]);
    remote.knowledge_folders.clear();
    remote.knowledge_documents.clear();
    remote.leitner_cards.clear();
    remote.failId = "";
    await cacheSet(getFoldersCacheKey(userId), []);
    await cacheSet(getDocsCacheKey(userId), []);
    await cacheSet(getLeitnerCardsCacheKey(userId), []);
  });

  it("compares exact seed IDs, not the presence of a legacy root", async () => {
    expect(PHARMACY_ROOT_FOLDER_ID).toBe("folder-pharmacy-root");
    remote.knowledge_folders.set("legacy-root", {
      id: "legacy-root", user_id: userId, parent_id: null,
      name: "دایره‌المعارف و آموزش دارویی (Pharmacy Knowledge)",
    });
    const status = await getPharmacyImportStatus(userId);
    expect(status.legacyDetected).toBe(true);
    expect(status.foldersMissing).toBe(PHARMACY_SEED_FOLDERS.length);
    expect(status.docsMissing).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect(await isPharmacyImported(userId)).toBe(false);
    await importPharmacyKnowledge(userId, { importCards: false });
    expect(remote.knowledge_folders.get(PHARMACY_ROOT_FOLDER_ID)?.parent_id).toBe("legacy-root");
    expect(remote.knowledge_folders.get("legacy-root")?.name).toContain("Pharmacy Knowledge");
  }, 15_000);

  it("generates complete source categories with valid folder and document links", () => {
    expect(PHARMACY_SEED_FOLDERS).toHaveLength(34);
    expect(PHARMACY_SEED_DOCUMENTS).toHaveLength(432);
    const folderIds = new Set(PHARMACY_SEED_FOLDERS.map((item) => item.id));
    const docIds = new Set(PHARMACY_SEED_DOCUMENTS.map((item) => item.id));
    const cardIds = new Set(PHARMACY_SEED_CARDS.map((item) => item.id));
    const graphDocumentIds = PHARMACY_CLINICAL_ENTITIES.flatMap((entity) => entity.documentId ? [entity.documentId] : []);
    expect(folderIds.size).toBe(PHARMACY_SEED_FOLDERS.length);
    expect(docIds.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect(cardIds.size).toBe(PHARMACY_SEED_CARDS.length);
    expect(new Set(graphDocumentIds).size).toBe(graphDocumentIds.length);
    for (const documentId of graphDocumentIds) {
      expect(docIds.has(documentId), `Clinical graph points to missing seed document ${documentId}`).toBe(true);
    }
    for (const folder of PHARMACY_SEED_FOLDERS) {
      if (folder.parent_id) expect(folderIds.has(folder.parent_id), `Broken parent in ${folder.id}`).toBe(true);
    }
    const sourceCommits = new Set(
      PHARMACY_SEED_DOCUMENTS.map((doc) => doc.source_url?.match(/\/blob\/([a-f0-9]{40})\//)?.[1] || "")
    );
    expect(sourceCommits.size).toBe(1);
    expect(sourceCommits.has("")).toBe(false);
    let internalLinkCount = 0;
    for (const doc of PHARMACY_SEED_DOCUMENTS) {
      expect(folderIds.has(doc.folder_id || "")).toBe(true);
      expect(doc.source_url).toMatch(/^https:\/\/github\.com\/hamedharami-hub\/pharmacy\/blob\/[a-f0-9]{40}\//);
      expect(doc.content_review_status).toBe("unreviewed");
      for (const match of `${doc.content_html} ${doc.content_en}`.matchAll(/data-doc-link="([^"]+)"/g)) {
        internalLinkCount += 1;
        expect(docIds.has(match[1]), `Broken link in ${doc.id}: ${match[1]}`).toBe(true);
      }
    }
    expect(internalLinkCount).toBe(808);
    for (const card of PHARMACY_SEED_CARDS) {
      if (card.document_id) expect(docIds.has(card.document_id)).toBe(true);
      if (card.folder_id) expect(folderIds.has(card.folder_id)).toBe(true);
    }
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-core-disease-"))).toHaveLength(15);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-study-track-"))).toHaveLength(5);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-practice-question-"))).toHaveLength(7);
    const productDocuments = PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-product-"));
    expect(productDocuments).toHaveLength(121);
    for (const schedule of ["S2", "S3", "S4", "S8"]) {
      expect(productDocuments.some((item) => item.tags?.includes(`Schedule ${schedule}`))).toBe(true);
    }
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) => item.id.startsWith("doc-mechanism-sub-"))).toHaveLength(14);
    expect(PHARMACY_SEED_DOCUMENTS.filter((item) =>
      item.id.startsWith("doc-mechanism-") && !item.id.startsWith("doc-mechanism-sub-")
    )).toHaveLength(70);
    const safeScriptCase = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-scenario-clinical-safescript-early-refill-s8");
    expect(safeScriptCase?.content_en).toContain("Pharmacist assessment questions");
    expect(safeScriptCase?.content_en).toContain("Clinical rationale:");
    expect(safeScriptCase?.content_en).toContain("Red flags and escalation cues");
    expect(safeScriptCase?.content_en).toContain("Administrative / jurisdiction note");
    expect(safeScriptCase?.content_en).toContain("Referral handover template");
    expect(safeScriptCase?.content_en).not.toMatch(/[\u0600-\u06ff]/);
    expect(safeScriptCase).toMatchObject({
      folder_id: "folder-cases-clinical",
      content_review_status: "unreviewed",
    });
    expect(safeScriptCase?.content_review_evidence).toBeUndefined();
    expect(safeScriptCase?.source_url).toMatch(/\/data\/scenarios\/clinicalScenarios\.ts$/);
    expect(PHARMACY_CLINICAL_ENTITIES.find((entity) => entity.id === "triage:safescript-early-refill-s8"))
      .toMatchObject({
        documentId: "doc-scenario-clinical-safescript-early-refill-s8",
        title: { en: "C4. SafeScript Alert & Early Replacement Request (NSW; S8/S4)" },
      });
    expect(safeScriptCase?.title_en).not.toMatch(/suspicious/i);
    expect(safeScriptCase?.content_html).toContain("منابع رسمی NSW و یادداشت ویرایشی");
    expect(safeScriptCase?.content_en).toContain("Official NSW references");
    expect(safeScriptCase?.content_en).toContain("SafeScript pop-up notifications and alerts");
    expect(safeScriptCase?.content_en).toContain("If a patient has lost or had medicines stolen");
    const sanitizedSafeScript = sanitizeKnowledgeHtml(safeScriptCase?.content_html || "");
    expect(sanitizedSafeScript).toContain('href="https://www.health.nsw.gov.au/pharmaceutical/safescript/');
    expect(sanitizedSafeScript).toContain('href="https://www.health.nsw.gov.au/pharmaceutical/patients/');
    expect(`${safeScriptCase?.content_html} ${safeScriptCase?.content_en}`).not.toMatch(
      /Police Event Number|legally and ethically required|strictly unlawful|all Schedule 8 and monitored medicines are tracked in real-time via SafeScript/i,
    );
    const lostEScriptCase = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-scenario-admin-admin-lost-escript-mysl");
    expect(lostEScriptCase).toMatchObject({
      folder_id: "folder-cases-admin",
      content_review_status: "unreviewed",
    });
    expect(lostEScriptCase?.content_review_evidence).toBeUndefined();
    expect(lostEScriptCase?.source_url).toMatch(/\/data\/scenarios\/adminScenarios\.ts$/);
    expect(lostEScriptCase?.title_en).not.toMatch(/Lookup \(MySL\)/i);
    expect(lostEScriptCase?.content_en).toContain("they do not have an ASL");
    expect(lostEScriptCase?.content_en).toContain("contact the prescriber to resend it");
    expect(lostEScriptCase?.content_en).toContain("required SMS/email process");
    expect(lostEScriptCase?.content_en).toContain("Active Script List Privacy Framework");
    expect(lostEScriptCase?.content_en).toContain("Official Australian references");
    expect(lostEScriptCase?.content_html).toContain("منابع رسمی استرالیا و یادداشت ویرایشی");
    expect(lostEScriptCase?.content_html).not.toContain("منابع رسمی NSW");
    expect(lostEScriptCase?.content_en).not.toMatch(/[\u0600-\u06ff]/);
    expect(`${lostEScriptCase?.content_html} ${lostEScriptCase?.content_en}`).toContain(
      "every deleted SMS token is automatically retrievable",
    );
    expect(`${lostEScriptCase?.content_html} ${lostEScriptCase?.content_en}`).toContain(
      "Opening an ASL before identity checks",
    );
    expect(`${lostEScriptCase?.content_html} ${lostEScriptCase?.content_en}`).not.toMatch(
      /Accessing MySL without valid patient consent &amp; IHI verification|Mismatch in Individual Healthcare Identifier \(IHI\) and Medicare details|Official NSW references/i,
    );
    expect(PHARMACY_CLINICAL_ENTITIES.find((entity) => entity.id === "triage:admin-lost-escript-mysl"))
      .toMatchObject({
        documentId: "doc-scenario-admin-admin-lost-escript-mysl",
        title: { en: "A1. Lost eScript Token: ASL/MySL Eligibility & Recovery" },
      });
    expect(`${lostEScriptCase?.content_html} ${lostEScriptCase?.content_en}`).not.toMatch(
      /retrieve active eScript tokens directly from the national MySL repository|verbal consent and verify Medicare\/IHI/i,
    );
    const pregnancyThrushCase = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-scenario-clinical-thrush-triage");
    expect(pregnancyThrushCase).toMatchObject({
      folder_id: "folder-cases-clinical",
      content_review_status: "unreviewed",
    });
    expect(pregnancyThrushCase?.content_review_evidence).toBeUndefined();
    expect(pregnancyThrushCase?.source_url).toMatch(/\/data\/scenarios\/clinicalScenarios\.ts$/);
    expect(pregnancyThrushCase?.title_en).not.toMatch(/Pregnancy Red Flag|Contraindicated/i);
    expect(pregnancyThrushCase?.content_en).toContain("This is my first episode");
    expect(pregnancyThrushCase?.content_en).toMatch(/do not recommend or supply oral fluconazole for self-treatment/i);
    expect(pregnancyThrushCase?.content_en).toContain("possible second-line option after the first trimester");
    expect(pregnancyThrushCase?.content_en).toContain("vaginal applicators may be used with care");
    expect(pregnancyThrushCase?.content_en).toContain("Official NSW and Australian references");
    expect(pregnancyThrushCase?.content_html).toContain("این نخستین بار است");
    expect(pregnancyThrushCase?.content_html).toContain("مگر پزشک توصیه کند");
    expect(pregnancyThrushCase?.content_html).toContain("گزینهٔ خط دوم");
    expect(pregnancyThrushCase?.content_html).toContain("اپلیکاتور با احتیاط قابل استفاده است");
    expect(pregnancyThrushCase?.content_html).toContain("منابع رسمی NSW و استرالیا و یادداشت ویرایشی");
    expect(pregnancyThrushCase?.content_html).toContain("ThrushinPregnancyJuly152024.pdf");
    expect(pregnancyThrushCase?.content_en).toContain("Prescribing medicines in pregnancy database (updated 19 May 2026)");
    expect(pregnancyThrushCase?.content_en).not.toMatch(/strictly contraindicated in pregnancy due to risks of spontaneous abortion|safe gold standard|avoid deep applicator insertion/i);
    expect(pregnancyThrushCase?.content_html).not.toMatch(/اکیداً ممنوع|استاندارد طلایی ایمن|اپلیکاتور نباید عمیق/i);
    expect(pregnancyThrushCase?.content_en).not.toMatch(/[\u0600-\u06ff]/);
    expect(PHARMACY_CLINICAL_ENTITIES.find((entity) => entity.id === "triage:thrush-triage"))
      .toMatchObject({
        documentId: "doc-scenario-clinical-thrush-triage",
        title: { en: "8. Vaginal Thrush in Pregnancy: Confirm Diagnosis & Individualise Treatment" },
      });
    const chickenpoxCase = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-scenario-clinical-chickenpox-advisory");
    expect(chickenpoxCase).toMatchObject({
      folder_id: "folder-cases-clinical",
      content_review_status: "unreviewed",
    });
    expect(chickenpoxCase?.content_review_evidence).toBeUndefined();
    expect(chickenpoxCase?.source_url).toMatch(/\/data\/scenarios\/clinicalScenarios\.ts$/);
    expect(chickenpoxCase?.title_en).not.toMatch(/Bath & Fever Advisory|NSAID Contraindications/i);
    expect(chickenpoxCase?.content_en).toContain("official guidance differs");
    expect(chickenpoxCase?.content_en).toContain("the updated Sydney Children’s Hospitals Network factsheet in NSW");
    expect(chickenpoxCase?.content_en).toContain("do not give ibuprofen based on this scenario alone");
    expect(chickenpoxCase?.content_en).toContain("colloidal oatmeal baths may help");
    expect(chickenpoxCase?.content_en).toContain("Official Australian references");
    expect(chickenpoxCase?.content_en).toContain("updated 13 April 2026; differing advice");
    expect(chickenpoxCase?.content_en).toContain("reviewed July 2021; updated July 2025");
    expect(chickenpoxCase?.content_en).toContain("Chickenpox clinical practice guideline (last updated July 2021)");
    expect(chickenpoxCase?.content_en).toContain("https://www.rch.org.au/clinicalguide/guideline_index/Chickenpox_varicella/");
    expect(chickenpoxCase?.content_html).toContain("چون راهنمای رسمی اختلاف دارد");
    expect(chickenpoxCase?.content_html).toContain("فقط با اتکا به این سناریو ایبوپروفن ندهید");
    expect(chickenpoxCase?.content_html).toContain("حمام جو دوسر کلوئیدی ممکن است کمک کند");
    expect(chickenpoxCase?.content_html).toContain("منابع رسمی استرالیا و یادداشت ویرایشی");
    expect(chickenpoxCase?.content_html).toContain("updated 13 April 2026; differing advice");
    expect(`${chickenpoxCase?.content_html} ${chickenpoxCase?.content_en}`).not.toMatch(
      /warm\/hot baths and oils are contraindicated|Ibuprofen\/NSAIDs are strictly contraindicated in Varicella due to increased risk of severe necrotising fasciitis|Paracetamol is the sole antipyretic of choice|حمام آب گرم\/داغ و ماساژ روغن.*گرما را حبس|منع قطعی ایبوپروفن\/NSAIDs/i,
    );
    expect(chickenpoxCase?.content_en).not.toMatch(/[\u0600-\u06ff]/);
    expect(PHARMACY_CLINICAL_ENTITIES.find((entity) => entity.id === "triage:chickenpox-advisory"))
      .toMatchObject({
        documentId: "doc-scenario-clinical-chickenpox-advisory",
        title: { en: "5. Childhood Chickenpox: Symptom Relief & Conflicting Ibuprofen Advice" },
      });
    const scenarioDocuments = PHARMACY_SEED_DOCUMENTS.filter((item) =>
      item.id.startsWith("doc-scenario-clinical-") || item.id.startsWith("doc-scenario-slang-")
    );
    expect(scenarioDocuments).toHaveLength(28);
    for (const scenario of scenarioDocuments) {
      expect(scenario.content_en).toContain("English study view");
      expect(scenario.content_en).not.toMatch(/[\u0600-\u06ff]/);
    }
    expect(PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-cyp-cyp2d6")?.title).toBe("\u0633\u06cc\u062a\u0648\u06a9\u0631\u0648\u0645 CYP2D6: \u062a\u062f\u0627\u062e\u0644\u0627\u062a \u0648 \u0645\u0647\u0627\u0631\u06a9\u0646\u0646\u062f\u0647\u200c\u0647\u0627");
  });

  it("sanitizes untrusted bilingual seed HTML while retaining internal knowledge links", () => {
    const fixture = {
      PHARMACY_SEED_DOCUMENTS: [{
        ...PHARMACY_SEED_DOCUMENTS[0],
        id: "doc-synthetic-import",
        content_html: '<p>Safe lesson</p><a data-doc-link="doc-synthetic-import" href="javascript:alert(1)">related</a><script>bad()</script>',
        content_en: '<img src="x" onerror="alert(1)"><p>English lesson</p>',
      }],
    } as Parameters<typeof normalizePharmacySeedData>[0];

    const normalized = normalizePharmacySeedData(fixture).PHARMACY_SEED_DOCUMENTS[0];

    expect(normalized.id).toBe("doc-synthetic-import");
    expect(normalized.content_html).toContain("Safe lesson");
    expect(normalized.content_html).toContain('data-doc-link="doc-synthetic-import"');
    expect(normalized.content_html).not.toMatch(/<script|javascript:/i);
    expect(normalized.content_en).toContain("English lesson");
    expect(normalized.content_en).not.toMatch(/onerror/i);
    expect(normalized.source_url).toBe(PHARMACY_SEED_DOCUMENTS[0].source_url);
  });

  it("rejects seed provenance links that are missing or unsafe", () => {
    const fixture = {
      PHARMACY_SEED_DOCUMENTS: [{
        ...PHARMACY_SEED_DOCUMENTS[0],
        id: "doc-synthetic-import",
        source_url: "javascript:alert(1)",
      }],
    } as Parameters<typeof normalizePharmacySeedData>[0];

    expect(() => normalizePharmacySeedData(fixture)).toThrow(/source URL is missing or invalid/i);
  });

  it("imports missing rows and verifies them on the server", async () => {
    const result = await importPharmacyKnowledge(userId);
    expect(result).toMatchObject({
      foldersCount: PHARMACY_SEED_FOLDERS.length,
      docsCount: PHARMACY_SEED_DOCUMENTS.length,
      cardsCount: PHARMACY_SEED_CARDS.length,
    });
    expect(result.status).toMatchObject({ foldersMissing: 0, docsMissing: 0, cardsMissing: 0 });
    expect(remote.knowledge_documents.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
    expect((await cacheGet<unknown[]>(getDocsCacheKey(userId)))?.length).toBe(PHARMACY_SEED_DOCUMENTS.length);
    const importedExample = remote.knowledge_documents.get(PHARMACY_SEED_DOCUMENTS[0].id);
    expect(importedExample?.content_html).toBe(sanitizeKnowledgeHtml(PHARMACY_SEED_DOCUMENTS[0].content_html));
    expect(importedExample?.content_en).toBe(sanitizeKnowledgeHtml(PHARMACY_SEED_DOCUMENTS[0].content_en || ""));
    expect(await isPharmacyImported(userId)).toBe(true);
  }, 15_000);

  it("adds sourced Ural and Hiprex safety corrections without mutating IDs, links, provenance, or review status", () => {
    const original = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-disease-uti_cystitis")!;
    const linkedIds = [...original.content_html.matchAll(/data-doc-link="([^"]+)"/g)].map((match) => match[1]);
    const linkedEnglishIds = [...(original.content_en || "").matchAll(/data-doc-link="([^"]+)"/g)].map((match) => match[1]);
    const result = applyPharmacyClinicalEditorialOverrides({ PHARMACY_SEED_DOCUMENTS: [original] });
    const corrected = result.PHARMACY_SEED_DOCUMENTS[0];

    expect(corrected.id).toBe(original.id);
    expect(corrected.folder_id).toBe(original.folder_id);
    expect(corrected.source_url).toBe(original.source_url);
    expect(corrected.tags).toEqual(original.tags);
    expect(corrected.content_review_status).toBe("unreviewed");
    expect(original.content_html).toContain("First-line OTC Pharmacotherapy");
    expect(corrected.content_html).not.toContain("First-line OTC Pharmacotherapy");
    expect(corrected.content_html).not.toContain("within 30 minutes");
    expect(corrected.content_html).toContain("اثربخشی این فرآورده‌ها برای تسکین علامتی UTI ثابت نشده است");
    expect(corrected.content_en).toContain("Symptomatic relief only (not first-line UTI treatment)");
    expect(corrected.content_en).toContain("efficacy for symptomatic UTI relief has not been established");
    expect(corrected.content_html).toContain("Hiprex (methenamine hippurate)");
    expect(corrected.content_en).toContain("that indication alone does not establish it as treatment for acute cystitis or as a first-line option");
    expect(corrected.content_html).toContain("زیر ۱۲ سال را توصیه نمی‌کند");
    expect(corrected.content_en).toContain("not recommended under 12");
    expect(corrected.content_en).toContain("breast-milk transfer is unknown");
    expect(corrected.content_en).toContain("the linked sources do not state a fixed urine-pH target");
    expect(corrected.content_en).toMatch(/the CMI makes it conditional on urinary pH or clinical response/i);
    expect(`${corrected.content_html}\n${corrected.content_en}`).not.toMatch(
      /Ural Sachets \/ Hiprex \/ Ural Effervescent|Adults >12yo: 1 tablet BD|Child 6-11yo:|Safe in pregnancy|Considered safe in breastfeeding|For UTI PROPHYLAXIS ONLY|requires acidic urine pH|urine pH <5\.5/i,
    );
    expect(corrected.content_html).toContain("hiprex.com.au/product/hiprex-urinary-tract-antibacterial-tab/");
    expect(corrected.content_html).toContain("iachipre11117.pdf");
    expect(corrected.content_html).toContain("healthdirect.gov.au/medicines/brand/");
    expect(corrected.content_html).toContain("practice-standards-uti.pdf");
    expect(corrected.content_en).toContain("PCCM_full.pdf");
    expect([...corrected.content_html.matchAll(/data-doc-link="([^"]+)"/g)].map((match) => match[1]))
      .toEqual(linkedIds);
    expect([...(corrected.content_en || "").matchAll(/data-doc-link="([^"]+)"/g)].map((match) => match[1]))
      .toEqual(linkedEnglishIds);
    expect(sanitizeKnowledgeHtml(corrected.content_html)).toContain("practice-standards-uti.pdf");
    expect(sanitizeKnowledgeHtml(corrected.content_html)).toContain("iachipre11117.pdf");
    expect(sanitizeKnowledgeHtml(corrected.content_en || "")).toContain("hiprex.com.au/product/hiprex-urinary-tract-antibacterial-tab/");
    expect(sanitizeKnowledgeHtml(corrected.content_en)).toContain("protocol-for-management-of-urinary-tract-infections.pdf");
    expect(applyPharmacyClinicalEditorialOverrides({ PHARMACY_SEED_DOCUMENTS: [corrected] }).PHARMACY_SEED_DOCUMENTS[0])
      .toBe(corrected);
  });

  it("offers the UTI correction as a safe upgrade for an unchanged prior full-seed document", async () => {
    for (const folder of PHARMACY_SEED_FOLDERS) {
      remote.knowledge_folders.set(folder.id, { ...folder, user_id: userId });
    }
    const original = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === "doc-disease-uti_cystitis")!;
    for (const document of PHARMACY_SEED_DOCUMENTS) {
      remote.knowledge_documents.set(document.id, {
        ...document,
        user_id: userId,
        ...(document.id === original.id ? {} : { content_html: `${document.content_html}<p>Personal test edit</p>` }),
      });
    }
    remote.knowledge_documents.set(original.id, { ...original, user_id: userId, read_count: 9, is_favorite: true });

    expect((await getPharmacyImportStatus(userId)).docsUpgradeable).toBe(1);
    const result = await importPharmacyKnowledge(userId, { importCards: false });
    const updated = remote.knowledge_documents.get(original.id)!;

    expect(result.docsUpdated).toBe(1);
    expect(String(updated.content_html)).toContain("یادداشت ایمنی و حوزه‌ای");
    expect(String(updated.content_html)).toContain("practice-standards-uti.pdf");
    expect(String(updated.content_en)).toContain("Symptomatic relief only (not first-line UTI treatment)");
    expect(updated.content_review_status).toBe("unreviewed");
    expect(updated.read_count).toBe(9);
    expect(updated.is_favorite).toBe(true);
    expect(result.status.docsUpgradeable).toBe(0);
  }, 15_000);

  it("refreshes only unchanged historical pseudoephedrine lessons and preserves personal state", async () => {
    for (const folder of PHARMACY_SEED_FOLDERS) {
      remote.knowledge_folders.set(folder.id, { ...folder, user_id: userId });
    }
    for (const document of PHARMACY_SEED_DOCUMENTS) {
      remote.knowledge_documents.set(document.id, { ...document, user_id: userId });
    }
    for (const card of PHARMACY_SEED_CARDS) {
      remote.leitner_cards.set(card.id, { ...card, user_id: userId });
    }

    const exactBaseline = PHARMACY_SEED_UPGRADE_DOCUMENT_BASELINES.find(
      (item) => item.id === "doc-scenario-clinical-s3-pseudoephedrine",
    )!;
    const manuallyEditedBaseline = PHARMACY_SEED_UPGRADE_DOCUMENT_BASELINES.find(
      (item) => item.id === "doc-scenario-clinical-s3-pseudoephedrine-conflict",
    )!;
    const effectiveSeed = normalizePharmacySeedData(await import("./pharmacySeedData"));
    const current = effectiveSeed.PHARMACY_SEED_DOCUMENTS.find((item) => item.id === exactBaseline.id)!;
    remote.knowledge_documents.set(exactBaseline.id, {
      ...exactBaseline, user_id: userId, read_count: 9, is_favorite: true,
    });
    remote.knowledge_documents.set(manuallyEditedBaseline.id, {
      ...manuallyEditedBaseline,
      user_id: userId,
      content_html: `${manuallyEditedBaseline.content_html}<p>Personal study note</p>`,
    });

    expect((await getPharmacyImportStatus(userId)).docsUpgradeable).toBeGreaterThanOrEqual(1);
    const result = await importPharmacyKnowledge(userId);

    const refreshed = remote.knowledge_documents.get(exactBaseline.id)!;
    const preserved = remote.knowledge_documents.get(manuallyEditedBaseline.id)!;
    expect(result.docsUpdated).toBeGreaterThanOrEqual(1);
    expect(refreshed.content_html).toBe(current.content_html);
    expect(refreshed.content_en).toBe(current.content_en);
    expect(refreshed.read_count).toBe(9);
    expect(refreshed.is_favorite).toBe(true);
    expect(String(preserved.content_html)).toContain("Personal study note");
    expect(result.status.docsUpgradeable).toBe(0);
  }, 15_000);

  it("refreshes an unchanged historical Leitner card without resetting review progress", async () => {
    for (const folder of PHARMACY_SEED_FOLDERS) {
      remote.knowledge_folders.set(folder.id, { ...folder, user_id: userId });
    }
    for (const document of PHARMACY_SEED_DOCUMENTS) {
      remote.knowledge_documents.set(document.id, { ...document, user_id: userId });
    }
    for (const card of PHARMACY_SEED_CARDS) {
      remote.leitner_cards.set(card.id, { ...card, user_id: userId });
    }

    const baseline = PHARMACY_SEED_UPGRADE_CARD_BASELINES.find(
      (item) => item.id === "card-pharmacy-sample-card-s3-pseudoephedrine",
    )!;
    const current = PHARMACY_SEED_CARDS.find((item) => item.id === baseline.id)!;
    const nextReviewAt = "2026-10-12T09:30:00.000Z";
    remote.leitner_cards.set(baseline.id, {
      ...baseline,
      user_id: userId,
      box: 4,
      review_count: 17,
      lapse_count: 3,
      next_review_at: nextReviewAt,
      last_reviewed_at: "2026-09-24T09:30:00.000Z",
      fsrs_state: {
        due: nextReviewAt, stability: 18, difficulty: 4, elapsed_days: 2,
        scheduled_days: 18, learning_steps: 0, reps: 17, lapses: 3, state: 2,
        last_review: "2026-09-24T09:30:00.000Z",
      },
    });

    expect((await getPharmacyImportStatus(userId)).cardsUpgradeable).toBe(1);
    const result = await importPharmacyKnowledge(userId);
    const refreshed = remote.leitner_cards.get(baseline.id)!;

    expect(result.cardsUpdated).toBe(1);
    expect(refreshed.front).toBe(current.front);
    expect(refreshed.back).toBe(current.back);
    expect(refreshed.box).toBe(4);
    expect(refreshed.review_count).toBe(17);
    expect(refreshed.lapse_count).toBe(3);
    expect(refreshed.next_review_at).toBe(nextReviewAt);
    expect(refreshed.last_reviewed_at).toBe("2026-09-24T09:30:00.000Z");
    expect(refreshed.fsrs_state).toMatchObject({ stability: 18, reps: 17, lapses: 3 });
    expect(result.status.cardsUpgradeable).toBe(0);
  }, 15_000);

  it("does not overwrite a manually edited historical Leitner card", async () => {
    const baseline = PHARMACY_SEED_UPGRADE_CARD_BASELINES.find(
      (item) => item.id === "card-pharmacy-sample-card-s3-pseudoephedrine",
    )!;
    remote.leitner_cards.set(baseline.id, {
      ...baseline,
      user_id: userId,
      back: `${baseline.back} Personal card note.`,
      box: 3,
      review_count: 8,
    });

    expect((await getPharmacyImportStatus(userId)).cardsUpgradeable).toBe(0);
    await importPharmacyKnowledge(userId);
    const preserved = remote.leitner_cards.get(baseline.id)!;
    expect(String(preserved.back)).toContain("Personal card note.");
    expect(preserved.box).toBe(3);
    expect(preserved.review_count).toBe(8);
  }, 15_000);

  it("safely upgrades an unchanged legacy UTI record with the current sourced correction", async () => {
    for (const folder of PHARMACY_SEED_FOLDERS) {
      remote.knowledge_folders.set(folder.id, { ...folder, user_id: userId });
    }
    const legacyUti = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-uti_cystitis")!;
    const currentUti = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === legacyUti.id)!;
    for (const document of PHARMACY_SEED_DOCUMENTS) {
      remote.knowledge_documents.set(document.id, document.id === legacyUti.id
        ? { ...legacyUti, user_id: userId, read_count: 14, is_favorite: true }
        : { ...document, user_id: userId, content_html: `${document.content_html}<p>Personal test edit</p>` });
    }

    expect((await getPharmacyImportStatus(userId)).docsUpgradeable).toBe(1);
    const result = await importPharmacyKnowledge(userId, { importCards: false });
    const upgraded = remote.knowledge_documents.get(legacyUti.id)!;

    expect(result.docsUpdated).toBe(1);
    expect(upgraded.id).toBe(legacyUti.id);
    expect(upgraded.folder_id).toBe(currentUti.folder_id);
    expect(upgraded.source_url).toBe(currentUti.source_url);
    expect(upgraded.content_review_status).toBe("unreviewed");
    expect(String(upgraded.content_html)).toContain("یادداشت ایمنی و حوزه‌ای");
    expect(String(upgraded.content_html)).toContain("iachipre11117.pdf");
    expect(String(upgraded.content_en)).toContain("not recommended under 12");
    expect(String(upgraded.content_en)).not.toContain("Child 6-11yo:");
    expect(upgraded.read_count).toBe(14);
    expect(upgraded.is_favorite).toBe(true);
    expect(result.status.docsUpgradeable).toBe(0);
  }, 15_000);

  it("preserves existing edits and review progress even when force is requested", async () => {
    const doc = { ...PHARMACY_SEED_DOCUMENTS[0], user_id: userId, title: "My edited title" };
    const card = { ...PHARMACY_SEED_CARDS[0], user_id: userId, box: 5, review_count: 19 };
    remote.knowledge_documents.set(doc.id, doc);
    remote.leitner_cards.set(card.id, card);
    const result = await importPharmacyKnowledge(userId, { force: true });
    expect(result.docsCount).toBe(PHARMACY_SEED_DOCUMENTS.length - 1);
    expect(result.cardsCount).toBe(PHARMACY_SEED_CARDS.length - 1);
    expect(remote.knowledge_documents.get(doc.id)?.title).toBe("My edited title");
    expect(remote.leitner_cards.get(card.id)?.box).toBe(5);
    expect(remote.leitner_cards.get(card.id)?.review_count).toBe(19);
    const second = await importPharmacyKnowledge(userId);
    expect(second).toMatchObject({ foldersCount: 0, docsCount: 0, cardsCount: 0 });
  }, 15_000);

  it("does not resurrect a stale cached copy when the server lacks that ID", async () => {
    const local = { ...PHARMACY_SEED_DOCUMENTS[0], user_id: userId, title: "Saved offline edit" };
    await cacheSet(getDocsCacheKey(userId), [local]);
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(local.id)?.title).toBe(PHARMACY_SEED_DOCUMENTS[0].title);
    expect((await cacheGet<typeof local[]>(getDocsCacheKey(userId)))?.find((doc) => doc.id === local.id)?.title)
      .toBe(PHARMACY_SEED_DOCUMENTS[0].title);
  }, 15_000);

  it("stops before writing when this user's knowledge changes are pending offline", async () => {
    vi.mocked(getPendingOps).mockResolvedValue([{
      table: "knowledge_documents", op: "update", ownerId: userId,
      payload: { id: PHARMACY_SEED_DOCUMENTS[0].id, title: "Pending edit" },
      createdAt: 1, attempts: 0,
    }]);
    await expect(importPharmacyKnowledge(userId)).rejects.toThrow(/Sync pending knowledge changes/);
    expect(remote.knowledge_folders.size).toBe(0);
    expect(remote.knowledge_documents.size).toBe(0);
  });

  it("refreshes only an unchanged legacy document and retains personal reading state", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    const next = PHARMACY_SEED_DOCUMENTS.find((item) => item.id === old.id)!;
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, read_count: 12, is_favorite: true });
    expect((await getPharmacyImportStatus(userId)).docsUpgradeable).toBeGreaterThan(0);
    const result = await importPharmacyKnowledge(userId);
    expect(result.docsUpdated).toBeGreaterThan(0);
    expect(remote.knowledge_documents.get(old.id)?.content_html).toBe(next.content_html);
    expect(remote.knowledge_documents.get(old.id)?.read_count).toBe(12);
    expect(remote.knowledge_documents.get(old.id)?.is_favorite).toBe(true);
  }, 15_000);

  it("does not replace a legacy document whose authored content was edited", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, content_html: `${old.content_html}<p>My note</p>` });
    await importPharmacyKnowledge(userId);
    expect(String(remote.knowledge_documents.get(old.id)?.content_html)).toContain("My note");
  }, 15_000);

  it("preserves a custom source link on a legacy document", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    const personalSource = "https://example.com/my-clinical-reference";
    remote.knowledge_documents.set(old.id, { ...old, user_id: userId, source_url: personalSource });
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(old.id)?.source_url).toBe(personalSource);
  }, 15_000);

  it("preserves the manual content-review status and evidence on a legacy document", async () => {
    const old = LEGACY_DOCUMENTS.find((item) => item.id === "doc-disease-eczema")!;
    const reviewEvidence = {
      reviewer_role: "Registered pharmacist",
      jurisdiction: "NSW, Australia",
      scope: "Clinical content",
      reviewed_at: "2026-09-20",
      references: [{
        title: "Example test reference",
        url: "https://example.org/clinical-reference",
        accessed_at: "2026-09-19",
      }],
    };
    remote.knowledge_documents.set(old.id, {
      ...old,
      user_id: userId,
      content_review_status: "reviewed",
      content_review_evidence: reviewEvidence,
    });
    await importPharmacyKnowledge(userId);
    expect(remote.knowledge_documents.get(old.id)?.content_review_status).toBe("reviewed");
    expect(remote.knowledge_documents.get(old.id)?.content_review_evidence).toEqual(reviewEvidence);
  }, 15_000);

  it("fails visibly on partial server writes and safely resumes", async () => {
    remote.failId = PHARMACY_SEED_DOCUMENTS[0].id;
    await expect(importPharmacyKnowledge(userId)).rejects.toThrow(/Could not save knowledge_documents/);
    expect(remote.knowledge_documents.size).toBeLessThan(PHARMACY_SEED_DOCUMENTS.length);
    remote.failId = "";
    const resumed = await importPharmacyKnowledge(userId);
    expect(resumed.status.docsMissing).toBe(0);
    expect(remote.knowledge_documents.size).toBe(PHARMACY_SEED_DOCUMENTS.length);
  // This recovery fixture writes hundreds of seed rows across two import attempts.
  }, 45_000);

  it("does not mistake a cache-only import for confirmed server data", () => {
    const status = comparePharmacySeed(
      { PHARMACY_SEED_FOLDERS, PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_CARDS, PHARMACY_ROOT_FOLDER_ID },
      { folders: [], documents: [], cards: [] },
    );
    expect(status.docsMissing).toBe(PHARMACY_SEED_DOCUMENTS.length);
  });
});
