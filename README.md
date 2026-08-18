# Shortlisting Platform — working prototype

A clickable prototype of the learner shortlisting journey. One eligibility form travels
through five statuses while four roles act on it: an Academic Counsellor fills it on a
call, the Ops team vets it field by field, the learner signs and certifies, and Ops
releases the offer letter.

Every flow, state and edge case is real and clickable — this runs on an actual SQLite
database, not on mockups. The database runs **inside the browser** (WASM), persisted to
the browser's own storage: there is no backend, no server state, and nothing to
provision. That is deliberate — it deploys to Vercel as-is (see **Deploying it**,
below). The visual design is built out; this is not a wireframe.

**Two design worlds, on purpose.** The counsellor, Ops and admin use the internal tool's
own design. The learner's side is built inside **upgrad.com** — the real site's header,
fonts (CircularXX), brand red and profile-page layout, with a **Shortlisting** entry
added to the site's left navigation below My applications. That is the pitch: the
learner never leaves upgrad.com.

The learner side ships in **two skins**, switchable live from the round button:
**v1** adds a Shortlisting section of its own to the site's navigation; **v2** rebuilds
the journey on the site's *current* **My Applications** pages — and v2 is not a lookalike.
It runs on the site's **own compiled stylesheet and markup**, lifted from saved captures
of upgrad.com and bundled in this zip, so what you see is the production site's actual
code rendering our flows. That's deliberate: this is the code that would be integrated
into upgrad.com.

---

## Start here — running it from scratch

This zip is the complete project. Nothing else is needed and nothing has to be fetched
from anywhere else. It has been tested from an empty machine.

**Step 1 — check you have Node.js.** Open Terminal and run:

```bash
node --version
```

If that prints a number **18 or higher**, you're set. If it says "command not found",
install the **LTS** build from https://nodejs.org (the big green button), then close and
reopen Terminal.

**Step 2 — open this folder in Terminal.** Type `cd ` (with a space), drag the unzipped
`shortlisting` folder onto the Terminal window, and press Enter.

**Step 3 — install and run.** The first command takes a minute or two; it only ever needs
running once.

```bash
npm install
```

```bash
npm run dev
```

**Step 4 — open http://localhost:3000** in your browser. Sign in as
**academic@upgrad.com** with password **12345**.

Stop the server with `Ctrl + C` in Terminal. To start it again later, just `npm run dev` —
you never need to `npm install` twice.

> **The database lives in your browser.** On first open the app seeds seven learners,
> one parked at each stage, straight into an in-browser SQLite (WASM) that persists to
> IndexedDB — so your clicks survive reloads, per browser. **Reset demo data** in the
> round button (below) puts everything back to the starting state. There are no native
> modules and nothing else to install.

---

## Deploying it — Vercel, no backend

Because all state lives in the visitor's browser, this deploys like a static site:

```bash
npx vercel
```

…from the project folder (or push it to GitHub and import the repo at vercel.com).
No environment variables, no database add-on, no configuration. Every visitor gets
their own private copy of the demo data, seeded on first load in their browser.

---

## Browsing it — the round button, bottom right

You do **not** need to sign in and out to see the other roles. The dark circular button in
the bottom-right corner switches account instantly, and tells you what each one is for:

| | Signs you in as | What you'll see |
|---|---|---|
| Academic Counsellor | Arjun Mehta | All seven learners, one per state |
| Ops Team | Omar Khan | The vetting pipeline |
| Learner | Neha Gupta | Inside upgrad.com — review, sign and certify |
| Admin | Asha Sharma | Users and role assignment |

The same menu holds one button and two switches:

- **Reset demo data** — puts every learner back to their starting state. Click through
  freely and reset when you want a clean run.
- **My Applications v2** — flips the learner between the two skins. **On** (v2): the
  site's My Applications list and a tabbed application — Personal Details / Program /
  Undertaking / Upload Documents — walked with Next/Back buttons, closed by the site's
  own consent checkbox + **Submit** (that submit *is* the certification). **Off** (v1):
  a Shortlisting entry in the profile navigation with the guided review walk. Same
  database, same rules — only the skin changes.
- **Activity timeline** — flips between the two ways of showing the activity log, so both
  can be compared live. **On** is the built design: the timeline sits in the right-hand
  column of the application. **Off** removes that column entirely and puts the same log
  behind a **Check activity** button beside the learner's name, which fans out from the
  right edge. Off is the alternative under discussion, not the default.

(Signing in manually also works: the four accounts above at `academic@` / `ops@` /
`learner@` / `admin@upgrad.com`, password **12345**.)

---

## The demo data

