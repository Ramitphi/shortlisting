/**
 * The demo dataset — one learner per state.
 *
 * Lives here rather than in the CLI script so the app's "Reset demo data"
 * action and `npm run seed` run the same code. Two copies of a seed drift,
 * and a drifted seed writes states the UI no longer understands.
 */
function seedDemo(db) {
  db.pragma("foreign_keys = ON");
  const ARJUN = 2; // Academic Counsellor
  const OMAR = 4; // Ops

  // Clear everything except users, then rebuild applications from scratch.
  // Resetting the autoincrement counters keeps demo ids readable (applications 1-6).
  db.exec(`
    DELETE FROM offer_letters;
    DELETE FROM page_views;
    DELETE FROM events;
    DELETE FROM notifications;
    DELETE FROM documents;
    DELETE FROM learner_documents;
    DELETE FROM programs;
    DELETE FROM remarks;
    DELETE FROM group_checks;
    DELETE FROM form_responses;
    DELETE FROM applications;
    DELETE FROM sqlite_sequence
      WHERE name IN ('applications','remarks','programs','documents','learner_documents','notifications','events','offer_letters');
  `);

  // A seventh learner so every demo state has an application of its own.
  db.prepare(
    `INSERT OR IGNORE INTO users (name, email, role)
     VALUES ('Kabir Nair', 'kabir.learner@example.com', 'learner')`
  ).run();

  const learners = db
    .prepare("SELECT id, name, email FROM users WHERE role = 'learner' ORDER BY id")
    .all();

  if (learners.length < 7) {
    throw new Error(`Need at least 7 learners, found ${learners.length}.`);
  }

  const insertApp = db.prepare(
    "INSERT INTO applications (learner_id, ac_id, ops_id, status) VALUES (?, ?, ?, ?)"
  );
  const insertField = db.prepare(
    "INSERT INTO form_responses (application_id, field_key, value) VALUES (?, ?, ?)"
  );
  const insertRemark = db.prepare(
    "INSERT INTO remarks (application_id, field_key, author_id, text, status) VALUES (?, ?, ?, ?, ?)"
  );
  // Programmes are the COUNSELLOR's recommendations (source 'ac'), with Ops'
  // eligibility verdict riding on each: 'pending' | 'eligible' | 'not_eligible'.
  const insertProgram = db.prepare(
    "INSERT INTO programs (application_id, name, institute, duration, fee, notes, added_by, shortlisted, source, eligibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ac', ?)"
  );
  const insertDoc = db.prepare(
    `INSERT INTO documents
     (application_id, type, title, content, auto_generated, signed_at, signature_name, template_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'auto')`
  );
  const insertEvent = db.prepare(
    "INSERT INTO events (application_id, actor_id, action, detail) VALUES (?, ?, ?, ?)"
  );
  const insertNotif = db.prepare(
    "INSERT INTO notifications (user_id, text, link, read) VALUES (?, ?, ?, ?)"
  );
  const insertOffer = db.prepare(
    "INSERT INTO offer_letters (application_id, program_id, content) VALUES (?, ?, ?)"
  );
  const insertLockerDoc = db.prepare(
    `INSERT INTO learner_documents
     (application_id, doc_key, filename, uploaded_by, verification, verified_by, verified_at, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // The documents the SHORTLISTING stage asks for (domain.ts SHORTLISTING_DOCS),
  // in the order they tend to arrive — so "verified up to here" reads as genuine
  // progress through a pile rather than a random scatter of ticks. The wider
  // admissions checklist stays out of this flow entirely.
  const CORE_DOCS = [
    ["doc_10_marksheet", "class10-marksheet.pdf"],
    ["doc_12_marksheet", "class12-marksheet.pdf"],
    ["doc_ug_degree", "ug-degree.pdf"],
    ["doc_ug_marksheet", "ug-consolidated-marksheet.pdf"],
    ["doc_score_card", "ielts-scorecard.pdf"],
    ["doc_sop_1", "statement-of-purpose.docx"],
    ["doc_passport", "passport-front-back.jpg"],
    ["doc_aadhaar", "aadhaar-card.jpg"],
  ];

  /**
   * @param count       how many of CORE_DOCS have been uploaded
   * @param verifiedUpto how far Ops has got through them
   * @param rejected    [docKey, reason] — one that came back
   * @param extra       [[key, filename]] beyond the core list
   */
  function addLockerDocs(
    appId,
    uploaderId,
    { count = CORE_DOCS.length, verifiedUpto = 0, rejected = null, extra = [] } = {}
  ) {
    const list = CORE_DOCS.slice(0, count).concat(extra);
    list.forEach(([key, file], i) => {
      const isRejected = rejected && rejected[0] === key;
      const verified = !isRejected && i < verifiedUpto;
      const stamped = isRejected || verified;
      insertLockerDoc.run(
        appId,
        key,
        file,
        uploaderId,
        isRejected ? "rejected" : verified ? "verified" : "pending",
        stamped ? OMAR : null,
        stamped ? "2026-08-04 11:20:00" : null,
        isRejected ? rejected[1] : null
      );
    });
  }

  const insertGroupCheck = db.prepare(
    `INSERT OR REPLACE INTO group_checks
     (application_id, group_key, actor_role, state, comment, by_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const AC_GROUPS = [
    "profile",
    "class10",
    "class12",
    "bachelor",
    "after_bachelor",
    "financing",
  ];
  const OPS_GROUPS = ["profile", "class10", "class12", "bachelor"];

  /** The counsellor confirmed these sections while filling the form. */
  function acConfirms(appId, groups = AC_GROUPS) {
    for (const g of groups) insertGroupCheck.run(appId, g, "ac", "checked", null, ARJUN);
  }

  /** Ops' verdicts: verified all, or all-but-one with a reason. */
  function opsVerifies(appId, { except = null, reason = null } = {}) {
    for (const g of OPS_GROUPS) {
      if (g === except) insertGroupCheck.run(appId, g, "ops", "not_verified", reason, OMAR);
      else insertGroupCheck.run(appId, g, "ops", "verified", null, OMAR);
    }
  }

  function fillForm(appId, learner, overrides = {}) {
    const values = {
      full_name: learner.name,
      mobile: "+91 98765 43210",
      gender: "Female",
      dob: "1998-04-12",
      degree_level: "Masters",
      countries: "Germany, Australia",
      marksheet_10: "class10-marksheet.pdf",
      score_10: "88",
      completion_10: "2014",
      board_12: "CBSE",
      status_12: "Completed",
      has_marksheet_12: "Yes",
      marksheet_12: "class12-marksheet.pdf",
      school_name: "Delhi Public School",
      score_12: "84",
      bachelor_status: "Completed",
      bachelor_docs: "Yes - All Documents Available",
      bachelor_files: "cmm-transcript.pdf",
      backlogs: "0",
      bachelor_score: "78",
      bachelor_university: "Pune University",
      bachelor_mode: "Regular",
      pg_status: "No",
      work_exp_months: "48",
      cv_file: "resume.pdf",
      career_gap_months: "0",
      finance_plan: "Education Loan (Partial/Full)",
      triggered_clauses: "UT/ACK-Loan-01",
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) insertField.run(appId, key, value);
  }

  // Link seeded documents back to their template so the picker knows they are
  // already attached (and so Ops sees them as required, not removable).
  const templateIdByTitle = (() => {
    try {
      const rows = db.prepare("SELECT id, title FROM document_templates").all();
      return Object.fromEntries(rows.map((r) => [r.title, r.id]));
    } catch {
      return {};
    }
  })();

  /** Templates keyed by the clause that triggers them, for the seed below. */
  const templatesByClause = (() => {
    try {
      const rows = db
        .prepare(
          "SELECT id, type, title, content, clause_id FROM document_templates WHERE clause_id IS NOT NULL"
        )
        .all();
      return Object.fromEntries(rows.map((r) => [r.clause_id, r]));
    } catch {
      return {};
    }
  })();

  /**
   * The undertakings a seeded application's answers actually trigger.
   *
   * Without this the seed declared clauses in `triggered_clauses` that no
   * document backed, so the review screens named declarations the learner was
   * never given anything to sign. The live app does this through
   * attachRequiredForms; the seed has to match it.
   */
  function addClauseDocs(appId, learnerName, clauses, signature = null) {
    const signedAt = signature ? "2026-08-03 09:10:00" : null;
    for (const id of String(clauses || "").split("|").filter(Boolean)) {
      const t = templatesByClause[id];
      if (!t) continue;
      insertDoc.run(
        appId,
        t.type,
        t.title,
        `I, ${learnerName}, ${t.content.replace(/^I /, "")}`,
        1,
        signedAt,
        signature,
        t.id
      );
    }
  }

  function addDefaultDocs(appId, learnerName, signature = null) {
    const signedAt = signature ? "2026-08-03 09:10:00" : null;
    insertDoc.run(
      appId,
      "undertaking",
      "Program Eligibility Undertaking",
      `I, ${learnerName}, hereby undertake that all details provided in my eligibility form are true and correct to the best of my knowledge. I understand that any misrepresentation may lead to cancellation of my application or admission.`,
      1,
      signedAt,
      signature,
      templateIdByTitle["Program Eligibility Undertaking"] ?? null
    );
    insertDoc.run(
      appId,
      "acknowledgement",
      "Process Acknowledgement",
      `I, ${learnerName}, acknowledge that I have been informed about the program structure, fee details, and admission process. I understand the shortlisting decision is based on the eligibility details submitted on my behalf by my academic counsellor.`,
      1,
      signedAt,
      signature,
      templateIdByTitle["Process Acknowledgement"] ?? null
    );
  }

  const seed = db.transaction(() => {
    // ── 1. Draft — AC still has to fill the form ────────────────────────────
    const draft = learners[0];
    const draftId = insertApp.run(draft.id, ARJUN, null, "draft").lastInsertRowid;
    // A couple collected on the first call — the rest of the checklist is
    // visibly empty, which is the state the counsellor works against.
    addLockerDocs(draftId, ARJUN, { count: 3 });

    // ── 2. Under vetting, unclaimed — in the Ops queue, nobody has opened it ─
    const submitted = learners[1];
    const submittedId = insertApp.run(submitted.id, ARJUN, null, "under_review").lastInsertRowid;
    fillForm(submittedId, submitted, {
      countries: "Australia",
      bachelor_university: "Savitribai Phule Pune University",
      bachelor_score: "74",
      work_exp_months: "60",
    });
    addDefaultDocs(submittedId, submitted.name);
    addClauseDocs(submittedId, submitted.name, "UT/ACK-Loan-01");
    // Nothing verified: nobody has opened it yet.
    addLockerDocs(submittedId, ARJUN, { count: 6 });
    // The counsellor's call-time recommendations, awaiting Ops' verdicts.
    insertProgram.run(submittedId, "MS in Data Science", "University of Melbourne", "24 months", "₹32L", "STEM background required", ARJUN, 0, "pending");
    insertProgram.run(submittedId, "Master of Business Analytics", "Monash University", "18 months", "₹28L", "Quantitative background preferred", ARJUN, 0, "pending");
    acConfirms(submittedId);
    insertEvent.run(submittedId, ARJUN, "Eligibility form submitted", `Submitted by Arjun Mehta on behalf of ${submitted.name}`);
    insertEvent.run(submittedId, ARJUN, "UT & Ack documents auto-generated", null);
    insertNotif.run(OMAR, `New learner details submitted: ${submitted.name} (by Arjun Mehta)`, `/ops/application/${submittedId}`, 0);

    // ── 3. Under vetting — Ops is reading the profile, nothing flagged yet ──
    // No remarks and no programmes: this is the clean path, where Ops finishes
    // vetting, attaches programmes and marks it reviewed.
    const vetting = learners[2];
    const vettingId = insertApp.run(vetting.id, ARJUN, OMAR, "under_review").lastInsertRowid;
    fillForm(vettingId, vetting, {
      bachelor_score: "78",
      work_exp_months: "42",
      bachelor_university: "VIT Vellore",
      triggered_clauses: "UT/ACK-Loan-01",
    });
    addDefaultDocs(vettingId, vetting.name);
    addClauseDocs(vettingId, vetting.name, "UT/ACK-Loan-01");
    // Omar is part-way through the pile — the state you land in mid-vetting.
    addLockerDocs(vettingId, ARJUN, { count: 8, verifiedUpto: 4 });
    // Mid-vetting: Omar has ruled on one recommendation, two still pending.
    insertProgram.run(vettingId, "MS in Software Engineering", "Aalto University", "24 months", "₹14L", "Portfolio reviewed", ARJUN, 0, "eligible");
    insertProgram.run(vettingId, "MS in Computer Science", "TU Munich", "24 months", "₹8L", "Anabin H+ institutions only", ARJUN, 0, "pending");
    insertProgram.run(vettingId, "MS in Data Engineering", "University of Warsaw", "24 months", "₹12L", "Good value option", ARJUN, 0, "pending");
    acConfirms(vettingId);
    // Ops is mid-review: identity and Class 10 done, Class 12 queried, the
    // bachelor's group not looked at yet.
    insertGroupCheck.run(vettingId, "profile", "ops", "verified", null, OMAR);
    insertGroupCheck.run(vettingId, "class10", "ops", "verified", null, OMAR);
    insertGroupCheck.run(
      vettingId,
      "class12",
      "ops",
      "not_verified",
      "Marksheet is a photo of a photocopy — ask the learner for a clean colour scan.",
      OMAR
    );
    insertRemark.run(vettingId, "school_name", OMAR, "Class 12: Marksheet is a photo of a photocopy — ask the learner for a clean colour scan.", "open");
    insertRemark.run(vettingId, "countries", OMAR, "Germany needs Anabin H+ — worth telling the learner before they set their heart on TU Munich.", "open");
    insertEvent.run(vettingId, ARJUN, "Eligibility form submitted", `Submitted by Arjun Mehta on behalf of ${vetting.name}`);
    insertEvent.run(vettingId, ARJUN, "UT & Ack documents auto-generated", null);
    insertEvent.run(vettingId, OMAR, "Picked up for vetting", null);
    insertEvent.run(vettingId, OMAR, "Document verified: 10th Marksheet", null);

    // ── 4. Reviewed, carrying Ops' notes ────────────────────────────────────
    // Ops flagged two fields during vetting. They read the documents and
    // comment; the answers stay as the counsellor captured them.
    const flagged = learners[3];
    const flaggedId = insertApp.run(flagged.id, ARJUN, OMAR, "reviewed").lastInsertRowid;
    fillForm(flaggedId, flagged, {
      gender: "Male",
      countries: "Germany, Finland",
      completion_10: "2013",
      bachelor_score: "68",
      bachelor_university: "Anna University",
      bachelor_docs: "Yes - Partial Documents",
      backlogs: "2",
      triggered_clauses: "UT-PG Doc/Result-04|UT-Backlog-01|UT/ACK-Loan-01",
    });
    addDefaultDocs(flaggedId, flagged.name);
    addClauseDocs(
      flaggedId,
      flagged.name,
      "UT-PG Doc/Result-04|UT-Backlog-01|UT/ACK-Loan-01"
    );
    // One came back — the rejected row and its reason are what the learner
    // sees on their own documents tab.
    addLockerDocs(flaggedId, ARJUN, {
      count: 8,
      verifiedUpto: 8,
      rejected: ["doc_passport", "Back page is cut off — please re-scan both sides."],
    });
    insertRemark.run(flaggedId, "mobile", OMAR, "This number is one digit short — the passport copy shows a different one. Please reconfirm with the learner.", "open");
    insertRemark.run(flaggedId, "backlogs", OMAR, "The transcript shows 3 backlogs but the form says 2. Please check.", "open");
    acConfirms(flaggedId);
    opsVerifies(flaggedId, {
      except: "profile",
      reason: "Mobile number does not match the passport copy.",
    });
    insertEvent.run(flaggedId, ARJUN, "Eligibility form submitted", `Submitted by Arjun Mehta on behalf of ${flagged.name}`);
    insertEvent.run(flaggedId, ARJUN, "UT & Ack documents auto-generated", null);
    insertProgram.run(flaggedId, "MS in Data Engineering", "TU Munich", "18 months", "\u20b94.1L", "Matches the German track", ARJUN, 0, "eligible");
    insertProgram.run(flaggedId, "MSc Software Systems", "Aalto University", "24 months", "\u20b93.6L", "Finland option", ARJUN, 0, "not_eligible");
    insertEvent.run(flaggedId, OMAR, "Picked up for vetting", null);
    insertEvent.run(flaggedId, OMAR, "Comment added on \"Learner Mobile Number\"", "Number is one digit short");
    insertEvent.run(flaggedId, OMAR, "Comment added on \"Backlogs / ATKTs (count)\"", "Transcript shows 3, form says 2");
    insertEvent.run(flaggedId, OMAR, "Document rejected: Passport (front & back)", "Back page is cut off");
    insertEvent.run(flaggedId, OMAR, "Marked as reviewed by Ops", null);
    insertNotif.run(ARJUN, `Ops reviewed ${flagged.name}'s application — 2 comment(s) to check`, `/ac/application/${flaggedId}`, 0);

    // ── 5. Reviewed — Ops approved, programmes attached, AC to shortlist ────
    const reviewed = learners[6];
    const reviewedId = insertApp.run(reviewed.id, ARJUN, OMAR, "reviewed").lastInsertRowid;
    fillForm(reviewedId, reviewed, {
      gender: "Male",
      countries: "Australia",
      bachelor_score: "82",
      bachelor_university: "Manipal Institute of Technology",
      work_exp_months: "30",
    });
    addDefaultDocs(reviewedId, reviewed.name);
    // The clean path: everything uploaded, everything verified.
    addLockerDocs(reviewedId, ARJUN, { count: 8, verifiedUpto: 8 });
    // Ops found both, fixed both, and closed their own notes.
    insertRemark.run(reviewedId, "mobile", OMAR, "Added the alternate number from the application form.", "resolved");
    insertRemark.run(reviewedId, "work_exp_months", OMAR, "CV shows 30 months against 24 on the form — confirmed with the counsellor.", "resolved");
    // Not everything Ops writes is a job: this one is context to read.
    insertRemark.run(reviewedId, "finance_plan", OMAR, "FYI — loan sanction usually takes 2 weeks with this lender, so start early.", "open");
    db.prepare("UPDATE remarks SET kind = 'info' WHERE application_id = ? AND field_key = 'finance_plan'").run(reviewedId);
    insertProgram.run(reviewedId, "Advanced Certification in Cloud Computing", "IIT Madras", "11 months", "₹2.9L", "Strong infrastructure background", ARJUN, 0, "eligible");
    insertProgram.run(reviewedId, "PG Program in DevOps & SRE", "upGrad", "10 months", "₹2.2L", "Matches current role trajectory", ARJUN, 0, "eligible");
    insertProgram.run(reviewedId, "MS in Computer Science (online)", "Woolf University", "24 months", "₹5.5L", "Stretch option if budget allows", ARJUN, 0, "eligible");
    acConfirms(reviewedId);
    opsVerifies(reviewedId);
    db.prepare(
      "UPDATE programs SET eligibility_note = ? WHERE application_id = ? AND name LIKE 'Advanced Certification%'"
    ).run("Scores and experience clear the bar comfortably.", reviewedId);
    insertEvent.run(reviewedId, ARJUN, "Eligibility form submitted", `Submitted by Arjun Mehta on behalf of ${reviewed.name}`);
    insertEvent.run(reviewedId, OMAR, "Picked up for vetting", null);
    insertEvent.run(reviewedId, OMAR, "Comment added on \"Work Experience After Bachelor's (months)\"", "CV shows 30 months, form says 24");
    insertEvent.run(reviewedId, OMAR, "Every uploaded document verified", null);
    insertEvent.run(reviewedId, OMAR, "Remark resolved on \"Learner Mobile Number\"", null);
    insertEvent.run(reviewedId, OMAR, "Remark resolved on \"Work Experience After Bachelor's (months)\"", null);
    insertEvent.run(reviewedId, OMAR, "Marked as reviewed by Ops", null);
    insertNotif.run(ARJUN, `Ops reviewed ${reviewed.name}'s application — 3 of your recommendations are eligible`, `/ac/application/${reviewedId}`, 0);

    // ── 5. Shortlisted — learner needs to sign UT & Ack ─────────────────────
    const shortlisted = learners[4];
    const shortlistedId = insertApp.run(shortlisted.id, ARJUN, OMAR, "shortlisted").lastInsertRowid;
    fillForm(shortlistedId, shortlisted, {
      countries: "France",
      bachelor_score: "81",
      bachelor_university: "Delhi University",
      work_exp_months: "36",
      finance_plan: "Self-funded",
    });
    addDefaultDocs(shortlistedId, shortlisted.name);
    // Core set verified; the visa documents are the ones still to come, which
    // is exactly what the learner sees pending on their own tab.
    addLockerDocs(shortlistedId, ARJUN, { count: 8, verifiedUpto: 8 });
    insertProgram.run(shortlistedId, "PG Diploma in Digital Marketing", "MICA", "11 months", "₹3.2L", "Communications background is a strong fit", ARJUN, 1, "eligible");
    insertProgram.run(shortlistedId, "Performance Marketing Certification", "Kraftshala", "6 months", "₹1.1L", "Faster, lower-cost alternative", ARJUN, 0, "eligible");
    acConfirms(shortlistedId);
    opsVerifies(shortlistedId);
    db.prepare(
      "UPDATE programs SET eligibility_note = ? WHERE application_id = ? AND shortlisted = 1"
    ).run("Communications background and 4 years' experience both check out.", shortlistedId);
    insertEvent.run(shortlistedId, ARJUN, "Eligibility form submitted", `Submitted by Arjun Mehta on behalf of ${shortlisted.name}`);
    insertEvent.run(shortlistedId, OMAR, "Marked as reviewed by Ops", null);
    insertEvent.run(shortlistedId, ARJUN, "Program shortlisted & sent to learner", "PG Diploma in Digital Marketing");
    insertNotif.run(shortlisted.id, "Congratulations! You have been shortlisted for: PG Diploma in Digital Marketing. Please review and sign your documents.", "/learner", 0);

    // ── 6. Completed — signed, offer letter issued ──────────────────────────
    const completed = learners[5];
    const completedId = insertApp.run(completed.id, ARJUN, OMAR, "completed").lastInsertRowid;
    fillForm(completedId, completed);
    addDefaultDocs(completedId, completed.name, completed.name);
    addLockerDocs(completedId, ARJUN, { count: 8, verifiedUpto: 8 });
    const programId = insertProgram.run(completedId, "PG Diploma in Data Science", "IIIT Bangalore", "12 months", "₹3.5L", "Strong CS background + 4 yrs experience", ARJUN, 1, "eligible").lastInsertRowid;
    insertProgram.run(completedId, "MS in Machine Learning & AI", "LJMU (online)", "18 months", "₹4.8L", null, ARJUN, 0, "eligible");
    acConfirms(completedId);
    opsVerifies(completedId);
    insertRemark.run(completedId, "bachelor_score", OMAR, "Please confirm if this is CGPA on a 10-point scale — attach marksheet.", "resolved");
    insertEvent.run(completedId, ARJUN, "Eligibility form submitted", `Submitted by Arjun Mehta on behalf of ${completed.name}`);
    insertEvent.run(completedId, OMAR, "Marked as reviewed by Ops", null);
    insertEvent.run(completedId, ARJUN, "Program shortlisted & sent to learner", "PG Diploma in Data Science");
    insertEvent.run(completedId, completed.id, "Document signed: Program Eligibility Undertaking", `Signed as "${completed.name}"`);
    insertEvent.run(completedId, completed.id, "All documents signed", "Learner details certified — awaiting offer letter from Ops");
    insertEvent.run(completedId, OMAR, "Offer letter sent to learner", "PG Diploma in Data Science — IIIT Bangalore");
    // The timeline says they certified and the offer letter proves Ops acted
    // on it, so the flag has to be set too — an offer cannot exist without it.
    db.prepare(
      "UPDATE applications SET certified_at = '2026-08-03 09:20:00' WHERE id = ?"
    ).run(completedId);
    insertOffer.run(
      completedId,
      programId,
      `Dear ${completed.name},\n\nCongratulations! We are pleased to offer you admission to PG Diploma in Data Science at IIIT Bangalore. Your eligibility has been verified and all required documents have been signed.\n\nOur team will reach out with the next steps for enrollment.\n\nWarm regards,\nAdmissions Team`
    );

    return { draft, submitted, vetting, flagged, reviewed, shortlisted, completed };
  });

  const out = seed();
  // Link seeded recommendations back to their catalogue entry where the name
  // matches, so the matching-score chip renders on seeded data too.
  db.exec(
    "UPDATE programs SET catalogue_id = (SELECT id FROM program_catalogue c WHERE c.name = programs.name AND c.institute = programs.institute) WHERE catalogue_id IS NULL"
  );
  return out;
}

module.exports = { seedDemo };
