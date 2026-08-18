import Link from "next/link";
import { FORM_FIELDS, FORM_SECTIONS } from "@/lib/domain";
import { DetailRows } from "./detail-rows";
import { LearnerDetailsForm } from "./details-form";

/**
 * The learner's details as upgrad.com profile cards — one card per section,
 * label/value rows, "(N details missing)", red Add on empty fields, and a
 * per-card Edit that swaps the rows for the form scoped to that section.
 *
 * ONE implementation, rendered by both Profile → Personal details and the v2
 * application's Personal Details tab. The two screens show the same data with
 * the same rules; a second copy of this markup is how they'd stop doing so.
 */

// The site's section names, mapped onto the form's sections.
const CARD_TITLES: Record<string, string> = {
  "Profile Data": "Personal details",
  "Academic Data": "Educational details",
  Financing: "Financing details",
};

export function ProfileSectionCards({
  responses,
  locked,
  editing,
  hrefFor,
  action,
}: {
  responses: Record<string, string>;
  /** Application completed — read-only everywhere. */
  locked: boolean;
  /** The section currently in edit mode, if any. */
  editing?: string | null;
  /** Href for a section's edit mode, or for read mode when section is null. */
  hrefFor: (section: string | null) => string;
  /** The bound updateLearnerDetails action. */
  action: (formData: FormData) => void;
}) {
  return (
    <>
      {FORM_SECTIONS.map((section) => {
        // Files live in the Documents locker; Ops-derived fields render as
        // read-only rows rather than editable ones.
        const fields = FORM_FIELDS.filter(
          (f) => f.section === section && f.type !== "file"
        );
        const missing = fields.filter(
          (f) => f.filledBy !== "ops" && !(responses[f.key] ?? "").trim()
        ).length;
        const isEditing = editing === section;

        return (
          <div key={section} className="card mt-5 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-[18px] font-medium">
                  {CARD_TITLES[section] ?? section}
                </h2>
                {missing > 0 && !isEditing && (
                  <span className="text-[13px] font-medium text-accent">
                    ({missing} detail{missing === 1 ? "" : "s"} missing)
                  </span>
                )}
              </div>
              {!locked &&
                (isEditing ? (
                  <Link
                    href={hrefFor(null)}
                    className="text-[14px] font-medium text-body hover:text-ink"
                  >
                    Cancel
                  </Link>
                ) : (
                  <Link
                    href={hrefFor(section)}
                    className="text-[14px] font-medium text-accent hover:underline"
                  >
                    Edit
                  </Link>
                ))}
            </div>

            {isEditing ? (
              <div className="mt-4">
                <LearnerDetailsForm
                  initial={responses}
                  locked={false}
                  lockedReason=""
                  action={action}
                  only={section}
                  hideFiles
                />
              </div>
            ) : (
              <div className="mt-2">
                <DetailRows
                  fields={fields}
                  responses={responses}
                  empty={(f) =>
                    f.filledBy === "ops" || locked ? undefined : (
                      <Link
                        href={hrefFor(section)}
                        className="text-[15px] font-medium text-accent hover:underline"
                      >
                        Add
                      </Link>
                    )
                  }
                />
              </div>
            )}
          </div>
        );
      })}
      {!locked && (
        <p className="mt-4 text-[12.5px] text-caption">
          Changing a detail after certifying withdraws the certification — it
          will need to be given again.
        </p>
      )}
    </>
  );
}
