import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import { cacheSet } from "@/lib/offlineQueue";
import { getFoldersCacheKey, getDocsCacheKey } from "@/lib/knowledgeService";
import { PHARMACY_SEED_FOLDERS as F, PHARMACY_SEED_DOCUMENTS as D, PHARMACY_SEED_CARDS as C } from "@/lib/pharmacySeedData";
import { KnowledgeMindMapView } from "@/components/review/KnowledgeMindMapView";
import PharmacyHubView from "@/pages/PharmacyHubView";
import PharmacyFredPracticeView from "@/pages/PharmacyFredPracticeView";
import { LeitnerDeckView } from "@/components/review/LeitnerDeckView";

const q = new URLSearchParams(location.search);
const scale = Number(q.get("scale") ?? "1");
async function main() {
  const f: typeof F = [...F], d: typeof D = [...D], c: typeof C = [...C];
  for (let i = 1; i < scale; i++) {
    f.push(...F.map(x => ({ ...x, id: `${x.id}-x${i}`, parent_id: x.parent_id ? `${x.parent_id}-x${i}` : null })));
    d.push(...D.map(x => ({ ...x, id: `${x.id}-x${i}`, folder_id: x.folder_id ? `${x.folder_id}-x${i}` : x.folder_id })));
    c.push(...C.map(x => ({ ...x, id: `${x.id}-x${i}`, document_id: x.document_id ? `${x.document_id}-x${i}` : x.document_id })));
  }
  await cacheSet(getFoldersCacheKey("bench"), f);
  await cacheSet(getDocsCacheKey("bench"), d);
  await cacheSet(getFoldersCacheKey("anonymous-kb-user"), f);
  await cacheSet(getDocsCacheKey("anonymous-kb-user"), d);
  await cacheSet("leitner_cards:bench", c);
  (window as unknown as { __counts: unknown }).__counts = { folders: f.length, docs: d.length, cards: c.length };
  (window as unknown as { __t0: number }).__t0 = performance.now();
  const view = q.get("view") ?? "mindmap";
  createRoot(document.getElementById("root")!).render(<MemoryRouter>{view === "mindmap" ? <KnowledgeMindMapView userId="bench" isActive cardLanguage="en" /> : view === "pharmacy" ? <PharmacyHubView /> : view === "fred" ? <PharmacyFredPracticeView /> : <LeitnerDeckView userId="bench" />}</MemoryRouter>);
}
void main();
