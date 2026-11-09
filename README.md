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
| 4 | Question types, question builder, answer keys, question bank | Next |
| 5 | Exams, marks, paper generation, multiple sets | Planned |
| 6 | Paper designer and live preview | Planned |
| 7 | Import and export (PDF, DOCX, XLSX, CSV, JSON) | Planned |
| 8 | Auto-save, backup and restore, analytics, settings | Planned |
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
│   └── app.css   Design system and responsive layout
├── docs/
│   └── DATA_MODEL.md   Collections, fields and the role matrix
├── js/
│   ├── modules/
│   │   ├── dashboard.js   Overview page
│   │   ├── institutions.js   Create, switch, join and edit institutions
│   │   └── users.js   Members, roles and invite codes
│   ├── services/
│   │   ├── auth-service.js   Sign-in, profile, preferences
│   │   ├── config-service.js   Central configuration (Firestore, cache, defaults)
│   │   ├── firestore-service.js   Database layout and data access
│   │   └── org-context.js   The active institution
│   ├── utilities/
│   │   ├── dom.js   Escaping, toasts, confirm dialog
│   │   ├── errors.js   Central error messages
│   │   ├── i18n.js   English and Bangla text engine
│   │   └── strings-institutions.js   Texts for institutions, members and invites
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
