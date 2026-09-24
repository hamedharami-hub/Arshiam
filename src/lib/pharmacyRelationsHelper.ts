import type { KnowledgeDocument } from "./knowledgeTypes";

export type ClinicalEntityType = "product" | "disease" | "scenario" | "pharmacology" | "regulation" | "general";

export interface ConnectedEntity {
  id: string;
  title: string;
  titleEn?: string;
  categoryFa?: string;
  categoryEn?: string;
  type: ClinicalEntityType;
  badgeFa: string;
  badgeEn: string;
  colorClass: string;
  subtitle?: string;
}

export interface DocumentRelationsGroup {
  products: ConnectedEntity[];
  diseases: ConnectedEntity[];
  scenarios: ConnectedEntity[];
  pharmacology: ConnectedEntity[];
  regulations: ConnectedEntity[];
  totalCount: number;
}

/**
 * Categorize a document by its folder and tags into a clinical entity type
 */
export function getClinicalEntityType(
  doc: KnowledgeDocument
): ConnectedEntity["type"] {
  const folder = doc.folder_id || "";
  const id = doc.id || "";
  const tags = doc.tags || [];

  if (
    (folder.startsWith("folder-mono-") || folder === "folder-pharmacy-cat-monographs") &&
    folder !== "folder-mono-cal" &&
    folder !== "folder-mono-storage"
  ) {
    return "product";
  }
  if (
    id.startsWith("doc-product-") ||
    id.startsWith("doc-mono-") ||
    tags.includes("OTC Monograph")
  ) {
    return "product";
  }

  if (
    folder.startsWith("folder-clinical-") ||
    id.startsWith("doc-disease-") ||
    tags.includes("Clinical Atlas")
  ) {
    return "disease";
  }

  if (
    folder.startsWith("folder-cases-") ||
    id.startsWith("doc-scenario-") ||
    id.startsWith("doc-script-") ||
    tags.includes("Clinical Triage")
  ) {
    return "scenario";
  }

  if (
    folder.startsWith("folder-pharm-") ||
    id.startsWith("doc-cyp-") ||
    id.startsWith("doc-mech-") ||
    id.startsWith("doc-mechanism-") ||
    id.startsWith("doc-concept-") ||
    tags.includes("Pharmacology")
  ) {
    return "pharmacology";
  }

  if (
    folder === "folder-mono-cal" ||
    folder === "folder-mono-storage" ||
    id.startsWith("doc-cal-") ||
    id.startsWith("doc-storage-") ||
    tags.includes("CAL Labels") ||
    tags.includes("Storage Law")
  ) {
    return "regulation";
  }

  return "general";
}

/**
 * Returns badge and color for each clinical entity type
 */
function getEntityBadgeAndColor(doc: KnowledgeDocument, type: ConnectedEntity["type"]) {
  const tags = doc.tags || [];
  const scheduleTag = tags.find((t) => t.startsWith("Schedule S") || t === "Unscheduled");

  switch (type) {
    case "product":
      return {
        badgeFa: scheduleTag ? `فرآورده ${scheduleTag}` : "دارو / فرآورده",
        badgeEn: scheduleTag || "Medicine",
        colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      };
    case "disease":
      return {
        badgeFa: "بیماری و گایدلاین",
        badgeEn: "Disease Guide",
        colorClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
      };
    case "scenario":
      return {
        badgeFa: "تریاژ و مکالمه بیمار",
        badgeEn: "Triage Case",
        colorClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
      };
    case "pharmacology":
      return {
        badgeFa: "فارماکولوژی / آنزیم",
        badgeEn: "Pharmacology",
        colorClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
      };
    case "regulation":
      return {
        badgeFa: "برچسب و قوانین",
        badgeEn: "Regulation / CAL",
        colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
      };
    default:
      return {
        badgeFa: "مطلب مرتبط",
        badgeEn: "Related",
        colorClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

/**
 * Scans a document for explicitly linked target IDs via `data-doc-link="..."` or `href="#doc-..."`
 */
export function extractExplicitDocumentLinks(html: string): string[] {
  if (!html) return [];
  const ids = new Set<string>();
  const dataMatches = html.matchAll(/data-doc-link=["']([^"']+)["']/g);
  for (const m of dataMatches) {
    if (m[1]) ids.add(m[1]);
  }
  const hrefMatches = html.matchAll(/href=["']#(doc-[^"']+)["']/g);
  for (const m of hrefMatches) {
    if (m[1]) ids.add(m[1]);
  }
  return Array.from(ids);
}

/**
 * Computes all forward and backward clinical links for a document
 */
export function getConnectedClinicalEntities(
  currentDoc: KnowledgeDocument | null,
  allDocuments: KnowledgeDocument[]
): DocumentRelationsGroup {
  if (!currentDoc || !allDocuments || allDocuments.length === 0) {
    return {
      products: [],
      diseases: [],
      scenarios: [],
      pharmacology: [],
      regulations: [],
      totalCount: 0,
    };
  }

  const docMap = new Map<string, KnowledgeDocument>();
  for (const d of allDocuments) {
    docMap.set(d.id, d);
  }

  const connectedIds = new Set<string>();

  // 1. Forward links: IDs explicitly mentioned in current doc HTML
  const forwardLinks = extractExplicitDocumentLinks(
    `${currentDoc.content_html || ""} ${currentDoc.content_en || ""}`
  );
  for (const id of forwardLinks) {
    if (id !== currentDoc.id && docMap.has(id)) {
      connectedIds.add(id);
    }
  }

  // 2. Backward links: other documents that reference currentDoc.id
  const targetToken = `data-doc-link="${currentDoc.id}"`;
  const targetTokenSingle = `data-doc-link='${currentDoc.id}'`;
  for (const otherDoc of allDocuments) {
    if (otherDoc.id === currentDoc.id) continue;
    const content = `${otherDoc.content_html || ""} ${otherDoc.content_en || ""}`;
    if (content.includes(targetToken) || content.includes(targetTokenSingle)) {
      connectedIds.add(otherDoc.id);
    }
  }

  // 3. Convert IDs to ConnectedEntity objects
  const products: ConnectedEntity[] = [];
  const diseases: ConnectedEntity[] = [];
  const scenarios: ConnectedEntity[] = [];
  const pharmacology: ConnectedEntity[] = [];
  const regulations: ConnectedEntity[] = [];

  for (const id of connectedIds) {
    const targetDoc = docMap.get(id);
    if (!targetDoc) continue;

    const entityType = getClinicalEntityType(targetDoc);
    const { badgeFa, badgeEn, colorClass } = getEntityBadgeAndColor(targetDoc, entityType);

    const entity: ConnectedEntity = {
      id: targetDoc.id,
      title: targetDoc.title,
      titleEn: targetDoc.title_en,
      type: entityType,
      badgeFa,
      badgeEn,
      colorClass,
      subtitle: targetDoc.tags?.slice(0, 2).join(" • "),
    };

    switch (entityType) {
      case "product":
        products.push(entity);
        break;
      case "disease":
        diseases.push(entity);
        break;
      case "scenario":
        scenarios.push(entity);
        break;
      case "pharmacology":
        pharmacology.push(entity);
        break;
      case "regulation":
        regulations.push(entity);
        break;
      default:
        // Group general under pharmacology or diseases as fallback
        diseases.push(entity);
        break;
    }
  }

  const totalCount =
    products.length +
    diseases.length +
    scenarios.length +
    pharmacology.length +
    regulations.length;

  return {
    products,
    diseases,
    scenarios,
    pharmacology,
    regulations,
    totalCount,
  };
}
