"use client";

import { useEffect } from "react";

/**
 * Puts the `ug-app` theme class on <body> while a learner page is mounted.
 *
 * The theme was scoped to a wrapper div, which quietly excluded everything
 * rendered through a portal — the document viewer, the sign dialog, the
 * certify dialog all mount on document.body and were falling back to the
 * internal tool's warm palette. Theming the body means every EXISTING
 * component — dialogs, inputs, buttons, chips, toasts — wears the upGrad
 * skin with no forks and no v2 copies.
 */
export function UgBody() {
  useEffect(() => {
    document.body.classList.add("ug-app");
    return () => document.body.classList.remove("ug-app");
  }, []);
  return null;
}
