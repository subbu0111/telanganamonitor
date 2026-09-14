# CivicDarpan intelligence reports

Implemented locally on 14 September 2026. Open the preview at http://127.0.0.1:4173/ and choose Intelligence Hub → AI Analysis or Daily Report.

## What is generated

Each of India, Andhra Pradesh, Telangana and Tamil Nadu has its own report. AI Analysis contains Executive Summary, Risk Assessment, Cross-Correlation, Recommendations and District Focus. Daily Report contains Daily Overview, Key Developments, Trend Analysis, Follow-ups & Unknowns and Action Items, with date selection, Markdown download and the actual saved executive-summary timeline.

The default model is `google/gemini-2.5-flash` through OpenRouter. It reads up to 48 geographically relevant consolidated stories per edition, using dated original-page headlines and available publisher excerpts. Daily selection samples across the previous IST day. Reports show the input coverage window and generation time. They do not claim full coverage of all articles or full article-body analysis.

Every item carries a source citation and exact supporting text. Validation rejects unknown sources, unsupported quotes and unsupported numerical factual claims. A second model pass checks support; rejected items are withheld. Failed generation preserves the last valid report. These safeguards reduce errors but do not establish zero hallucinations or independently confirm a reported outcome.

## Running locally

The existing runtime `OPENROUTER_API_KEY` is required. Credentials are never placed in browser code or report output.

```powershell
node outputs/civicdarpan/scripts/preview.mjs --auto-intelligence
```

While this process stays running, local collection and AI analysis run every six hours; the previous day's daily digest runs at 7 AM IST. Starting the server schedules the next cycle; it does not immediately regenerate reports. Closing it stops scheduling. The page's Refresh reports button reloads saved reports, rather than starting a paid model request. Local automation status is available at `/api/automation-status`.

Manual generation:

```powershell
node outputs/civicdarpan/scripts/generate-intelligence.mjs
node outputs/civicdarpan/scripts/generate-intelligence.mjs --region=India --type=analysis
node outputs/civicdarpan/scripts/generate-intelligence.mjs --region=Telangana --type=daily
```

Generated reports are stored in `data/intelligence.json`. Current report generations have also been saved in the private local archive. Static GitHub Pages cannot run this local scheduler or hold the model credential; public hosting and unattended generation remain separate deployment work.

The original project brief is unchanged. This document supplements the V2 scope and implementation-status references.
