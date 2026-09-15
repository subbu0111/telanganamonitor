# CivicDarpan public V2

The public edition covers India, with district navigation for Andhra Pradesh, Telangana and Tamil Nadu. The original project brief is unchanged. Tagline: “Your place. Your news. The bigger picture.”

## Permitted collection

Only records accepted by `scripts/public-sources.mjs` may enter the public payload. Initial coverage is primarily Press Information Bureau releases, plus eligible English Global Voices India reporting. Publisher identity, author, original URL, publication timestamp, permission URL and licence URL travel with each record and report citation. The page labels official releases and displays its coverage limits. Original headlines and shortened excerpts are credited; no third-party media is reused.

- PIB permits accurate reproduction with prominent source attribution; third-party material is excluded: https://www.pib.gov.in/content/3604_2_CopyrightPolicy.aspx?lang=1&reg=3
- Global Voices permits reuse under CC BY 3.0 with attribution and changes indicated: https://globalvoices.org/about/global-voices-attribution-policy/

These sources have reuse conditions, not an absence of restrictions. The owner's unlicensed local research collection and private archive are excluded from deployment. Legacy news JSON and generators are retired from the public branch.

## AI and schedules

All generation and model verification calls use only `nvidia/nemotron-3.5-lightning:free` through OpenRouter. There is no paid-model fallback. The runtime `OPENROUTER_API_KEY` is required, stored only in the hosting environment's secret facility. No credential is included in the browser or JSON.

GitHub Actions targets analysis every six hours, at 05:47, 11:47, 17:47 and 23:47 IST. The daily report targets 07:00 IST and covers the previous calendar day. GitHub may delay scheduled starts. Unchanged selected evidence retains the previous analysis; missing dated inputs produce no invented report. Provider failures retain existing published reports.

Each report item needs source IDs and exact supporting text. Deterministic validation and a separate model review withhold unsupported items. These checks reduce errors but do not guarantee zero hallucinations or independently verify publisher claims.

## Civic heat

The editorial impact rubric weights severity 40%, essential-service disruption 30%, documented reach 20% and documented duration 10%. The displayed regional heat is the highest fully supported incident score, not an article count. Duplicate coverage does not add points; unrelated articles do not dilute the score. All four components must be supported, otherwise the total is unknown. A named city does not imply city-wide impact; publication age is not incident duration. The asterisk opens the formula and evidence.

## Operations

`node scripts/refresh-public.mjs` refreshes permitted collection, impact and analysis. Add `--daily` for the previous day's digest. Public validation runs before any scheduled commit. The serial workflow commits only the three public JSON payloads and requests a GitHub Pages refresh. Local preview scheduling remains optional.
