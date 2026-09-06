# Shortlisting — Product Requirements Document

| | |
|---|---|
| **Status** | Draft for review |
| **Product owner** | *TBD* |
| **Last updated** | 2026-09-06 |
| **Engineering spec** | [`stage-wise-flow.md`](./stage-wise-flow.md) — stage-by-stage behaviour, guards, data model |
| **Rule audit** | [`rule-sweep.md`](./rule-sweep.md) — every rule extracted from the prototype, with review status |
| **Prototype** | Clickable, seeded with seven learners (one per state) |

> **How the three documents divide up.** This PRD answers *why we are building it, for
> whom, what is in scope, and how we will know it worked.* The stage-wise flow answers
> *exactly how each rule behaves.* The rule sweep is the audit trail behind both. Read
> this one first.

> **⚠ Sections marked *[needs business input]* contain no invented numbers.** Baselines,
> targets and current-state volumes have to come from the team that runs the process
> today. Everything else in this document is derived from the product itself.

---

## 1. Summary

Prospective learners applying to study abroad are shortlisted for a programme through a
manual, multi-team process: an Academic Counsellor captures their details on a call, an
Ops team checks those details against documents, a programme is chosen, the learner signs
undertakings, and an offer letter is released.

Today that journey has no single system. This product gives it one — a shared pipeline
where each role has a clearly bounded job, every decision is recorded against the person
who made it, and the learner sees a clean view of their own application inside
upgrad.com without ever being exposed to the internal handoffs.

**The core product bet:** most of the cost in this process is *rework* — details captured
wrong and caught late, documents chased twice, eligibility judged against answers that
have since changed, undertakings missed. Structuring the flow so that each role can only
do their own job, and so that a changed answer automatically invalidates the decisions
that rested on it, removes the rework rather than speeding it up.

---

## 2. Problem

*[needs business input — the current-state description below is inferred from the process
this product replaces. Confirm or correct before circulating.]*

| # | Problem | Consequence |
|---|---|---|
| P1 | **No single source of truth.** Learner details live in the CRM, documents arrive over email and chat, eligibility judgements happen in conversation. | Nobody can answer "what is the current state of this learner?" without asking three people. |
| P2 | **No boundary between capture and verification.** The person who captured an answer can also change it after it has been checked. | A verified value can silently stop being the value that was verified. No audit of who changed what. |
| P3 | **Eligibility is judged once, informally.** If a learner's circumstances change, the earlier judgement is not revisited. | Learners are sent programmes they no longer qualify for, and it surfaces late — after signing, sometimes after the offer. |
| P4 | **Undertakings are manual.** Which declarations a learner must sign depends on their answers, and that mapping lives in people's heads and a spec sheet. | Missed undertakings are a compliance exposure, and re-deriving them by hand is slow and error-prone. |
| P5 | **Documents are a pile, not a checklist.** | "What is still missing?" is not answerable at a glance, so documents are chased repeatedly and late. |
| P6 | **The learner is in the dark.** They do not know what stage they are at or what is expected of them. | Inbound "what's happening with my application?" contacts, absorbed by counsellors. |

**Baseline metrics needed:** applications per month · current end-to-end TAT · % requiring
rework after Ops review · % of offers delayed by missing documents · counsellor hours per
application · inbound status-chase contacts per application.

---

## 3. Goals and non-goals

### Goals

| # | Goal | Ties to |
|---|---|---|
| G1 | One system of record for the whole shortlisting journey, with a full audit trail | P1, P2 |
| G2 | Enforce role boundaries so capture, verification and decision cannot blur | P2 |
| G3 | Make eligibility a recorded, re-checkable decision rather than a conversation | P3 |
| G4 | Generate the right undertakings automatically from the learner's answers | P4 |
| G5 | Turn documents into a visible checklist with an explicit verification state | P5 |
| G6 | Give the learner a self-serve view, inside upgrad.com, that never exposes internal handoffs | P6 |
| G7 | Reduce end-to-end time to offer letter by removing rework, not by rushing steps | all |

### Non-goals

- **Not a CRM.** Lead management, pipeline and outreach stay where they are; this consumes lead data, it does not own it.
- **Not the admissions system.** This ends at the offer letter. The full university application is downstream.
- **Not a counsellor performance tool.** No leaderboards, targets or call scoring.
- **Not an automated eligibility engine.** The match score *ranks and explains*; a human rules. Automating the ruling is explicitly out.

