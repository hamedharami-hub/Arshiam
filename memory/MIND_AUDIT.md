# Mind page clean-up report

Scope of review: code-level review of each existing Mind item (does it map to a topic, are fa/en texts present, is scoring covered by tests).
NOT done: clinical/content review of the long assessments (HEXACO, VIA, attachment, Life Architect, About-me) — they were only mapped, not rewritten.

## Kept and placed in the tree (nothing deleted; users' saved results untouched)
| Existing item | Where it lives now |
|---|---|
| Mood & energy check-in | Mood > Sadness, Stress; Body > Energy; Daily check-in quick tool |
| Calm / guided breathing | Mood > Anxiety, Anger; Body > Tension, Sleep; Planning > Focus |
| Sleep sounds | Body > Sleep |
| Thought record (+ABC, already merged into it) | Problem > Stuck / Fear of mistake; Mood > Anxiety, Anger, Guilt, Self-esteem; Relationships |
| Worry tree | Problem > Stuck; Mood > Anxiety |
| Values & goals, Life Architect, Self-knowledge, About-me | Growth > Purpose, Identity, Life change; Work > Career path |
| Cycle tracker | Body > Monthly cycle |
| Trends & check-ups | Mood > Sadness |
| PHQ-9, GAD-7, WHO-5 (unchanged scoring) | Mood > Sadness / Anxiety; Body > Energy |
| Burnout screener | Work > Burnout; Mood > Stress |
| Pomodoro, Diary, Planning, Kanban, Knowledge, Today | linked as "related tools" |

## Edited
- Burnout screener item 5 (fa): awkward wording rewritten ("انرژی‌ام ته کشیده و در برابر فشار آسیب‌پذیرم").

## Removed
- Nothing was removed from menus or the library: every existing tool mapped to at least one topic and none was a duplicate.
- The old `/app/mind/socratic` redirect route is kept so old bookmarks keep working.

## Added
- 9 categories, 51 topics (some with a third "details" level), 39 methods (problem solving, planning, mood, relationships, body, growth, daily life).
- 9 short non-diagnostic self-checks: stress, procrastination, self-worth, loneliness, sleep quality, decision style, planning habits, relationship satisfaction, clarity of values (original wording, labelled "not a standard instrument").
- AI assistant (user's own key) + offline fallback, sessions in "My needs", suggestion -> task/note/habit, fixed safety notice (no phone numbers).
