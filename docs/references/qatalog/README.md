# Qatalog — UI reference set (curated by Mobbin)

Shared 2026-09-07. Nine screens from Qatalog's workspace product. Kept for Design mode — the WIP treatments switchable from the demo FAB — as a reference for *how a calm, dense, form-heavy product handles structure*: field configuration, detail rails, empty placeholders, sticky save bars, slash menus, and automation triggers.

**Drop the PNGs into this folder with the names below** (any names work; these keep the index readable).

| # | File | Screen | Why it's here |
| --- | --- | --- | --- |
| 1 | `01-manage-fields.png` | **Manage fields** (module settings) | The configuration pattern for the profile-summary sheet: each field is one row — drag handle · name input · type select with a glyph (Text / Email / Phone / Location / Multi select) · required asterisk · overflow menu. Locked system fields (Name, Description) show a padlock instead of a handle. Multi-select options nest beneath as indented, draggable rows with their own delete. Left rail: General / Fields / Connections, then a **Features** list with delete + arrow per row. |
| 2 | `02-details-empty.png` | **Details card, nothing filled** | Empty-state copy done *per field*: "Please enter Email", "Please select Skills, you can select multiple" — muted, inline, in the value column. No dashes, no "Not on file". Chevron on the right only for multi-selects. The edit affordance is one pencil top-right with a tooltip ("Edit UX Designers fields"). Profile header: diamond-cropped avatar, name, long bio, chips for visibility · owner · teams. |
| 3 | `03-manage-fields-blank-title.png` | Same as #1, section title empty | Shows the placeholder state of the title input ("Name") and confirms the sticky footer: *"You've made 1 change to this Module, cancel changes or save to apply."* with **Cancel** / **✓ Save**. The footer counts changes — compare our re-check bar ("2 verdicts to re-rule"). |
| 4 | `04-details-filled.png` | **Details card, partly filled** | Filled values as chips (`Resume.pdf`, tags `designer · associate · government project`) beside still-empty placeholders. Then **Recommended actions** (three icon tiles with a dismiss ×) and **Latest activity** — a vertical timeline with paired glyphs, actor in bold, object in bold, relative time right-aligned. Direct analogue of our Activity Timeline. |
| 5 | `05-task-detail-rail.png` | **Task detail with property rail** | Two-pane detail: content left (title, description, Subtasks, Comments with an "Add a reply…" composer, Activity), a **property rail** right — Status / Assignees / Due date / In / Creator / Estimate / Priority / Blocker / Labels / Repeat — each a label left, chip control right, hairline rules between. Footer note with a lock glyph: *"Privacy settings inherited from connection."* — the exact tone for our "Verified by the upGrad team" seals. |
| 6 | `06-slash-menu.png` | **Page editor, slash command menu** | Three-column command palette on `/`: blocks (H1–H3, paragraph, bold…), objects (lists, checklist *New*, image, table, import tasks, create page, hint, mention), embeds (Slack, Me, Embed, Divider, Figma, Loom…). Gradient page header with an emoji tile. Reference for the comment/note composer if it ever grows beyond plain text. |
| 7 | `07-triggers-empty.png` | **Triggers, empty + one trigger** | Automation list per object: "No triggers yet" under UX Designers; one trigger card under John Smith ("Updates · On status changed · 3 steps") selected in blue; **+ Add new trigger**. Right pane: name, created date, step count, and **Trigger activity — "No runs yet"**. Two honest empty states in one screen. |
| 8 | `08-trigger-edit.png` | **Trigger editing (draft)** | Card flips to an amber warning glyph + *Draft* while unsaved. Right: Name*, "When this happens*" select, then **"The following actions are performed:"** — draggable action cards with type glyph + delete, and **+ Add action**. Footer: info line *"Save your changes to actions"*, Cancel / 🗑 Discard changes / ✓ Save. Maps to our re-check → programme-change → AC hand-off as a *sequence* someone could configure. |
| 9 | `09-create-task-sheet.png` | **Create task, full-height sheet** | A sentence-as-form header: "**in** [Landing page research ▾] **assigned to** [John Smith ▾]". Task name with a lightning glyph (templated value), rich-text description with a toolbar. Second capture shows the "in" picker open: grouped, searchable list (Status changed / Research / Projects / UX Designers / People) with lock glyphs on private items and an *Invited* chip. |

## Patterns worth lifting into Design mode

- **Per-field empty copy in the value column** ("Please enter Phone") instead of a generic dash — try on the profile summary's "Not on file".
- **Sticky change-count footer** ("You've made 1 change…") — our re-check bar already counts verdicts; the phrasing and Cancel/Save pairing are tighter here.
- **Property rail** (label · chip · hairline) — a candidate structure for the application header meta (status, counsellor, dates) on the staff boards.
- **Sentence-as-form** ("in ▾ assigned to ▾") — a lighter way to capture programme + learner on the AC's shortlist step.
- **Padlock for system fields** and **"inherited from"** footnotes — the vocabulary for Ops-derived, non-editable answers.
- **Draft state with amber glyph** on an unsaved card — for the AC's draft application row.

## Provenance

Screens are Qatalog's, captured and curated by Mobbin. Internal reference only — not for redistribution.
