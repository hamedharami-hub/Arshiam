/** Browser/PWA Back belongs to browser history, including keyboard shortcuts.
 * Do not push synthetic sentinel entries: they trap Back and corrupt router idx.
 * Android hardware Back is owned separately by AndroidBackButton.
 */
export default function BackButtonHandler() {
  return null;
}
