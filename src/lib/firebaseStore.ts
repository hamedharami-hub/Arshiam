import {
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  fbSignOut,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy as fsOrderBy,
  query as fsQuery,
  setDoc,
  updateDoc,
  where as fsWhere,
} from "@/lib/firebase";
import { getStoredUser } from "@/lib/authService";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import type { QueryConstraint } from "firebase/firestore";

type Row = Record<string, any>;
type Result<T = Row[]> = { data: T | null; error: Error | null; count?: number | null };
type Filter = { field: string; operator: string; value: unknown };

const currentUserId = () => auth.currentUser?.uid || getStoredUser()?.id || null;
const makeId = () => typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function matches(row: Row, filters: Filter[]) {
  return filters.every(({ field, operator, value }) => {
    const actual = row[field];
    if (operator === "eq") return actual === value;
    if (operator === "neq") return actual !== value;
    if (operator === "in") return Array.isArray(value) && value.includes(actual);
    if (operator === "is") return actual === value;
    if (operator === "gte") return actual >= value;
    if (operator === "gt") return actual > value;
    if (operator === "lte") return actual <= value;
    if (operator === "lt") return actual < value;
    if (operator === "ilike") return String(actual || "").toLowerCase().includes(String(value || "").replaceAll("%", "").toLowerCase());
    return true;
  });
}

class FirestoreQuery {
  private filters: Filter[] = [];
  private sort: { field: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;
  private one: "single" | "maybe" | null = null;
  private wantsCount = false;
  private headOnly = false;

  constructor(private readonly table: string) {}

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.wantsCount = options?.count === "exact";
    this.headOnly = !!options?.head;
    return this;
  }
  eq(field: string, value: unknown) { this.filters.push({ field, operator: "eq", value }); return this; }
  neq(field: string, value: unknown) { this.filters.push({ field, operator: "neq", value }); return this; }
  is(field: string, value: unknown) { this.filters.push({ field, operator: "is", value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ field, operator: "in", value }); return this; }
  gte(field: string, value: unknown) { this.filters.push({ field, operator: "gte", value }); return this; }
  gt(field: string, value: unknown) { this.filters.push({ field, operator: "gt", value }); return this; }
  lte(field: string, value: unknown) { this.filters.push({ field, operator: "lte", value }); return this; }
  lt(field: string, value: unknown) { this.filters.push({ field, operator: "lt", value }); return this; }
  ilike(field: string, value: string) { this.filters.push({ field, operator: "ilike", value }); return this; }
  not(field: string, operator: string, value: unknown) { this.filters.push({ field, operator: operator === "is" ? "neq" : operator, value }); return this; }
  or(_expression: string) { return this; }
  order(field: string, options?: { ascending?: boolean }) { this.sort = { field, ascending: options?.ascending !== false }; return this; }
  limit(count: number) { this.maxRows = count; return this; }
  range(from: number, to: number) { this.maxRows = to - from + 1; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private async rows(): Promise<Result<Row[]>> {
    const userId = currentUserId();
    if (!userId) return { data: null, error: new Error("برای دسترسی به داده وارد شوید") };

    // Fast path: direct document lookup when filtering by ID
    const idFilter = this.filters.find((f) => f.field === "id" && f.operator === "eq");
    if (idFilter && typeof idFilter.value === "string") {
      try {
        const docRef = doc(db, "users", userId, this.table, idFilter.value);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return { data: [], error: null, count: this.wantsCount ? 0 : null };
        }
        const row = { id: docSnap.id, ...docSnap.data() } as Row;
        if (!matches(row, this.filters)) {
          return { data: [], error: null, count: this.wantsCount ? 0 : null };
        }
        return { data: [row], error: null, count: this.wantsCount ? 1 : null };
      } catch (cause) {
        return { data: null, error: cause instanceof Error ? cause : new Error("خطا در خواندن داده") };
      }
    }

    try {
      const colRef = collection(db, "users", userId, this.table);
      const constraints: QueryConstraint[] = [];
      let hasClientOnlyFilter = false;

      for (const filter of this.filters) {
        if (filter.operator === "eq") {
          constraints.push(fsWhere(filter.field, "==", filter.value));
        } else if (filter.operator === "neq") {
          constraints.push(fsWhere(filter.field, "!=", filter.value));
        } else if (filter.operator === "is") {
          constraints.push(fsWhere(filter.field, "==", filter.value));
        } else if (filter.operator === "gt") {
          constraints.push(fsWhere(filter.field, ">", filter.value));
        } else if (filter.operator === "gte") {
          constraints.push(fsWhere(filter.field, ">=", filter.value));
        } else if (filter.operator === "lt") {
          constraints.push(fsWhere(filter.field, "<", filter.value));
        } else if (filter.operator === "lte") {
          constraints.push(fsWhere(filter.field, "<=", filter.value));
        } else if (filter.operator === "in" && Array.isArray(filter.value)) {
          if (filter.value.length > 0 && filter.value.length <= 10) {
            constraints.push(fsWhere(filter.field, "in", filter.value));
          } else {
            hasClientOnlyFilter = true;
          }
        } else {
          hasClientOnlyFilter = true;
        }
      }

      if (this.sort && !hasClientOnlyFilter) {
        constraints.push(fsOrderBy(this.sort.field, this.sort.ascending ? "asc" : "desc"));
      }

      if (this.maxRows !== null && !hasClientOnlyFilter) {
        constraints.push(fsLimit(this.maxRows));
      }

      let snapshot;
      try {
        if (constraints.length > 0) {
          const q = fsQuery(colRef, ...constraints);
          snapshot = await getDocs(q);
        } else {
          snapshot = await getDocs(colRef);
        }
      } catch (queryErr) {
        // Fallback: If composite index missing or query incompatible, gracefully fallback to client filtering
        snapshot = await getDocs(colRef);
        hasClientOnlyFilter = true;
      }

      let rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Row[];
      rows = rows.filter((row) => matches(row, this.filters));

      if (this.sort) {
        rows.sort((a, b) => {
          const left = a[this.sort!.field] ?? "";
          const right = b[this.sort!.field] ?? "";
          const direction = this.sort!.ascending ? 1 : -1;
          return left < right ? -direction : left > right ? direction : 0;
        });
      }

      if (this.maxRows !== null) {
        rows = rows.slice(0, this.maxRows);
      }

      return { data: rows, error: null, count: this.wantsCount ? rows.length : null };
    } catch (cause) {
      return { data: null, error: cause instanceof Error ? cause : new Error("خطا در خواندن داده") };
    }
  }

