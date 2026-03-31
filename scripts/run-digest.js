/**
 * TelanganaMonitor — Daily Digest Generator
 * Runs via GitHub Actions at 7 AM IST, consolidates previous day's Executive Summaries
 * 
 * Usage: OPENROUTER_API_KEY=sk-xxx node scripts/run-digest.js
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENROUTER_API_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data');
const SUMMARIES_FILE = path.join(DATA_DIR, 'executive_summaries.json');
const DIGESTS_FILE = path.join(DATA_DIR, 'daily_digests.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function log(msg) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${ts}] ${msg}`);
}

function readJSON(fp) {
  try { if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch(e) {}
  return [];
}

function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  log('📰 GitHub Actions: Generating Daily Digest...');

  if (!API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set!');
    process.exit(1);
  }

  const summaries = readJSON(SUMMARIES_FILE);
  if (!summaries.length) {
    log('No summaries found. Skipping digest.');
    process.exit(0);
  }

  // Get yesterday's date in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const yesterday = new Date(istNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Filter yesterday's summaries
  const daySummaries = summaries.filter(s => {
    const sDate = new Date(new Date(s.timestamp).getTime() + istOffset);
    return sDate.toISOString().split('T')[0] === yesterdayStr;
  });

  if (!daySummaries.length) {
    log(`No summaries for ${yesterdayStr}. Skipping.`);
    process.exit(0);
  }

  log(`Found ${daySummaries.length} summaries for ${yesterdayStr}`);

  // Build prompt
  const summaryTexts = daySummaries.map((s, i) => {
    return `[${s.timestampIST}]\n${s.executiveSummary.replace(/<[^>]*>/g, '').trim()}`;
  }).join('\n\n---\n\n');

  const firstSnap = daySummaries[0].dataSnapshot;
  const lastSnap = daySummaries[daySummaries.length - 1].dataSnapshot;

  const prompt = `You are a senior intelligence editor for the Government of Telangana. Below are ${daySummaries.length} Executive Summaries captured throughout ${yesterdayStr} (every 2 hours).

Produce a consolidated "DAILY INTELLIGENCE DIGEST" for the Chief Minister's morning briefing.

DATA CONTEXT:
- Morning: ${firstSnap.temperature}, ${firstSnap.weatherDesc}, AQI ${firstSnap.aqi}
- Evening: ${lastSnap.temperature}, ${lastSnap.weatherDesc}, AQI ${lastSnap.aqi}
- Gold: ${lastSnap.goldPerGram}
- News tracked: ${lastSnap.newsCount}+ items

EXECUTIVE SUMMARIES:
${summaryTexts}

Produce in clean HTML (<h3>, <p>, <ul>, <li>, <strong> tags only):

1. <h3>🌅 Daily Overview — ${yesterdayStr}</h3> — 4-5 lines on overall state. Dominant themes? Escalations?

2. <h3>📊 Key Developments</h3> — Top 5-7 significant events with context.

3. <h3>📈 Trend Analysis</h3> — How did the situation evolve? Patterns? Shifts?

4. <h3>⚠️ Unresolved Issues</h3> — Items needing continued monitoring.

5. <h3>📋 Action Items for Today</h3> — 3-5 actionable items based on yesterday's intelligence.

Keep tone authoritative, concise, governance-focused.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
      'HTTP-Referer': 'https://github.com/subbu0111/telanganamonitor',
      'X-Title': 'TelanganaMonitor Daily Digest'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 3000
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const digest = data.choices?.[0]?.message?.content;
  if (!digest) throw new Error('Empty response');

  // Save digest
  let digests = readJSON(DIGESTS_FILE);
  digests.push({
    date: yesterdayStr,
    generatedAt: now.toISOString(),
    generatedAtIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    digest: digest,
    summaryCount: daySummaries.length,
    dataRange: {
      firstSnapshot: daySummaries[0].timestampIST,
      lastSnapshot: daySummaries[daySummaries.length - 1].timestampIST
    }
  });

  // Keep last 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  digests = digests.filter(d => new Date(d.date) >= cutoff);

  writeJSON(DIGESTS_FILE, digests);
  log(`✅ Daily Digest for ${yesterdayStr} saved! (${daySummaries.length} summaries consolidated)`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