---

## 4. Users

| Persona | Job to be done | Environment | Success feels like |
|---|---|---|---|
| **Academic Counsellor (AC)** | Capture a learner's details accurately on a live call, recommend programmes they will plausibly qualify for, and get one confirmed offer into their hands | On a call, screen shared or typing while talking. Time-pressured, high volume | "I finished the form on the call and did not have to touch it again" |
| **Ops verifier** | Check captured details against documents, correct what is theirs to correct, flag what is not, and rule on eligibility | Deep, focused queue work. Reads scans closely | "I could tell at a glance what changed and what still needs my judgement" |
| **Learner** | Understand where their application stands and complete their part without confusion | Mobile-first, on upgrad.com, unfamiliar with the process | "I knew exactly what was being asked of me and why" |
| **Admin** | Manage users and role assignment | Occasional, internal | Invisible when it works |

---

## 5. Scope

### 5.1 In scope — v1

| Area | Included |
|---|---|
| **Capture** | Guided eligibility form on the call · lead-data prefill (identity and intent only) · autosave · programme recommendation from a master catalogue with an explainable match score |
| **Verification** | Field-level and section-level Ops verdicts · comment threads pinned to fields · Ops-owned fields transcribed from documents · document verification |
| **Documents** | Fixed checklist with visible empty slots · upload, replace, verify, reject with reason · permission windows per role and stage |
| **Eligibility** | Per-programme eligible / not-eligible rulings with a reason · counsellor appeal path · exactly one shortlisted programme |
| **Undertakings** | Auto-generated from the answers that trigger them · attached, detached and re-attached as answers change · OTP-backed signing |
| **Learner experience** | Inside upgrad.com · visible only once the first shortlist lands · guided review walk ending in signature and certification · profile always readable |
| **Change handling** | The re-check loop: a learner edit after vetting invalidates certification and any eligibility verdict it touched, and must be cleared before the offer letter |
| **Offer letter** | Released by Ops, gated on signing, certification and a closed re-check |
| **Platform** | Roles and permissions · in-app notifications · full event log per application |

### 5.2 Out of scope — v1

| Excluded | Why / where it goes |
|---|---|
| Downstream application sync | Open — **Q7**. May land in v1 if the integration is ready; specified as a phase boundary |
| "Welcome 2.0" extended form | Below the line on the original journey diagram; awaiting the business team |
| Email and SMS notifications | In-app only for v1 *(note: OTP delivery is a hard dependency and is separate — see §9)* |
| Bulk actions for Ops | Volume-dependent; revisit after launch |
| SLA, ageing and escalation | See §5.3 |
| Multiple applications per learner | Open — **Q5**. Has schema consequences even if deferred |
| Analytics dashboards | Metrics instrumented in v1 (§6); surfacing them is later |

### 5.3 Recommended for v1 but currently unscoped — needs a decision

**A rejection / withdrawal path.** The pipeline only moves forwards. There is no terminal
state for a learner who drops out, goes quiet, or qualifies for nothing anywhere. Those
applications will accumulate in Ops and counsellor queues permanently with no way to
close them.

This is the largest functional gap in the current design and it will be felt within weeks
of launch. **Recommendation: bring into v1.**

**Basic ageing.** Not full SLA machinery — just "this has been sitting for N days" on the
queue views. Without it, nothing surfaces a stalled application and the fix above only
solves the deliberate exits, not the silent ones.

---

## 6. Success metrics

Every metric below is derivable from the event log the product already writes. No
additional instrumentation is needed for v1 beyond exposing them.

### 6.1 North star

> **Median working days from call to offer letter, for applications that reach one.**

Chosen because it moves only when rework falls — the thing the product is actually
designed to remove. Paired always with the quality guardrails in §6.3, so it cannot be
gamed by rushing verification.

**Baseline: *[needs business input]*. Target: *[set once baseline is known]*.**

### 6.2 Funnel and throughput

| Metric | Definition |
|---|---|
| Stage conversion | % advancing `draft → under_review → reviewed → shortlisted → completed` |
| Drop-off by stage | Where applications stall, and for how long |
| Time in stage | Median and p90 per status, measured from status-change events |
| Ops throughput | Applications marked reviewed per verifier per day |
| Counsellor throughput | Forms submitted per counsellor per day |

