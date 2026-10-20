// Small shared UI state that outlives the dock (it unmounts when the panel closes) and is read by
// the tool-options wrapper, which sits outside the dock's React tree.
import { useEffect, useState } from "react";
import { Rect } from "layout";

type Listener = () => void;

const listeners = new Set<Listener>();

// The floating window's state is the UI's alone, so it lives in localStorage (as Parking Lot
// Tool's window does), not in Find It's settings file. Rects are in rem, per screen shape.
const STORAGE_KEY = "FindItLocal.window";

type SavedWindow = { floating: boolean; rects: Record<string, Rect> };

function loadWindow(): SavedWindow {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : null;

    if (value && typeof value === "object") {
      return { floating: value.floating === true, rects: value.rects && typeof value.rects === "object" ? value.rects : {} };
    }
  } catch {
    // no storage, or a broken value: start docked
  }

  return { floating: false, rects: {} };
}

const saved = loadWindow();

export const uiState = {
  collapsed: false,
  officialNoticeDismissed: false,
  floating: saved.floating,
  rects: saved.rects as Record<string, Rect>,
};

export function setUiState(change: Partial<typeof uiState>) {
  Object.assign(uiState, change);

  if ("floating" in change || "rects" in change) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ floating: uiState.floating, rects: uiState.rects }));
    } catch {
      // not saved; the window still works for this session
    }
  }

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
