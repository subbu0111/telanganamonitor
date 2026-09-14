# CivicDarpan V2: impact and scheduled intelligence

Agreed on 14 September 2026: two-hour AI Analysis; daily report at 7 AM IST covering the previous day; source-supported impact heat; tagline “Your place. Your news. The bigger picture.”

## Release status

The implementation is prepared for review. Public launch is blocked by source reuse permissions. The owner confirmed that no publisher permissions are held. The review branch contains code, map assets and empty public data envelopes; it does not include the local article collection, generated reports, impact evidence or private archive. Do not replace the existing live site with this empty-data release.

The Hindu's terms restrict public/commercial use and limit permitted dissemination to personal or academic uses: https://www.thehindugroup.com/termsofuse.html . Indian Express's RSS terms limit consumption to personal/non-commercial use and require express permission for reuse: https://indianexpress.com/rss-2/ . Source availability and RSS discovery do not establish reuse rights. Other registry publishers remain unapproved where a suitable permission basis has not been established.

## Changes

- Replaces headline-keyword frequency heat with an editorial reported-impact rubric: severity 40%, essential-service disruption 30%, reported reach 20%, documented duration 10%.
- Shows the highest fully supported incident score in the selected geography/time window. Extra articles neither inflate nor dilute it. Exact quotes, source timestamps and component calculations are visible behind the asterisk. Missing evidence produces an unknown total, not a low score. Publication time is not incident duration; “indefinite” is not proof of an elapsed week; a city name does not establish city-wide impact.
- Gemini extraction is followed by quote validation, explicit category-evidence checks and a separate model support pass. These checks reduce unsupported assessments; they do not independently verify news reports or guarantee zero errors.
- AI analysis runs on a target two-hour schedule. Unchanged selected evidence retains the prior generation and timestamp. Daily digest targets 7 AM IST for the previous calendar day, with labelled later revisions. GitHub scheduled runs can be delayed.
- A single scheduled workflow serializes refreshes. It checks source permissions, collects dated original-page records, assesses impact, generates reports, validates, commits public data and requests a refresh of the existing branch-based Pages site. Failed stages do not commit or deploy partial runs.
- Public validation checks both article records and citations embedded in AI reports. A successful RSS fetch cannot silently approve a publisher. No credential or private database is included in the public payload.

## Before merging and activating

1. Establish permitted publisher sources or written licences; record the scope, URL and review date in the source registry. Confirm that permission covers the intended extracts and derived analysis.
2. Generate and validate an actual public collection and reports using `node scripts/refresh-public.mjs` and `node scripts/refresh-public.mjs --daily`. Empty envelopes are review placeholders, not a ready launch.
3. The existing repository workflows already reference the `OPENROUTER_API_KEY` Actions secret. The new workflow uses the same name. Its value was not read or copied. Verify a successful new workflow run before calling hosted AI operational.
4. Verify the existing GitHub Pages main/root publishing configuration, retire the three legacy scheduled jobs via the changes in this release branch, then verify the deployed India and three state editions, timestamps, report links and heat evidence.

The original project brief remains unchanged. The local preview and its private archive remain separate from this public release.
