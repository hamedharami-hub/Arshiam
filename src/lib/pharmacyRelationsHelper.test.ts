import { describe, it, expect } from "vitest";
import {
  getClinicalEntityType,
  extractExplicitDocumentLinks,
  getConnectedClinicalEntities,
  type ClinicalEntityType,
} from "./pharmacyRelationsHelper";
import type { KnowledgeDocument } from "./knowledgeTypes";
import {
  PHARMACY_CLINICAL_ENTITIES,
  PHARMACY_CLINICAL_RELATIONS,
  PHARMACY_CLINICAL_SOURCE_COMMIT,
} from "./pharmacyClinicalGraph.generated";

describe("pharmacyRelationsHelper", () => {
  const mockDoc = (partial: Partial<KnowledgeDocument>): KnowledgeDocument => ({
    id: partial.id || "doc-1",
    user_id: "u-1",
    folder_id: partial.folder_id || null,
    title: partial.title || "Sample Title",
    title_en: partial.title_en || "Sample Title EN",
    content_html: partial.content_html || "",
    content_en: partial.content_en || "",
    preferred_language: "bilingual",
    direction: "rtl",
    tags: partial.tags || [],
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
  });

  describe("getClinicalEntityType", () => {
    it("identifies product documents", () => {
      expect(getClinicalEntityType(mockDoc({ id: "doc-product-panadol" }))).toBe("product");
      expect(getClinicalEntityType(mockDoc({ id: "doc-mono-nurofen" }))).toBe("product");
      expect(getClinicalEntityType(mockDoc({ id: "doc-custom", folder_id: "folder-pharmacy-cat-monographs" }))).toBe("product");
    });

    it("identifies disease documents", () => {
      expect(getClinicalEntityType(mockDoc({ id: "doc-disease-asthma" }))).toBe("disease");
      expect(getClinicalEntityType(mockDoc({ id: "doc-custom", folder_id: "folder-clinical-resp" }))).toBe("disease");
    });

    it("identifies scenario documents", () => {
      expect(getClinicalEntityType(mockDoc({ id: "doc-scenario-dry-cough" }))).toBe("scenario");
      expect(getClinicalEntityType(mockDoc({ id: "doc-script-s8" }))).toBe("scenario");
      expect(getClinicalEntityType(mockDoc({ id: "doc-custom", folder_id: "folder-cases-clinical" }))).toBe("scenario");
    });

    it("identifies pharmacology documents", () => {
      expect(getClinicalEntityType(mockDoc({ id: "doc-cyp-cyp2d6" }))).toBe("pharmacology");
      expect(getClinicalEntityType(mockDoc({ id: "doc-mech-nsaid" }))).toBe("pharmacology");
      expect(getClinicalEntityType(mockDoc({ id: "doc-concept-qt-prolongation" }))).toBe("pharmacology");
      expect(getClinicalEntityType(mockDoc({ id: "doc-custom", folder_id: "folder-pharm-cyp" }))).toBe("pharmacology");
    });

    it("identifies regulation documents", () => {
      expect(getClinicalEntityType(mockDoc({ id: "doc-cal-label-1" }))).toBe("regulation");
      expect(getClinicalEntityType(mockDoc({ id: "doc-storage-nsw" }))).toBe("regulation");
      expect(getClinicalEntityType(mockDoc({ id: "doc-custom", folder_id: "folder-mono-cal" }))).toBe("regulation");
    });

    it("does not label clinical domain guides as product monographs", () => {
      expect(getClinicalEntityType(mockDoc({ id: "doc-clinical-domain-cat-1", folder_id: "folder-mono-domains" }))).toBe("general");
    });
  });

  describe("extractExplicitDocumentLinks", () => {
    it("extracts data-doc-link attributes from HTML content", () => {
      const html = `
        <p>برای درمان به <button data-doc-link="doc-product-panadol">پانادول</button> مراجعه کنید.</p>
        <div data-doc-link="doc-disease-pain">درد</div>
        <a href="#doc-cyp-cyp3a4">آنزیم CYP3A4</a>
      `;
      const links = extractExplicitDocumentLinks(html);
      expect(links).toContain("doc-product-panadol");
      expect(links).toContain("doc-disease-pain");
      expect(links).toContain("doc-cyp-cyp3a4");
      expect(links.length).toBe(3);
    });

    it("handles empty or null html strings gracefully", () => {
      expect(extractExplicitDocumentLinks("")).toEqual([]);
    });

    it("deduplicates identical doc links", () => {
      const html = `
        <span data-doc-link="doc-product-panadol">پانادول</span>
        <span data-doc-link="doc-product-panadol">Panadol 500mg</span>
      `;
      const links = extractExplicitDocumentLinks(html);
      expect(links).toEqual(["doc-product-panadol"]);
    });
  });

  describe("getConnectedClinicalEntities", () => {
    it("keeps source relation confidence and provenance for mapped documents", () => {
      const asthma = mockDoc({
        id: "doc-core-disease-dis-asthma",
        title: "آسم و اسپاسم برونش",
        title_en: "Asthma & Bronchospasm",
        folder_id: "folder-clinical-core",
      });
      const ventolin = mockDoc({
        id: "doc-product-prod-ventolin-inhaler",
        title: "Ventolin",
        title_en: "Ventolin CFC-Free Inhaler 100mcg",
        folder_id: "folder-mono-respiratory",
      });

      const relations = getConnectedClinicalEntities(asthma, [asthma, ventolin]);
      const linkedProduct = relations.products.find((item) => item.documentId === ventolin.id);

      expect(linkedProduct).toBeDefined();
      expect(linkedProduct?.sourceRelations).toContainEqual(expect.objectContaining({
        type: "has-product",
        confidence: "verified",
        source: "DiseaseInfo.relatedShelfProducts",
        direction: "outgoing",
      }));
    });

    it("preserves active-ingredient graph nodes without inventing a document link", () => {
      const panadol = mockDoc({
        id: "doc-product-prod-panadol-500",
        title: "Panadol 500mg",
        title_en: "Panadol 500mg (Paracetamol)",
        folder_id: "folder-mono-analgesics",
      });

      const relations = getConnectedClinicalEntities(panadol, [panadol]);
      const ingredient = relations.products.find((item) => item.titleEn === "Paracetamol");

      expect(ingredient).toBeDefined();
      expect(ingredient?.documentId).toBeUndefined();
      expect(ingredient?.sourceRelations).toContainEqual(expect.objectContaining({
        type: "has-medicine",
        confidence: "verified",
        source: "Product.genericName canonical identity",
      }));
    });

    it("ships a complete, internally consistent source graph and maps only existing seed documents", () => {
      const entityIds = new Set(PHARMACY_CLINICAL_ENTITIES.map((entity) => entity.id));
      const documentIds = new Set(PHARMACY_CLINICAL_ENTITIES.flatMap((entity) => entity.documentId ? [entity.documentId] : []));
      const relationIds = new Set(PHARMACY_CLINICAL_RELATIONS.map((relation) => relation.id));

      // A Pharmacy source refresh must deliberately regenerate and review this snapshot.
      expect(PHARMACY_CLINICAL_SOURCE_COMMIT).toBe("5b4f7d2443a3ed97aea752c1d0d18583ce6d0067");
      expect(PHARMACY_CLINICAL_ENTITIES).toHaveLength(442);
      expect(PHARMACY_CLINICAL_ENTITIES.filter((entity) => entity.documentId)).toHaveLength(322);
      expect(PHARMACY_CLINICAL_ENTITIES.filter((entity) => !entity.documentId)).toHaveLength(120);
      expect(PHARMACY_CLINICAL_RELATIONS).toHaveLength(546);
      expect(relationIds.size).toBe(PHARMACY_CLINICAL_RELATIONS.length);
      expect(documentIds.size).toBe(PHARMACY_CLINICAL_ENTITIES.filter((entity) => entity.documentId).length);
      expect(PHARMACY_CLINICAL_RELATIONS.every((relation) =>
        entityIds.has(relation.fromId) && entityIds.has(relation.toId),
      )).toBe(true);
      expect(PHARMACY_CLINICAL_RELATIONS.every((relation) =>
        relation.confidence === "verified" || relation.confidence === "suggested",
      )).toBe(true);
      expect(PHARMACY_CLINICAL_ENTITIES.filter((entity) => entity.type === "medicine" && !entity.documentId).length).toBeGreaterThan(0);
    });

    it("constructs bidirectional relations between diseases and products", () => {
      const docDisease = mockDoc({
        id: "doc-disease-headache",
        title: "سردرد و میگرن",
        title_en: "Headache & Migraine",
        folder_id: "folder-clinical-pain",
        content_html: '<p>داروی خط اول: <button data-doc-link="doc-product-panadol">Panadol</button></p>',
      });

      const docProduct = mockDoc({
        id: "doc-product-panadol",
        title: "پانادول (استامینوفن ۵۰۰)",
        title_en: "Panadol 500mg (Paracetamol)",
        folder_id: "folder-mono-analgesics",
        content_html: '<p>اندیکاسیون: مناسب برای تسکین درد و تب</p>',
      });

      const docCyp = mockDoc({
        id: "doc-cyp-cyp2e1",
        title: "آنزیم CYP2E1 و متابولیسم استامینوفن",
        title_en: "CYP2E1 & Paracetamol Metabolism",
        folder_id: "folder-pharm-cyp",
        content_html: '<p>متابولیسم و سمیت با <span data-doc-link="doc-product-panadol">Panadol</span></p>',
      });

      const allDocs = [docDisease, docProduct, docCyp];

      // Test relations from perspective of Product (it should have back-links from Disease and Cyp)
      const productRelations = getConnectedClinicalEntities(docProduct, allDocs);
      expect(productRelations.totalCount).toBe(2);
      expect(productRelations.diseases.length).toBe(1);
      expect(productRelations.diseases[0].id).toBe("doc-disease-headache");
      expect(productRelations.pharmacology.length).toBe(1);
      expect(productRelations.pharmacology[0].id).toBe("doc-cyp-cyp2e1");

      // Test relations from perspective of Disease (it has forward-link to Product)
      const diseaseRelations = getConnectedClinicalEntities(docDisease, allDocs);
      expect(diseaseRelations.totalCount).toBe(1);
      expect(diseaseRelations.products.length).toBe(1);
      expect(diseaseRelations.products[0].id).toBe("doc-product-panadol");
    });
  });
});
