/**
 * TelanganaMonitor — Whisper Net feed builder
 * Runs in GitHub Actions / locally. Writes data/whisper_net.json
 * so the static dashboard never depends on browser CORS.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'whisper_net.json');
const UA = 'TelanganaMonitor/3.2 (+https://github.com/subbu0111/telanganamonitor)';

const BUCKETS = {
  Water: {
    color: '#0a84ff',
    icon: '💧',
    keywords: ['water', 'hmwssb', 'tanker', 'borewell', 'pipeline', 'drinking water', 'water supply', 'scarcity', 'reservoir', 'krishna water', 'godavari']
  },
  Power: {
    color: '#ffd60a',
    icon: '⚡',
    keywords: ['power cut', 'outage', 'tsspdcl', 'tsnspdcl', 'load shedding', 'transformer', 'power supply', 'current cut']
  },
  Roads: {
    color: '#ff9f0a',
    icon: '🛣️',
    keywords: ['pothole', 'road', 'flyover', 'ghmc repair', 'footpath', 'manhole', 'crater']
  },
  Sanitation: {
    color: '#30d158',
    icon: '🗑️',
    keywords: ['garbage', 'sewage', 'sanitation', 'drain', 'dumping', 'landfill', 'stink', 'waste']
  },
  Traffic: {
    color: '#ff453a',
    icon: '🚦',
    keywords: ['traffic', 'congestion', 'accident', 'jam', 'signal', 'diversion', 'orr', 'peak-hour']
  },
  Crime: {
    color: '#ff375f',
    icon: '🚨',
    keywords: ['crime', 'theft', 'robbery', 'assault', 'police', 'snatch', 'scam', 'fraud', 'harass']
  },
  Governance: {
    color: '#bf5af2',
    icon: '🏛️',
    keywords: ['ghmc', 'hmda', 'complaint', 'prajavani', 'councillor', 'mayor', 'commissioner', 'encroachment']
  }
};

const FEEDS = [
  { query: 'when:14d (Hyderabad OR Telangana) (HMWSSB OR "water supply" OR tanker OR "drinking water" OR "water scarcity")', prefer: 'Water' },
  { query: 'when:14d (Hyderabad OR Telangana) (TSSPDCL OR "power cut" OR outage OR electricity)', prefer: 'Power' },
  { query: 'when:14d (Hyderabad OR GHMC) (pothole OR "road repair" OR flyover OR manhole)', prefer: 'Roads' },
  { query: 'when:14d (Hyderabad OR GHMC) (garbage OR sewage OR sanitation OR landfill OR drain)', prefer: 'Sanitation' },
  { query: 'when:14d (Hyderabad OR Cyberabad) (traffic OR congestion OR accident OR diversion)', prefer: 'Traffic' },
  { query: 'when:14d (Hyderabad OR Telangana) (complaint OR shortage OR "civic issue" OR encroachment)', prefer: 'Governance' }
];

function log(msg) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${ts}] ${msg}`);
}

function decodeXml(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function bucketOf(text, prefer) {
  const t = String(text || '').toLowerCase();
  let best = prefer || 'Other';
  let hits = prefer && BUCKETS[prefer] && BUCKETS[prefer].keywords.some(k => t.includes(k)) ? 2 : 0;
  for (const [name, meta] of Object.entries(BUCKETS)) {
    const n = meta.keywords.filter(k => t.includes(k)).length;
    if (n > hits) {
      hits = n;
      best = name;
    }
  }
  return { bucket: hits ? best : (prefer || 'Other'), hits };
}

function ageHours(pubDate) {
  const t = Date.parse(pubDate);
  if (!Number.isFinite(t)) return 999;
  return (Date.now() - t) / 36e5;
}

function heatTag(hours, score) {
  if (hours <= 12 && score >= 20) return 'rising';
  if (hours <= 48 && score >= 28) return 'hot';
  if (hours <= 168) return 'warm';
  return 'cool';
}

function scoreItem(hours, hits, source) {
  let s = 8;
  if (hours <= 6) s += 40;
  else if (hours <= 24) s += 28;
  else if (hours <= 72) s += 16;
  else if (hours <= 168) s += 8;
  else if (hours <= 336) s += 3;
  s += Math.min(12, hits * 4);
  const local = /telangana today|siasat|deccan chronicle|hans india|hyderabad mail|new indian express|hindu/i.test(source || '');
  if (local) s += 6;
  return s;
}

async function fetchRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const items = [];
  const block = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = block.exec(xml))) {
    const raw = m[1];
    const title = decodeXml((raw.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const link = decodeXml((raw.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const pubDate = decodeXml((raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
    const source = decodeXml((raw.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1]) || 'News';
    if (title && title !== 'Google News') items.push({ title, link, pubDate, source });
  }
  return items;
}

function isNoise(title) {
  const t = (title || '').toLowerCase();
  const drop = [
    'ipl', 'srh', 'sunrisers', 'cricket', 'wicket', 'bollywood', 'trailer',
    'box office', 'bigg boss', 'horoscope', 'sensex', 'nifty', 'gst on',
    'not taxable', 'camcording', 'piracy', 'movie', 'film', 'ott'
  ];
  return drop.some(w => t.includes(w));
}

function isLocal(title) {
  const t = (title || '').toLowerCase();
  return /hyderabad|telangana|ghmc|hmda|hmwssb|tsspdcl|cyberabad|secunderabad|warangal|khammam|nizamabad|karimnagar|rangareddy|medchal|srisailam/.test(t);
}

async function build() {
  log('Building Whisper Net feed…');
  const seen = new Set();
  const topics = [];

  for (const feed of FEEDS) {
    try {
      const items = await fetchRss(feed.query);
      log(`  ${feed.prefer}: ${items.length} headlines`);
      for (const item of items) {
        const key = (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!key || seen.has(key) || isNoise(item.title) || !isLocal(item.title)) continue;
        seen.add(key);
        const hours = ageHours(item.pubDate);
        if (hours > 14 * 24) continue;
        const { bucket, hits } = bucketOf(`${item.title} ${item.source}`, feed.prefer);
        const score = scoreItem(hours, hits, item.source);
        topics.push({
          bucket,
          heat: heatTag(hours, score),
          title: item.title,
          source: 'press',
          outlet: item.source,
          score,
          comments: 0,
          url: item.link,
          ageHours: Math.round(hours * 10) / 10,
          pubDate: item.pubDate
        });
      }
    } catch (e) {
      log(`  ${feed.prefer} failed: ${e.message}`);
    }
  }

  const kept = topics.sort((a, b) => b.score - a.score || a.ageHours - b.ageHours).slice(0, 60);

  const counts = {};
  let painScore = 0;
  for (const t of kept) {
    counts[t.bucket] = (counts[t.bucket] || 0) + 1;
    if (['Water', 'Power', 'Roads', 'Sanitation', 'Traffic', 'Crime'].includes(t.bucket)) {
      painScore += Math.min(18, t.score);
    }
  }

  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    updatedAtIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    painScore,
    counts,
    redditStatus: 'client',
    note: 'Press layer is pre-built. Reddit Pulse is fetched in the visitor browser (datacenter IPs are blocked by Reddit).',
    topics: kept
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  log(`Wrote ${payload.topics.length} topics → ${OUT} (pain ${painScore})`);
  return payload;
}

if (require.main === module) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { build, BUCKETS };
