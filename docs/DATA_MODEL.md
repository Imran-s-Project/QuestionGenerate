# Data model (Phase 2)

Everything is stored in Firestore. No Firebase Storage. Paths below `organizations/{orgId}/` are one institution's private workspace.

| Path | Purpose |
|---|---|
| organizations/{orgId} | Institution profile: `name`, `type`, `code`, `ownerUid`, `status` (active/archived). Never hard-deleted from the client. |
| .../members/{uid} | One doc per user, keyed by uid: `role`, `status` (active/invited/disabled), `answerKeyAccess`. |
| .../invites/{token} | One-time join codes: `role`, `answerKeyAccess`, `expiresAt` (7 days at most), `status` pending/used. The unguessable id is the secret. |
| .../questions/{id} | Student-facing question content only. `status`: draft/active/archived. |
| .../questions/{id}/answerKey/{id} | Correct answers and explanations, with separate permissions. |
| .../exams/{id}, .../sections, .../sets, .../selections | Exam setup. Sets store question and option order only, never answers. |
| .../subjects, departments, classes, categories, questionTypes, questionCollections | Taxonomy used by question authors. |
| .../templates, paperLayouts, settings | Paper design and organization settings. |
| .../imports, exports, archives, auditLogs | History. The audit log is append-only. |
| users/{uid}, users/{uid}/preferences/{id} | The user's own profile and settings. |
| appConfig/{id} | Public branding, navigation and feature flags. |
| platformAdmins/{uid} | Marker docs you create in the console. They allow writing `appConfig` and nothing else. |

