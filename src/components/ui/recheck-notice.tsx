import type { RecheckState } from "@/lib/domain";
import { IconAlert, IconRefresh } from "./icons";

/**
 * The learner changed a detail after the form was vetted, so the application
 * is in a re-check.
 *
 * One component, four readings, because the same fact means a different job
 * depending on who is looking and whose move it is:
 *
 *   Ops, state ops → re-read the changed fields, then clear it or comment
 *   Ops, state ac  → you commented; the counsellor has it
 *   AC,  state ops → the learner changed something; Ops is re-reading it
 *   AC,  state ac  → Ops' comments are yours to resolve with the learner
 *
 * The changed labels are always listed. "The learner edited something" sends
 * a reviewer back through the whole form, which is how re-checks get skipped.
 */
export function RecheckNotice({
  fields,
  at,
  state,
  viewer,
  learnerName,
  openRemarks = 0,
  staleVerdicts = 0,
  verdictHref,
  action,
}: {
  /** The field labels the learner changed. */
  fields: string[];
  /** When the change landed. */
  at: string;
  state: RecheckState;
  viewer: "ops" | "ac";
  learnerName?: string;
  /** Ops' comments still open on this application. */
  openRemarks?: number;
  /**
   * Eligibility verdicts made against answers the learner has since changed.
   * The loud case: the programme they were shortlisted for may no longer be
   * open to them, which is not something a reviewer should have to infer.
   */
  staleVerdicts?: number;
  /** Where the verdicts are ruled — the reader should not have to hunt. */
  verdictHref?: string;
  /** The control that moves it on, rendered by whoever's move it is. */
  action?: React.ReactNode;
}) {
  const mine = state === viewer;
  const who = learnerName ?? "The learner";
  // A count of zero means the comments predate this change (data from an
  // earlier round trip): say "comments" rather than claim a wrong number.
  const comments =
    openRemarks > 0
      ? `${openRemarks} comment${openRemarks === 1 ? "" : "s"}`
      : "comments";

  // ONE line — the changed fields are pinned on the fields themselves and
  // the full story is in the Activity timeline, so the banner only has to
  // say whose move it is.
  const title =
    state === "ops"
      ? viewer === "ops"
        ? `Re-check — ${who} changed ${fields.length || "some"} detail${fields.length === 1 ? "" : "s"} after vetting`
        : `${who} changed ${fields.length || "some"} detail${fields.length === 1 ? "" : "s"} — with Ops for a re-check`
      : viewer === "ac"
        ? `Re-check — resolve Ops' ${comments} on ${who}'s change with the learner`
        : `Re-check with the counsellor — ${comments} to resolve with the learner`;

  return (
    <div
      className={`card fade-up mb-5 px-5 py-4 ${
        mine ? "border-[#ecdfc0] bg-[#fbf7ec]" : "border-line bg-paper"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              mine ? "bg-[#f6efdd] text-[#8a6d2f]" : "bg-cream text-body"
            }`}
          >
            {mine ? (
              <IconAlert className="h-4 w-4" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <div
              className={`text-[14.5px] font-medium ${
                mine ? "text-[#6f5624]" : "text-ink"
              }`}
            >
              {title}
            </div>
            <p
              className={`mt-0.5 text-[12.5px] ${
                mine ? "text-[#a08442]" : "text-caption"
              }`}
            >
              Changed fields carry a yellow marker · details in the Activity
              timeline
              {staleVerdicts > 0 && (
                <>
                  {" · "}
                  <b className={mine ? "text-[#8a6d2f]" : "text-body"}>
                    {staleVerdicts} verdict{staleVerdicts === 1 ? "" : "s"} to
                    re-rule
                  </b>
                  {verdictHref && (
                    <>
                      {" "}
                      <a
                        href={verdictHref}
                        className="underline underline-offset-2 hover:no-underline"
                      >
                        rule now →
                      </a>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
