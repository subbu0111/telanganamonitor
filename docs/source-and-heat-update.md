# Source and heat update — 22 September 2026

## Added collection
- Mongabay India: original headlines with author, licence and article links. No article adaptation or image republication. Reuse policy: https://india.mongabay.com/about/ ; CC BY-ND 4.0. Prefer the RSS reporter byline when the original page corroborates it, since page metadata may identify an editor.
- India Water Portal: original dated pages discovered from publisher webpage links. CC BY-NC-SA 2.5 IN attributed extracts, under the same licence, with original and author links. Terms: https://www.indiawaterportal.org/terms-of-use . Third-party media excluded.
- Factly became reachable during this refresh; four page-verified records passed the existing licence check.
- Each candidate still requires an original matching headline and a timezone-qualified publication timestamp, English text, India relevance and a publication within 30 days. Directory entries do not count as ingestion.

## Heat presentation and extraction
- Complete supported assessments retain the agreed 40/30/20/10 weights. No unknown component is converted to zero or estimated.
- Partial supported assessments show the reported severity and name the missing components.
- Pending analysis, no collected coverage, and missing evidence are displayed separately.
- Where the original headline explicitly reports deaths, a linked “Deaths reported” signal can appear even before an AI score. It is expressly labelled as a headline signal, not an AI score. Negated, speculative, historical, fictional, animal and unverified/future headlines are withheld. A newer report supersedes an older claim within the same grouped story.
- Literal death headlines can propose a severity candidate for extraction. They still require exact-source validation and an independent Nemotron support check before becoming a scored component. No duration, affected population or service impact is inferred.
- Extraction version 3 rechecks older all-null assessments, demands exact rubric identifiers and evaluates components independently. Invalid drafts are withheld instead of silently converted into empty evidence.
- All AI calls remain nvidia/nemotron-3.5-lightning:free. Analysis cadence remains six hours; the daily report remains 7 AM IST.

Coverage remains uneven. A headline signal is a publisher-attributed report, not independent confirmation of the incident or a substitute for the full impact score.
