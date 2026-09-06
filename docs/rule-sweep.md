# Rule sweep — what the prototype currently enforces

Every rule the build actually enforces, extracted from the code. **Tick, cross, or
flag each one.** The crossed ones become the change list; the flagged ones become the
PRD's open questions. Everything ticked becomes spec.

Where a rule is enforced *only in the UI* (the control isn't rendered) rather than in
the mutation itself, it says so — that distinction matters for a backend rebuild,
because a UI-only rule is not a rule once there's an API.

**🔶 = I think this one needs a decision.** Reasons are collected at the bottom.

---

## A. Roles and access

| # | Rule | Where |
|---|---|---|
| A1 | Four roles: learner, counsellor (`ac`), Ops, admin. | `domain.ts` |
| A2 | One application per learner. The counsellor is assigned when the application is created; the Ops owner on first open. **Both are write-once — neither can be changed afterwards.** See Q1. | schema, `claimApplication` |
| A3 | Admin can create users and change any user's role. Admin sees aggregate counts but cannot open an individual application. Single role per user; no permissions, scopes, teams or hierarchy. See Q2. | `setUserRole`, `createUser` |
| A7 | 🔶 Creating a learner auto-creates a draft application and assigns it to a **randomly chosen** counsellor (`ORDER BY RANDOM()`). No territory, capacity or round-robin logic. | `createUser` |
| A4 | The first Ops user to **open** an unassigned application under vetting is assigned it. Opening *is* claiming — there is no confirm step. | `claimApplication` |
| A5 | A counsellor can only act on applications where they are the assigned counsellor. | every `ac` action |
| A6 | 🔶 **Any Ops user can act on any application, including one already claimed by another Ops user.** No Ops action checks `ops_id`. | all `ops` actions |

## B. State machine

| # | Rule | Where |
|---|---|---|
| B1 | Five statuses, strictly one-way. No status ever moves backwards. | `STATUS_FLOW` |
| B2 | Transitions and who may make them: draft→under_review (counsellor), under_review→reviewed (Ops), reviewed→shortlisted (counsellor), shortlisted→completed (Ops). No skipping. | `TRANSITIONS` |
| B3 | A re-check is a **flag on top of the status**, never a status of its own. | `recheck_at` |
| B4 | Certification is a flag (`certified_at`), set by the learner and withdrawn automatically by their own edit. | `certifyDetails` |

## C. Stage 1 — counsellor fills the form (`draft`)

| # | Rule | Where |
|---|---|---|
| C1 | Only the counsellor writes answers in draft. Nobody else, including the learner. | `editorOf` |
| C2 | ✅ *Corrected.* **Three controls write to the table, all firing the same `saveForm`: Save draft, Next, and Submit for Vetting.** (My earlier "no save button" was wrong — it came from a stale README line.) | `call-form.tsx:1134-1164` |
| C2a | Every save posts **all** fields, not just the visible step — hidden inputs mirror the full value state, so an answer on an unmounted step is still written. | `call-form.tsx:561-568` |
| C2b | Clicking the **step strip** does not save; it only swaps the mounted section. Values survive in React state and are written by the next button press, so nothing is lost — but nothing is persisted until a button is pressed either. | `goToStep` |
| C2c | No timeline event is logged for a save. Saving is not a milestone. | `saveForm` |
| C3 | LSQ sync fills **only empty** fields, never overwrites. | `syncFromLsq` |
| C4 | LSQ carries identity and intent only — name, mobile, degree level, countries, financing. Never academics. | `syncFromLsq` |
| C5 | LSQ writing into a section un-ticks the counsellor's "confirmed correct" on it. | `syncFromLsq` |
| C6 | Submit is refused unless all of these exist: name, mobile, gender, DOB, guardian email (if under 18), degree level, country, Class 10 marksheet, Class 12 board, Class 12 status, Bachelor's status (if Masters), financing plan, **and at least one recommended programme**. | `missingForSubmit` |
| C7 | Submit does **not** require any locker documents to have been uploaded. → **Q3 and Q6, with business.** | `missingForSubmit` |
| C8 | ❌ **CHANGED.** Prototype allows **5**. Correct rule: the counsellor may request eligibility for **at most 3 programmes**. Catalogue only, no duplicates. | `addProgram`, `MAX_RECOMMENDED_PROGRAMS` |
| C9 | Submitting auto-generates the undertakings: every always-required template, plus one per triggered clause. Runs once only. | `attachRequiredForms` |
| C10 | The guardian-consent document names the **guardian** as declarant, not the learner. | `attachRequiredForms` |

## D. Stage 2 — Ops vetting (`under_review`)

| # | Rule | Where |
|---|---|---|
| D1 | Ops never edits the counsellor's answers. Ops fills only the eight ops-owned fields (Class 10 score and year, school name, Class 12 score, Bachelor's score / university / mode, career gap). | `updateFieldValue` |
| D2 | Anything wrong in the counsellor's answers gets a comment pinned to the field. Comments are `action` (must be dealt with) or `info` (context). | `addRemark` |
| D3 | Ops cannot comment on the fields Ops fills. **UI only** — `addRemark` does not check this. | UI |
| D4 | Ops rules **every** counsellor-filled answer correct/incorrect (~26 fields). Clicking the state it already has clears it. → **Q4, with business: only a few fields should need this.** | `setFieldCheck` |
| D4a | 🔶 `setFieldCheck` does **not** check group membership, so Ops can rule on individual fields inside the two sections D6 says are not theirs to review ("After graduation", "Financing"). D4 and D6 contradict each other. | `setFieldCheck` |
| D5 | Section and field verdicts stay in sync both ways: all fields correct ⇒ section verified; any field incorrect ⇒ section verification cleared; ruling the section stamps every field under it. | `setFieldCheck`, `setGroupReview` |
| D6 | Only four sections are Ops' to rule on (profile, Class 10, Class 12, Bachelor's). "After graduation" and "Financing" are the counsellor's confirmation alone. | `REVIEW_GROUPS` |
| D7 | A "not verified" section verdict with a comment also raises an action remark, pinned to the first field in the group that renders a comment slot. | `setGroupReview` |
| D8 | Flipping a section back to verified auto-resolves that remark. | `setGroupReview` |
| D9 | Ops verifies or rejects each document; the rejection reason is optional. | `verifyLearnerDoc` |
| D10 | Marking reviewed requires **at least one eligible programme**. | `markReviewed` |
| D11 | Open remarks do **not** block marking reviewed. | `markReviewed` |
| D12 | ❌ **CHANGED.** Prototype requires neither. Correct rule: **every required document must be verified before Ops can mark reviewed.** Still to pin down: (a) which set — the 8 required shortlisting slots, and does it vary by degree level? `doc_ug_degree` / `doc_ug_marksheet` are meaningless for a Bachelors applicant; (b) does a **rejected** document block, or only a missing one? (c) do all sections still need ruling on, or only documents? **⚠ This change deadlocks against H2 and M4 — see Q3.** | `markReviewed` |

