/**
 * TelanganaMonitor — Node.js Server & AI Analysis Scheduler
 * 
 * Features:
 * 1. Serves the dashboard on http://localhost:3000
 * 2. Runs AI analysis every 2 hours, saves Executive Summary to data/executive_summaries.json
 * 3. At 7 AM IST daily, generates a consolidated Daily Digest from previous day's summaries
 * 
 * Usage: npm start
 */

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SUMMARIES_FILE = path.join(DATA_DIR, 'executive_summaries.json');
const DIGESTS_FILE = path.join(DATA_DIR, 'daily_digests.json');

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function log(msg) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${ts}] ${msg}`);
}

function readJSON(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    log(`Error reading ${filepath}: ${e.message}`);
  }
  return [];
}

function writeJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    log(`Error writing ${filepath}: ${e.message}`);
  }
}

// WMO Weather codes
const WMO = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle',
  55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 80: 'Rain Showers',
  81: 'Moderate Showers', 82: 'Violent Showers', 95: 'Thunderstorm',
  96: 'Thunderstorm+Hail', 99: 'Severe Thunderstorm'
};

// ============================================================
// DATA FETCHING FUNCTIONS (same APIs as the dashboard)
// ============================================================

async function fetchWeather() {
  try {
    const lat = 17.385, lon = 78.4867;
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FKolkata&forecast_days=7`);
    const w = await wRes.json();
    return w.current;
  } catch (e) {
    log('Weather fetch failed: ' + e.message);
    return null;
  }
}

async function fetchAQI() {
  try {
    const lat = 17.385, lon = 78.4867;
    const aRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timezone=Asia%2FKolkata`);
    const a = await aRes.json();
    return a.current;
  } catch (e) {
    log('AQI fetch failed: ' + e.message);
    return null;
  }
}

async function fetchGold() {
  try {
    const r = await fetch('https://api.metals.live/v1/spot');
    const data = await r.json();
    const goldOz = data.find(m => m.gold)?.gold;
    if (goldOz) return Math.round((goldOz * 85) / 31.1035);
  } catch (e) {}
  try {
    const fx = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
    const data = await fx.json();
    return Math.round((3000 * data.rates.INR) / 31.1035);
  } catch (e) {}
  return null;
}

async function fetchNews() {
  try {
    const query = 'Telangana OR Hyderabad latest news today';
    const googleRss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    
    // Try multiple approaches
    let text = '';
    try {
      const r = await fetch(googleRss);
      text = await r.text();
    } catch (e) {
      // Try via allorigins
      try {
        const r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(googleRss));
        const wrapper = await r.json();
        text = wrapper.contents;
      } catch (e2) {
        log('All RSS fetch methods failed');
        return [];
      }
    }
    
    // Parse RSS XML
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const itemXml = match[1];
      const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
      const source = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'News';
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        link: link.trim(),
        pubDate: pubDate.trim(),
        source: source.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      });
    }
    return items;
  } catch (e) {
    log('News fetch failed: ' + e.message);
    return [];
  }
}


// ============================================================
// AI ANALYSIS via OpenRouter
// ============================================================

async function runAIAnalysis(weather, aqi, news, gold) {
  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    log('⚠️  No OpenRouter API key set! Please update .env file.');
    return null;
  }

  const weatherContext = weather
    ? `Temperature: ${weather.temperature_2m}°C, Humidity: ${weather.relative_humidity_2m}%, Wind: ${weather.wind_speed_10m} km/h, Weather: ${WMO[weather.weather_code] || 'Unknown'}`
    : 'No weather data';

  const aqiContext = aqi
    ? `AQI: ${aqi.european_aqi}, PM2.5: ${aqi.pm2_5}, PM10: ${aqi.pm10}`
    : 'No AQI data';

  const newsContext = news.slice(0, 20).map((n, i) => `${i + 1}. ${n.title} [${n.source || 'Unknown'}]`).join('\n');

  const prompt = `You are an intelligence analyst for the Government of Telangana, India. You serve senior IAS/IPS officers and the Chief Minister. Analyze the following real-time data and produce a structured intelligence briefing.

CURRENT DATE/TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

WEATHER & ENVIRONMENT:
${weatherContext}
${aqiContext}


LATEST NEWS HEADLINES:
${newsContext || 'No news available'}

GOLD PRICE: ₹${gold || '--'}/gram

Produce the following sections in clean HTML (use <h3>, <p>, <ul>, <li> tags only, no markdown):

1. <h3>📋 Executive Summary</h3> — 3-4 concise lines covering the most critical developments for the CM/DGP. Be specific with names, places, numbers.

2. <h3>🚨 Risk Assessment</h3> — List top 3-5 risks with severity (HIGH/MEDIUM/LOW). Use <span class="risk-high">, <span class="risk-medium">, or <span class="risk-low"> for severity tags. Focus on law & order, infrastructure, civic issues.

3. <h3>🔗 Cross-Correlation</h3> — Identify 2-3 connections between different news items or data points that may not be obvious.

4. <h3>💡 Recommendations</h3> — 3-5 actionable items for immediate attention by senior administration. Be specific about which department should act.

5. <h3>🗺️ District Focus</h3> — Based on the news data, highlight which districts need immediate attention and why.

Keep the tone formal, concise, and actionable. This is for decision-makers, not the public.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'HTTP-Referer': 'http://localhost:' + PORT,
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
    if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    log('AI Analysis failed: ' + e.message);
    return null;
  }
}

