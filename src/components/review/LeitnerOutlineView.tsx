import React, { memo, useCallback, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Edit3, FileText, Folder, Trash2, Zap } from "lucide-react";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { isPersianText } from "@/lib/bilingualHelper";
import type { LeitnerOutline, LeitnerOutlineNode } from "@/lib/leitnerOutline";

interface LeitnerOutlineViewProps {
  outline: LeitnerOutline;
  dueCardIds: ReadonlySet<string>;
  eligibleStudyCardIds: ReadonlySet<string>;
  isEn: boolean;
  onEdit: (card: LeitnerCard) => void;
  onDelete: (cardId: string) => void;
  onStudyDueCards: (cards: LeitnerCard[], scopeLabel: string) => void;
}

interface OutlineCardRowProps {
  card: LeitnerCard;
  due: boolean;
  isEn: boolean;
  onEdit: (card: LeitnerCard) => void;
  onDelete: (cardId: string) => void;
}

const OutlineCardRow = memo(function OutlineCardRow({ card, due, isEn, onEdit, onDelete }: OutlineCardRowProps) {
  const frontRtl = isPersianText(card.front);
  const backRtl = isPersianText(card.back);

  return (
    <article
      className="rounded-xl border border-border bg-background/80 p-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 96px" }}
      data-testid={`leitner-outline-card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p dir={frontRtl ? "rtl" : "ltr"} className={`whitespace-pre-wrap break-words text-xs font-semibold text-foreground ${frontRtl ? "text-right" : "text-left"}`}>
            {card.front}
          </p>
          <p dir={backRtl ? "rtl" : "ltr"} className={`whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground ${backRtl ? "text-right" : "text-left"}`}>
            {card.back}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">B{card.box}</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${due ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
              {due ? (isEn ? "Due" : "موعد مرور") : (isEn ? "Upcoming" : "موعد بعدی")}
            </span>
            {(card.lapse_count ?? 0) > 0 && (
              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-600 dark:text-rose-300">
                {isEn ? `Lapsed ${card.lapse_count}×` : `${card.lapse_count} بار لغزش`}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(card)}
            aria-label={isEn ? `Edit ${card.front}` : `ویرایش ${card.front}`}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Edit3 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            aria-label={isEn ? `Delete ${card.front}` : `حذف ${card.front}`}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
});

interface OutlineBranchProps {
  node: LeitnerOutlineNode;
  depth: number;
  dueCardIds: ReadonlySet<string>;
  eligibleStudyCardIds: ReadonlySet<string>;
  isEn: boolean;
  onEdit: (card: LeitnerCard) => void;
  onDelete: (cardId: string) => void;
  onStudyDueCards: (cards: LeitnerCard[], scopeLabel: string) => void;
}

const OutlineBranch = memo(function OutlineBranch({
  node,
  depth,
  dueCardIds,
  eligibleStudyCardIds,
  isEn,
  onEdit,
  onDelete,
  onStudyDueCards,
}: OutlineBranchProps) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === "folder";
  const label = isFolder ? node.name : node.title;
  const childNodes = isFolder ? node.children : [];
  const groupId = `leitner-outline-${node.type}-${node.id}`;
  const toggle = useCallback(() => setExpanded((current) => !current), []);
  const handleStudyBranch = useCallback(() => {
    onStudyDueCards(
      collectNodeCards(node).filter((card) => eligibleStudyCardIds.has(card.id)),
      label,
    );
  }, [eligibleStudyCardIds, label, node, onStudyDueCards]);

  return (
    <section className="space-y-2" style={{ marginInlineStart: `${Math.min(depth, 8) * 12}px` }}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={groupId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-start transition hover:bg-muted/70"
        >
          {expanded ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          {isFolder ? <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-600" /> : <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs font-semibold text-foreground">{label}</span>
          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{node.cardCount}</span>
        </button>
        {node.dueCardCount > 0 && (
          <button
            type="button"
            onClick={handleStudyBranch}
            aria-label={isEn
              ? `Study ${node.dueCardCount} due cards in ${label}`
              : `مرور ${node.dueCardCount} کارت موعددار در ${label}`}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-2 py-2 text-[10px] font-semibold text-primary transition hover:bg-primary/10"
          >
            <Zap aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{isEn ? `Review ${node.dueCardCount}` : `مرور ${node.dueCardCount}`}</span>
          </button>
        )}
      </div>

      {expanded && (
        <div id={groupId} className="space-y-2" role="group" aria-label={label}>
          {isFolder && node.cards.length > 0 && (
            <div className="space-y-2" style={{ marginInlineStart: "12px" }}>
              {node.cards.map((card) => (
                <OutlineCardRow key={card.id} card={card} due={dueCardIds.has(card.id)} isEn={isEn} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          )}
          {childNodes.map((child) => (
            <OutlineBranch
              key={`${child.type}-${child.id}`}
              node={child}
              depth={depth + 1}
              dueCardIds={dueCardIds}
              eligibleStudyCardIds={eligibleStudyCardIds}
              isEn={isEn}
              onEdit={onEdit}
              onDelete={onDelete}
              onStudyDueCards={onStudyDueCards}
            />
          ))}
          {!isFolder && node.cards.map((card) => (
            <OutlineCardRow key={card.id} card={card} due={dueCardIds.has(card.id)} isEn={isEn} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
});

function collectNodeCards(node: LeitnerOutlineNode): LeitnerCard[] {
  const cards: LeitnerCard[] = [];
  const seenIds = new Set<string>();
  const pendingNodes: LeitnerOutlineNode[] = [node];

  while (pendingNodes.length > 0) {
    const current = pendingNodes.pop();
    if (!current) continue;
    for (const card of current.cards) {
      if (seenIds.has(card.id)) continue;
      seenIds.add(card.id);
      cards.push(card);
    }
    if (current.type === "folder") pendingNodes.push(...current.children);
  }

  return cards;
}

export const LeitnerOutlineView = memo(function LeitnerOutlineView({
  outline,
  dueCardIds,
  eligibleStudyCardIds,
  isEn,
  onEdit,
  onDelete,
  onStudyDueCards,
}: LeitnerOutlineViewProps) {
  const unfiledDueCards = outline.unfiledCards.filter((card) => eligibleStudyCardIds.has(card.id));

  if (outline.nodes.length === 0 && outline.unfiledCards.length === 0) {
    return <div className="p-8 text-center text-xs text-muted-foreground">{isEn ? "No cards match your criteria." : "کارتی با معیارهای انتخابی یافت نشد."}</div>;
  }

  return (
    <div className="max-h-[560px] space-y-3 overflow-y-auto pe-1" aria-label={isEn ? "Flashcard outline" : "درخت‌وارهٔ فلش‌کارت‌ها"}>
      {outline.nodes.map((node) => (
        <OutlineBranch
          key={`${node.type}-${node.id}`}
          node={node}
          depth={0}
          dueCardIds={dueCardIds}
          eligibleStudyCardIds={eligibleStudyCardIds}
          isEn={isEn}
          onEdit={onEdit}
          onDelete={onDelete}
          onStudyDueCards={onStudyDueCards}
        />
      ))}
      {outline.unfiledCards.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <FileText aria-hidden="true" className="h-4 w-4" />
              {isEn ? "Unfiled cards" : "کارت‌های بدون پوشه یا درس"}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{outline.unfiledCards.length}</span>
            </h4>
            {unfiledDueCards.length > 0 && (
              <button
                type="button"
                onClick={() => onStudyDueCards(unfiledDueCards, isEn ? "Unfiled cards" : "کارت‌های بدون پوشه یا درس")}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1.5 text-[10px] font-semibold text-primary"
              >
                <Zap aria-hidden="true" className="h-3.5 w-3.5" />
                {isEn ? `Review ${unfiledDueCards.length}` : `مرور ${unfiledDueCards.length}`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {outline.unfiledCards.map((card) => (
              <OutlineCardRow key={card.id} card={card} due={dueCardIds.has(card.id)} isEn={isEn} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
});
