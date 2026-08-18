import type { DocRow, Signee } from "@/components/ui";
import { SHORTLISTING_DOCS } from "./domain";
import type { Application, Doc, LearnerDoc } from "./queries";

/**
 * The checklist joined to whatever has actually been uploaded. Every slot
 * appears whether or not it is filled — the missing ones are the reason the
 * table exists. Only the shortlisting-stage slots render in this flow; the
 * rest of the admissions checklist belongs to later stages.
 */
export function docRows(stored: Record<string, LearnerDoc>): DocRow[] {
  return SHORTLISTING_DOCS.map((d) => {
    const row = stored[d.key];
    return {
      key: d.key,
      type: d.type,
      label: d.label,
      category: d.category,
      optional: d.optional,
      filename: row?.filename,
      verification: row?.verification ?? "pending",
      uploadedByName: row?.uploaded_by_name,
      uploadedAt: row?.uploaded_at,
      verifiedByName: row?.verified_by_name,
      verifiedAt: row?.verified_at,
      reason: row?.reason,
    };
  });
}

/**
 * The parties on an undertaking, built the same way for every role so the
 * learner, counsellor and Ops all see an identical document.
 */
export function signeesFor(
  app: Application,
  responses: Record<string, string>,
  doc: Doc
): Signee[] {
  const learnerName = responses.full_name || app.learner_name || "The learner";
  const guardianName = responses.guardian_name;
  const guardianEmail = responses.guardian_email;

  const signees: Signee[] = [
    {
      role: "Learner",
      name: learnerName,
      email: app.learner_email ?? "—",
      onBehalfOf: guardianName ? `${learnerName} (minor)` : "Themselves",
      signs: true,
      signedAt: doc.signed_at,
      signatureName: doc.signature_name,
    },
  ];

  // Under-18 applications carry the guardian on the record.
  if (guardianName || guardianEmail) {
    signees.push({
      role: "Parent / Legal Guardian",
      name: guardianName || "—",
      email: guardianEmail || "—",
      onBehalfOf: learnerName,
      signs: false,
    });
  }

  signees.push({
    role: "Academic Counsellor",
    name: app.ac_name ?? "—",
    email: app.ac_email ?? "—",
    onBehalfOf: "upGrad",
    signs: false,
  });

  return signees;
}