// Extract Executive Summary from the full AI response
function extractExecutiveSummary(fullHtml) {
  if (!fullHtml) return '';
  // Match content between Executive Summary heading and the next heading
  const match = fullHtml.match(/<h3>📋 Executive Summary<\/h3>([\s\S]*?)(?=<h3>|$)/i);
  if (match) return match[1].trim();
  // Fallback: try without emoji
  const match2 = fullHtml.match(/Executive Summary<\/h3>([\s\S]*?)(?=<h3>|$)/i);
  if (match2) return match2[1].trim();
  return fullHtml.substring(0, 500);
}

// ============================================================
// SCHEDULED ANALYSIS — Every 2 Hours
// ============================================================

async function runScheduledAnalysis() {
  log('🔄 Starting scheduled AI analysis...');
  
  try {
    // Fetch all data in parallel
    const [weather, aqi, news, gold] = await Promise.all([
      fetchWeather(),
      fetchAQI(),
      fetchNews(),
      fetchGold()
    ]);

    log(`📊 Data collected — Weather: ${weather ? '✅' : '❌'}, AQI: ${aqi ? '✅' : '❌'}, News: ${news.length} items, Gold: ${gold ? '✅' : '❌'}`);

    // Run AI analysis
    const fullAnalysis = await runAIAnalysis(weather, aqi, news, gold);
    if (!fullAnalysis) {
      log('❌ AI analysis returned no data');
      return;
    }

    const execSummary = extractExecutiveSummary(fullAnalysis);
    const now = new Date();

    // Build the summary entry
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

    // Read existing summaries, append, and save
    let summaries = readJSON(SUMMARIES_FILE);
    summaries.push(entry);

    // Prune: keep only last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    summaries = summaries.filter(s => new Date(s.timestamp) >= thirtyDaysAgo);

    writeJSON(SUMMARIES_FILE, summaries);

    log(`✅ Executive Summary saved! (Total: ${summaries.length} entries)`);
    log(`📋 Summary: ${execSummary.replace(/<[^>]*>/g, '').substring(0, 150)}...`);

  } catch (e) {
    log('❌ Scheduled analysis error: ' + e.message);
  }
}

// ============================================================
// DAILY DIGEST — 7 AM IST
// ============================================================

