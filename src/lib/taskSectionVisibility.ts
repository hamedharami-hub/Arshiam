/** An explicitly chosen task section remains visible, and existing content is never hidden. */
export function shouldShowTaskSection(selected: boolean | undefined, itemCount: number): boolean {
  return selected === true || itemCount > 0;
}