Seven learners are parked across the journey, all assigned to Arjun Mehta, so signing in
as Arjun shows every state in one list.

| Learner | Status | What it demonstrates |
|---|---|---|
| **Ravi Kumar** | Draft | The empty eligibility form — a 6-step wizard filled on the call: profile, academics, documents, financing, then **programme recommendations ranked by a live match score** |
| **Priya Singh** | Under Vetting | In the Ops queue, unclaimed — 6 of the 10 document slots in. Opening it as Ops claims it |
| **Sneha Patel** | Under Vetting | Omar is mid-vetting — drop a comment pin on a counsellor field, fill an ops field, verify documents, and **rule each recommended programme eligible or not** |
| **Vikram Joshi** | Reviewed by Ops | Ops corrected two fields and rejected a passport scan. As Arjun: read the comments, shortlist among the eligible |
| **Kabir Nair** | Reviewed by Ops | Clean — every document verified, 3 recommendations ruled eligible. Shortlist one and send |
| **Neha Gupta** | Shortlisted | Switch to Neha: she's on upgrad.com. Review details → programme → undertakings, **sign with an OTP**, then **certify**. Then as Ops, release the offer. Try her in both skins |
| **Aman Verma** | Completed | The finished state, offer letter issued |

Clicking through changes this data — that's the point (it changes it in YOUR browser
only). Reset from the round button whenever you want a clean run.

---

## The journey

```
draft ──► under_review ──► reviewed ──► shortlisted ──► completed
```

One way. There is no loop back, because a form that can bounce between two editors
bounces forever.

| Stage | Who acts | What happens |
|---|---|---|
| `draft → under_review` | Counsellor | Fills the form on the call, collects whatever documents the learner has to hand, and recommends programmes: **the AI vet reads the captured details and surfaces its best matches right on the step** (country, degree, score, experience — each shows its % and why), with the full catalogue one click deeper. Submitting generates the undertakings the answers trigger, and it lands in the Ops queue. |
| `under_review → reviewed` | Ops | Vets field by field. The counsellor's answers are **comment-only** — a wrong one gets a **pin on the field** (a Figma-style alert icon; the thread opens from it), never an edit. The **ops-owned fields** (scores, university, career gap — read off the documents) are Ops' own to fill, and every fill is logged. Verifies or rejects each document. Then **rules each of the counsellor's recommendations Eligible / Not eligible** — marking reviewed needs at least one eligible. |
| `reviewed → shortlisted` | Counsellor | Reads Ops' corrections and comments (resolving a comment greys its pin — it never disappears), then **shortlists exactly one** of the eligible programmes. Not-eligible ones stay visible, greyed, so the call is explainable. |
| `shortlisted → completed` | Learner, then Ops | The learner walks a guided review — details, programme, undertakings, **in that order** — and signs at the end of it. **Every signature takes an OTP** sent to their phone. Certifying closes their side; only then can Ops release the offer letter. |

### Rules the UI enforces

- **One editor at a time.** The counsellor owns the details until they submit; Ops owns
  them from that moment on. The counsellor's view goes read-only, and Ops fixes what they
  find rather than posting it back for another round of edits. `editorOf()` in `domain.ts`
  is the single place that decides this.
- **Ops remarks are notes, not blockers.** They are Ops' record of what they changed —
  raised and resolved by Ops, read by the counsellor. They never take tabs away or change
  what Ops can finish.
- **Documents are a checklist, not a pile.** Every learner carries the same slots, so
  "still missing" is as legible as "here it is". Verification is Ops' alone; rejecting one
  notifies the learner with the reason, and replacing a verified file returns it to
  pending — Ops verified the file that was there, not whatever replaces it.
- **The learner is told what's happening, never whose desk it's on.** They see three
  stages, not five statuses, and no activity log — which team inside upGrad is holding
  the file is our business, and naming it only invites "why is it still there?".
- **Reading comes before signing.** In v1 there is no Undertaking tab at all — signing
  lives at the end of a guided walk (Your details → Your programme → Undertaking), so a
  learner cannot reach a signature without having just re-read what it certifies. In v2
  the site's tab strip stays freely navigable (that's how the real pages behave), but
  the Next/Back walk leads through the same order and **Submit stays disabled until
  every undertaking is signed and the consent box is ticked**. Their details are also
  always readable under **Profile → Personal details**, in upgrad.com's own row layout,
  editable per section.
- **Once the shortlist is sent, remarks lock** as read-only history.
- **The learner certifies at the end.** Signing says "I agree to these documents";
  certifying says "and the details behind them are correct". Ops cannot release the offer
  letter without it, and editing any detail afterwards withdraws it.
