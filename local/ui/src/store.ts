// Small shared UI state that outlives the dock (it unmounts when the panel closes) and is read by
// the tool-options wrapper, which sits outside the dock's React tree.
import { useEffect, useState } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();

export const uiState = {
  collapsed: false,
  officialNoticeDismissed: false,
};

export function setUiState(change: Partial<typeof uiState>) {
  Object.assign(uiState, change);
  listeners.forEach((listener) => listener());
}

export function useUiState() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return uiState;
}
