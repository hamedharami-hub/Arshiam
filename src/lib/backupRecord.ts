/**
 * Makes a backup row safe to write into the current user's Firestore space
 * without changing its stable id or application revision timestamp.
 */
export function prepareFirestoreBackupRecord(
  record: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  const { _graceUntil: _transientGraceUntil, ...persistedFields } = record;
  return omitUndefinedBackupValues({
    ...persistedFields,
    id: record.id,
    user_id: userId,
  }) as Record<string, unknown>;
}

function omitUndefinedBackupValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Firestore arrays cannot contain `undefined`; JSON backups represent
    // those slots as null, so keep their positions stable.
    return value.map((item) => item === undefined ? null : omitUndefinedBackupValues(item));
  }
  if (!value || typeof value !== "object") return value;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, omitUndefinedBackupValues(item)]),
  );
}
