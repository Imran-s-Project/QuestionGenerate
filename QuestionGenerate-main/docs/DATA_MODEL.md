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
