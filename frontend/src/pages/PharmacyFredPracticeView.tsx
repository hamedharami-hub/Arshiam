import { useInRouterContext } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FredPracticeProvider } from "@/components/pharmacy/fred/FredPracticeContext";
import { FredRoutedWorkspace, FredStandaloneWorkspace } from "@/components/pharmacy/fred/FredLearningWorkspace";

export default function PharmacyFredPracticeView() {
  const { user } = useAuth();
  const inRouter = useInRouterContext();
  const userId = user?.id ?? "guest";
  return <FredPracticeProvider key={userId}>{inRouter ? <FredRoutedWorkspace userId={userId} /> : <FredStandaloneWorkspace userId={userId} />}</FredPracticeProvider>;
}
