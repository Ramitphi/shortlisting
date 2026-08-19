/**
 * The AI's one-liner under an uploaded document — the "AI vet compares the
 * doc to the manually filled fields" box from the journey diagram, counsellor's
 * edition (the learner never sees these): a quick read of whether the document and the application agree,
 * and a heads-up when a field is probably wrong.
 *
 * Deterministic on purpose (it reads the form responses, not the file): the
 * same upload always says the same thing, which is what a demo needs.
 */

export interface DocInsight {
  text: string;
  /** ok = reassurance, warn = a field is probably wrong. */
  tone: "ok" | "warn";
}

export function docInsight(
  docKey: string,
  responses: Record<string, string>,
  learnerName: string
): DocInsight | null {
  const r = (k: string) => (responses[k] ?? "").trim();

  switch (docKey) {
    case "doc_10_marksheet": {
      const score = r("score_10");
      if (!score)
        return {
          tone: "ok",
          text: "Legible scan — the Class 10 score can be read off this marksheet.",
        };
      return Number(score) < 40
        ? {
            tone: "warn",
            text: `The application says Class 10: ${score}% — that looks low for this marksheet. Worth double-checking.`,
          }
        : {
            tone: "ok",
            text: `Matches the application — Class 10 reads ${score}%.`,
          };
    }
    case "doc_12_marksheet": {
      const score = r("score_12");
      return score
        ? {
            tone: "ok",
            text: `Matches the application — Class 12 reads ${score}%.`,
          }
        : {
            tone: "warn",
            text: "Class 12 score is not on the application yet — read it off this marksheet.",
          };
    }
    case "doc_ug_degree":
    case "doc_ug_marksheet": {
      const uni = r("bachelor_university");
      const score = r("bachelor_score");
      if (uni && score)
        return {
          tone: "ok",
          text: `Consistent with the application — ${uni}, ${score}%.`,
        };
      return {
        tone: "warn",
        text: "University or score still blank on the application — check them against this document.",
      };
    }
    case "doc_score_card":
      return {
        tone: "ok",
        text: "English test scorecard on file — universities see this exact document.",
      };
    case "doc_sop_1": {
      const degree = r("degree_level");
      return {
        tone: "ok",
        text: degree
          ? `Reads plausibly for a ${degree} application — skim before submitting.`
          : "Reads plausibly — skim before submitting.",
      };
    }
    case "doc_passport": {
      const name = r("full_name") || learnerName;
      return {
        tone: "warn",
        text: `Check the passport name against the application — it is filed as “${name}”.`,
      };
    }
    case "doc_aadhaar": {
      const dob = r("dob");
      return dob
        ? {
            tone: "ok",
            text: `Application DOB is ${dob} — confirm it matches this card exactly.`,
          }
        : {
            tone: "warn",
            text: "DOB missing on the application — it must match this card exactly.",
          };
    }
    case "doc_work_ex": {
      const months = Number(r("work_exp_months") || 0);
      return months === 0
        ? {
            tone: "warn",
            text: "Application lists 0 months of experience — either this document is unnecessary, or that field is wrong.",
          }
        : {
            tone: "ok",
            text: `Consistent with the ${months} months of experience on the application.`,
          };
    }
    case "doc_gre":
      return {
        tone: "ok",
        text: "Optional test score attached — strengthens the USA options.",
      };
    default:
      return null;
  }
}

/**
 * The same AI vet, pointed at the FIELDS: on the Ops vetting view each field
 * that has a document counterpart gets a one-liner comparing the two — fill
 * hints for the ops-owned fields, cross-check nudges for identity fields.
 * Only speaks when the counterpart document is actually uploaded.
 */
export function fieldInsight(
  fieldKey: string,
  responses: Record<string, string>,
  uploaded: ReadonlySet<string>
): DocInsight | null {
  const r = (k: string) => (responses[k] ?? "").trim();

  switch (fieldKey) {
    case "full_name":
      if (!uploaded.has("doc_passport")) return null;
      return {
        tone: "warn",
        text: "Cross-check against the uploaded passport — the name must match it exactly.",
      };
    case "dob":
      if (!uploaded.has("doc_aadhaar")) return null;
      return r("dob")
        ? {
            tone: "ok",
            text: "Aadhaar is on file — the AI vet finds no mismatch with this date.",
          }
        : {
            tone: "warn",
            text: "Aadhaar is on file — read the date of birth off it.",
          };
    case "score_10":
      if (!uploaded.has("doc_10_marksheet")) return null;
      return r("score_10")
        ? {
            tone: "ok",
            text: `Consistent with the uploaded 10th marksheet (${r("score_10")}%).`,
          }
        : {
            tone: "warn",
            text: "The 10th marksheet is uploaded — the AI vet reads the score there; fill it in.",
          };
    case "score_12":
      if (!uploaded.has("doc_12_marksheet")) return null;
      return r("score_12")
        ? {
            tone: "ok",
            text: `Consistent with the uploaded 12th marksheet (${r("score_12")}%).`,
          }
        : {
            tone: "warn",
            text: "The 12th marksheet is uploaded — read the score off it.",
          };
    case "bachelor_score":
      if (!uploaded.has("doc_ug_marksheet")) return null;
      return r("bachelor_score")
        ? {
            tone: "ok",
            text: `Consistent with the UG marksheet (${r("bachelor_score")}%).`,
          }
        : {
            tone: "warn",
            text: "UG marksheet is uploaded — the score is readable there.",
          };
    case "bachelor_university":
      if (!uploaded.has("doc_ug_degree")) return null;
      return r("bachelor_university")
        ? {
            tone: "ok",
            text: `Matches the uploaded UG degree (${r("bachelor_university")}).`,
          }
        : {
            tone: "warn",
            text: "UG degree certificate is uploaded — the university reads off it.",
          };
    case "work_exp_months": {
      if (!uploaded.has("doc_work_ex")) return null;
      const months = Number(r("work_exp_months") || 0);
      return months === 0
        ? {
            tone: "warn",
            text: "A work-experience document is uploaded but the form says 0 months — one of the two is wrong.",
          }
        : {
            tone: "ok",
            text: `Work-experience document supports the ${months} months entered.`,
          };
    }
    default:
      return null;
  }
}
