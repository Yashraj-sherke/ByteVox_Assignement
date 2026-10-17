# ReportCraft

A show-your-work report builder for the ByteVox Full Stack Intern assignment. Upload a messy CSV, inspect its profile, compose metric/chart/table/note blocks, apply shared filters, and publish a revocable read-only link. The distinguishing interaction is a **calculation receipt**: each numeric block explains its operation and reconciles included and excluded rows.

## Run locally

Requires Node.js 22 and npm; SQLite runs inside the server, with no database service to configure.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Create an account, then upload `sample_data.csv`. If the demo account already exists, the sign-in screen can fill its credentials; a fresh checkout does not automatically create that account.

```sh
npm test
npm run build
```

The current suite has 34 passing tests covering aggregation, bad files, report validation, ownership, expiry, and revocation.

Tests use an in-memory SQLite database, separate from `server/data/app.db`. The optional feature is **suggested blocks**. No paid API or AI service is needed to run the app.

## How my report builder works

**Ingestion and profiling.** Express accepts CSV uploads up to 10 MB. PapaParse parses the content on the server, preserving strings. Type inference samples up to 100 non-empty values: numeric-looking columns use an 80% threshold, dates use 70%, repeated short values become categories, and the rest are text. Currency symbols, separators, and missing tokens are handled by shared parsing helpers. Blank and malformed rows are recorded with reasons in the dataset profile. Some parser warnings can accompany retained rows; the profile is an audit, not a promise that every flagged row was discarded. Inference is heuristic, and ambiguous dates deserve review.

**From file to number.** SQLite stores parsed rows and column metadata as JSON. The aggregation service applies report filters first, parses numeric cells, groups where requested, and calculates the block. It returns the value together with its description, operation summary, included/excluded counts, and exclusion reasons. Owner and anonymous views call the same service. The operation shown is a description of JavaScript array computation, not SQL executed against the database. The calculation receipt reconciles parsed rows; file-level parser issues are tracked separately in the profile. Count charts count rows even if their numeric cell is missing. Line charts order their x labels using natural string order; date labels should use ISO calendar dates for chronological order.

**Ownership and sharing.** Passwords are hashed with bcrypt; authenticated routes use JWTs and constrain dataset/report lookups by the current user ID. SQL values are bound parameters. Share creation and revocation require report ownership. An anonymous request checks its random UUID token, expiry, and revocation before computing the report. It returns report blocks, filters, and limited metadata rather than the stored dataset or raw-file access. Table blocks intentionally expose the rows displayed in that report: review table contents before sharing. Links show the current report, including subsequent owner edits; they are not immutable snapshots. Revocation stops subsequent requests, but cannot erase information a viewer already saved.

**Decisions and limits.** React renders cell text as text. SQLite and JSON keep setup small and calculations easy to inspect. JavaScript floating-point values are rounded to two decimals for display results; that is not exact financial decimal arithmetic. Grouping handles category names such as `__proto__` safely. Min/max use reductions rather than argument spreading. The browser uses fluid layouts, contained table scrolling, and small-screen form layouts. There is no pagination for very large category groupings.

**At 100 times the size.** Upload buffering, JSON parsing, and repeated full-array aggregation would consume memory and block the Node event loop first. The next iteration would stream ingestion, store typed rows in queryable tables, index filter columns, and limit chart cardinality. This version has not been load-tested at that scale; no latency guarantees are claimed.

## Scope, trade-offs, and honest disclosure

The core workflow and suggested blocks are implemented. Cuts include custom type overrides, arbitrary nested filters, immutable share snapshots, production rate limiting, and password recovery. Before exposing this publicly, review authentication configuration and deployment security. The server validates report definitions, column references, operations, filters, and table limits. Local development generates a persistent random JWT secret; production requires JWT_SECRET. Uploads must be UTF-8.

**Time spent:** fill in your actual total before submission, including follow-up polish. The assignment says to stop after 5.5 hours; do not claim an unverified 4.5-hour build.

**AI usage:** AI assisted implementation, UI refinements, and tests. One observed AI-introduced issue was a page entrance transform that positioned fixed dialogs relative to the page; manual phone-width inspection caught it, and the entrance now animates opacity. Review and understand all submitted code before the live walkthrough.

See [DEMO.md](DEMO.md) for the 3–4 minute recording plan. The recording, repository URL, actual time spent, and any deployment URL must still be supplied by the applicant.
