import * as React from "react";
import { AutoTextarea, type AutoTextareaProps } from "@/components/ui/auto-textarea";

/**
 * Task titles are multiline: rows={1} is only the initial height. Enter inserts
 * a newline, never saves/closes; the caller saves on blur. IME confirmation
 * (including Safari's keyCode 229 fallback) must not reach save/close shortcuts.
 */
export const TaskTitleInput = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ onKeyDown, ...props }, ref) => (
    <AutoTextarea
      {...props}
      ref={ref}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === "Enter") {
          event.stopPropagation();
          // Do not preventDefault: the textarea and IME keep their native behavior.
          return;
        }
        onKeyDown?.(event);
      }}
    />
  ),
);
TaskTitleInput.displayName = "TaskTitleInput";
