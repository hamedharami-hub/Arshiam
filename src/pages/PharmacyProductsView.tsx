import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, PackageSearch, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_PRODUCT_CATALOG } from "@/lib/pharmacyProductCatalogData";
import {
  filterPharmacyProducts,
  getPharmacyProductCategories,
  type PharmacyProductCatalogEntry,
  type PharmacyProductScheduleFilter,
} from "@/lib/pharmacyProductCatalog";

export default function PharmacyProductsView() {
  const { T, lang } = useBilingual();
  const [query, setQuery] = useState("");
  const [schedule, setSchedule] = useState<PharmacyProductScheduleFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<PharmacyProductCatalogEntry | null>(null);
  const isEn = lang === "en";

  const categories = useMemo(
    () => getPharmacyProductCategories(PHARMACY_PRODUCT_CATALOG, lang),
    [lang],
  );
  const products = useMemo(
    () => filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query, schedule, categoryId }),
    [categoryId, query, schedule],
  );

  const resetFilters = () => {
    setQuery("");
    setSchedule("all");
    setCategoryId("all");
  };

  const categoryName = (product: PharmacyProductCatalogEntry) =>
    isEn ? product.categoryEn : product.categoryFa;
  const subcategoryName = (product: PharmacyProductCatalogEntry) =>
    isEn ? product.subcategoryEn : product.subcategoryFa;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-4 sm:px-5 sm:py-6" dir={isEn ? "ltr" : "rtl"}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary" aria-hidden="true">
            <PackageSearch className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{T("فهرست محصولات دارویی", "Pharmacy product catalogue")}</h1>
            <p className="text-sm text-muted-foreground">
              {T("نمایهٔ جست‌وجوپذیر محصولات منبع Pharmacy؛ برای دسترسی سریع به مدخل‌ها.", "A searchable index of Pharmacy source products for quick reference.")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
          <BookOpen className="h-3.5 w-3.5" />
          {T("فقط نمایه", "Index only")}
        </Badge>
      </header>

      <Card className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-4 text-sm" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="leading-relaxed">
          {T(
            "اطلاعات این نسخه از منبع Pharmacy منتقل شده و هنوز بازبینی مستقل نشده است. این فهرست ابزار جست‌وجو است، نه مرجع بالینی یا راهنمای مصرف؛ برای تصمیم‌گیری به منبع معتبر و به‌روز مراجعه کن.",
            "This snapshot was imported from the Pharmacy source and has not been independently reviewed. It is a search index, not a clinical or directions-for-use reference; consult an authoritative, current source for decisions.",
          )}
        </p>
      </Card>

      <section aria-label={T("جست‌وجو و فیلتر", "Search and filters")} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 md:items-center xl:grid-cols-[minmax(16rem,1fr)_12rem_minmax(12rem,16rem)_auto]">
          <div className="relative min-w-0">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isEn ? "left-3" : "right-3"}`} aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={T("نام تجاری، ژنریک یا مادهٔ مؤثره…", "Brand, generic, or ingredient…")}
              aria-label={T("جست‌وجوی محصولات", "Search products")}
              className={isEn ? "ps-9" : "pe-9"}
            />
          </div>

          <Select value={schedule} onValueChange={(value) => setSchedule(value as PharmacyProductScheduleFilter)}>
            <SelectTrigger aria-label={T("فیلتر ردهٔ محصول", "Filter by schedule")}>
              <SelectValue placeholder={T("همهٔ رده‌ها", "All schedules")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("همهٔ رده‌ها", "All schedules")}</SelectItem>
              <SelectItem value="Unscheduled">Unscheduled</SelectItem>
              <SelectItem value="S2">S2</SelectItem>
              <SelectItem value="S3">S3</SelectItem>
              <SelectItem value="S4">S4</SelectItem>
              <SelectItem value="S8">S8</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger aria-label={T("فیلتر دسته‌بندی", "Filter by category")}>
              <SelectValue placeholder={T("همهٔ دسته‌ها", "All categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("همهٔ دسته‌ها", "All categories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {T("پاک‌کردن", "Reset")}
          </button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {T(`${products.length} محصول از ${PHARMACY_PRODUCT_CATALOG.length}`, `${products.length} of ${PHARMACY_PRODUCT_CATALOG.length} products`)}
        </p>
      </section>

      {products.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={T("محصولات", "Products")}>
          {products.map((product) => (
            <Card key={product.id} className="h-full p-0 transition-colors hover:border-primary/50 hover:bg-accent/30 focus-within:border-primary">
              <button
                type="button"
                onClick={() => setSelectedProduct(product)}
                className="flex h-full w-full min-w-0 flex-col gap-3 rounded-xl p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={T(`نمایش ${product.brandName}`, `View ${product.brandName}`)}
              >
                <span className="flex min-w-0 w-full items-start justify-between gap-2">
                  <span className="min-w-0 space-y-1">
                    <span className="block break-words text-base font-semibold leading-snug">{product.brandName}</span>
                    <span className="block break-words text-sm text-muted-foreground">{product.genericName}</span>
                  </span>
                  <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold">{product.schedule}</span>
                </span>
                <span className="flex w-full flex-wrap gap-1.5">
                  {categoryName(product) && <span className="max-w-full truncate rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{categoryName(product)}</span>}
                  {subcategoryName(product) && <span className="max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-semibold">{subcategoryName(product)}</span>}
                  <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">{T("بازبینی‌نشده", "Unreviewed")}</span>
                </span>
              </button>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="px-5 py-12 text-center">
          <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold">{T("محصولی پیدا نشد", "No products found")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{T("عبارت یا فیلترها را تغییر بده.", "Try a different search or reset the filters.")}</p>
        </Card>
      )}

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="pe-6 text-start leading-snug">{selectedProduct.brandName}</DialogTitle>
                <DialogDescription className="text-start">{selectedProduct.genericName}</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Metadata label={T("مادهٔ مؤثره (طبق منبع)", "Active ingredient (source label)")} value={selectedProduct.activeIngredients} />
                <Metadata label={T("بسته‌بندی (طبق منبع)", "Pack (source label)")} value={selectedProduct.packSize} />
                <Metadata label={T("ردهٔ منبع", "Source schedule")} value={selectedProduct.schedule} />
                <Metadata label={T("دسته", "Category")} value={categoryName(selectedProduct)} />
                <Metadata label={T("زیردسته", "Subcategory")} value={subcategoryName(selectedProduct)} />
                <Metadata label={T("وضعیت محتوا", "Content status")} value={T("بازبینی‌نشده", "Unreviewed")} />
              </dl>
              <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                {T("این پنجره فقط فرادادهٔ نمایه را نشان می‌دهد و محتوای مونوگراف را جایگزین نمی‌کند.", "This panel shows index metadata only; it does not replace the product monograph.")}
              </p>
              <a
                href={selectedProduct.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {T("مشاهدهٔ فایل منبع در GitHub", "View source file on GitHub")}
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{value || "—"}</dd>
    </div>
  );
}
