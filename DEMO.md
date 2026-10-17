# A 3–4 minute demo that proves the assignment

Record the real app, with your own narration. Use only synthetic data. Keep a private/incognito window ready and `sample_data.csv` beside a plain text file named `bad.txt`.

| Time | Action | Explain |
|---|---|---|
| 0:00–0:35 | Sign in, upload sample_data.csv, inspect missing cells and flagged lines. | Nothing is silently hidden; inference is a guess, and parsing issues remain visible. |
| 0:35–1:15 | Create a report. Add a sum metric, bar chart, top-row table, and note. Reorder a block. | One small report with all four block types. Suggested blocks are the single optional feature. |
| 1:15–2:00 | Apply a category/date filter. Open receipts on a metric and chart. | Values come from the server. Point to included + excluded = total and an exclusion reason. The displayed operation is an array-computation summary. |
| 2:00–2:45 | Create an expiring link, paste it in a private window, inspect the read-only report. Return to owner view, revoke it, then reload the private view. | Only report content is shared; displayed table rows are intentionally included. Revocation rejects the next request. |
| 2:45–3:15 | Upload bad.txt. Resize to phone width. | Clear file validation, usable controls, tables scroll within their cards. |
| 3:15–3:45 | Briefly show npm test and explain one trade-off. | Same computation service for owner/shared views; in-memory test DB; JSON storage will be the first scaling bottleneck. |

Before sending: replace any placeholder with the actual repository/video URLs, record your actual hours, confirm fresh-install instructions on a clean checkout, and remove claims you cannot explain. No implementation can guarantee selection; use the walkthrough to demonstrate your decisions.

Live walkthrough practice: trace computeMetric from filters to response, explain why share lookups are separate from authenticated routes, and describe where to add a median aggregation plus its tests. Do not add median just for the demo unless asked.