- **Programmes travel counsellor → Ops → counsellor.** The counsellor recommends from
  the catalogue (guided by the match score), Ops rules each recommendation eligible or
  not, and the counsellor shortlists **exactly one** — and only from the eligible.
  Nobody can invent a programme or author an undertaking; both come from master
  catalogues, and Ops can only remove what Ops added.
- **Ops comments; the counsellor corrects.** The counsellor's answers are never Ops'
  to change — anything wrong gets a comment pin on the field itself, and once the
  review lands, the counsellor edits that same field right beside the pin and ticks
  it off. Only the ops-owned fields (scores, university, career gap) are Ops' to
  fill, and every change is logged ("Ops filled X: before → after").
- **Ops cannot leave remarks on fields Ops fills** (scores, university, career gap) —
  those are read off the documents by Ops, so there is nothing to flag to anyone else.
- **A signature takes an OTP.** The sign dialog sends a code to the learner's masked
  number and asks for it before recording the signature — in both skins. (Prototype:
  any 4-digit code verifies; no SMS is actually sent.)
- **The form autosaves.** Moving between steps persists the answers — there is no "save
  draft" button, because abandoning it should just leave a draft.
- Notifications are in-app only (the bell) — no email or SMS.

---

## Where things live

```
src/
├── app/
│   ├── globals.css                       ← design tokens + .btn/.card/.input classes
│   ├── login/                            ← split-screen sign-in with the showcase carousel
│   ├── ac/                               ← Academic Counsellor
│   │   ├── page.tsx                      ← dashboard: stats, quick actions, learner list
│   │   ├── users/page.tsx                ← User Hub, filterable by status
│   │   └── application/[id]/
│   │       ├── page.tsx                  ← the application, four tabs
│   │       └── call-form.tsx             ← the 5-step eligibility wizard
│   ├── ops/                              ← Ops: pipeline, User Hub, vetting view
│   │   └── application/[id]/
│   │       ├── page.tsx                  ← field-by-field vetting
│   │       ├── ops-field.tsx             ← a field Ops can correct in place
│   │       └── catalogue-picker.tsx      ← programme / form library picker
│   ├── learner/                          ← lives inside upgrad.com's design
│   │   ├── application/[id]/page.tsx     ← v1: overview, documents, guided review walk
│   │   ├── applications/page.tsx         ← v2: the site's My Applications list (capture code)
│   │   ├── applications/[id]/page.tsx    ← v2: tabbed application, the site's own tab strip
│   │   ├── applications/[id]/v2-bits.tsx ← v2: capture docs table + consent-checkbox Submit
│   │   ├── profile/page.tsx              ← Profile → Personal details, per-section edit
│   │   ├── profile-cards.tsx             ← the profile section cards, shared by v1 and v2
│   │   ├── details-form.tsx              ← the edit form, in the capture's own field classes
│   │   ├── detail-rows.tsx               ← the upGrad label/value row, shared
│   │   └── certify-block.tsx             ← the closing certification dialogue
│   ├── admin/page.tsx                    ← user list and role assignment
│   └── updates/page.tsx                  ← notifications, shared by every role
├── components/
│   ├── db-provider.tsx                   ← opens the browser database, gates the app on it
│   ├── shell.tsx                         ← internal-tool frame (counsellor, Ops, admin)
│   ├── upgrad-shell.tsx                  ← upgrad.com frame for the learner: header,
│   │                                        breadcrumb, left nav — and the ONLY place
│   │                                        that loads /upgrad/site.css
│   ├── ug-body.tsx                       ← puts the learner theme class on <body> so
│   │                                        portalled dialogs/toasts wear it too
│   ├── role-switcher.tsx                 ← the round button, bottom right
│   ├── open-application.tsx              ← records a visit / claims for Ops (see below)
│   └── ui/                               ← the component library — one file per concern
└── lib/
    ├── domain.ts                         ← statuses, transitions, form fields, clauses
    ├── actions.ts                        ← every mutation (all writes)
    ├── queries.ts                        ← every read
    ├── browser-db.ts                     ← sql.js adapter + IndexedDB persistence
    ├── session.ts                        ← the localStorage session + demo toggles
    ├── demo-seed.js                      ← the demo dataset (first load + Reset)
    ├── vetting.ts                        ← form generation + claiming
    └── db.ts                             ← schema, migrations, initial seed
```

**Two files worth reading first:**

