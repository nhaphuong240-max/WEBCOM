/** Tiny id helper — avoids depending on shared-kernel from themes package. */
export function createId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