### 6.3 Quality — the guardrails

These are the ones that tell us whether the core bet is paying off.

| Metric | Definition | Direction |
|---|---|---|
| **Re-check rate** | % of applications with ≥1 learner edit after vetting | ↓ — high means capture is inaccurate |
| **Re-check depth** | Mean edits per application in re-check | ↓ — high means the loop is not converging |
| **Eligibility overturn rate** | % of shortlisted programmes later ruled not eligible | ↓ — the failure this product exists to catch |
| **Document rejection rate** | % of uploads rejected by Ops | ↓ — high means collection guidance is poor |
| **Document chase count** | Mean uploads per slot before verification | ↓ |
| **Comment resolution time** | Raised → resolved, per comment | ↓ |
| **Appeal rate and success rate** | Counsellor appeals raised, and % that overturn | Watch — a high success rate means Ops rulings are miscalibrated; a high raise rate with low success means the reasons are not landing |
| **Submit rejection rate** | Submits blocked by the completeness gate | ↓ over time as counsellors learn the form |

### 6.4 Learner experience

| Metric | Definition |
|---|---|
| Time from shortlist sent → all documents signed | Median, p90 |
| Time from all signed → certified | Median — a long tail here means certification is not understood |
| Learner edit rate after shortlist | % who change details once they can see them — a proxy for capture accuracy from the learner's side |
| Abandonment after shortlist | Shortlisted but never certified within N days |

### 6.5 Health