Every organization document carries `orgId`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt` (server timestamps). Rules reject forged or rewritten values. Use `forCreate` and `forUpdate` from `js/services/firestore-service.js`.

## Roles
| Capability | owner | admin | teacher | editor | reviewer | examManager | viewer |
|---|---|---|---|---|---|---|---|
| Read questions, exams, taxonomy | yes | yes | yes | yes | yes | yes | yes |
| Create, edit, archive questions | yes | yes | yes | yes | - | - | - |
| Hard-delete questions | yes | yes | - | - | - | - | - |
| Read answer keys | yes | yes | yes | yes | yes | yes | - |
| Write answer keys | yes | yes | yes | yes | - | - | - |
| Manage exams | yes | yes | yes | - | - | yes | - |
| Templates and paper layouts | yes | yes | - | - | - | yes | - |
| Imports and exports | yes | yes | yes | yes | - | yes | - |
| Settings, archives, read audit log | yes | yes | - | - | - | - | - |
| Add or change members | any non-owner role | non-admin roles | - | - | - | - | - |

A member with `answerKeyAccess: true` can read and write answer keys whatever their role. Only owners and admins can set it.

## Design notes
- "My organizations" is one collection-group query on `members.uid` (index override in `firestore.indexes.json`).
- Creating an organization is one batch (organization + owner member). The rules verify it with `getAfter`.
- Deleting a question does not delete its `answerKey` documents. Delete those in the same batch.
- Members join with an invite code (`orgId.token`). Redeeming creates the member and marks the invite used in one batch; the rules verify both with `getAfter`.
- The institution profile (address, contact, academic session, brand color, paper header, default footer, https logo URL) lives in the organization document. Inline image data is rejected by the rules.
- Composite indexes cover the planned Question Bank filters. If a new filter combination needs an index, Firestore's error message contains a link that creates it.

## Questions (Phase 4)
- `questions/{id}`: student-facing content only. `type` (built-in id or `c_<customTypeId>`), `family`, `statement` (controlled markup, see below), `imageUrl` (https), `instructions`, `subjectId`, `topic`, `chapter`, `chapterId`, `category`, `difficulty` (easy/medium/hard), `marks`, `negativeMarks`, `timeSeconds`, `tags` (lowercase), `status` (draft/active/archived), `keywords` (search words), `fingerprint` (SHA-256 for duplicate warnings), plus family fields: `options` or `lefts`/`rights` (shuffled) or `items` (shuffled) or `subs`.
- `questions/{id}/answerKey/main`: `correct` (option ids), `value` (true/false), `blanks`, `answer`, `map` (left id to right id), `order` (item ids), `subs` (sub-question answers), `explanation`, `notes`. Correct answers never appear in the question document.
- Text is stored as controlled markup, never HTML: `**bold**`, `*italic*`, `++underline++`, `^(sup)`, `_(sub)`, `{1/2}`, `- list`, `| table |`. It is escaped and converted by a whitelist renderer (`js/utilities/rich-text.js`).
- Search uses the `keywords` array (one word per query, array-contains). One filter (subject, type, difficulty, chapter or tag) can be combined with status and search; more combinations need more indexes.
- `questionTypes/{id}`: custom types (`name`, `family`, `count`, `instructions`, `criteria`). Built-in types live in `js/services/question-types.js`.

## Exams (Phase 5)
- `exams/{id}`: `title`, `code`, `version`, `categoryId` (built-in id or `c_<categories doc id>`), `examType`, `session`, `className`, `department`, `group`, `subjectId`, `date`, `startTime`, `endTime`, `durationMin`, `totalMarks`, `passMarks`, `negativeMarking`, `instructions`, `status` (draft/final/archived), `sectionCount`, `questionCount`. The rules reject an empty title and a pass mark above the total.
- `exams/{id}/sections/{id}`: `title`, `type` (question type filter, empty = any), `count`, `marksEach`, `order`, `questionIds` (the selection; stored here instead of a separate `selections` collection). Section total = count x marksEach; the exam total must equal the sum of sections to be marked final.
- `exams/{id}/sets/{id}`: `label` (A to F), `questionOrder` (section id to question ids), `optionOrder` (question id to option ids), shuffle flags. Sets hold permutations only. Answer letters are derived from the answer-key documents when needed, so student-readable data never contains answers.
- Changing sections or the selection deletes the exam's sets in the same batch, so a set can never refer to an outdated selection.
- Auto-fill picks randomly from the newest 300 active questions of the section's type (optional difficulty mix and chapter); `selections`, cross-exam repetition rules and rule presets are not built yet.

## Paper layouts (Phase 6)
- `paperLayouts/{id}`: one design per document. Page (`pageSize` A4/Legal/Custom, `orientation`, `customW/H`, `margin`, `columns`, `border`), typography (`fontFamily`, `fontSize`, `lineHeight`, `qSpacing`, `sSpacing`, `paperLang`), header and student-information toggles, `marksAlign`, `optionsLayout`, `pageNumbers`, `footerText`, `watermark`, `name`, `isDefault`. Owners, admins and exam managers can write; all members can read.
- The paper header uses the institution profile (name, address, https logo URL, paper header, default footer). Section titles and instructions come from the exam sections.
- Pages are real elements: blocks are measured and moved to a new page when a page overflows, so the preview and the printed pages are identical. Printing uses the browser (choose "Save as PDF" for a file); direct PDF/DOCX export is Phase 7.
- The student paper is built from question documents and set permutations only. `js/utilities/paper-render.js` and `js/modules/paper-preview.js` never read answer keys.
- Bengali-capable fonts (Noto Sans Bengali, Noto Serif Bengali, Hind Siliguri) are loaded from Google Fonts and cached by the service worker after the first online use.

## Export (Phase 7, part 1)
- Everything is built in the browser and downloaded; nothing is uploaded. `js/utilities/zip.js` writes ZIP packages, `js/utilities/office.js` builds DOCX, XLSX, CSV (with BOM, formula-safe) and TXT.
- Exam modes: student paper (DOCX, TXT), teacher copy (DOCX, TXT), answer key (CSV, XLSX, TXT, JSON), detailed solutions (DOCX, TXT), examination archive (JSON). Answer keys are read only for modes that need them. For PDF use Paper Preview, Print, "Save as PDF".
- Question bank export: CSV, XLSX, JSON, TXT, optionally with answers and explanations. CSV/XLSX columns: `BANK_HEAD` in `js/services/export-service.js` (options A to F, `correct` letters, `answer` for other families). The JSON format `question-generate/questions` (version 1) is what the import will read back.
- `exports/{id}` keeps a history record of each export (best effort) and the audit log gets an entry.

## Import (Phase 7, part 2)
- Sources: CSV/TSV/semicolon text, XLSX (first sheet, read in the browser), JSON, or pasted text. DOCX is not supported. The file is parsed on the device and never stored; the `imports/{id}` record keeps only the file name, counts and status.
- Spreadsheet columns are `IMPORT_FIELDS` in `js/utilities/question-schema.js` (the same list the export uses). Columns are matched by header name and can be remapped. Choice questions use `optionA` to `optionF` and `correct` letters; true/false, blanks and written answers use `answer`. Match, ordering and structured questions need the JSON format `question-generate/questions`.
- Checks per row (same validator as the builder): statement, marks, difficulty, options, correct answer, blanks. Possible duplicates (same fingerprint inside the file or already in the bank) are flagged and unticked by default; nothing is deleted or overwritten. Statements can be corrected in the preview.
- Saving: batches of 200 questions (with their answer keys). Cancel stops between batches. On a failed batch saving stops and the report shows what was saved and which rows were not. Subjects named in the file are reused by name or created.
- Questions are always created as new documents, by the importing user, with fresh ids and timestamps.

## Backup and restore (Phase 8, part 1)
- Backup (owners and admins): one JSON file `question-generate/backup` (version 1) built in the browser: settings (subjects, categories, custom types, paper layouts, profile), the question bank (optionally with answer keys) and exams with sections and sets. Timestamps and ids of the source are not kept; subjects are stored by name. Nothing is uploaded.
- Restore is additive: every document becomes a NEW document with a fresh id. Existing data is never deleted or overwritten (the institution profile only if you tick it). Subjects, categories and custom types are reused by name or created. Links are remapped: exam sections point to the new question ids, sets to the new sections and questions. If the question bank is not restored in the same run, exam sections lose their selections and sets are skipped.
- Invalid questions are skipped and counted. Writes are batched (400 per batch); cancel stops between batches and a failed batch stops the restore, with a report of what was written. Restoring into the same institution creates copies, so it is best used for a new or damaged institution.
- Planning is pure code in `js/utilities/backup-plan.js`; the Firestore writes are in `js/services/backup-service.js`.

## Dashboard, reports, settings and drafts (Phase 8, part 2)
- The dashboard shows real counts from server-side aggregation (questions and exams by status, active questions by type, difficulty and subject, questions and exams created per month). Results are cached for 5 minutes per institution; recent questions and exams are read as five documents each.
- Reports: activity (`auditLogs`, owners and admins), exports and imports history (staff roles). Newest first, 30 per page; the activity list can be filtered by action (uses the `action` + `createdAt` index).
- `settings/general`: default question type, difficulty, marks, negative marks, default exam duration and instructions, and the auto-save switch. Owners and admins can write; every member reads. Only settings the app applies are offered.
- Question drafts are saved on the device (localStorage) every 5 seconds while editing and offered again if the page was closed before saving. They are removed after a successful save.
