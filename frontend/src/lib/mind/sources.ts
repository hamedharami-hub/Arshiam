/** Shared action provenance; this registry grants no access to private session data. */
export const MIND_ACTION_SOURCES = ["cbt_thought", "abc_model", "worry_tree", "mind_need", "values_goal"] as const;
export type MindActionSource = typeof MIND_ACTION_SOURCES[number];
