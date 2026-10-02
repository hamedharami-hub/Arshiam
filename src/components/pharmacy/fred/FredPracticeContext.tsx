import { createContext, useContext, useState, type ReactNode } from "react";
import { useFredPracticeState } from "./useFredPracticeState";
import type { FredLabelDraft } from "@/lib/pharmacyFredWorkflow";

const FredPracticeContext = createContext<ReturnType<typeof useFredPracticeState> | null>(null);

/** Keeps exercises intact while the learner changes lessons or teaching tabs. */
export function FredPracticeProvider({ children }: { children: ReactNode }) {
  const model = useFredPracticeState();
  const workflow = useState<WorkflowState>({ scriptId: "", labels: {}, step: "label" });
  return <FredPracticeContext.Provider value={model}><WorkflowContext.Provider value={workflow}>{children}</WorkflowContext.Provider></FredPracticeContext.Provider>;
}

export interface WorkflowState { scriptId: string; labels: Record<string, FredLabelDraft>; step: string }
const WorkflowContext = createContext<ReturnType<typeof useState<WorkflowState>> | null>(null);

/** Workflow panel state lives above the lessons so edits survive switching lessons. */
export function useFredWorkflowState() {
  const value = useContext(WorkflowContext);
  if (!value) throw new Error("FRED exercises require the practice workspace");
  return value as [WorkflowState, React.Dispatch<React.SetStateAction<WorkflowState>>];
}

export function useFredPractice() {
  const model = useContext(FredPracticeContext);
  if (!model) throw new Error("FRED exercises require the practice workspace");
  return model;
}
