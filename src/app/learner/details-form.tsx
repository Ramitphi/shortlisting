"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  COUNTRIES,
  COUNTRY_FLAGS,
  FORM_FIELDS,
  FORM_SECTIONS,
  type FieldDef,
} from "@/lib/domain";
import {
  DocumentDialog,
  FileTile,
  useToast,
  IconCheck,
  IconDoc,
  IconPlus,
  IconShield,
  IconTrash,
  VerifiedSeal,
} from "@/components/ui";

type Values = Record<string, string>;

// The capture's OWN field classes, verbatim — definitions ship in
// /upgrad/site.css, which the learner shell loads. This form only ever
// renders on the learner side, so the site's classes always resolve.
const inputCls =
  "placeholder-greyscale-9 h-48px border-info-label-bg-text rounded-lg border px-spacing12 py-spacing10 w-full text-black-russian text-fontSize14 font-normal outline-none focus:border-primary bg-white";

/**
 * A document slot. Empty slots invite an upload; filled ones stay neutral —
 * green would imply "approved" when it only means "present" — and offer View,
 * Replace and Remove.
 */
/**
 * The learner's own view of their details — the same fields the counsellor
 * filled, editable by the learner until they sign anything. Fields Ops derives
 * from documents stay read-only.
 */
export function LearnerDetailsForm({
  initial,
  locked,
  lockedReason,
  action,
  only,
  hideFiles = false,
  doneHref,
}: {
  initial: Values;
  locked: boolean;
  lockedReason: string;
  action: (formData: FormData) => void;
  /**
   * Render a single FORM_SECTIONS entry, for embedding in a per-section card
   * (the upGrad profile gives each section its own card and its own Edit).
   * Safe because the save action skips fields that were not posted, so
   * submitting one section never clears another.
   */
  only?: string;
  /** Uploads live in the Documents locker now — hide the in-form file tiles. */
  hideFiles?: boolean;
  /**
   * Where to go once it saves. Edit mode is a URL state, so without this the
   * card stays open after saving with "Cancel" as its only way out — which
   * reads like the save did not take.
   */
  doneHref?: string;
}) {
  const [v, setV] = useState<Values>(initial);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const set = (k: string, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    setDirty(true);
  };

  const renderField = (f: FieldDef) => {
    const opsOwned = f.filledBy === "ops";
    const value = v[f.key] ?? "";
    const readOnly = locked || opsOwned;

    if (f.type === "file") {
      return (
        <FileTile
          label={f.label}
          value={value}
          disabled={readOnly}
          onChange={(val) => set(f.key, val)}
        />
      );
    }

    return (
      <>
        {/* The capture's label markup, verbatim. */}
        <label className="text-info-label-bg-text text-fontSize14 font-normal mb-spacing4 block">
          {f.label}
          {f.required && (
            <sup className="text-application-card-ungency-text">*</sup>
          )}
          {opsOwned && (
            <VerifiedSeal
              verified
              label="Verified by the upGrad team from your documents"
              className="ml-1.5 align-middle"
            />
          )}
        </label>
        {readOnly ? (
          /* The same box as every editable field beside it, in a muted
             fill — a bare line of text among bordered inputs read as a
             field that had failed to render rather than one that is
             simply not the learner's to change. */
          <div className="flex h-[48px] items-center rounded-lg border border-line bg-muted px-3 text-[14px] text-ink">
            {value || <span className="text-caption">—</span>}
          </div>
        ) : f.key === "countries" ? (
          /* Free text invited "America" — a single dropdown over the
             catalogue's own countries. One pick; a legacy multi-value shows
             as unselected until the learner picks. */
          <select
            value={COUNTRIES.includes(value as (typeof COUNTRIES)[number]) ? value : ""}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          >
            <option value="">Select a country…</option>
            {COUNTRIES.map((o) => (
              <option key={o} value={o}>
                {COUNTRY_FLAGS[o] ? `${COUNTRY_FLAGS[o]} ` : ""}{o}
              </option>
            ))}
          </select>
        ) : f.type === "select" && f.options ? (
          <select
            value={value}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          >
            <option value="">Select…</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            // Numbers render as numbers here too, with the same bounds the
            // counsellor's form enforces — a percentage over 100 is a typo
            // whichever side of the desk types it.
            type={
              f.type === "month"
                ? "month"
                : f.type === "date"
                  ? "date"
                  : f.type === "number"
                    ? "number"
                    : "text"
            }
            min={f.type === "number" ? f.min : undefined}
            max={f.type === "number" ? f.max : undefined}
            value={value}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          />
        )}
      </>
    );
  };

  return (
    <form
      action={async (formData: FormData) => {
        setDirty(false);
        toast("Details updated");
        await action(formData);
        if (doneHref) router.push(doneHref, { scroll: false });
        router.refresh();
      }}
    >
      {/* Every editable value in scope rides along, including untouched ones.
          Scoped to `only` when set — posting just this section's fields, so
          the action leaves every other section exactly as it was. */}
      {FORM_FIELDS.filter(
        (f) =>
          f.filledBy !== "ops" &&
          (!only || f.section === only) &&
          (!hideFiles || f.type !== "file")
      ).map((f) => (
        <input key={f.key} type="hidden" name={f.key} value={v[f.key] ?? ""} />
      ))}

      {locked && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[12.5px] text-body">
          <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caption" />
          {lockedReason}
        </div>
      )}

      {FORM_SECTIONS.filter((s) => !only || s === only).map((section) => {
        const fields = FORM_FIELDS.filter((f) => f.section === section);
        const uploads = hideFiles ? [] : fields.filter((f) => f.type === "file");
        const plain = fields.filter((f) => f.type !== "file");
        return (
          <div key={section} className="mb-7 last:mb-0">
            {/* Inside a per-section card the card already carries the title */}
            {!only && (
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                {section}
              </h3>
            )}
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              {plain.map((f) => (
                <div key={f.key}>{renderField(f)}</div>
              ))}
            </div>

            {uploads.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                  <IconDoc className="h-3.5 w-3.5" />
                  Documents
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {uploads.map((f) => (
                    <div key={f.key}>{renderField(f)}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!locked && (
        <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
          <button className="btn-primary" disabled={!dirty}>
            Save changes
          </button>
          <span className="text-[12px] text-caption">
            {dirty
              ? "You have unsaved changes."
              : "Your counsellor is notified of any change."}
          </span>
        </div>
      )}
    </form>
  );
}
