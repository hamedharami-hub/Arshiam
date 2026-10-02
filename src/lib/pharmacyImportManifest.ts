import type { KnowledgeDocument, KnowledgeFolder } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";
import {
  PHARMACY_CLINICAL_RELATIONS,
  PHARMACY_CLINICAL_SOURCE_COMMIT,
} from "./pharmacyClinicalGraph.generated";

export interface PharmacyImportManifestEntry {
  source_id: string;
  source_paths: string[];
  destination_id: string;
  seed_content_sha256: string;
  destination_content_sha256: string;
  matches_seed: boolean;
  related_document_id: string | null;
}

export interface PharmacyImportManifest {
  id: string;
  user_id: string;
  schema_version: 1;
  source_repository: string;
  source_commit_sha: string;
  source_snapshot_sha256: string;
  relations_sha256: string;
  imported_at: string;
  includes_cards: boolean;
  folders: PharmacyImportManifestEntry[];
  documents: PharmacyImportManifestEntry[];
  cards: PharmacyImportManifestEntry[];
}

interface PharmacyManifestSnapshot {
  folders: KnowledgeFolder[];
  documents: KnowledgeDocument[];
  cards: LeitnerCard[];
}

type PharmacySeedData = typeof import("./pharmacySeedData");

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure SHA-256 hashing is unavailable; Pharmacy import provenance was not recorded.");
  }
  const bytes = new TextEncoder().encode(stableJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function documentSnapshot(document: KnowledgeDocument) {
  return {
    id: document.id,
    folder_id: document.folder_id ?? null,
    title: document.title,
    title_en: document.title_en ?? null,
    content_html: document.content_html ?? "",
    content_en: document.content_en ?? null,
    preferred_language: document.preferred_language ?? null,
    direction: document.direction ?? null,
    tags: document.tags ?? [],
    source_url: document.source_url ?? null,
  };
}

function folderSnapshot(folder: KnowledgeFolder) {
  return {
    id: folder.id,
    parent_id: folder.parent_id ?? null,
    name: folder.name,
    icon: folder.icon ?? null,
    color: folder.color ?? null,
    position: folder.position ?? null,
  };
}

function cardSnapshot(card: LeitnerCard) {
  return {
    id: card.id,
    document_id: card.document_id ?? null,
    folder_id: card.folder_id ?? null,
    front: card.front,
    back: card.back,
    front_fa: card.front_fa ?? null,
    back_fa: card.back_fa ?? null,
    front_en: card.front_en ?? null,
    back_en: card.back_en ?? null,
    clue: card.clue ?? null,
  };
}

function parseSource(sourceUrl: string | undefined): { repository: string; commit: string; path: string } {
  const match = sourceUrl?.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([a-f0-9]{40})\/(.+)$/);
  if (!match) throw new Error("A Pharmacy source URL is missing a canonical GitHub commit and path.");
  return { repository: `https://github.com/${match[1]}`, commit: match[2], path: match[3] };
}

