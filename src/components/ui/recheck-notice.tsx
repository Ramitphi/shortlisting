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

  const title =
    state === "ops"
      ? viewer === "ops"
        ? "Re-check needed — the learner changed their details"
        : `${who} changed their details — with Ops for a re-check`
      : viewer === "ac"
        ? `Ops raised ${comments} on ${who}'s changed details`
        : `With the counsellor — ${comments} to resolve with the learner`;

  const body =
    state === "ops"
      ? viewer === "ops"
        ? "These were vetted before the change. Read them again — clear the re-check if they're fine, or comment on the fields that aren't and send it to the counsellor. Until this is closed the learner cannot certify and the offer letter cannot go out."
        : "Their certification has been withdrawn. If Ops has comments it comes back to you to resolve with the learner; if not, the application picks up where it left off."
      : viewer === "ac"
        ? "Ops does not call the learner — you do. Work through each comment with them: anything they change comes straight back to Ops, and if nothing needs changing, tick the comments off and send it back yourself."
        : "You have commented and the counsellor is taking it to the learner. It comes back here when they've changed something or confirmed nothing needs changing.";

  const verdictLine =
    staleVerdicts > 0
      ? `${staleVerdicts} eligibility verdict${staleVerdicts === 1 ? "" : "s"} rested on what they changed${
          viewer === "ops"
            ? " — rule again before closing this, including on the shortlisted programme"
            : " and are being ruled again — the shortlisted programme could change"
        }.`
      : null;

  return (
    <div
      className={`card fade-up mb-5 p-5 ${
        mine ? "border-[#ecdfc0] bg-[#fbf7ec]" : "border-line bg-paper"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
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
              className={`text-[15px] font-medium ${
                mine ? "text-[#6f5624]" : "text-ink"
              }`}
            >
              {title}
            </div>
            <p
              className={`mt-1 text-[13.5px] leading-relaxed ${
                mine ? "text-[#8a6d2f]" : "text-body"
              }`}
            >
              {body}
            </p>
            {verdictLine && (
              <p
                className={`mt-2 text-[13.5px] font-medium leading-relaxed ${
                  mine ? "text-[#8a6d2f]" : "text-body"
                }`}
              >
                {verdictLine}
                {verdictHref && (
                  <>
                    {" "}
                    <a
                      href={verdictHref}
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      Rule on them now →
                    </a>
                  </>
                )}
              </p>
            )}
            {fields.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <li
                    key={f}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                      mine
                        ? "border-[#ecdfc0] bg-white text-[#8a6d2f]"
                        : "border-line bg-white text-body"
                    }`}
                  >
                    {f}
                  </li>
                ))}
              </ul>
            )}
            <p
              className={`mt-3 text-[12px] ${mine ? "text-[#a08442]" : "text-caption"}`}
            >
              Changed {at} UTC
            </p>
          </div>
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
