/**
 * Small bridges between Mongoose query results and the plain types in `./types`.
 * Pair with `toPlain` / `toPlainList` from `./models`.
 */

/** Raw `.lean()` result shape — still carries `_id`. */
export type LeanDoc = Record<string, unknown>;

/** `_id` of a document returned by `Model.create()`. */
export function insertedId(doc: unknown): string {
  const id = (doc as { _id?: unknown } | null | undefined)?._id;
  if (id == null) {
    throw new Error('Mongoose create() returned a document without an _id.');
  }
  return String(id);
}
