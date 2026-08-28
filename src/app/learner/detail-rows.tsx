import { VerifiedSeal } from "@/components/ui";
import type { FieldDef } from "@/lib/domain";

/**
 * The upGrad profile row: label on the left, value on the right, a divider
 * between rows. One implementation shared by the Profile cards and step 1 of
 * the review walk — the walk exists so the learner reads exactly what their
 * profile holds, so the two must never drift apart.
 */
export function DetailRows({
  fields,
  responses,
  empty,
}: {
  fields: FieldDef[];
  responses: Record<string, string>;
  /** What an empty row offers — Profile shows a red Add link; the walk a dash. */
  empty?: (f: FieldDef) => React.ReactNode;
}) {
  return (
    <div className="divide-y divide-line">
      {fields.map((f) => {
        const value = (responses[f.key] ?? "").trim();
        return (
          <div
            key={f.key}
            className="flex items-center justify-between gap-6 py-4"
          >
            {/* The seal sits with the LABEL, the way it does on the staff
                boards — trailing the value left one ragged right edge, with
                the numbers stopping at a different x on every checked row. */}
            <span className="flex min-w-0 items-center gap-2 text-[15px] text-body">
              <span className="min-w-0">{f.label}</span>
              {f.filledBy === "ops" && (
                <VerifiedSeal
                  verified
                  label="Verified by the upGrad team from your documents"
                />
              )}
            </span>
            {value ? (
              <span className="text-right text-[15px] font-medium text-ink">
                {value}
              </span>
            ) : (
              (empty?.(f) ?? <span className="text-[15px] text-caption">—</span>)
            )}
          </div>
        );
      })}
    </div>
  );
}