Error rate per mutation · failed OTP deliveries · median document upload time · p95 API
latency on the two heaviest screens (the counsellor's form, the Ops vetting view).

---

## 7. User stories

Format: **As a … I want … so that …**, with testable acceptance criteria. Detailed rules
and guard conditions live in [`stage-wise-flow.md`](./stage-wise-flow.md); the section
reference is given where relevant.

### 7.1 Academic Counsellor

**US-AC-01 — Find and open a learner**
*As an AC, I want to find a learner from my list quickly, so that I am not fumbling while they are on the phone.*
- My list shows only learners assigned to me, with their current status
- I can search by name and filter by status
- Recently opened learners are one click away

**US-AC-02 — Prefill from the lead record**
*As an AC, I want the details we already hold to be filled in, so that I do not re-ask questions the learner has already answered.*
- Identity and intent prefill: name, mobile, degree level, countries, financing
- Academic data is never prefilled — it must be captured or read off documents
- Prefill only fills empty fields; it never overwrites something I typed
- If prefill writes into a section I had already confirmed, that confirmation is cleared

**US-AC-03 — Fill the form without losing work**
*As an AC, I want my answers saved as I go, so that a dropped call does not cost me the form.*
- *Save draft*, *Next* and *Submit* all persist every answer, not just the visible step
- Autosave requires no explicit action and produces no timeline noise
- Reopening a draft restores everything previously entered

**US-AC-04 — See which declarations the answers trigger**
*As an AC, I want to see which undertakings the learner's answers require, as I capture them, so that I can set expectations on the call.*
- Triggered declarations update live as answers change (§Appendix C)
- I can see *why* each one applies

**US-AC-05 — Recommend programmes with evidence**
*As an AC, I want ranked programme suggestions with a reason, so that I can explain the recommendation to the learner.*
- Suggestions come from the master catalogue, ranked by match score
- Every score shows what it lost points for and why
- I can browse the full catalogue
- 🔄 I can request eligibility for **at most 3** programmes
- I cannot invent a programme

**US-AC-06 — Know what is missing before I submit**
*As an AC, I want to be told exactly what is incomplete, so that I do not hand Ops something they can only send back.*
- A live count of missing required items, each named
- Submit is disabled until they are all present, and refused server-side if bypassed

**US-AC-07 — Act on Ops' comments at the field**
*As an AC, I want each comment attached to the field it is about, so that I can fix it in place.*
- Comments appear pinned to their field, not in a separate list
- I edit the field directly beside the comment
- I can acknowledge or reply; only Ops closes a comment
- Resolved comments grey out rather than disappearing

**US-AC-08 — Shortlist one programme**
*As an AC, I want to send the learner exactly one programme, so that the decision is made rather than delegated.*
- Only programmes Ops ruled eligible are selectable
- Not-eligible ones remain visible and greyed, with Ops' reason, so I can explain the call
- Selecting one clears any previous selection
- I cannot shortlist while a re-check is open

**US-AC-09 — Challenge a ruling I disagree with**
*As an AC, I want to ask Ops to reconsider, or propose an alternative, so that a wrong verdict is not final.*
- Two modes: reconsider an existing rejection, or suggest a catalogue programme
- A written reason is mandatory
- The application returns to Ops, tagged as an appeal
- The learner is never notified about an appeal

**US-AC-10 — Handle a learner's change**
*As an AC, I want to be told when my learner changes something and what changed, so that I can call them before Ops does.*
- I am notified before Ops, with the specific fields named
- Changed fields are marked wherever they appear, showing before → after
- If Ops sends comments to me, I resolve them with the learner and hand it back

### 7.2 Ops verifier

**US-OPS-01 — Pick up work**
*As an Ops verifier, I want new submissions to reach me without a claiming ritual, so that I spend my time verifying.*
- Opening an unassigned application assigns it to me
- My queue distinguishes new submissions from re-checks

**US-OPS-02 — See the answers against the documents**
*As an Ops verifier, I want the documents beside the answers they evidence, so that I am not switching context to check a number.*
- Each section shows the documents that evidence it
- Documents open without leaving the application
- ⚠ Depends on in-browser rendering of whatever formats we accept — **Q9**

**US-OPS-03 — Fill the fields that are mine**
*As an Ops verifier, I want to enter the values I read off documents, so that they come from the source rather than from the call.*
- Only the eight ops-owned fields are mine to fill (§Appendix A)
- Every fill is logged with before → after
- Bounds are enforced — a percentage cannot be 104

**US-OPS-04 — Flag a wrong answer without changing it**
*As an Ops verifier, I want to comment on a counsellor's answer rather than correct it, so that the record shows what the learner actually said.*
- I cannot edit a counsellor-captured answer
- I pin a comment to the field, marked as an action or as context
- ❓ Which fields need a per-answer verdict is open — **Q4**

**US-OPS-05 — Rule on a section in one go**
*As an Ops verifier, I want to verify a block of related answers together, so that I am not clicking through thirty fields.*
- Sections carry a verdict; ruling a section rules the fields inside it
- All fields correct rolls the section up to verified; a field going wrong clears it
- A "not verified" verdict with a reason raises a comment the counsellor will see

**US-OPS-06 — Verify documents**
*As an Ops verifier, I want to mark each document verified or rejected with a reason, so that the learner knows what to fix.*
- Verification is mine alone
- Rejection carries an optional reason and notifies whoever can act on it
- A replaced document returns to pending — I verified the file that was there

**US-OPS-07 — Rule on eligibility**
*As an Ops verifier, I want to rule each recommended programme eligible or not, with a reason, so that the counsellor can explain the outcome.*
- One verdict per recommendation, each with a reason
- 🔄 I cannot mark the application reviewed until every required document is verified
- I cannot mark it reviewed with nothing eligible — that hands the counsellor a dead end

**US-OPS-08 — Re-check a learner's change efficiently**
*As an Ops verifier, I want to see only what changed, so that I do not re-read the whole form.*
- Changed fields are marked with before → after
- Verdicts that rested on a changed answer are marked out of date, and I must rule again
- I close the re-check, or send comments to the counsellor — never straight to the learner
- I cannot close it while any verdict is stale, or with nothing eligible

**US-OPS-09 — Release the offer letter**
*As an Ops verifier, I want the release blocked until everything is genuinely complete, so that an offer never goes out against unverified details.*
- Blocked unless: every document signed, learner certified, no open re-check, a programme still shortlisted
- Confirmation before it goes
- ❓ Whether it should also wait on a downstream sync is open — **Q7**

### 7.3 Learner

**US-L-01 — Not see an application before there is one to see**
*As a learner, I want to hear from upGrad when there is something for me, so that I am not watching a form being worked on.*
- Nothing of the application is visible before the first shortlist
- I see "we're preparing your options"
- My own personal details remain readable in my profile throughout

**US-L-02 — Understand where I stand**
*As a learner, I want a plain statement of what is happening, so that I do not have to ring someone.*
- Three stages, not five internal statuses
- I am never told which internal team holds my file
- When upGrad is the one working, it never says "action needed"

**US-L-03 — Review before I sign**
*As a learner, I want to re-read my details and my programme before signing, so that I know what I am agreeing to.*
- The walk is details → programme → undertaking, in that order
- I cannot reach a signature without passing through what it certifies
- Each undertaking shows the answers behind it

**US-L-04 — Sign securely**
*As a learner, I want my signature protected, so that nobody can sign in my name.*
- Every signature requires an OTP to my registered number
- Signed documents are listed with their date

**US-L-05 — Correct something that is wrong**
*As a learner, I want to fix a wrong detail whenever I spot it, so that my application is accurate.*
- Editable at any point before the offer letter is released
- I am told plainly that a change means re-checking, and what that affects
- ✅ Once the offer letter is out, my details for that application are locked

**US-L-06 — Certify**
*As a learner, I want a clear final confirmation step, so that I know my part is done.*
- Available only once every document is signed and nothing is being re-checked
- After certifying, I am told what happens next

**US-L-07 — Be told if my programme changes**
*As a learner, I want to know if my programme changes, so that I am not signing for the wrong thing.*
- If my change makes me ineligible, I am told my programme is being re-confirmed
- My status reads "Being confirmed" — not "Action needed" — while upGrad settles it

### 7.4 Admin

**US-ADM-01 — Manage users** — create users and assign roles; new learners get an application automatically.
❓ Whether role management belongs in this product at all is open — **Q2**.

**US-ADM-02 — Reassign work** — ❓ does not exist today. **Q1**.

---

## 8. Key product decisions

The opinionated choices. Each was made deliberately; each has a cost worth knowing.

| # | Decision | Why | Cost accepted |
|---|---|---|---|
| D1 | **The pipeline is one-way** | A form that can bounce between two editors bounces forever | Needs a separate mechanism for genuine change — hence the re-check |
| D2 | **A re-check is a flag, not a status** | Rewinding would strip the shortlist and signed undertakings of the state they were made in | More complex than a status; must be understood before building (§3.3 of the spec) |
| D3 | **Ops comments, the counsellor corrects** | A reviewer who edits the thing under review leaves no record of what the learner actually said | An extra hop to fix a wrong answer |
| D4 | **Exactly one programme is shortlisted** | Sending a list delegates the decision back to the learner, who is least equipped to make it | The counsellor must commit |
| D5 | **Documents are a checklist, not a pile** | "Still missing" must be as legible as "here it is" | A fixed slot list needs maintaining |
| D6 | **The learner sees three stages, never five** | Internal handoffs are not their business and naming them invites chasing | Less transparency; deliberate |
| D7 | **The learner sees nothing until the first shortlist** | An application they can watch but not act on only generates anxiety and contacts | They cannot supply documents early — resolved by widening the counsellor's upload window |
| D8 | **A changed answer un-makes the verdicts that rested on it** | A ruling made against answers that have moved is not a ruling | Ops re-work on every material edit — this is the point |
| D9 | **Nothing is authored — programmes and undertakings come from catalogues** | Compliance and consistency | Catalogue upkeep becomes an operational job |
| D10 | **The match score explains itself** | The counsellor quotes it to the learner; Ops second-guesses it | Cannot use an opaque model later without losing this |

---

## 9. Dependencies

| Dependency | Needed for | Status |
|---|---|---|
| **Identity / RBAC** | All access control | ❓ **Q2** — must not be reinvented here |
| **OTP / SMS delivery** | Every signature | **Hard dependency.** Not built; no learner can sign without it |
| **Document storage** | The entire locker | ❓ **Q9** — including in-browser rendering for Ops |
| **Lead source (CRM)** | Prefill | Contract exists in prototype form; needs the real integration |
| **Downstream application system** | Stage 4's ending | ❓ **Q7** — target system not yet identified |
| **Programme catalogue** | Recommendations and eligibility | Needs an owner and an update process |
| **Undertaking templates** | Auto-generation | Needs legal sign-off on wording |

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Deadlock-class bugs** — a state with no exit. One was already found and fixed (documents unaddable during vetting) | An application stuck permanently, needing a DB fix | Every state must have an exit. Test each guard's refusal path, not just its success path. The rejection path in §5.3 is the general answer |
| **Compliance on identity documents** — Aadhaar and passport scans under DPDP | Regulatory exposure | Legal review before storage design is fixed — **Q9** |
| **Ops throughput becomes the bottleneck** — verification is deliberately manual | Queue grows, TAT rises | Instrument §6.2 from day one; bulk actions ready as a fast follow |
| **Counsellors work around the completeness gate** with placeholder values | Garbage that looks complete | Watch document rejection rate and re-check rate; validate what can be validated |
| **The downstream sync is not ready** | Stage 4 has no ending | Decide **Q7** early; if it slips, ship with a manual Ops step and a clear seam |
| **Re-check loops that do not converge** — edit, re-check, edit again | Learner never certifies | Track re-check depth (§6.3); escalate after N cycles |
| **The rule sweep is incomplete** — ~70 of 82 rules unreviewed | Prototype accidents become spec | Finish the sweep before build starts |

---

## 11. Open questions

**Nothing dependent on these should be built until they are answered.** Full detail —
what the prototype does today, the consequences, and the sub-questions — is in
[`rule-sweep.md`](./rule-sweep.md) under the same numbers.

| # | Question | Owner | Blocks | Needed by |
|---|---|---|---|---|
| **Q2** | How does role access work in the existing products? The prototype invented four hardcoded role strings with no permissions, scopes or teams. Almost certainly should consume an existing identity system rather than own one. | Engineering | Data model, all access control | **Before build** |
| **Q5** | Can a learner ever have more than one application? Personal details *and* the entire document locker are keyed per application today, so a second one duplicates everything and forces re-verification. | Business | Schema | **Before build** |
| **Q9** | File storage and supported formats — nothing is stored today. Includes multi-file slots (the "Passport front & back" slot holds one image), in-browser rendering so Ops can read scans, virus scanning, retention, and DPDP/Aadhaar compliance. | Engineering + Business + Legal | The whole document locker | **Before build** |
| **Q7** | The downstream sync: is auto-fill-on-certification buildable, and should the offer letter wait for it? Nothing is implemented; the original journey diagram's sync gate was dropped without a decision. | Engineering + Business | Stage 4's ending | **Before Stage 4** |
| **Q3** | Which documents must exist before the form goes to Ops? Does the required set vary by degree level? Does a *rejected* document count as missing? | Business | The verified-documents gate | **Before Stage 2** |
| **Q6** | Should a missing document *block* submission or only warn? The hard-stop machinery already exists and is proven — this is policy, not feasibility. | Business | Submit gate | With Q3 |
| **Q4** | Which answers actually need a per-field Ops verdict? All ~26 are rulable today, which contradicts the rule that two sections are not Ops' to review. Also determines whether the section rollup survives. | Business | Stage 2 UI | Before Stage 2 |
| **Q1** | Can the assigned Ops owner change mid-process? And the counsellor? Both are write-once, and a claimed application stops notifying anyone else — so an owner on leave makes it invisible. | Business | Reassignment, notification routing | Before launch |

**Also needing a decision, not yet numbered:**

- **The rejection / withdrawal path** (§5.3) — recommended for v1.
- **Ageing on queue views** (§5.3).
- **Baseline metrics** (§2, §6) — without them the north star has no target.

*(Q8 — who can add a document once vetting has started — is decided and implemented.)*

---

## 12. Phasing

| Phase | Contents | Gate to start |
|---|---|---|
| **0 — Decide** | Q2, Q5, Q9 answered · rule sweep completed · baselines captured | — |
| **1 — Core flow** | Stages 1–3, documents, eligibility, appeals, the re-check loop, roles, in-app notifications, event log | Phase 0 complete |
| **2 — Learner side** | Learner experience in upgrad.com, undertaking signing with real OTP, certification | OTP delivery available |
| **3 — Close the loop** | Downstream sync, offer letter release | Q7 answered |
| **4 — Operate** | Ageing, bulk actions, metrics surfacing, email/SMS | Post-launch, driven by §6 |

Phases 1 and 2 can overlap; 3 depends on an external system and should be de-risked early.

---

## 13. Appendix — reference

- **Stage-by-stage behaviour, guards, data model, notification matrix** →
  [`stage-wise-flow.md`](./stage-wise-flow.md)
- **Every extracted rule with review status** → [`rule-sweep.md`](./rule-sweep.md)
- **Ops-owned fields · eligibility inputs · clause triggers · match score · document
  checklist** → appendices A–E of the stage-wise flow

**Marker key used across all three documents:** ✅ confirmed · 🔄 changed from the
prototype · ⬜ extracted but unreviewed · ❓ open question.
