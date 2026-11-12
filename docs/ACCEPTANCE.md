# Acceptance checklist

Legend: **Checked** = verified by automated code checks or tests that ship with this project (`npm run test:rules` and the static checks run during the build). **Your test** = needs your own Firebase project or devices, because it cannot be proven without them.

| # | Requirement | Status |
|---|---|---|
| 1 | Users can sign in correctly | Your test: sign up, sign in, Google, sign out |
| 2 | Institutions can be created and managed | Your test (rules tests cover the permissions) |
| 3 | Institution data is isolated | Rules tests written: run `npm run test:rules` |
| 4 | Custom question types work | Your test: create one, then create a question with it |
| 5 | All built-in types can be created and edited | Your test: one question of each editor family (choice, multi, true/false, blank, written, match, order, sub-questions) |
| 6 | Questions are saved in Firestore | Your test: create, edit, reload |
| 7 | Question bank search and filters work | Your test, after `firebase deploy` has finished building the indexes |
| 8 | Exam creation works | Your test |
| 9 | Total marks are calculated accurately | Checked in code (`examIssues`); your test with real numbers |
| 10 | Multiple sets, answer mapping after shuffling | Your test: generate sets and compare each answer key with the shuffled options |
| 11 | Duplicate question validation | Checked for import conversion; your test in the builder and bank |
| 12 | Live paper preview | Your test in Chrome, on a long paper and on a phone |
| 13 | Bengali and English printing | Your test: print a Bengali paper to PDF and inspect the fonts |
| 14 | Import supports validated data | Checked: parsers tested with real CSV, XLSX and JSON; your test against Firestore |
| 15 | All advertised exports work | Checked: DOCX and XLSX are valid packages; your test: open them in Word and Excel |
| 16 | Student papers never expose answer keys | Checked: the student paper code never reads answer keys (build check) |
| 17 | JSON backup and restore | Checked: restore planner tested; your test: back up, restore into a new institution |
| 18 | Offline and online sync | Your test: go offline, edit, go online (Firestore offline cache is enabled) |
| 19 | Rules prevent unauthorized access | Rules tests written: run them before every deploy |
| 20 | No Firebase Storage anywhere | Checked: build check finds no Storage reference |

## Not built
Direct PDF file generation (use Print, "Save as PDF"), DOCX import, cross-exam repetition rules, department/class fields on questions, bulk edit, undo/redo buttons, a Firestore storage-usage indicator, a count of question sets on the dashboard.

## Phase 9 checks you still need to run
Performance with a large question bank; mobile (iPhone and Android) and desktop browsers (Chrome, Edge, Safari, Firefox); install as an app; the Firebase Emulator rules tests; a security review of your own Firestore rules deployment.
