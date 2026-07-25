import { useCallback, useState } from "react";

/** Shared clipboard-copy-with-toast behavior for feed URL "Copy" actions
 * (feed list rows and the feed editor's public/private URL buttons). */
export function useCopyToClipboard() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const copy = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setToastMessage(`${label} copied to clipboard`);
  }, []);

  return { toastMessage, setToastMessage, copy };
}