- **`src/lib/domain.ts`** — the single source of truth. Statuses and their colours, the
  allowed transitions and who may make them, **who may edit at each status**
  (`editorOf`), what the learner is shown instead (`LEARNER_STAGES`, `learnerStatus`),
  every field in the eligibility form, the document checklist (`LEARNER_DOCS`), and the
  clauses each answer triggers. Change a field here and it changes in the counsellor's
  wizard, the Ops vetting view and the learner's view at once.
- **`src/app/globals.css`** — the design tokens and the `.btn-primary` / `.card` /
  `.input` classes. Restyling those restyles most of the app.

---

## The learner/v2 side wears the site's own code — read this before touching it

This was an explicit product decision, not a styling shortcut: the learner experience is
what gets integrated into upgrad.com, so it must be the site's code, not a translation
of it.

- **`public/upgrad/site.css` is upgrad.com's real compiled stylesheet** (from saved
  captures of the live site; its CDN font URLs rewritten to the woff files bundled next
  to it, including the icomoon icon font that draws the `icon-*` glyphs). The v2 pages'
  markup — the My Applications card, the tab strip, the documents table, the consent
  checkbox, the form fields — is **lifted verbatim from the captures**, class strings
  and all. Tab selection is driven by `data-headlessui-state="selected"`, exactly how
  the site itself does it. **Do not "improve" these class strings into our own
  components** — matching the site is the requirement.
- **Only `upgrad-shell.tsx` loads site.css**, so the internal tool (counsellor / Ops /
  admin) never sees it. Keep it that way — the two design worlds must not bleed into
  each other.
- **Three landmines in that stylesheet are already defused in our copy; don't undo
  them.** (1) It ships two-letter country-flag sprite classes — `.ug` is *Uganda's
  flag*, which is why the learner theme class is `ug-app`; never add a two-letter class
  on the learner side. (2) Its button preflight (`[type=button]{background-color:
  transparent}`) is wrapped in `:where()` in our copy — unpatched, it silently blanks
  any of our own buttons that carry an explicit `type`. (3) Its icomoon `@font-face`
  points at the bundled woff only (the original listed font files that don't exist
  locally, and the status icons rendered as empty boxes while the browser worked that
  out).

---

## Three things to know before changing code

**Never mutate state during render.** Opening an application records the visit and, for
Ops, claims it. That looks like something a server component could do — it isn't. Next.js
re-renders pages for prefetches, `router.refresh()` and every `revalidatePath`, so doing
it in the render path silently started vetting on applications nobody had opened. It lives
in a client effect (`components/open-application.tsx`) for that reason.

**`src/components/ui/` is a directory, not a file.** There was once a `ui.tsx` beside it,
which shadowed the directory and broke every import. Add components inside `ui/` and
export them from `ui/index.ts`.

**One component per concern, reused across roles.** Uploads (`FileTile` / `FileValue`),
the document checklist (`DocumentTable`), documents (`DocumentDialog`), remarks
(`RemarkCard`), undertakings (`UndertakingCard`) all render the same everywhere on
purpose. If a screen needs a variation, add a prop rather than a second copy — this
codebase has been bitten repeatedly by two implementations of the same thing drifting
apart.

**No nested `<form>`.** `DocumentTable` calls its actions directly instead of
wrapping each button in a form, because it renders inside the counsellor's call wizard,
which is itself one big form. A nested form is invalid HTML and makes React discard the
entire server render on hydration — the symptom is a page that flashes correct and then
goes blank.

---

## Deliberate shortcuts

- **No real auth.** The session is a user id in localStorage, and `/dev-login?email=…`
  signs you in as anyone. Everyone who opens the URL gets their own sandbox, so this is
  demo-safe — but it is not authentication.
- **SQLite in the browser** — the real schema and queries run on sql.js (WASM SQLite),
  persisted to IndexedDB per browser. No server, no writable disk, which is exactly why
  it deploys to Vercel unchanged. The trade: state is per-browser (two laptops see two
  demos), which for a prototype is the feature, not the bug.
- **Uploads are filenames**, not real files. Images picked in the current session show a
  live thumbnail; after a reload there are no bytes to render, so the file icon shows.
- **Signing is a typed name** plus an OTP plus a timestamp, standing in for a real
  e-signature flow. No SMS is sent — the dialog says so, and any 4-digit code verifies.
- **One application per learner.**
- **The upGrad look is self-contained.** The site's own compiled stylesheet, the logo,
  the CircularXX text faces and the icomoon icon font are all bundled in
  `public/upgrad/` — nothing is fetched from upgrad.com at runtime, so the learner side
  renders offline. The nav items that aren't part of this prototype (courses,
  certificates, jobs) are set dressing: present so the page reads as the real site,
  deliberately inert.
