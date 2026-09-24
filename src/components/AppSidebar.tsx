import { useEffect, useState } from "react";
import {
  CalendarDays, FolderTree, Tag, Folder as FolderIcon,
  LogOut, Settings, PanelLeft, PanelRight, RotateCcw, Plus,
} from "lucide-react";
import { StreakCard } from "@/components/StreakCard";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { firebaseStore } from "@/lib/firebaseStore";
import { toast } from "sonner";
import FolderAIChat from "@/components/FolderAIChat";
import { useSidebarPosition } from "@/lib/sidebarPosition";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FolderDeleteDialog } from "@/components/FolderDeleteDialog";
import { TagDeleteDialog } from "@/components/TagDeleteDialog";
import { useTranslation } from "react-i18next";
import SidebarItemSheet from "@/components/SidebarItemSheet";
import { cacheGet, cacheSet, enqueueOp } from "@/lib/offlineQueue";
import { useSidebarQuickLinks } from "@/lib/sidebarQuickLinks";
import { cn } from "@/lib/utils";
import {
  useLabel,
  SECTIONS,
  NAV_ITEMS,
  DEFAULT_ORDER,
  ORDER_KEY,
  loadOrder,
  SortableBlock,
  SidebarSectionCollapsible,
} from "./sidebar/SidebarNavSections";
import { Folder, SidebarFoldersList } from "./sidebar/SidebarFoldersList";
import { TagT, SidebarTagsList } from "./sidebar/SidebarTagsList";


