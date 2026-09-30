import { createContext, useContext, type ReactNode } from "react";
import { useFredPracticeState } from "./useFredPracticeState";

const FredPracticeContext = createContext<ReturnType<typeof useFredPracticeState> | null>(null);

/** Keeps exercises intact while the learner changes lessons or teaching tabs. */
export function FredPracticeProvider({ children }: { children: ReactNode }) {
  const model = useFredPracticeState();
  return <FredPracticeContext.Provider value={model}>{children}</FredPracticeContext.Provider>;
}

export function useFredPractice() {
  const model = useContext(FredPracticeContext);
  if (!model) throw new Error("FRED exercises require the practice workspace");
  return model;
}