  async execute(): Promise<Result<Row[] | Row>> {
    const result = await this.rows();
    if (result.error || !this.one) return this.headOnly ? { ...result, data: null } : result;
    const first = result.data?.[0] ?? null;
    if (!first && this.one === "single") return { data: null, error: new Error("رکورد پیدا نشد"), count: result.count };
    return { data: first, error: null, count: result.count };
  }

  then<TResult1 = Result<Row[] | Row>, TResult2 = never>(
    onfulfilled?: ((value: Result<Row[] | Row>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) { return this.execute().then(onfulfilled, onrejected); }

  insert(input: Row | Row[]) {
    return new FirestoreMutation(this, () => this.write(input, false));
  }
  upsert(input: Row | Row[], options?: { onConflict?: string }) {
    return new FirestoreMutation(this, () => this.write(input, true, options?.onConflict));
  }
  private async write(input: Row | Row[], _merge: boolean, onConflict?: string): Promise<Result<Row[]>> {
    const userId = currentUserId();
    if (!userId) return { data: null, error: new Error("برای ذخیره وارد شوید") };
    try {
      const saved: Row[] = [];
      for (const raw of Array.isArray(input) ? input : [input]) {
        let id = raw.id;
        if (!id && onConflict) {
          const fields = onConflict.split(",").map((field) => field.trim()).filter(Boolean);
          try {
            if (fields.length === 1 && raw[fields[0]] !== undefined) {
              const q = fsQuery(
                collection(db, "users", userId, this.table),
                fsWhere(fields[0], "==", raw[fields[0]]),
                fsLimit(1)
              );
              const matchSnap = await getDocs(q);
              if (!matchSnap.empty) id = matchSnap.docs[0].id;
            } else {
              const existing = await getDocs(collection(db, "users", userId, this.table));
              id = existing.docs.find((item) => fields.every((field) => item.data()[field] === raw[field]))?.id;
            }
          } catch {
            const existing = await getDocs(collection(db, "users", userId, this.table));
            id = existing.docs.find((item) => fields.every((field) => item.data()[field] === raw[field]))?.id;
          }
        }
        id ||= makeId();
        const row = { ...raw, id, user_id: raw.user_id || userId, updated_at: raw.updated_at || new Date().toISOString() };
        await setDoc(doc(db, "users", userId, this.table, id), row, { merge: true });
        saved.push(row);
      }
      if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
      return { data: saved, error: null };
    } catch (cause) {
      return { data: null, error: cause instanceof Error ? cause : new Error("خطا در ذخیره داده") };
    }
  }
  update(patch: Row) {
    return new FirestoreMutation(this, async () => {
      const userId = currentUserId();
      if (!userId) return { data: null, error: new Error("برای ذخیره وارد شوید") };
      const idFilter = this.filters.find((f) => f.field === "id" && f.operator === "eq");
      if (idFilter && typeof idFilter.value === "string" && this.filters.length === 1) {
        try {
          const docRef = doc(db, "users", userId, this.table, idFilter.value);
          const updatedRow = { ...patch, id: idFilter.value, user_id: userId, updated_at: patch.updated_at || new Date().toISOString() };
          await updateDoc(docRef, updatedRow);
          if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
          return { data: [updatedRow], error: null };
        } catch {
          // Fallback to general update if doc not yet existing or update fails
        }
      }
      const result = await this.rows();
      if (result.error || !result.data) return result;
      return this.write(result.data.map((row) => ({ ...row, ...patch })), true);
    });
  }
  delete() {
    return new FirestoreMutation(this, async () => {
      const userId = currentUserId();
      if (!userId) return { data: null, error: new Error("برای حذف وارد شوید") };
      const idFilter = this.filters.find((f) => f.field === "id" && f.operator === "eq");
      if (idFilter && typeof idFilter.value === "string" && this.filters.length === 1) {
        try {
          const docRef = doc(db, "users", userId, this.table, idFilter.value);
          await deleteDoc(docRef);
          if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
          return { data: [{ id: idFilter.value }], error: null };
        } catch {
          // Fallback to general delete
        }
      }
      const result = await this.rows();
      if (result.error || !result.data || !userId) return result;
      try {
        await Promise.all(result.data.map((row) => deleteDoc(doc(db, "users", userId, this.table, row.id))));
        if (typeof window !== "undefined") window.dispatchEvent(new Event("firebase-store-changed"));
        return { data: result.data, error: null };
      } catch (cause) {
        return { data: null, error: cause instanceof Error ? cause : new Error("خطا در حذف داده") };
      }
    });
  }
}

class FirestoreMutation {
  private one = false;
  constructor(private readonly query: FirestoreQuery, private readonly operation: () => Promise<Result<Row[]>>) {}
  select(_columns = "*") { return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  eq(field: string, value: unknown) { this.query.eq(field, value); return this; }
  in(field: string, value: unknown[]) { this.query.in(field, value); return this; }
  is(field: string, value: unknown) { this.query.is(field, value); return this; }
  not(field: string, operator: string, value: unknown) { this.query.not(field, operator, value); return this; }
  async execute(): Promise<Result<Row[] | Row>> {
    const result = await this.operation();
    if (!this.one || result.error) return result;
    return { data: result.data?.[0] || null, error: null };
  }
  then<TResult1 = Result<Row[] | Row>, TResult2 = never>(
    onfulfilled?: ((value: Result<Row[] | Row>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) { return this.execute().then(onfulfilled, onrejected); }
  catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null) {
    return this.execute().catch(onrejected);
  }
}

const disabled = (feature: string) => ({ data: null, error: new Error(`${feature} هنوز برای Firebase پیکربندی نشده است`) });

function mediaBucket(name: string) {
  return {
    upload: async (path: string, file: Blob, metadata?: { contentType?: string }) => {
      try {
        await uploadBytes(ref(getStorage(), `${name}/${path}`), file, metadata);
        return { error: null };
      } catch (cause) {
        return { error: cause instanceof Error ? cause : new Error("خطا در آپلود فایل") };
      }
    },
    createSignedUrl: async (path: string, _expiresIn: number) => {
      try {
        return { data: { signedUrl: await getDownloadURL(ref(getStorage(), `${name}/${path}`)) }, error: null };
      } catch (cause) {
        return { data: null, error: cause instanceof Error ? cause : new Error("خطا در دریافت نشانی فایل") };
      }
    },
    remove: async (paths: string[]) => {
      try {
        await Promise.all(paths.map((path) => deleteObject(ref(getStorage(), `${name}/${path}`))));
        return { error: null };
      } catch (cause) {
        return { error: cause instanceof Error ? cause : new Error("خطا در حذف فایل") };
      }
    },
  };
}

export const firebaseStore = {
  from: (table: string) => new FirestoreQuery(table),
  rpc: (name: string, _args?: Row) => Promise.resolve(disabled(name)),
  functions: { invoke: (name: string, _body?: unknown) => Promise.resolve(disabled(name)) },
  storage: { from: (name: string) => mediaBucket(name) },
  auth: {
    getUser: async () => ({ data: { user: auth.currentUser } }),
    getSession: async () => ({ data: { session: auth.currentUser ? { user: auth.currentUser } : null } }),
    setSession: async (_tokens: unknown) => disabled("ورود"),
    signOut: async () => { await fbSignOut(auth); return { error: null }; },
  },
  channel: (_name: string) => {
    const callbacks = new Set<() => void>();
    let unsubscribe: (() => void) | undefined;
    const channel = {
      on: (_event: string, _filter: unknown, callback?: () => void) => { if (callback) callbacks.add(callback); return channel; },
      subscribe: () => {
        const handler = () => callbacks.forEach((callback) => callback());
        window.addEventListener("firebase-store-changed", handler);
        unsubscribe = () => window.removeEventListener("firebase-store-changed", handler);
        return channel;
      },
      unsubscribe: () => unsubscribe?.(),
    };
    return channel;
  },
  removeChannel: (channel: { unsubscribe?: () => void }) => channel?.unsubscribe?.(),
};