export async function buildPharmacyImportManifest(
  userId: string,
  seed: PharmacySeedData,
  remote: PharmacyManifestSnapshot,
  importedAt: string,
  includesCards = true,
): Promise<PharmacyImportManifest> {
  const parsedSources = seed.PHARMACY_SEED_DOCUMENTS.map((document) => parseSource(document.source_url));
  const repositories = new Set(parsedSources.map((source) => source.repository));
  const commits = new Set(parsedSources.map((source) => source.commit));
  if (repositories.size !== 1 || commits.size !== 1 || commits.has("")) {
    throw new Error("Pharmacy seed documents must share one canonical repository and commit.");
  }
  const sourceCommit = [...commits][0];
  if (sourceCommit !== PHARMACY_CLINICAL_SOURCE_COMMIT) {
    throw new Error("Pharmacy seed documents and clinical graph use different source commits.");
  }

  const remoteFolders = new Map(remote.folders.map((item) => [item.id, item]));
  const remoteDocuments = new Map(remote.documents.map((item) => [item.id, item]));
  const remoteCards = new Map(remote.cards.map((item) => [item.id, item]));
  const sourcePathByDocumentId = new Map(seed.PHARMACY_SEED_DOCUMENTS.map((document) => [
    document.id,
    parseSource(document.source_url).path,
  ]));

  const folders = await Promise.all(seed.PHARMACY_SEED_FOLDERS.map(async (source) => {
    const destination = remoteFolders.get(source.id);
    if (!destination) throw new Error(`Cannot create import manifest: folder ${source.id} is missing remotely.`);
    const seedContent = folderSnapshot(source);
    const destinationContent = folderSnapshot(destination);
    const seedHash = await sha256(seedContent);
    const destinationHash = await sha256(destinationContent);
    return {
      source_id: source.id,
      source_paths: [...new Set(seed.PHARMACY_SEED_DOCUMENTS
        .filter((document) => document.folder_id === source.id)
        .map((document) => sourcePathByDocumentId.get(document.id)!)
        .filter(Boolean))].sort(),
      destination_id: destination.id,
      seed_content_sha256: seedHash,
      destination_content_sha256: destinationHash,
      matches_seed: seedHash === destinationHash,
      related_document_id: null,
    };
  }));

  const documents = await Promise.all(seed.PHARMACY_SEED_DOCUMENTS.map(async (source) => {
    const destination = remoteDocuments.get(source.id);
    if (!destination) throw new Error(`Cannot create import manifest: document ${source.id} is missing remotely.`);
    const sourceMeta = parseSource(source.source_url);
    const seedContent = documentSnapshot(source);
    const destinationContent = documentSnapshot(destination);
    const seedHash = await sha256(seedContent);
    const destinationHash = await sha256(destinationContent);
    return {
      source_id: source.id,
      source_paths: [sourceMeta.path],
      destination_id: destination.id,
      seed_content_sha256: seedHash,
      destination_content_sha256: destinationHash,
      matches_seed: seedHash === destinationHash,
      related_document_id: null,
    };
  }));

  const cards = includesCards
    ? await Promise.all(seed.PHARMACY_SEED_CARDS.map(async (source) => {
      const destination = remoteCards.get(source.id);
      if (!destination) throw new Error(`Cannot create import manifest: card ${source.id} is missing remotely.`);
      const seedContent = cardSnapshot(source);
      const destinationContent = cardSnapshot(destination);
      const seedHash = await sha256(seedContent);
      const destinationHash = await sha256(destinationContent);
      return {
        source_id: source.id,
        source_paths: source.document_id && sourcePathByDocumentId.has(source.document_id)
          ? [sourcePathByDocumentId.get(source.document_id)!]
          : [],
        destination_id: destination.id,
        seed_content_sha256: seedHash,
        destination_content_sha256: destinationHash,
        matches_seed: seedHash === destinationHash,
        related_document_id: destination.document_id ?? null,
      };
    }))
    : [];

  const relationsHash = await sha256(PHARMACY_CLINICAL_RELATIONS);
  const sourceSnapshotHash = await sha256({
    source_commit_sha: sourceCommit,
    includes_cards: includesCards,
    folders: folders.map(({ source_id, source_paths, seed_content_sha256 }) => ({ source_id, source_paths, seed_content_sha256 })),
    documents: documents.map(({ source_id, source_paths, seed_content_sha256 }) => ({ source_id, source_paths, seed_content_sha256 })),
    cards: cards.map(({ source_id, source_paths, seed_content_sha256, related_document_id }) => ({ source_id, source_paths, seed_content_sha256, related_document_id })),
    relations_sha256: relationsHash,
  });

  const manifest: PharmacyImportManifest = {
    id: `pharmacy-${sourceCommit}-${sourceSnapshotHash.slice(0, 16)}-${includesCards ? "with-cards" : "docs-only"}`,
    user_id: userId,
    schema_version: 1,
    source_repository: [...repositories][0],
    source_commit_sha: sourceCommit,
    source_snapshot_sha256: sourceSnapshotHash,
    relations_sha256: relationsHash,
    imported_at: importedAt,
    includes_cards: includesCards,
    folders,
    documents,
    cards,
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest)).byteLength;
  if (manifestBytes > 700 * 1024) {
    throw new Error("Pharmacy import provenance exceeds the safe Firestore document size; no manifest was saved.");
  }
  return manifest;
}
