# Question Generate

*Create Smarter Exams. Generate Better Questions.*

A multi-institution question bank and exam paper platform for schools, colleges, madrasas, coaching centers and recruitment bodies.
Plain HTML, CSS and JavaScript (no framework, no build step) on Firebase Firestore and Authentication.
**Firebase Storage is never used.** Exports are created on the user's device and images are external URLs.

## Build status
| Phase | Content | State |
|---|---|---|
| 1 | Foundation: app shell, responsive layout, sign-in, offline cache, PWA, English and বাংলা | Done |
| 2 | Database and security: rules, indexes, data layer, rules tests | Done (run the tests yourself) |
| 3 | Institutions: create, switch, edit; members, roles, invite codes | Done |
| 4 | Question types, custom types, builder, answer keys, question bank, search | Done (core). Department/class fields and bulk edit come later. |
| 5 | Exams, sections and marks, question selection, multiple sets | Done (core). Cross-exam repetition rules and presets come later. |
| 6 | Paper designer, live page-by-page preview, print, layout templates | Done (core). Student paper only; teacher copy comes with Phase 7. |
| 7 | Export Center and import (CSV, XLSX, JSON, paste) | Done (core). DOCX import and direct PDF files are not built. |
| 8 | Auto-save, backup and restore, analytics, settings | Next |
| 9 to 10 | Optimization, testing, final audit and user guide | Planned |

Menu items for unbuilt phases are marked "Phase N" and open an honest "planned" page.

## Quick start
1. Firebase Console: create a project, add a Web app, and paste its config into `js/firebase-config.js`.
2. Authentication: enable Email/Password (Google is optional). Under Settings > Authorized domains add your site's domain.
3. Firestore Database: create a database in production mode.
4. In this folder run `npm i -g firebase-tools`, `firebase login`, `firebase use --add`, then `firebase deploy`. This publishes the site, the rules and the indexes.
5. Open the site, create an account, then create your first institution on the Institutions page. Add colleagues from Users & Roles with one-time invite codes.

Local preview (ES modules need http, not `file://`): `npx serve .`

## Security rules tests
Needs Node 18+ and Java 11+. Run `npm install`, then `npm run test:rules`, before every rules deploy.

## Optional configuration
- Firestore document `appConfig/main` overrides branding, feature flags and the module list. Without it the defaults in `js/services/config-service.js` apply.
- A document `platformAdmins/<your uid>` (create it in the console) lets that user edit `appConfig`. It gives no access to institution data.

## Project structure
```
question-generate/
├── assets/
│   └── icons/
│       └── icon.svg   App icon
├── css/
│   ├── app.css   Design system and responsive layout
│   └── paper-preview.css   Paper pages and print styles
├── docs/
│   └── DATA_MODEL.md   Collections, fields and the role matrix
├── js/
│   ├── modules/
│   │   ├── dashboard.js   Overview page
│   │   ├── exam-manager.js   Exam setup, sections and marks
│   │   ├── exports.js   Export Center
│   │   ├── imports.js   Import wizard
│   │   ├── institutions.js   Create, switch, join and edit institutions
│   │   ├── paper-generator.js   Question selection and set generation
│   │   ├── paper-preview.js   Live preview, layout designer, print
│   │   ├── question-bank.js   Search, filter, archive, duplicate
│   │   ├── question-builder.js   Question editor with rich text and answer key
│   │   ├── templates.js   Paper layout templates
│   │   └── users.js   Members, roles and invite codes
│   ├── services/
│   │   ├── auth-service.js   Sign-in, profile, preferences
│   │   ├── config-service.js   Central configuration (Firestore, cache, defaults)
│   │   ├── exam-service.js   Exams, sections, selection, sets
│   │   ├── export-service.js   Export data: papers, answer keys, bank, archive
│   │   ├── firestore-service.js   Database layout and data access
│   │   ├── import-service.js   Duplicate check and batched import
│   │   ├── layout-service.js   Paper layouts: fields, defaults, storage
│   │   ├── org-context.js   The active institution
│   │   ├── question-service.js   Questions, answer keys, search, duplicates
│   │   └── question-types.js   22 built-in types and custom types
│   ├── utilities/
│   │   ├── dom.js   Escaping, toasts, confirm dialog
│   │   ├── errors.js   Central error messages
│   │   ├── i18n.js   English and Bangla text engine
│   │   ├── office.js   DOCX, XLSX, CSV, TXT builders and download
│   │   ├── paper-render.js   Builds the paginated student paper
│   │   ├── parse.js   CSV, XLSX, JSON readers
│   │   ├── question-schema.js   Question schema, validation, row conversion
│   │   ├── random.js   Shuffle helper
│   │   ├── rich-text.js   Safe question markup renderer
│   │   ├── strings-exams.js   Texts for exams and paper generation
│   │   ├── strings-export.js   Texts for the Export Center
│   │   ├── strings-import.js   Texts for the import
│   │   ├── strings-institutions.js   Texts for institutions, members and invites
│   │   ├── strings-paper.js   Texts for the designer and the printed paper
│   │   ├── strings-questions.js   Texts for the builder and bank
│   │   └── zip.js   ZIP writer for DOCX and XLSX
│   ├── app.js   Startup, sign-in, language, institution switcher
│   ├── firebase-config.js   YOUR Firebase keys go here
│   ├── firebase.js   Firebase setup (Firestore and Auth only)
│   └── router.js   Hash router and navigation
├── tests/
│   └── rules.test.js   Emulator tests for the security rules
├── firebase.json   Hosting, Firestore and emulator settings
├── firestore.indexes.json   Composite indexes for the planned queries
├── firestore.rules   Security rules: roles, isolation, answer keys, invites
├── index.html   App shell: login, sidebar, mobile navigation
├── manifest.json   PWA manifest
├── package.json   Dev tooling for the rules tests only
├── README.md   This file
└── service-worker.js   Offline cache for the app files
```
Roles, collections and permissions are described in `docs/DATA_MODEL.md`.
