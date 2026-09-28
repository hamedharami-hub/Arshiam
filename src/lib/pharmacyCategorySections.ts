/** Keep the current Pharmacy taxonomy together while retaining older user folders. */
export const PHARMACY_MAIN_CATEGORY_IDS = [
  "folder-pharmacy-cat-clinical-atlas",
  "folder-pharmacy-cat-pharmacology",
  "folder-pharmacy-cat-monographs",
  "folder-pharmacy-cat-cases-triage",
  "folder-pharmacy-cat-academic-modules",
  "folder-pharmacy-cat-learning",
] as const;

export function splitPharmacyRootFolders<T extends { id: string; name: string; position?: number }>(children: T[]) {
  const byId = new Map(children.map((folder) => [folder.id, folder]));
  const current = PHARMACY_MAIN_CATEGORY_IDS
    .map((id) => byId.get(id))
    .filter((folder): folder is T => Boolean(folder));
  const sortByPosition = (a: T, b: T) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name);

  if (current.length === 0) return { main: [...children].sort(sortByPosition), additional: [] as T[] };

  const currentIds = new Set<string>(current.map((folder) => folder.id));
  return {
    main: current,
    additional: children.filter((folder) => !currentIds.has(folder.id)).sort(sortByPosition),
  };
}