## E. Stage 3 — counsellor shortlists (`reviewed`)

| # | Rule | Where |
|---|---|---|
| E1 | The counsellor shortlists **exactly one** programme, and only one Ops ruled eligible. | `shortlistProgram` |
| E2 | Shortlisting is refused while any re-check is open. | `shortlistProgram` |
| E3 | The counsellor may edit their own fields at `reviewed` to act on Ops' comments. Ops-owned fields stay closed to them. | `updateFieldValue` |
| E4 | The counsellor may appeal a `not_eligible` verdict ("reconsider") or propose a catalogue programme ("suggest"). A note is mandatory. | `appealEligibility` |
| E5 | Appeals are only possible at `reviewed`, or at `shortlisted` once the shortlist has come off. Never while another re-check is open. | `appealEligibility` |
| E6 | Only a rejection can be appealed — not a pending or already-eligible verdict. | `appealEligibility` |

## F. Stage 4 — learner signs and certifies (`shortlisted`)

| # | Rule | Where |
|---|---|---|
| F1 | ✅ **Confirmed.** The gate is the **first** shortlist only. Once shown it stays shown for good — through re-checks, through the counsellor swapping the programme, through the shortlist being withdrawn — and the application tab always shows the latest state. Implemented as `stageIndex(status) >= stageIndex("shortlisted")` rather than a stored flag, so "once shown, stays shown" holds by construction: the status never rewinds below `shortlisted`. | `learnerCanSeeApplication` |
| F1a | ⚠ **The card and the page contradict each other in one window.** When Ops rules the shortlisted programme out and the re-check then closes, the learner's card reads **"Action needed"** — but nothing is waiting on them; the counsellor has to choose a new programme. The detail page inside gets it right ("Your programme is being re-confirmed — we'll let you know as soon as you can certify"). `learnerStatus` has no `hasShortlist` argument, so it cannot tell this state from a normal shortlist. → **fix below.** | `learnerStatus`, `application/page.tsx:65` |
| F2 | Their own personal details stay readable under Profile throughout, even pre-shortlist. | `profile/page.tsx` |
| F3 | Signing requires status `shortlisted`, an unsigned document, and a typed signature. | `signDocument` |
| F4 | Every signature takes an OTP. **Prototype: any 4 digits pass, no SMS is sent.** | UI |
| F5 | Certifying requires: not already certified, no open re-check (appeals excepted), at least one document and **all** signed, and a programme still shortlisted. | `certifyDetails` |
| F6 | ✅ **Confirmed.** The learner may edit their details at any point before `completed` — and `completed` is set only by `sendOfferLetter`, so the lock lands exactly when the offer letter is released. The freeze is total, not just their details: comments, uploads, verification and appeals all stop too (G3). **Scoped to that one application — see Q5.** | `updateLearnerDetails:1483` |
| F7 | Learner edits are bounds-checked; ops-filled fields are skipped entirely. | `updateLearnerDetails` |
| F8 | Certifying **is** the downstream sync — but only as a log line; nothing is actually synced and there is no sync state in the schema. No separate "trigger the application link" step, and no sync gate on the offer letter. → **Q7, with engineering and business.** | `certifyDetails` |

