import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { SectionCard, SettingRow } from "./SectionCard";
import { setShowCompletedTasks, useShowCompletedTasks } from "@/lib/completedTaskVisibility";

export function CompletedTasksSettings() {
  const { t } = useTranslation();
  const showCompleted = useShowCompletedTasks();

  return (
    <SectionCard
      icon={Eye}
      title={t("settings.completedTasksTitle")}
      description={t("settings.completedTasksDesc")}
    >
      <SettingRow label={t("settings.showCompletedTasks")}>
        <Switch
          checked={showCompleted}
          onCheckedChange={setShowCompletedTasks}
          aria-label={t("settings.showCompletedTasks")}
          data-testid="show-completed-tasks-setting"
        />
      </SettingRow>
    </SectionCard>
  );
}
