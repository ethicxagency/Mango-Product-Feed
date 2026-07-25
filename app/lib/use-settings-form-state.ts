import { useEffect, useState } from "react";

/**
 * Local form state for a Settings section, kept in sync with the server
 * after a successful save.
 *
 * `useState(defaultValues)` alone has a bug here: its initializer only
 * runs on mount, so after Save succeeds local state never catches up with
 * what actually landed in the database — clicking "Reset" afterward would
 * revert to the *pre-save* values, not the just-saved ones.
 *
 * The natural fix — resyncing from `useLoaderData()` in a `useEffect` keyed
 * on `useActionData()` — has its own race: Remix updates action data and
 * revalidated loader data in separate renders, so the effect can fire
 * before the loader has caught up, using a stale snapshot, and then never
 * fires again (its dependency doesn't change on the later loader-only
 * render). Depending on `actionValues` returned directly by the action
 * response instead sidesteps that entirely — action data is always
 * internally consistent with itself in the same response, no cross-hook
 * ordering to race.
 */
export function useSettingsFormState<T>(
  defaultValues: T,
  actionValues: T | undefined,
) {
  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    if (actionValues !== undefined) setValues(actionValues);
    // Only resync when a new save response arrives, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionValues]);

  return [values, setValues] as const;
}
