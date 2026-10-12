import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/taskTypes";

const row = "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg px-2.5 text-sm";
const field = "h-7 min-w-0 flex-1 rounded-md bg-muted/60 px-2 text-[11px] text-foreground disabled:opacity-50";
const confirmClass = "h-7 shrink-0 rounded-md bg-muted/60 px-2.5 text-[11px] transition hover:bg-muted disabled:opacity-50";

export function TaskNextButton({ pressed, canEdit, onToggle, T }: {
  pressed: boolean;
  canEdit: boolean;
  onToggle: () => void;
  T: (fa: string, en: string) => string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={!canEdit}
      data-testid="task-next-toggle"
      onClick={onToggle}
      className={confirmClass}
    >
      {T("کار بعدی من", "My next")}
    </button>
  );
}

export function TaskWaitingRow({ task, canEdit, onSave, onClear, T }: {
  task: Pick<Task, "id" | "status" | "waiting_reason" | "prerequisite_id">;
  canEdit: boolean;
  onSave: (input: { reason: string; prerequisite_id: string }) => void;
  onClear: () => void;
  T: (fa: string, en: string) => string;
}) {
  const dirty = useRef(false);
  const [reason, setReason] = useState(task.waiting_reason || "");
  const [prerequisite, setPrerequisite] = useState(task.prerequisite_id || "");
  useEffect(() => {
    if (dirty.current) return;
    setReason(task.waiting_reason || "");
    setPrerequisite(task.prerequisite_id || "");
  }, [task.id, task.waiting_reason, task.prerequisite_id]);

  return (
    <div className={row} data-testid="task-waiting-row">
      <span className="shrink-0 font-medium text-foreground/90">{T("منتظر", "Waiting")}</span>
      <input
        value={reason}
        disabled={!canEdit}
        aria-label={T("دلیل انتظار", "Waiting reason")}
        placeholder={T("دلیل، اختیاری", "Reason, optional")}
        data-testid="task-waiting-reason"
        className={field}
        onChange={(event) => { dirty.current = true; setReason(event.target.value); }}
      />
      <input
        value={prerequisite}
        disabled={!canEdit}
        dir="ltr"
        aria-label={T("شناسهٔ پیش‌نیاز", "Prerequisite id")}
        placeholder={T("شناسهٔ پیش‌نیاز", "Prerequisite id")}
        data-testid="task-waiting-prerequisite"
        className={`${field} max-w-[9rem]`}
        onChange={(event) => { dirty.current = true; setPrerequisite(event.target.value); }}
      />
      <button
        type="button"
        disabled={!canEdit}
        data-testid="task-waiting-confirm"
        className={confirmClass}
        onClick={() => onSave({ reason, prerequisite_id: prerequisite })}
      >
        {T("تأیید", "Confirm")}
      </button>
      {task.status === "waiting" && (
        <button type="button" disabled={!canEdit} data-testid="task-waiting-clear" className={confirmClass} onClick={onClear}>
          {T("پاک کردن", "Clear")}
        </button>
      )}
    </div>
  );
}

function DraftField({ label, testId, canEdit, initial, onConfirm, T }: {
  label: string;
  testId: string;
  canEdit: boolean;
  initial?: string | null;
  onConfirm: (value: string) => void;
  T: (fa: string, en: string) => string;
}) {
  const dirty = useRef(false);
  const [value, setValue] = useState(initial || "");
  useEffect(() => {
    if (dirty.current) return;
    setValue(initial || "");
  }, [initial]);
  return (
    <div className={row} data-testid={testId}>
      <span className="shrink-0 font-medium text-foreground/90">{label}</span>
      <input
        value={value}
        disabled={!canEdit}
        aria-label={label}
        data-testid={`${testId}-input`}
        className={field}
        onChange={(event) => { dirty.current = true; setValue(event.target.value); }}
      />
      <button
        type="button"
        disabled={!canEdit}
        data-testid={`${testId}-confirm`}
        className={confirmClass}
        onClick={() => onConfirm(value.trim())}
      >
        {T("تأیید", "Confirm")}
      </button>
    </div>
  );
}

export function TaskConfirmedDrafts({ task, canEdit, onSmallStep, onIfThen, onDoneWhen, T }: {
  task: Pick<Task, "if_then" | "done_when">;
  canEdit: boolean;
  onSmallStep: (title: string) => void;
  onIfThen: (value: string) => void;
  onDoneWhen: (value: string) => void;
  T: (fa: string, en: string) => string;
}) {
  return (
    <>
      <DraftField label={T("گام کوچک", "Small step")} testId="task-small-step" canEdit={canEdit} onConfirm={onSmallStep} T={T} />
      <DraftField label={T("اگر/آنگاه", "If/then")} testId="task-if-then" canEdit={canEdit} initial={task.if_then} onConfirm={onIfThen} T={T} />
      <DraftField label={T("معیار پایان", "Done when")} testId="task-done-when" canEdit={canEdit} initial={task.done_when} onConfirm={onDoneWhen} T={T} />
    </>
  );
}
