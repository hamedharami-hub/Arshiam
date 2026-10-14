import { z } from "zod";

export const MIND_SESSION_SCHEMA_VERSION = 1 as const;
const id = z.string().min(1);
const timestamp = z.number().finite().nonnegative().max(8640000000000000);
export interface MindLegacyRef { collection: string; recordId: string; ownerId: string }
export const legacyRefSchema = z.object({
  collection: id, recordId: id, ownerId: id,
}).strict().transform((value): MindLegacyRef => value as MindLegacyRef);
const answer: z.ZodType<MindAnswer> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(),
  z.array(answer), z.record(answer),
]));
export type MindAnswer = string | number | boolean | null | MindAnswer[] | { [key: string]: MindAnswer };
/** Explicit required fields: Zod's inferred optionality depends on strictNullChecks. */
export interface MindSession {
  id: string;
  ownerId: string;
  schemaVersion: typeof MIND_SESSION_SCHEMA_VERSION;
  revision: number;
  language: "fa" | "en" | null;
  createdAt: number;
  updatedAt: number;
  text: string;
  goal: "calm" | "clarify" | "step" | null;
  intensity: "short" | "explore" | null;
  status: "draft" | "paused" | "finished" | "archived";
  outcome?: "just_wrote" | "clearer" | "chose_step" | "set_aside";
  steps: {
    sessionId: string; toolId: string; toolVersion: string; stepId: string; slot: string;
    answers: Record<string, MindAnswer>; status: "draft" | "completed" | "skipped";
    legacyRef?: MindLegacyRef;
  }[];
  suggestions: {
    id: string; source: "local" | "ai"; reason: string; inputRevision: number;
    choice: "pending" | "selected" | "rejected"; text: string;
  }[];
  actions: {
    id: string; suggestionId: string; destination: "task" | "note" | "habit";
    destinationId: string | null; status: "pending" | "converted" | "failed";
  }[];
  feedback: {
    id: string; sessionId: string; toolId: string; toolVersion: string; at: number;
    response: "helpful" | "unchanged" | "unhelpful" | "uncomfortable" | "uncertain" | null;
    context?: Record<string, MindAnswer>;
  }[];
  legacyDraft?: {
    migrationVersion: 1; sourceKey: string; text: string; path: "think" | "worry" | null;
  };
}
export const mindSessionSchema = z.object({
  id, ownerId: id, schemaVersion: z.literal(MIND_SESSION_SCHEMA_VERSION),
  revision: z.number().int().positive(), language: z.enum(["fa", "en"]).nullable(),
  createdAt: timestamp, updatedAt: timestamp,
  text: z.string(), goal: z.enum(["calm", "clarify", "step"]).nullable(),
  intensity: z.enum(["short", "explore"]).nullable(),
  status: z.enum(["draft", "paused", "finished", "archived"]),
  outcome: z.enum(["just_wrote", "clearer", "chose_step", "set_aside"]).optional(),
  steps: z.array(z.object({
    sessionId: id, toolId: id, toolVersion: id, stepId: id, slot: id,
    answers: z.record(answer), status: z.enum(["draft", "completed", "skipped"]),
    legacyRef: legacyRefSchema.optional(),
  }).strict()),
  suggestions: z.array(z.object({
    id, source: z.enum(["local", "ai"]), reason: z.string(),
    inputRevision: z.number().int().positive(),
    choice: z.enum(["pending", "selected", "rejected"]), text: z.string(),
  }).strict()),
  actions: z.array(z.object({
    id, suggestionId: id, destination: z.enum(["task", "note", "habit"]),
    destinationId: id.nullable(), status: z.enum(["pending", "converted", "failed"]),
  }).strict()),
  feedback: z.array(z.object({
    id, sessionId: id, toolId: id, toolVersion: id, at: timestamp,
    response: z.enum(["helpful", "unchanged", "unhelpful", "uncomfortable", "uncertain"]).nullable(),
    context: z.record(answer).optional(),
  }).strict()),
  legacyDraft: z.object({
    migrationVersion: z.literal(1), sourceKey: id, text: z.string(),
    path: z.enum(["think", "worry"]).nullable(),
  }).strict().optional(),
}).strict().superRefine((session, ctx) => {
  const invalid = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (session.updatedAt < session.createdAt) invalid("Invalid timestamps");
  for (const items of [session.steps.map(s => s.stepId), session.suggestions.map(s => s.id),
    session.actions.map(a => a.id), session.feedback.map(f => f.id)]) {
    if (new Set(items).size !== items.length) invalid("Duplicate artifact identity");
  }
  if (new Set(session.steps.map(s => s.slot)).size !== session.steps.length) invalid("Duplicate tool slot");
  for (const step of session.steps) {
    if (step.sessionId !== session.id || (step.legacyRef && step.legacyRef.ownerId !== session.ownerId)) invalid("Foreign step");
  }
  for (const suggestion of session.suggestions) {
    if (suggestion.inputRevision > session.revision) invalid("Future suggestion revision");
  }
  const destinations = new Set<string>();
  for (const action of session.actions) {
    if (!session.suggestions.some(s => s.id === action.suggestionId)) invalid("Missing suggestion");
    const identity = `${action.suggestionId}:${action.destination}`;
    if (destinations.has(identity)) invalid("Duplicate conversion reference");
    destinations.add(identity);
    if (action.status === "converted" && !action.destinationId) invalid("Missing destination");
  }
  for (const feedback of session.feedback) {
    if (feedback.sessionId !== session.id || !session.steps.some(s => s.toolId === feedback.toolId && s.toolVersion === feedback.toolVersion)) invalid("Foreign feedback");
  }
}).transform((value): MindSession => value as MindSession);
/** UI state, not content status. Local storage never produces `synced`. */
export type MindPersistenceStatus = "dirty" | "saving" | "device-saved" | "synced" | "conflict" | "failed";
export type MindResult<T> = { ok: true; value: T } | { ok: false; reason: string };
export type MindSaveResult = { ok: true; session: MindSession } | {
  ok: false; reason: string; current?: MindSession; proposed?: MindSession; preserved?: boolean;
};