async function generateDailyDigest() {
  log('📰 Generating Daily Digest for previous day...');

  const summaries = readJSON(SUMMARIES_FILE);
  if (!summaries.length) {
    log('No summaries found for daily digest');
    return;
  }

  // Get yesterday's date in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const yesterday = new Date(istNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

  // Filter summaries from yesterday
  const yesterdaySummaries = summaries.filter(s => {
    const sDate = new Date(new Date(s.timestamp).getTime() + istOffset);
    return sDate.toISOString().split('T')[0] === yesterdayStr;
  });

  if (!yesterdaySummaries.length) {
    log(`No summaries found for ${yesterdayStr}`);
    return;
  }

  log(`Found ${yesterdaySummaries.length} summaries for ${yesterdayStr}`);

  if (!API_KEY || API_KEY === 'your_openrouter_api_key_here') {
    log('⚠️  No OpenRouter API key set! Cannot generate digest.');
    return;
  }

  // Build the digest prompt
  const summaryTexts = yesterdaySummaries.map((s, i) => {
    const plainText = s.executiveSummary.replace(/<[^>]*>/g, '').trim();
    return `[${s.timestampIST}]\n${plainText}`;
  }).join('\n\n---\n\n');

  // Get first and last data snapshots for context
  const firstSnap = yesterdaySummaries[0].dataSnapshot;
  const lastSnap = yesterdaySummaries[yesterdaySummaries.length - 1].dataSnapshot;

  const prompt = `You are a senior intelligence editor for the Government of Telangana. Below are ${yesterdaySummaries.length} Executive Summaries captured throughout ${yesterdayStr} (every 2 hours).

Your task: Produce a single, consolidated "DAILY INTELLIGENCE DIGEST" suitable for the Chief Minister's morning briefing.

DATA CONTEXT:
- Morning conditions: ${firstSnap.temperature}, ${firstSnap.weatherDesc}, AQI ${firstSnap.aqi}
- Evening conditions: ${lastSnap.temperature}, ${lastSnap.weatherDesc}, AQI ${lastSnap.aqi}
- Gold: ${lastSnap.goldPerGram}
- Total news tracked: ${lastSnap.newsCount}+ items

EXECUTIVE SUMMARIES THROUGHOUT THE DAY:
${summaryTexts}

Produce the following in clean HTML (use <h3>, <p>, <ul>, <li>, <strong> tags only):

1. <h3>🌅 Daily Overview — ${yesterdayStr}</h3> — 4-5 lines capturing the overall state of Telangana that day. What were the dominant themes? Any escalations or de-escalations?

2. <h3>📊 Key Developments</h3> — Top 5-7 most significant events/developments of the day, with brief context for each.

3. <h3>📈 Trend Analysis</h3> — How did the situation evolve throughout the day? Were there any emerging patterns, escalations, or notable shifts between morning and evening?

4. <h3>⚠️ Unresolved Issues</h3> — Items from the day that remain unresolved and need continued monitoring.

5. <h3>📋 Action Items for Today</h3> — 3-5 specific, actionable items for the administration today based on yesterday's intelligence.

Keep the tone authoritative, concise, and focused on governance priorities.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'HTTP-Referer': 'http://localhost:' + PORT,
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

    // Save the daily digest
    let digests = readJSON(DIGESTS_FILE);
    digests.push({
      date: yesterdayStr,
      generatedAt: now.toISOString(),
      generatedAtIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      digest: digest,
      summaryCount: yesterdaySummaries.length,
      dataRange: {
        firstSnapshot: yesterdaySummaries[0].timestampIST,
        lastSnapshot: yesterdaySummaries[yesterdaySummaries.length - 1].timestampIST
      }
    });

    // Keep last 90 days of digests
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    digests = digests.filter(d => new Date(d.date) >= ninetyDaysAgo);

    writeJSON(DIGESTS_FILE, digests);

    log(`✅ Daily Digest for ${yesterdayStr} saved! (${yesterdaySummaries.length} summaries consolidated)`);

  } catch (e) {
    log('❌ Daily Digest generation failed: ' + e.message);
  }
}

// ============================================================
// EXPRESS SERVER & API ENDPOINTS
// ============================================================

// Serve static files (dashboard)
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// API: Get executive summaries
app.get('/api/summaries', (req, res) => {
  const date = req.query.date; // Optional: filter by date (YYYY-MM-DD)
  let summaries = readJSON(SUMMARIES_FILE);
  
  if (date) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    summaries = summaries.filter(s => {
      const sDate = new Date(new Date(s.timestamp).getTime() + istOffset);
      return sDate.toISOString().split('T')[0] === date;
    });
  }
  
  res.json({
    count: summaries.length,
    summaries: summaries
  });
});

// API: Get daily digests
app.get('/api/digests', (req, res) => {
  const date = req.query.date; // Optional: filter by date (YYYY-MM-DD)
  let digests = readJSON(DIGESTS_FILE);
  
  if (date) {
    digests = digests.filter(d => d.date === date);
  }
  
  res.json({
    count: digests.length,
    digests: digests
  });
});

// API: Get latest summary
app.get('/api/summaries/latest', (req, res) => {
  const summaries = readJSON(SUMMARIES_FILE);
  const latest = summaries.length ? summaries[summaries.length - 1] : null;
  res.json({ latest });
});

// API: Get scheduler status
app.get('/api/status', (req, res) => {
  const summaries = readJSON(SUMMARIES_FILE);
  const digests = readJSON(DIGESTS_FILE);
  const latest = summaries.length ? summaries[summaries.length - 1] : null;
  
  res.json({
    status: 'running',
    apiKeySet: !!API_KEY && API_KEY !== 'your_openrouter_api_key_here',
    totalSummaries: summaries.length,
    totalDigests: digests.length,
    lastAnalysis: latest ? latest.timestampIST : 'Never',
    lastAnalysisTimestamp: latest ? latest.timestamp : null,
    schedule: {
      analysis: 'Every 2 hours (even hours IST)',
      dailyDigest: '7:00 AM IST'
    }
  });
});

// API: Manually trigger analysis
app.post('/api/trigger-analysis', async (req, res) => {
  res.json({ message: 'Analysis triggered', status: 'running' });
  // Run in background
  runScheduledAnalysis();
});

// API: Manually trigger daily digest
app.post('/api/trigger-digest', async (req, res) => {
  res.json({ message: 'Daily digest triggered', status: 'running' });
  // Run in background
  generateDailyDigest();
});

// ============================================================
// CRON SCHEDULES
// ============================================================

// Every 2 hours: 0:00, 2:00, 4:00, 6:00, 8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
// Cron: At minute 0 past every 2nd hour
cron.schedule('0 */2 * * *', () => {
  log('⏰ Cron triggered: 2-hourly AI analysis');
  runScheduledAnalysis();
}, {
  timezone: 'Asia/Kolkata'
});

// Daily at 7:00 AM IST
cron.schedule('0 7 * * *', () => {
  log('⏰ Cron triggered: 7 AM Daily Digest');
  generateDailyDigest();
}, {
  timezone: 'Asia/Kolkata'
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  log('═══════════════════════════════════════════════════════');
  log('  🚀 TelanganaMonitor Server Started');
  log(`  📡 Dashboard: http://localhost:${PORT}`);
  log(`  🔑 API Key: ${API_KEY && API_KEY !== 'your_openrouter_api_key_here' ? '✅ Set' : '❌ NOT SET — update .env'}`);
  log('  ⏰ Schedule:');
  log('     • AI Analysis: Every 2 hours (0:00, 2:00, 4:00, ...)');
  log('     • Daily Digest: 7:00 AM IST');
  log('  📁 Data directory: ' + DATA_DIR);
  log('═══════════════════════════════════════════════════════');

  // Run initial analysis on startup if none exists or if last one was 2+ hours ago
  const summaries = readJSON(SUMMARIES_FILE);
  const latest = summaries.length ? summaries[summaries.length - 1] : null;
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

  if (!latest || new Date(latest.timestamp).getTime() < twoHoursAgo) {
    log('🔄 No recent analysis found — running initial analysis in 10 seconds...');
    setTimeout(runScheduledAnalysis, 10000);
  } else {
    log(`✅ Recent analysis found from ${latest.timestampIST} — skipping initial run`);
  }
});
