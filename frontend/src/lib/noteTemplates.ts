export type NoteTemplateId = "meeting" | "weekly_review" | "lesson";

export type NoteTemplate = {
  id: NoteTemplateId;
  title: string;
  content: string;
};

/** Small starting outlines for notes. They never replace an existing note. */
export function getNoteTemplates(isEn: boolean): NoteTemplate[] {
  if (isEn) {
    return [
      {
        id: "meeting",
        title: "Meeting notes",
        content: "# Meeting notes\n\n**Date:**\n**Attendees:**\n\n## Agenda\n- \n\n## Notes\n\n\n## Decisions\n- \n\n## Action items\n- [ ] ",
      },
      {
        id: "weekly_review",
        title: "Weekly review",
        content: "# Weekly review\n\n## What went well?\n\n\n## What needs attention?\n\n\n## What did I learn?\n\n\n## Next week's focus\n- [ ] ",
      },
      {
        id: "lesson",
        title: "Lesson notes",
        content: "# Lesson notes\n\n**Subject:**\n**Source:**\n\n## Key ideas\n- \n\n## Questions\n- \n\n## Next steps\n- [ ] ",
      },
    ];
  }

  return [
    {
      id: "meeting",
      title: "یادداشت جلسه",
      content: "# یادداشت جلسه\n\n**تاریخ:**\n**شرکت‌کنندگان:**\n\n## دستور جلسه\n- \n\n## یادداشت‌ها\n\n\n## تصمیم‌ها\n- \n\n## کارهای پیگیری\n- [ ] ",
    },
    {
      id: "weekly_review",
      title: "مرور هفتگی",
      content: "# مرور هفتگی\n\n## چه چیزهایی خوب پیش رفت؟\n\n\n## چه چیزی نیاز به توجه دارد؟\n\n\n## چه چیزی یاد گرفتم؟\n\n\n## تمرکز هفتهٔ بعد\n- [ ] ",
    },
    {
      id: "lesson",
      title: "یادداشت درس",
      content: "# یادداشت درس\n\n**موضوع:**\n**منبع:**\n\n## نکته‌های کلیدی\n- \n\n## پرسش‌ها\n- \n\n## گام‌های بعدی\n- [ ] ",
    },
  ];
}
