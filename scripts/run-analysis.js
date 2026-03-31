/**
 * TelanganaMonitor — Standalone AI Analysis Script
 * Runs via GitHub Actions (or locally) to fetch data + generate Executive Summary
 * 
 * Usage: OPENROUTER_API_KEY=sk-xxx node scripts/run-analysis.js
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENROUTER_API_KEY;
const DATA_DIR = path.join(__dirname, '..', 'data');
const SUMMARIES_FILE = path.join(DATA_DIR, 'executive_summaries.json');

// Ensure data directory
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const WMO = {
  0:'Clear Sky',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',
  45:'Foggy',48:'Rime Fog',51:'Light Drizzle',53:'Drizzle',55:'Dense Drizzle',
  61:'Slight Rain',63:'Moderate Rain',65:'Heavy Rain',80:'Rain Showers',
  81:'Moderate Showers',82:'Violent Showers',95:'Thunderstorm',
  96:'Thunderstorm+Hail',99:'Severe Thunderstorm'
};

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

// ── Data Fetchers ──────────────────────────────

async function fetchWeather() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index&timezone=Asia%2FKolkata');
    return (await r.json()).current;
  } catch(e) { log('Weather failed: '+e.message); return null; }
}

async function fetchAQI() {
  try {
    const r = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=17.385&longitude=78.4867&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timezone=Asia%2FKolkata');
    return (await r.json()).current;
  } catch(e) { log('AQI failed: '+e.message); return null; }
}

async function fetchGold() {
  try {
    const r = await fetch('https://api.metals.live/v1/spot');
    const data = await r.json();
    const oz = data.find(m => m.gold)?.gold;
    if (oz) return Math.round((oz * 85) / 31.1035);
  } catch(e) {}
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
    const data = await r.json();
    return Math.round((3000 * data.rates.INR) / 31.1035);
  } catch(e) {}
  return null;
}

async function fetchNews() {
  try {
    const query = 'Telangana OR Hyderabad latest news today';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    let text = '';
    try { text = await (await fetch(url)).text(); } catch(e) {
      try {
        const r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url));
        text = (await r.json()).contents;
      } catch(e2) { return []; }
    }
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const x = m[1];
      items.push({
        title: ((x.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        link: ((x.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim(),
        pubDate: ((x.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '').trim(),
        source: ((x.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'News').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      });
    }
    return items;
  } catch(e) { return []; }
}


// ── AI Analysis ────────────────────────────────

async function runAIAnalysis(weather, aqi, news, gold) {
  const wCtx = weather
    ? `Temperature: ${weather.temperature_2m}°C, Humidity: ${weather.relative_humidity_2m}%, Wind: ${weather.wind_speed_10m} km/h, Weather: ${WMO[weather.weather_code] || 'Unknown'}`
    : 'No weather data';
  const aCtx = aqi ? `AQI: ${aqi.european_aqi}, PM2.5: ${aqi.pm2_5}, PM10: ${aqi.pm10}` : 'No AQI data';
  const nCtx = news.slice(0, 20).map((n, i) => `${i + 1}. ${n.title} [${n.source}]`).join('\n');

  const prompt = `You are an intelligence analyst for the Government of Telangana, India. You serve senior IAS/IPS officers and the Chief Minister. Analyze the following real-time data and produce a structured intelligence briefing.

CURRENT DATE/TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

WEATHER & ENVIRONMENT:
${wCtx}
${aCtx}


LATEST NEWS HEADLINES:
${nCtx || 'No news available'}

GOLD PRICE: ₹${gold || '--'}/gram

Produce the following sections in clean HTML (use <h3>, <p>, <ul>, <li> tags only, no markdown):

1. <h3>📋 Executive Summary</h3> — 3-4 concise lines covering the most critical developments for the CM/DGP. Be specific with names, places, numbers.

2. <h3>🚨 Risk Assessment</h3> — List top 3-5 risks with severity (HIGH/MEDIUM/LOW). Use <span class="risk-high">, <span class="risk-medium">, or <span class="risk-low"> for severity tags.

3. <h3>🔗 Cross-Correlation</h3> — Identify 2-3 connections between different news items or data points.

4. <h3>💡 Recommendations</h3> — 3-5 actionable items for immediate attention by senior administration.

5. <h3>🗺️ District Focus</h3> — Highlight which districts need immediate attention and why.

Keep the tone formal, concise, and actionable. This is for decision-makers, not the public.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
      'HTTP-Referer': 'https://github.com/subbu0111/telanganamonitor',
      'X-Title': 'TelanganaMonitor'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  return data.choices?.[0]?.message?.content || null;
}

function extractExecutiveSummary(html) {
  if (!html) return '';
  const m = html.match(/Executive Summary<\/h3>([\s\S]*?)(?=<h3>|$)/i);
  return m ? m[1].trim() : html.substring(0, 500);
}

// ── Main ───────────────────────────────────────

async function main() {
  log('🔄 GitHub Actions: Starting AI analysis...');

  if (!API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set! Add it as a GitHub Secret.');
    process.exit(1);
  }

  const [weather, aqi, news, gold] = await Promise.all([
    fetchWeather(), fetchAQI(), fetchNews(), fetchGold()
  ]);

  log(`📊 Data: Weather ${weather ? '✅' : '❌'}, AQI ${aqi ? '✅' : '❌'}, News ${news.length}, Gold ${gold ? '✅' : '❌'}`);

  const fullAnalysis = await runAIAnalysis(weather, aqi, news, gold);
  if (!fullAnalysis) { log('❌ AI returned no data'); process.exit(1); }

  const execSummary = extractExecutiveSummary(fullAnalysis);
  const now = new Date();

  const entry = {
    timestamp: now.toISOString(),
    timestampIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    executiveSummary: execSummary,
    fullAnalysis: fullAnalysis,
    dataSnapshot: {
      temperature: weather ? weather.temperature_2m + '°C' : 'N/A',
      humidity: weather ? weather.relative_humidity_2m + '%' : 'N/A',
      wind: weather ? weather.wind_speed_10m + ' km/h' : 'N/A',
      weatherDesc: weather ? (WMO[weather.weather_code] || 'Unknown') : 'N/A',
      aqi: aqi ? aqi.european_aqi : 'N/A',
      pm25: aqi ? aqi.pm2_5 : 'N/A',
      goldPerGram: gold ? '₹' + gold.toLocaleString('en-IN') : 'N/A',
      newsCount: news.length,
      topHeadlines: news.slice(0, 5).map(n => n.title)
    }
  };

  let summaries = readJSON(SUMMARIES_FILE);
  summaries.push(entry);

  // Keep last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  summaries = summaries.filter(s => new Date(s.timestamp) >= cutoff);

  writeJSON(SUMMARIES_FILE, summaries);

  log(`✅ Saved! Total: ${summaries.length} entries`);
  log(`📋 Summary: ${execSummary.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