export function AppSidebar({ className, style }: { className?: string; style?: React.CSSProperties } = {}) {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const { sidebarPosition } = useSidebarPosition();
  const collapsed = state === "collapsed" && !isMobile;
  const { signOut, user } = useAuth();
  const { isAdmin } = useUserRole();
  const tr = useLabel();
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<TagT[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newFolder, setNewFolder] = useState("");
  const [newTag, setNewTag] = useState("");
  const [openFolderDlg, setOpenFolderDlg] = useState(false);
  const [openTagDlg, setOpenTagDlg] = useState(false);
  const [aiFolder, setAiFolder] = useState<Folder | null>(null);
  const [delFolder, setDelFolder] = useState<Folder | null>(null);
  const [delTag, setDelTag] = useState<TagT | null>(null);
  const [sheetFolder, setSheetFolder] = useState<Folder | null>(null);
  const [sheetTag, setSheetTag] = useState<TagT | null>(null);
  const [order, setOrder] = useState<string[]>(loadOrder);
  const { quickLinks } = useSidebarQuickLinks();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("sidebar_sections_v1");
      if (raw) return JSON.parse(raw);
    } catch { void 0; }
    const init: Record<string, boolean> = Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultOpen]));
    init.__folders = true;
    init.__tags = false;
    return init;
  });
  const setSection = (id: string, open: boolean) => {
    setOpenSections((s) => {
      const n = { ...s, [id]: open };
      try { localStorage.setItem("sidebar_sections_v1", JSON.stringify(n)); } catch { void 0; }
      return n;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = order.indexOf(String(active.id));
    const newI = order.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(order, oldI, newI);
    setOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch { void 0; }
  };

  const resetOrder = () => {
    setOrder(DEFAULT_ORDER);
    try { localStorage.removeItem(ORDER_KEY); } catch { void 0; }
    toast.success(t("sidebar.resetDone"));
  };

  const generateId = () => {
    try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  };

  const FOLDERS_KEY = user ? `folders:${user.id}` : "";
  const TAGS_KEY = user ? `tags:${user.id}` : "";

  const load = async () => {
    if (!user) return;
    const cachedFolders = await cacheGet<Folder[]>(FOLDERS_KEY);
    const cachedTags = await cacheGet<TagT[]>(TAGS_KEY);
    if (cachedFolders) setFolders(cachedFolders);
    if (cachedTags) setTags(cachedTags);

    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    // 1. Primary: load folders & tags from Firebase Firestore
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const [foldersSnap, tagsSnap] = await Promise.all([
        getDocs(collection(db, "users", user.id, "folders")),
        getDocs(collection(db, "users", user.id, "tags")),
      ]);
      const fList: Folder[] = [];
      foldersSnap.forEach((d) => fList.push({ id: d.id, ...(d.data() as any) }));
      fList.sort((a, b) => ((a as any).position ?? 0) - ((b as any).position ?? 0));
      setFolders(fList);
      await cacheSet(FOLDERS_KEY, fList);

      const tList: TagT[] = [];
      tagsSnap.forEach((d) => tList.push({ id: d.id, ...(d.data() as any) }));
      tList.sort((a, b) => a.name.localeCompare(b.name));
      setTags(tList);
      await cacheSet(TAGS_KEY, tList);
    } catch {
      // 2. Secondary fallback: check firebaseStore
      try {
        const [f, t] = await Promise.all([
          firebaseStore.from("folders").select("*").order("position"),
          firebaseStore.from("tags").select("*").order("name"),
        ]);
        if (f.data) {
          setFolders((f.data as unknown) as Folder[]);
          await cacheSet(FOLDERS_KEY, f.data);
        }
        if (t.data) {
          setTags((t.data as unknown) as TagT[]);
          await cacheSet(TAGS_KEY, t.data);
        }
      } catch {
        void 0;
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    let fsUnsubF = () => {};
    let fsUnsubT = () => {};
    import("@/lib/firestoreDataService").then(({ subscribeFolders, subscribeTags }) => {
      fsUnsubF = subscribeFolders(user.id, (flist) => {
        setFolders((flist || []) as Folder[]);
      });
      fsUnsubT = subscribeTags(user.id, (tlist) => {
        setTags((tlist || []) as TagT[]);
      });
    });
    const ch = firebaseStore
      .channel("sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "folders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, load)
      .subscribe();
    return () => {
      fsUnsubF();
      fsUnsubT();
      firebaseStore.removeChannel(ch);
    };
  }, [user]);

  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  const createFolder = async () => {
    if (!newFolder.trim() || !user) return;
    const folder: Folder = { id: generateId(), name: newFolder, user_id: user.id, parent_id: null, color: "" };
    setFolders(prev => [...prev, folder]);
    await cacheSet(FOLDERS_KEY, [...folders, folder]);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "folders", op: "insert", payload: folder });
      toast.info(t("folders.created") + " — " + t("offline.willSync", "با اتصال اینترنت همگام می‌شود"));
      setNewFolder(""); setOpenFolderDlg(false);
      return;
    }

    // 1. Primary: save folder to Firebase Firestore
    let saved = false;
    try {
      const { upsertFolder } = await import("@/lib/firestoreDataService");
      saved = await upsertFolder(user.id, folder);
    } catch {}

    if (!saved) {
      const queued = await enqueueOp({ table: "folders", op: "insert", payload: folder });
      if (queued) {
        toast.info(t("folders.created") + " — " + t("offline.willSync", "با اتصال اینترنت همگام می‌شود"));
      } else {
        toast.error(t("error.saveFailed", "خطا در ذخیره پوشه"));
      }
    } else {
      toast.success(t("folders.created"));
    }

    // 2. Best-effort mirror to firebaseStore
    try {
      await firebaseStore.from("folders").insert({ id: folder.id, name: newFolder, user_id: user.id });
    } catch {}

    setNewFolder("");
    setOpenFolderDlg(false);
  };

  const createTag = async () => {
    if (!newTag.trim() || !user) return;
    const tag: TagT = { id: generateId(), name: newTag, user_id: user.id, color: "" };
    setTags(prev => [...prev, tag]);
    await cacheSet(TAGS_KEY, [...tags, tag]);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "tags", op: "insert", payload: tag });
      toast.info(t("tags.created") + " — " + t("offline.willSync", "با اتصال اینترنت همگام می‌شود"));
      setNewTag(""); setOpenTagDlg(false);
      return;
    }

    // 1. Primary: save tag to Firebase Firestore
    let saved = false;
    try {
      const { upsertTag } = await import("@/lib/firestoreDataService");
      saved = await upsertTag(user.id, tag);
    } catch {}

    if (!saved) {
      const queued = await enqueueOp({ table: "tags", op: "insert", payload: tag });
      if (queued) {
        toast.info(t("tags.created") + " — " + t("offline.willSync", "با اتصال اینترنت همگام می‌شود"));
      } else {
        toast.error(t("error.saveFailed", "خطا در ذخیره تگ"));
      }
    } else {
      toast.success(t("tags.created"));
    }

    // 2. Best-effort mirror to firebaseStore
    try {
      await firebaseStore.from("tags").insert({ id: tag.id, name: newTag, user_id: user.id });
    } catch {}

    setNewTag("");
    setOpenTagDlg(false);
  };

  const renderBlock = (id: string, dragHandle: any) => {
    if (id === "__folders") {
      return (
        <SidebarFoldersList
          folders={folders}
          expanded={expanded}
          setExpanded={setExpanded}
          collapsed={collapsed}
          isOpen={openSections["__folders"] ?? true}
          onToggleOpen={(v) => setSection("__folders", v)}
          sidebarPosition={sidebarPosition}
          dragHandle={dragHandle}
          onSheetFolder={(f) => setSheetFolder(f)}
          closeOnMobile={closeOnMobile}
          tr={tr}
          isEn={isEn}
          openFolderDlg={openFolderDlg}
          setOpenFolderDlg={setOpenFolderDlg}
          newFolder={newFolder}
          setNewFolder={setNewFolder}
          createFolder={createFolder}
        />
      );
    }
    if (id === "__tags") {
      return (
        <SidebarTagsList
          tags={tags}
          collapsed={collapsed}
          isOpen={openSections["__tags"] ?? false}
          onToggleOpen={(v) => setSection("__tags", v)}
          sidebarPosition={sidebarPosition}
          dragHandle={dragHandle}
          onSheetTag={(t) => setSheetTag(t)}
          closeOnMobile={closeOnMobile}
          tr={tr}
          isEn={isEn}
          openTagDlg={openTagDlg}
          setOpenTagDlg={setOpenTagDlg}
          newTag={newTag}
          setNewTag={setNewTag}
          createTag={createTag}
        />
      );
    }
    const sec = SECTIONS.find((s) => s.id === id);
    if (!sec) return null;
    return (
      <SidebarSectionCollapsible
        key={sec.id}
        section={sec}
        dragHandle={dragHandle}
        collapsed={collapsed}
        isOpen={openSections[sec.id] ?? sec.defaultOpen}
        onToggle={(v) => setSection(sec.id, v)}
        isAdmin={isAdmin}
        tr={tr}
        closeOnMobile={closeOnMobile}
      />
    );
  };

  return (
    <Sidebar side={sidebarPosition} collapsible="icon" className={className} style={style} dir={isEn ? "ltr" : "rtl"}>
      <SidebarRail />
      {!collapsed && (
        <SidebarHeader className="border-b p-2">
          <div className="flex items-center gap-2 px-1 py-1">
            <img src="/favicon.png" alt="ARSHNAZ" className="w-8 h-8 rounded-lg shrink-0" loading="lazy" width={32} height={32} />
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="font-bold text-base bg-gradient-to-l from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent truncate">ARSHNAZ</span>
              <span className="text-[9px] text-muted-foreground truncate">{t("app.tagline")}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-sidebar-accent cursor-pointer shrink-0"
              onClick={() => toggleSidebar()}
              title={isEn ? "Collapse sidebar" : "بستن نوار کناری"}
            >
              {sidebarPosition === "left" ? (
                <PanelLeft className="w-4 h-4 text-muted-foreground" />
              ) : (
                <PanelRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="sr-only">{isEn ? "Collapse" : "بستن"}</span>
            </Button>
          </div>
        </SidebarHeader>
      )}

      <SidebarContent className={cn(collapsed && "p-0 pt-1.5 gap-1")}>
        {/* The compact desktop rail is intentionally curated in Settings. */}
        {collapsed ? (
          <SidebarGroup className="p-1 pt-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {/* 1. Menu Toggle Button (Pinned) */}
                <SidebarMenuItem key="sidebar-toggle-menu">
                  <SidebarMenuButton
                    onClick={() => toggleSidebar()}
                    tooltip={isEn ? "Menu (Open sidebar)" : "منو (باز کردن نوار کناری)"}
                    className="justify-center h-9 w-9 mx-auto rounded-xl hover:bg-sidebar-accent cursor-pointer text-foreground"
                  >
                    {sidebarPosition === "left" ? (
                      <PanelLeft className="w-4 h-4 shrink-0 text-primary" />
                    ) : (
                      <PanelRight className="w-4 h-4 shrink-0 text-primary" />
                    )}
                    <span className="sr-only">{isEn ? "Menu" : "منو"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* 2. Today (Pinned) */}
                <SidebarMenuItem key="/app/today">
                  <SidebarMenuButton asChild tooltip={tr("امروز")} className="justify-center h-9 w-9 mx-auto rounded-xl">
                    <NavLink
                      to="/app/today"
                      onClick={closeOnMobile}
                      className="flex items-center justify-center w-full h-full"
                      activeClassName="bg-accent text-accent-foreground font-bold"
                    >
                      <CalendarDays className="w-4 h-4 shrink-0 text-primary" />
                      <span className="sr-only">{tr("امروز")}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* 3. Configured shortcuts (excluding /app/today since it's already pinned above) */}
                {quickLinks
                  .filter((url) => url !== "/app/today")
                  .map((url) => {
                    if (url === "__folders") {
                      return (
                        <SidebarMenuItem key="__folders">
                          <Popover>
                            <PopoverTrigger asChild>
                              <SidebarMenuButton
                                tooltip={tr("فولدرها")}
                                className="justify-center h-9 w-9 mx-auto rounded-xl hover:bg-sidebar-accent cursor-pointer"
                              >
                                <FolderTree className="w-4 h-4 shrink-0 text-primary" />
                                <span className="sr-only">{tr("فولدرها")}</span>
                              </SidebarMenuButton>
                            </PopoverTrigger>
                            <PopoverContent
                              side={sidebarPosition === "left" ? "right" : "left"}
                              align="start"
                              sideOffset={14}
                              className="w-64 p-2 shadow-2xl rounded-2xl border bg-card/95 backdrop-blur-xl z-50"
                            >
                              <div className="flex items-center justify-between pb-2 mb-1.5 border-b px-1">
                                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                                  <FolderTree className="w-4 h-4 text-primary" />
                                  <span>{tr("فولدرها")}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-mono">
                                    {folders.length}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-md hover:bg-accent cursor-pointer"
                                  onClick={() => setOpenFolderDlg(true)}
                                  title={isEn ? "New Folder" : "فولدر جدید"}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <div className="max-h-72 overflow-y-auto space-y-1">
                                {folders.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">
                                    {isEn ? "No folders yet" : "هنوز فولدری ساخته نشده"}
                                  </p>
                                ) : (
                                  folders.map((f) => (
                                    <NavLink
                                      key={f.id}
                                      to={`/app/folder/${f.id}`}
                                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs hover:bg-accent transition-colors text-foreground"
                                      activeClassName="bg-primary/10 text-primary font-bold"
                                      onClick={closeOnMobile}
                                    >
                                      <FolderIcon
                                        className="w-4 h-4 shrink-0"
                                        style={{ color: f.color || "hsl(var(--primary))" }}
                                      />
                                      <span className="truncate flex-1 text-start font-medium">{f.name}</span>
                                    </NavLink>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </SidebarMenuItem>
                      );
                    }

                    if (url === "__tags") {
                      return (
                        <SidebarMenuItem key="__tags">
                          <Popover>
                            <PopoverTrigger asChild>
                              <SidebarMenuButton
                                tooltip={tr("تگ‌ها")}
                                className="justify-center h-9 w-9 mx-auto rounded-xl hover:bg-sidebar-accent cursor-pointer"
                              >
                                <Tag className="w-4 h-4 shrink-0 text-muted-foreground" />
                                <span className="sr-only">{tr("تگ‌ها")}</span>
                              </SidebarMenuButton>
                            </PopoverTrigger>
                            <PopoverContent
                              side={sidebarPosition === "left" ? "right" : "left"}
                              align="start"
                              sideOffset={14}
                              className="w-56 p-2 shadow-2xl rounded-2xl border bg-card/95 backdrop-blur-xl z-50"
                            >
                              <div className="flex items-center justify-between pb-2 mb-1.5 border-b px-1">
                                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                                  <Tag className="w-3.5 h-3.5 text-primary" />
                                  <span>{tr("تگ‌ها")}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-mono">
                                    {tags.length}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-md hover:bg-accent cursor-pointer"
                                  onClick={() => setOpenTagDlg(true)}
                                  title={isEn ? "New Tag" : "تگ جدید"}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <div className="max-h-64 overflow-y-auto space-y-1">
                                {tags.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">
                                    {isEn ? "No tags yet" : "هنوز تگی ساخته نشده"}
                                  </p>
                                ) : (
                                  tags.map((t) => (
                                    <NavLink
                                      key={t.id}
                                      to={`/app/tag/${t.id}`}
                                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent transition-colors"
                                      activeClassName="bg-primary/10 text-primary font-bold"
                                      onClick={closeOnMobile}
                                    >
                                      <Tag className="w-3.5 h-3.5 shrink-0" style={{ color: t.color }} />
                                      <span className="truncate flex-1 text-start font-medium">{t.name}</span>
                                    </NavLink>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </SidebarMenuItem>
                      );
                    }

                    const item = NAV_ITEMS.find((candidate) => candidate.url === url);
                    if (!item) return null;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild tooltip={tr(item.label)} className="justify-center h-9 w-9 mx-auto rounded-xl">
                          <NavLink to={item.url} onClick={closeOnMobile} className="flex items-center justify-center w-full h-full" activeClassName="bg-accent text-accent-foreground font-bold">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="sr-only">{tr(item.label)}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <div className="px-3 py-2">
            <NavLink
              to="/app/stats"
              onClick={closeOnMobile}
              className="block"
              activeClassName=""
            >
              <StreakCard />
            </NavLink>
          </div>
        )}

        {!collapsed && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((id) => (
                <SortableBlock key={id} id={id}>
                  {(handleProps) => renderBlock(id, handleProps)}
                </SortableBlock>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={tr("تنظیمات")}>
              <NavLink
                to="/app/settings"
                onClick={closeOnMobile}
                className="flex items-center gap-2"
                activeClassName="bg-accent text-accent-foreground font-medium"
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{tr("تنظیمات")}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <Button variant="ghost" size="sm" onClick={resetOrder} className="justify-start text-xs opacity-70">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="ms-2">{isEn ? "Reset order" : "بازنشانی ترتیب"}</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={() => { signOut(); toast.success(isEn ? "Signed out successfully" : "خروج موفق"); }}
          className={collapsed ? "h-8 w-8 mx-auto" : "justify-start"}
          title={isEn ? "Log out" : "خروج"}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="ms-2">{isEn ? "Log out" : "خروج"}</span>}
        </Button>
      </SidebarFooter>
      {aiFolder && (
        <FolderAIChat
          open={!!aiFolder}
          onOpenChange={(v) => !v && setAiFolder(null)}
          folderId={aiFolder.id}
          folderName={aiFolder.name}
        />
      )}
      {delFolder && (
        <FolderDeleteDialog
          open={!!delFolder}
          onOpenChange={(v) => !v && setDelFolder(null)}
          folderId={delFolder.id}
          folderName={delFolder.name}
          onDone={load}
        />
      )}
      {delTag && (
        <TagDeleteDialog
          open={!!delTag}
          onOpenChange={(v) => !v && setDelTag(null)}
          tagId={delTag.id}
          tagName={delTag.name}
          onDone={load}
        />
      )}
      <SidebarItemSheet
        item={sheetFolder}
        kind="folder"
        onOpenChange={(v) => !v && setSheetFolder(null)}
        onDelete={() => sheetFolder && setDelFolder(sheetFolder)}
        onAIChat={() => sheetFolder && setAiFolder(sheetFolder)}
        onChanged={load}
      />
      <SidebarItemSheet
        item={sheetTag}
        kind="tag"
        onOpenChange={(v) => !v && setSheetTag(null)}
        onDelete={() => sheetTag && setDelTag(sheetTag)}
        onChanged={load}
      />
    </Sidebar>
  );
}
