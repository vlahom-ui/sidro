"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ConfirmState {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (value: boolean) => void;
}

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Zamjena za window.confirm() — isti "await odluku korisnika" API (poziv
 * vraća Promise<boolean>), ali kao in-app modal umjesto sinkronog dijaloga
 * preglednika, dosljedan ostatku dizajna.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        message,
        confirmLabel: options?.confirmLabel ?? "Potvrdi",
        cancelLabel: options?.cancelLabel ?? "Odustani",
        resolve,
      });
    });
  }, []);

  function respond(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  useEffect(() => {
    if (!state) return;
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") respond(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const ConfirmDialog = state ? (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4"
    >
      <div className="bg-bg text-navy border border-navy/20 rounded max-w-sm w-full p-5 flex flex-col gap-4 shadow-lg">
        <p className="text-sm whitespace-pre-line">{state.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => respond(false)}
            className="rounded px-4 py-2 border border-navy/30 font-bold text-sm"
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            className="btn-alert rounded px-4 py-2 font-bold text-sm"
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