## G. Offer letter (`completed`)

| # | Rule | Where |
|---|---|---|
| G1 | Releasing the offer letter requires **all six**: status is `shortlisted`, no letter already issued, at least one document, every document signed, `certified_at` set, and no open re-check. | `sendOfferLetter` |
| G2 | A programme must still be shortlisted; the letter is written against it. | `sendOfferLetter` |
| G3 | Once completed, nothing changes — no edits, no uploads, no verification, no comment resolution. | multiple |

## H. Documents — the locker

| # | Rule | Where |
|---|---|---|
| H1 | A fixed checklist, not free-form uploads. 29 slots defined; 10 shown during shortlisting. | `LEARNER_DOCS` |
| H2 | ✅ **CHANGED — implemented.** One line decides it: **can the counsellor change a document Ops is reading right now? No. Anything else, yes.** · **While Ops reads** (`under_review`, or a re-check on Ops' desk) they may fill an **empty slot only** — no replacing a file already in, rejected ones included, and no removing. · **Once Ops hands it back** (`draft`, `reviewed`, or a re-check passed to them) they have the full locker, so a rejected scan can be replaced. · A verified document stays Ops' alone to remove (H5). · The learner: any time until completed. Ops: any time. | `docUploader` |
| H2b | No form field is editable by the counsellor while Ops reads — unchanged, and verified (zero editable inputs on their page at `under_review`). The locker is the only thing that moves. | `saveForm`, `updateFieldValue` |
| H2a | ✅ **Resolved.** The counsellor can fill a missing document during vetting, so vetting can always reach a verifiable set — and can replace a rejected one the moment Ops hands the application back. | `docUploader` |
| H3 | Verification is Ops' alone. | `verifyLearnerDoc` |
| H4 | Replacing a document returns it to pending — Ops verified the file that was there. | `uploadLearnerDoc` |
| H5 | A verified document can only be removed by Ops. | `removeLearnerDoc` |
| H6 | Uploads are **filenames only** — `learner_documents.filename` is a TEXT column and no bytes are ever stored. No upload endpoint, no size or type validation, no scanning. Images picked in the current session show a live thumbnail from memory; after a reload there is nothing to render. → **Q9, with engineering and business.** | schema |
| H7 | ⚠ **One file per slot** — `UNIQUE(application_id, doc_key)`. So `doc_passport`, whose own label is "Passport (**front & back**)", can hold exactly one image; a multi-page transcript cannot be uploaded at all. → **Q9.** | schema |

## I. Comments and remarks

| # | Rule | Where |
|---|---|---|
| I1 | Ops raises comments. Either side replies. **Only Ops resolves.** | `resolveRemark` |
| I2 | The counsellor answers by acknowledging (thumbs-up) or replying. Neither closes the comment. | `acknowledgeRemark`, `replyToRemark` |
| I3 | Ops can delete their own comment, only while it is still open. | `deleteRemark` |
| I4 | Replies append to a thread; nothing is ever overwritten. | `remark_replies` |
| I5 | Comments lock as read-only history at `shortlisted` — **unless** a re-check is open, when they are the live conversation. Always locked at `completed`. | `resolveRemark` |
| I6 | A resolved comment greys out. It never disappears. | UI |

## J. Programmes and eligibility

| # | Rule | Where |
|---|---|---|
| J1 | Every programme comes from the master catalogue. Nobody — counsellor or Ops — can author one. | `addProgram`, `opsAddProgram` |
| J2 | ❌ **CHANGED with C8** — the cap is **3**, not 5. It counts live options and is **waived when nothing is eligible** (the escape hatch out of a dead-ended application). Applies to all three add paths. | `addProgram`, `opsAddProgram`, `appealEligibility` |
| J3 | The counsellor may withdraw a recommendation only while it isn't shortlisted, and only in draft or a re-check handed to them. | `removeProgram` |
| J4 | Ops may add a programme only during vetting or an Ops-side re-check — and it is auto-marked eligible. | `opsAddProgram` |
| J5 | Ops rules each recommendation eligible / not eligible, with an optional reason. | `setProgramEligibility` |
| J6 | The shortlisted programme can only be re-ruled during a re-check. | `setProgramEligibility` |
| J7 | Ruling the shortlisted programme not-eligible **withdraws the shortlist** and tells the counsellor to choose again. | `setProgramEligibility` |
| J8 | The match score is deterministic and explainable: country 40, degree level 25, academic score 20, work experience 15, every lost point naming its reason. | `matchScore` |

## K. The re-check loop

| # | Rule | Where |
|---|---|---|
| K1 | A learner edit after vetting (any status but draft) raises a re-check. An edit in draft does not. | `updateLearnerDetails` |
| K2 | 🔶 With F1 in place, the draft-edit branch is now **unreachable** — the learner has no surface before `shortlisted`. | dead code |
| K3 | An edit withdraws certification. | `updateLearnerDetails` |
| K4 | A second edit while a re-check is open **extends** it, never restarts it: `recheck_at` is preserved, the changed-field list is merged, and the original "from" values are kept so the diff reads against what Ops actually ruled on. | `updateLearnerDetails` |
| K5 | If the edit touches any of the 15 `ELIGIBILITY_INPUTS`, **every** programme verdict is marked stale — the shortlisted one included. | `affectsEligibility` |
| K6 | Ops closing a re-check requires: it's open, it hasn't been handed to the counsellor, **no stale verdicts remain**, and **at least one programme is eligible**. | `clearRecheck` |
| K7 | Ops' other exit is handing it to the counsellor — requires at least one open action comment raised *on this change*. Older comments don't count. | `raiseRecheckRemarks` |
| K8 | The counsellor hands it back only once every comment from this re-check is **answered** (acknowledged or replied to) — not resolved, since resolving is Ops' call. | `returnRecheckToOps` |
| K9 | Closing a re-check attaches any newly-triggered undertakings **and detaches unsigned auto-generated ones that no longer apply** — otherwise a learner who edits out of a declaration can never certify again. | `attachMissingForms` |
| K10 | The learner's next edit sends an `ac`-state re-check straight back to Ops. | `updateLearnerDetails` |

## L. Appeals

| # | Rule | Where |
|---|---|---|
| L1 | An appeal rides the re-check machinery, tagged `recheck_kind = 'appeal'`. | `appealEligibility` |
| L2 | The learner is never told about an appeal, and it does **not** withdraw their certification — it's an internal argument they aren't part of. | `certifyDetails`, `clearRecheck` |
| L3 | Ops ruling again on the programme clears the appeal automatically. | `setProgramEligibility` |
| L4 | A learner edit landing on top of an open appeal leaves it tagged as an appeal. | `updateLearnerDetails` |

## M. What the learner is told

| # | Rule | Where |
|---|---|---|
| M1 | Three stages, not five statuses. The learner never learns whose desk the file is on. | `LEARNER_STAGES` |
| M2 | No activity log on the learner side. | — |
| M3 | While a re-check is open the learner reads "Being checked" — never "Action needed". We are the ones holding it up. | `learnerStatus` |
| M4 | A rejected document notifies the **counsellor** pre-shortlist, the **learner** after. *(Just implemented.)* | `verifyLearnerDoc` |
| M4a | ✅ **Resolved.** A rejected document notifies the counsellor pre-shortlist, and they can act on it **once Ops marks the application reviewed** — which is the same moment they are notified the review is done. During the review itself the rejection is visible but not actionable, deliberately: Ops is still reading. | `verifyLearnerDoc` + H2 |
| M5 | Notifications are in-app only. No email, no SMS. | prototype gap |

## N. Known gaps — not built

| # | Item |
|---|---|
| N1 | **The downstream application sync** from the journey diagram's Stage 4 ("trigger the application link" / "once data is synced"). Collapsed into F8. |
| N2 | **Stage 5 — Welcome 2.0 form extension.** Awaiting the business team. |
| N3 | **No real authentication.** Session is a user id in localStorage; `/dev-login?email=…` signs in as anyone. |
| N4 | No file storage, no email/SMS, no audit export, no bulk operations, no search beyond learner name. |

---

## The 🔶 list — decisions I'd want from you

1. **A6** — Any Ops user can act on any application, even one another Ops user claimed. Fine for a small team; a real permissions question for a backend. Is claiming advisory or exclusive?
2. ~~**C7**~~ → moved to **Q3** (business). **D12** stands: should marking reviewed require a verified document set?
3. **D3** — "Ops cannot comment on their own fields" is UI-only. Must become a real check with an API.
4. ~~**F8**~~ → moved to **Q7** (engineering + business).
5. ~~**H6**~~ → moved to **Q9** (engineering + business + compliance).
6. **K2** — The draft-edit branch is now dead code. Keep the guard defensively, or drop it?
7. **I5** — Comments locking at `shortlisted` except during a re-check. Confirm this is wanted, since it means the counsellor cannot raise anything new once the shortlist is out.

## Things worth adding that don't exist yet

- **No SLA or ageing anywhere.** Nothing escalates, nothing is chased, nothing goes red with time.
- **No bulk actions for Ops.** Every application is worked one at a time.
- **No reassignment.** A counsellor or Ops owner cannot be changed once set. See Q1 — this is with the business team.
- **No withdrawal or rejection path.** An application can only go forwards; there is no "learner dropped out" or "not eligible for anything" terminal state.

---

# Open questions

**This section is the running list.** Anything raised during review lands here rather
than being resolved inline, so the PRD has one place to inherit its open-questions
section from. Each carries who needs to answer it and what the prototype does today.

### Q1 — Can the assigned Ops owner change mid-process? And the counsellor?

**Owner: business team**

**What the prototype does today:** neither can ever change. The Ops owner is set the
first time an Ops user opens the application and is never written again
(`claimApplication` refuses if one is already set). The counsellor is set when the
application is created and is never written at all. There is no reassignment path in
the product, and no admin override — the admin screen changes a person's *role*, not
who owns a given learner.

**Why it matters operationally:** once an Ops owner is set, **12 notification sites
route to that one person and stop telling anyone else** (`if (app.ops_id) notify(…)
else notifyRole("ops", …)`). So today, if the assigned Ops owner is on leave, leaves
the company, or moves team, every notification for that learner goes to an inbox
nobody is reading, and no other Ops user is alerted. The application is still
*actionable* by any Ops user (see A6) — it just becomes invisible.

**What we need decided:**

- Can an application be **reassigned** to a different Ops owner? By whom — a team
  lead, an admin, any Ops user, self-serve pickup?
- Same question for the **counsellor**. This is likely the more common real-world
  case: attrition, territory changes, a learner asking for someone else.
- Should reassignment be **logged and visible** to the other roles, or silent?
- Is the learner ever told their counsellor changed? (They currently see the
  counsellor's name on their application card once it is visible.)
- When someone is reassigned, do their **open comments and verdicts** stay attributed
  to them? (Assume yes — the audit trail should be immutable — but confirm.)
- Is there a **fallback** when the owner is unavailable, or does the notification
  simply follow whoever the owner currently is?

**Related:** A6 (any Ops user can already act on any application, so ownership is
advisory in practice but exclusive for notifications — the two need to agree).

### Q2 — How does role access work in the existing products?

**Owner: engineering team**

**What the prototype does today:** it invented its own model, and almost certainly the
wrong one for a real system. Four hardcoded roles (`learner`, `ac`, `ops`, `admin`)
stored as a single string on the user row. One role per user — nobody can be both a
counsellor and a team lead. No permissions, scopes, teams or hierarchy of any kind:
every access decision in the codebase is a literal `requireUser("ops")` string
comparison, and every data-scoping rule is hardcoded (a counsellor sees their own
applications because queries filter on `ac_id`, not because a permission says so).
"Admin" is a whole role rather than a permission, and role assignment happens *inside
this product* on its own admin screen.

**What we need to know before specifying any of it:**

- Is there an **existing identity / RBAC system** that already owns roles and
  permissions across upGrad's products? If so this product should consume it, not keep
  its own `users.role` column.
- Is there **SSO** for staff? Does the learner side authenticate the same way as the
  internal tool, or separately (they're different products to the user — one is
  upgrad.com, one is an internal console)?
- Can a person hold **more than one role**, or a role plus a scope — team lead,
  supervisor, regional Ops, read-only auditor?
- Is **role assignment really this product's job**, or is it inherited from the
  existing admin console? If inherited, the admin screen here should not exist.
- Are there **permissions finer than role** in the current products — for example, who
  may release an offer letter, or override an eligibility verdict? The prototype ties
  every one of those to a bare role.
- What **data scoping** rules exist today — can any counsellor see any learner, or is
  it territory / cohort / assignment based? The prototype hardcodes "your own only" for
  counsellors and "everything" for Ops (see A6).
- Is there an **audit requirement** on role changes and access? Nothing is logged today
  when an admin changes someone's role.

**Related:** A6 (Ops scoping), A7 (random counsellor assignment on user creation),
N3 (no real authentication at all — the session is a user id in localStorage).

### Q3 — Which documents must exist before the form goes to Ops?

**Owner: business team**

**What the prototype does today:** nothing is required. `missingForSubmit` checks
thirteen answers plus at least one recommended programme, and **not a single locker
document**. The one document-shaped item on that list — "Class 10 marksheet" — is a
form field (`marksheet_10`), not a locker slot, so it is satisfied by a filename typed
on the call and has no bearing on whether the actual 10th-marksheet document exists.

An application can therefore reach Ops' queue with an empty locker.

**Why it matters:** Ops' whole job at Stage 2 is reading values off documents — the
eight ops-owned fields (scores, school, university, degree mode, career gap) are all
derived from them. With an empty locker there is nothing to derive from, so the
application is one Ops can only sit on or send back informally, and there is no
send-back path in the product (the pipeline is one-way).

Note this compounds with **D12**: Ops can also mark an application *reviewed* without
any document being verified. So today a learner can reach a shortlist with no
documents at any point in the chain.

**⚠ There is a deadlock behind this — see Q8**, which asks who can add a document once
vetting has started. Q3 decides *what is required*, Q6 decides *whether it blocks*, Q8
decides *who can fix it*. All three need answering together.

**What we need decided:**

- **Which documents are required**, and does the set vary by **degree level**?
  `doc_ug_degree` and `doc_ug_marksheet` are in the required 8 but mean nothing for a
  Bachelors or Profile Building applicant.
- Does a **rejected** document block marking reviewed, or only a missing one?
- If documents can arrive late, **who chases them and against what deadline?** No SLA
  or ageing exists anywhere today.

**Related:** D12 (the change that forces this), H2 / H2a (upload windows), M4a (the
counsellor is asked to do something they cannot), F1 (learner visibility), B1 (one-way
pipeline), N4 (no SLA).

### Q4 — Which answers actually need a per-field Ops verdict?

**Owner: business team**

**What the prototype does today:** Ops can rule correct/incorrect on **every
counsellor-filled answer** — roughly 26 of the 34 form fields (the other 8 are
ops-filled, and Ops does not rule on their own entries). There is no notion of "only
these matter"; the icons appear against every answer.

**Two problems with that, beyond the volume:**

1. **It contradicts D6.** Section-level review is restricted to four sections
   (Profile, Class 10, Class 12, Bachelor's) — "After graduation" and "Financing" are
   the counsellor's own confirmation and Ops never rules on them. But `setFieldCheck`
   never checks which group a field belongs to, so Ops *can* rule on the individual
   answers inside those two sections. The section says "not mine", the fields say
   "mine". One of the two is wrong.
2. **It is load-bearing for the section rollup.** D5 says all-fields-correct ⇒ section
   verified, and ruling a section stamps every field beneath it. If only a subset of
   fields is rulable, that logic has to be redefined: does a section verify when its
   *rulable* fields are all correct, or does the section verdict become the only
   verdict and per-field ruling disappear from the rest?

**What we need decided:**

- **Which specific fields** need a per-answer verdict? My guess at the intent is the
  document-derived and eligibility-critical ones — Class 12 board and status, backlogs,
  Bachelor's status and documents, date of birth, degree level, countries — but that is
  a guess and should come from Ops.
- For everything else, is the **section verdict sufficient**, or is nothing recorded
  at all?
- Does the **rollup in D5 survive**? If yes, restated against rulable fields only.
- Should the fields needing a verdict be **configurable** (a flag in the field
  definition, like `filledBy: "ops"` already is) rather than hardcoded? This is cheap
  to build now and expensive to retrofit.

**Related:** D5 (rollup), D6 (which sections Ops reviews), D7 (not-verified raises a
remark), D3 (Ops cannot comment on their own fields — UI only).

### Q5 — Can a learner ever have more than one application?

**Owner: business team** — raised by "that particular application" in the F6
confirmation, which implies there can be others.

**What the prototype does today:** exactly one, permanently. `createUser` makes a
single draft application per learner, and all three learner pages read
`listApplications({ learnerId })[0]` — the first row, with no concept of a second. A
learner whose application completes has reached the end of the product; there is no
"apply again".

**Why this is a data-model question, not a UI one.** Two tables are keyed by
`application_id`, not by person:

- **`form_responses`** — so name, date of birth, mobile and every academic answer are
  stored **per application**. A second application would duplicate all of it, and
  editing one would not update the other. Profile → Personal details reads from
  `[0]`, so it would show whichever application happened to be created first.
- **`learner_documents`** — `UNIQUE(application_id, doc_key)`, so the locker is
  per application too. A learner applying a second time would **re-upload their
  passport, Aadhaar and every marksheet, and Ops would re-verify all of them.**

If multiple applications are real, both almost certainly need to move to the person,
with the application referencing them. That is a foundational schema decision and it is
much cheaper to make now than after launch.

**What we need decided:**

- Can a learner apply **again** — next intake, a second country, a different degree
  level — and can two be **open at once** or only in sequence?
- Do **personal details belong to the person or the application?** (Almost certainly
  the person.)
- Does the **document locker belong to the person or the application?** (Almost
  certainly the person — with verification possibly still per application, since a
  document verified last year may need re-checking.)
- What happens to a learner who **drops out or is rejected**? There is no withdrawal
  or rejection path at all today (N-list), so with one-application-per-learner a
  learner who abandons the process is stuck in that state permanently with no way to
  start again.
- If a learner has several, what does **Profile → Personal details** show?

**Related:** A2 (one application per learner), F6, G3 (everything freezes at
completed), N4 / the missing withdrawal path.

### Q6 — Should a missing document actually stop the flow? **(answer with Q3)**

**Owner: business team**

Q3 asks *where* documents can be added. This asks *whether a missing one blocks*, and
at which gate. They have to be answered together, but they are different decisions —
you could require documents and only warn, or not require them and hard-block later.

**The good news: the machinery already exists and is proven.** `missingForSubmit`
returns a list of what is missing, and that one list drives **both** halves of a hard
stop:

- the **Confirm & Submit** button is `disabled={missing.length > 0}`, with the missing
  items named in its tooltip;
- `submitForm` **independently refuses** if the list is non-empty, so the block holds
  even if the button is bypassed.

Thirteen answers and "at least one recommended programme" are already gated this way.
**Adding documents to that list is a small, well-trodden change** — the question is
entirely policy, not feasibility.

**The two gates, and what each could do:**

| Gate | Today | Options |
|---|---|---|
| **Submit** (counsellor → Ops) | No document check at all | Hard block · warn but allow · no check |
| **Mark reviewed** (Ops → counsellor) | No check | **Hard block** — already decided in D12 |

**What we need decided:**

- **Hard block at submit, or a warning the counsellor can override?** A hard block puts
  the burden on the counsellor to collect everything on the call — and your journey
  diagram says they collect "whatever documents the learner has to hand", which points
  the other way.
- If a **warning**, is it recorded? Ops currently has no way to see "the counsellor
  knowingly submitted without a passport", and nothing chases it afterwards (no SLA).
- Does **"missing" mean the same as "rejected"**? A slot with a rejected file is filled
  but not usable.
- The **2 optional slots** in the shortlisting set (Work Experience, GRE/GMAT/SAT/ACT)
  are by definition never chased — confirm they stay out of any gate.
- Is the required set **conditional on degree level**? (Also in Q3 — a Bachelors
  applicant has no UG degree to upload.)
- If the counsellor is blocked at submit but the learner is the one who actually has
  the documents, **how does the counsellor unblock themselves?** This folds straight
  back into Q3's four options.

**Related:** Q3 (blocking — where documents can be added), C7, D12, H2a, M4a.

### Q7 — The downstream sync: is auto-fill-on-certification actually buildable?

**Owners: engineering (feasibility) *and* business (confirm the branch)** — these two
need the same answer, which is why it is one question.

**What the prototype does today: nothing.** `certifyDetails` writes a timeline entry
reading *"Certified details auto-filled into the {programme} application"* — and that
log line is the entire implementation. There is no integration, no API call, no target
system, and **no sync state anywhere in the schema**. `sendOfferLetter` gates on
`certified_at` and never asks whether anything was actually synced.

**Where this came from.** Your journey diagram's Stage 4 offered two branches — *"either
ops team trigger the application link"* **or** *"filled and learner certified details
auto filled in the application for the shortlisted program"* — and then gated the
offer letter on *"once data is synced for that learner"*. The build silently picked the
second branch, made it instantaneous and implicit, and **dropped the sync gate
entirely**. This is the one place the prototype resolved a fork in your diagram without
anyone deciding it.

**For business — confirm the branch:**

- Is **auto-fill on certification** the decision, or is Ops triggering the application
  link still on the table?
- Your diagram gates the offer letter on the sync completing. **The build does not.**
  Should the Release OL button wait for confirmed sync?
- Should Ops be able to **see what was synced** before releasing the offer letter?
- If the sync fails, **who is told**, and what does the learner see? They have just
  certified and are expecting an offer letter.

**For engineering — feasibility:**

- **What is "the application"?** A university portal, an internal admissions system,
  a third party? Who owns it?
- Is there an **API**, and is it synchronous or queued? Everything in this product is
  currently synchronous and in-process.
- **Field mapping:** which of the 34 form fields, 8 ops-filled values and 10 documents
  cross over? Is the target schema anything like ours?
- **Failure handling:** retries, dead-letter, manual replay? Does a failed sync block
  the offer letter, and can Ops see and retry it?
- This almost certainly needs **real state** — `pending` / `synced` / `failed` — rather
  than being implicit in `certified_at`. That is a schema change and it should land
  before launch, not after.
- **Idempotency, and this is the sharp one:** a learner who edits after certifying has
  their certification withdrawn, goes through a re-check, and **certifies again**. If
  certification triggers a sync, that is a second sync for the same learner. Does the
  target system **update** the existing application, or create a duplicate? The
  prototype has no answer because it never syncs at all — but the re-check loop makes
  repeat certification a normal, expected event, not an edge case.

**Related:** F8, G1 (offer-letter preconditions — no sync gate today), K3 (edit
withdraws certification), N1 (listed as a known gap).

### Q8 — Who can add a document once vetting has started? ✅ **DECIDED — option 2, implemented**

**Decision:** during `under_review` the counsellor may upload a document that is **not
present yet**. They may not replace or remove one already in, and no other field is
editable by them in that window. Implemented in `docUploader` and mirrored in the UI, so
no control is shown that the action would refuse. Verified: on an application with 6 of
10 slots filled, the counsellor sees 4 Upload controls, zero Replace, zero Remove, and
zero editable fields.

**The rejected-document residue is settled too:** a rejected file stays untouchable
*during* the review, and becomes replaceable the moment Ops marks the application
reviewed and notifies the counsellor. So the "please collect a replacement" notification
is actionable by the time it matters, and nothing changes under Ops mid-read.

**Verified in the browser, both windows:**

| Application | State | Note shown | Upload | Replace | Remove |
|---|---|---|---|---|---|
| Priya Singh | `under_review`, 6/10 in | "Ops is reading these…" | 4 (empty slots) | 0 | 0 |
| Vikram Joshi | `reviewed`, passport rejected | none | 2 (empty slots) | **1** (the rejected scan) | 1 |

The original question and the four options are kept below for the record.

**Owner: business team**

**This is the most urgent question in the sweep.** Not a preference — the product
currently has a state it cannot get out of, and your D12 change turns it from latent
into blocking.

**Nobody who has the learner's documents can upload them during vetting:**

| Role | Can upload at `under_review`? | |
|---|---|---|
| Counsellor | ❌ | `docUploader` allows them in **draft only** |
| Learner | ❌ | The action would permit it, but F1 gives them no surface until shortlisted |
| Ops | ✅ | …and Ops does not have the learner's papers |

So an application that reaches vetting with a missing or rejected document has **no
route forward**. Ops cannot verify what isn't there. With D12 they cannot mark reviewed
without verifying. And they cannot send it back — the pipeline is one-way (B1). It
stops, permanently, with no control on any screen able to move it.

**It already bites today, without D12.** When Ops rejects a document pre-shortlist, the
counsellor is notified *"please collect a replacement"* — and cannot upload one (M4a).
That message asks for something the product does not allow. I introduced that specific
gap with the F1 learner-visibility change; before it, the notification went to the
learner, who could act on it.

**Pick one — each is coherent, and they cost differently:**

1. **Require the documents at submit.** Vetting always has something to verify.
   Cleanest, matches D12's intent — but it lengthens the call and contradicts "collects
   whatever documents the learner has to hand" in your own journey diagram.
2. **Let the counsellor upload through vetting and re-checks.** Relax `docUploader` so
   locker access does not end at draft. Smallest change; does not touch the one-editor
   rule, since the locker was never part of the form; **fixes M4a for free.**
   ← **my recommendation** unless business prefers 1.
3. **Give the learner a document-only surface pre-shortlist.** A narrow carve-out from
   F1 — they can see and fill their locker but not the application. Most direct, since
   the learner is who actually holds the documents, but it partly reopens the decision
   you just made.
4. **Add a send-back transition.** Ops returns an unworkable application to the
   counsellor. Fixes the deadlock generally rather than just for documents — but it
   breaks the one-way pipeline (B1), which is load-bearing and shouldn't be undone
   casually.

Options 2 and 3 are not mutually exclusive, and doing both is defensible: the counsellor
chases on the phone, the learner uploads when they find the file.

**Related:** Q3 (what is required), Q6 (whether it blocks), D12 (the change that makes
this blocking), H2 / H2a, M4a, F1, B1 (one-way pipeline).

### Q9 — File storage and supported formats

**Owners: engineering (build) and business (policy).**
**Stated direction: support an exhaustive range of formats.**

**What the prototype does today: no files exist.** `learner_documents.filename` is a
TEXT column; not a single byte is ever stored. There is no upload endpoint, no size
limit, no type check and no scanning. An image picked in the current session renders a
thumbnail from browser memory; after a reload there is nothing left to show. Every
document rule in this sweep — verify, reject, replace — operates on a filename string.

**Two structural gaps to settle before anything is built:**

- **One file per slot.** `UNIQUE(application_id, doc_key)` allows exactly one file per
  document type. `doc_passport` is labelled "Passport (**front & back**)" and can hold
  one image. A three-page transcript cannot be uploaded. "Exhaustive format support"
  almost certainly implies **multi-file slots**, which is a schema change (H7).
- **Ops reads values off these documents.** The eight ops-filled fields — scores,
  school, university, degree mode, career gap — are all transcribed from scans. So
  in-browser rendering is not a nicety; it is how Stage 2 works. Whatever formats are
  accepted must be **viewable by Ops without downloading**.

**For engineering:**

- **Is there an existing document service** in upGrad's stack to consume rather than
  building one? Same instinct as Q2 — don't reinvent identity, don't reinvent storage.
- Object store, signed URLs, expiry, and **who may download** — currently anyone who
  can see the row.
- **Which formats, concretely?** PDF, JPEG, PNG are table stakes. Worth deciding
  explicitly on **HEIC** (the iPhone camera default — learners photograph marksheets),
  WhatsApp-recompressed JPEG, multi-page TIFF, and DOCX for SOPs and LORs.
- **Conversion / rendering pipeline** for anything the browser cannot display natively
  (HEIC, TIFF, DOCX), given the Ops-must-read constraint above.
- **Virus scanning** — non-negotiable for learner-supplied uploads.
- Size limits per file and per application, and behaviour on a slow mobile connection —
  resumable uploads, or a hard fail?

**For business and compliance:**

- **What do learners actually send today?** Phone photos and WhatsApp forwards will
  dominate; the format list should follow reality, not an ideal.
- **Retention** — how long are documents kept after an offer letter, or after an
  application is abandoned? Nothing is ever deleted today.
- **Can a learner delete their own documents?** Currently they can, unless verified
  (H5).
- ⚠ **These are government identity documents** — Aadhaar and passport scans. Aadhaar
  in particular carries specific handling and storage obligations in India, and the
  whole locker falls under DPDP. **This needs legal/compliance input, not just
  product.** It may constrain storage location, retention and access logging.

**Related:** H1–H7, D1 (Ops transcribes from documents), Q2 (reuse existing services),
Q8 (who can upload when).
