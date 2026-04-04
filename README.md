# 🌍 TelanganaMonitor

**AI-Powered Real-Time State Intelligence Platform for Telangana**

An intelligent dashboard designed for government decision-makers to monitor Telangana state across weather, air quality, civic infrastructure, news intelligence, financial indicators, and more.

![Platform](https://img.shields.io/badge/Platform-Web%20Dashboard-blue)
![AI-Powered](https://img.shields.io/badge/AI-Google%20Gemini%202.0-red)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green)
![Automation](https://img.shields.io/badge/Automation-GitHub%20Actions-orange)

---

## 🎯 Overview

TelanganaMonitor is a centralized intelligence platform that aggregates real-time data from multiple sources and provides AI-powered analysis for senior state administration (Chief Minister, IAS/IPS officers). The system automates intelligence collection and generates actionable briefings every 2 hours with a consolidated daily digest at 7 AM IST.

**Key Insight:** No API keys required for basic usage—works with free, open-source data feeds!

---

## ✨ Features

### 📊 Dashboard Tab
- **Live Statistics Strip**: Real-time temperature, AQI, humidity, wind speed, gold price, alerts, and last sync timestamp
- **Real-Time Alerts Panel**: Weather alerts, air quality warnings, and system status
- **Interactive State Map**: 
  - District heatmap showing news density (color-coded by mention count)
  - Reservoir view with dam water levels (Srisailam, Nagarjuna Sagar, Himayat Sagar, Osman Sagar)
- **Smart News Feed**: 18+ latest articles categorized by topic (Security, Disaster, Governance, Infrastructure, Agriculture, Economy)
- **Right Panel Widgets**:
  - Hydro monitoring with current water levels
  - 7-day weather forecast
  - Cultural spotlight and upcoming events

### 🔍 Intelligence Hub Tab
- **Environment**: Air quality matrix, weather outlook, detailed pollutant analysis (PM2.5, PM10, NO₂, Ozone)
- **Civic Pulse**: Real-time infrastructure project tracking (Metro, Ring Road, Musi Riverfront, Pharma City, IT Corridor)
- **Whisper Net**: Civic complaints and infrastructure alerts (water, power, roads, sanitation, traffic)
- **Trends**: Live news category analytics with visual charts
- **AI Analysis**: 
  - Automated 2-hourly executive summaries
  - Risk assessment with severity ratings
  - Cross-correlations between data points
  - Actionable recommendations by department
  - District-wise focus areas
- **Daily Report**: 
  - Consolidated daily digest aggregating 12 × 2-hourly summaries
  - Timeline view of executive summaries
  - Data snapshots with metadata

### 🎨 Additional Features
- **Theme Toggle**: Light/dark mode with persistent storage
- **Data Export**: Download intelligence as JSON or text brief
- **Responsive Design**: Optimized for desktop and mobile devices
- **Auto-Refresh**: Live data updates every 15 minutes
- **Privacy-First**: No user tracking, local storage only

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Visualizations** | Leaflet.js (Interactive Maps), Chart.js |
| **Backend** | Node.js + Express.js |
| **Scheduling** | node-cron (2-hourly runs, 7 AM IST digest) |
| **AI Engine** | OpenRouter API + Google Gemini 2.0 Flash Lite |
| **Data Sources** | Open-Meteo, Google News RSS, metals.live, frankfurter.app |
| **Deployment** | GitHub Actions (Automated Workflows) |
| **Data Storage** | JSON files (persistent local storage) |

---

## 📦 Dependencies

```json
{
  "express": "^4.21.0",
  "node-cron": "^3.0.3",
  "dotenv": "^16.4.5"
}
```

**Minimal dependencies for lightweight deployment.**

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16+ or higher
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/subbu0111/telanganamonitor.git
   cd telanganamonitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create configuration file** (optional, for AI analysis)
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your OpenRouter API key (optional for basic dashboard):
   ```env
   OPENROUTER_API_KEY=your_api_key_here
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   The dashboard will be available at `http://localhost:3000`

---

## 📖 Usage

### Dashboard Features

**View Live Data:**
- Open the browser and navigate to the Dashboard tab
- Real-time weather, AQI, news, and reservoir data load automatically
- Auto-refresh occurs every 15 minutes

**Access Intelligence Hub:**
- Click on "Intelligence Hub" tab to view:
  - Environmental analysis
  - Civic pulse infrastructure updates
  - AI-generated executive summaries (auto-loaded from latest 2-hourly run)
  - Daily digest timeline
  - Trend analysis

**Export Data:**
- Use the "Export" button to download intelligence reports as JSON or text brief
- Timestamps included for audit trail

**Toggle Theme:**
- Switch between light and dark mode using the theme toggle button
- Preference is saved locally

### Running Scheduled Analysis

The system automatically runs:
- **Every 2 hours**: Fetches data and generates AI analysis (if OpenRouter API key configured)
- **Daily at 7 AM IST**: Generates consolidated daily digest

To trigger manually:
```bash
npm run analyze
```

---

## ⚙️ Configuration

### API Keys (Optional)

**Basic Dashboard** works without any API keys using free data sources:
- Open-Meteo: Weather and air quality
- Google News: Articles
- metals.live: Gold prices
- frankfurter.app: Currency conversion

**For AI Analysis** (advanced features):
1. Get an OpenRouter API key from [openrouter.ai](https://openrouter.ai)
2. Add to `.env` file:
   ```env
   OPENROUTER_API_KEY=your_key_here
   ```

### Environment Variables

```env
# Backend Configuration
PORT=3000
NODE_ENV=production

# AI Analysis (Optional)
OPENROUTER_API_KEY=your_api_key_here
ANALYSIS_FREQUENCY=120  # minutes (2 hours default)
DAILY_DIGEST_TIME=07:00  # IST format
```

---

## 📁 Project Structure

```
telanganamonitor/
├── index.html                 # Main dashboard UI
├── server.js                  # Express server + cron scheduler
├── config.js                  # Configuration management
├── package.json               # Dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore patterns
├── data/                      # Auto-generated data storage
│   ├── executive_summaries.json    # 2-hourly AI analyses (last 30 days)
│   ├── daily_digests.json          # Daily consolidated summaries (last 90 days)
│   └── news_cache.json             # Latest news articles
├── scripts/                   # Utility scripts
│   ├── analyze.js             # AI analysis runner
│   ├── data_fetch.js          # External API integrations
│   └── daily_digest.js        # Daily consolidation logic
├── .github/
│   └── workflows/             # GitHub Actions automation
│       ├── scheduled_analysis.yml      # 2-hourly trigger
│       └── daily_digest.yml            # 7 AM IST trigger
└── README.md                  # This file
```

---

## 🔄 Data Pipeline

```
┌─────────────────────────────────────┐
│  Free Public Data Sources            │
│  (Weather, News, Gold, etc.)         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Data Aggregation (every 2 hrs)      │
│  - Fetch weather + AQI               │
│  - Scrape 20+ news headlines         │
│  - Update gold/commodity prices      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  AI Analysis (Google Gemini 2.0)     │
│  - Executive Summary                 │
│  - Risk Assessment                   │
│  - Cross-Correlations                │
│  - Recommendations                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Data Storage (JSON)                 │
│  - executive_summaries.json          │
│  - daily_digests.json                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Dashboard Display                   │
│  - Real-time stats                   │
│  - Interactive maps                  │
│  - AI briefings                      │
│  - Export options                    │
└─────────────────────────────────────┘
```

---

## 🤖 AI Analysis Details

### Executive Summary (per 2-hour cycle)
- 3-4 line briefing for senior leaders
- Highlights the most critical developments

### Risk Assessment
- Top 3-5 identified risks with severity tags: **HIGH** | **MEDIUM** | **LOW**
- Context and recommended actions

### Cross-Correlations
- Identifies connections between different data streams
- Example: "High AQI in Hyderabad correlates with traffic congestion"

### Recommendations
- Actionable items grouped by department
- Department-specific priorities based on risk assessment

### District Focus
- Identifies which districts require immediate attention
- Based on news density and alerts

---

## 🚀 Deployment

### GitHub Actions (Automated)
The project includes workflows that:
- Run analysis automatically every 2 hours ⏰
- Generate daily digest at 7 AM IST daily 📋
- Commit results to the repository 📤
- No manual intervention required

### Local Deployment
```bash
npm start
```

### Production Deployment (DigitalOcean, Heroku, AWS, etc.)
1. Set environment variables on the hosting platform
2. Deploy the repository
3. Webhook triggers will automatically run scheduled tasks

---

## 📊 Dashboard Screenshots

### Dashboard Tab
- Live statistics with temperature, AQI, alerts
- Interactive state map with district heatmap
- Real-time reservoir water levels
- News feed categorized by importance

### Intelligence Hub
- Environmental quality metrics
- Civic infrastructure dashboard
- AI-powered executive summary
- Daily digest timeline

### Responsive Design
- Works on desktop (1920px+), tablet (768px+), and mobile (320px+)

---

## 🔐 Security & Privacy

- ✅ **No user tracking** — All data is processed locally
- ✅ **No cookies** — Theme preference stored in localStorage only
- ✅ **Open-source** — Fully auditable code
- ✅ **API key security** — Sensitive keys stored in environment variables
- ✅ **HTTPS-ready** — Can be deployed behind SSL/TLS

---

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Manual Triggers
```bash
# Run analysis immediately
npm run analyze

# Generate daily digest
npm run digest

# Fetch fresh data
npm run fetch-data
```

### Testing
```bash
npm test
```

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Areas for Contribution
- 🗺️ Additional data sources (SMS alerts, CCTV, sensor networks)
- 🎨 UI/UX enhancements
- 🤖 Improved AI analysis logic
- 📱 Mobile app wrapper
- 🌐 Multi-language support
- 🧪 Test coverage

---

## 📞 Support & Feedback

- **Issues:** [GitHub Issues](https://github.com/subbu0111/telanganamonitor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/subbu0111/telanganamonitor/discussions)
- **Email:** subbu0111@github.com

---

## 🙏 Acknowledgments

- **Data Sources:** Open-Meteo, Google News, metals.live, frankfurter.app
- **AI Engine:** OpenRouter + Google Gemini 2.0 Flash Lite
- **Inspiration:** Real-time intelligence for better governance
- **Community:** Thanks to all contributors and testers

---

## 🗓️ Roadmap

- [ ] Multi-language support (Telugu, Hindi, English)
- [ ] Mobile app (iOS/Android)
- [ ] Integration with SMS/WhatsApp alerts
- [ ] Live camera feeds integration
- [ ] Advanced sentiment analysis on news
- [ ] Predictive analytics (flooding, drought)
- [ ] Department-wise dashboard views
- [ ] PDF report generation
- [ ] Data visualization exports

---

**Made with ❤️ for Telangana State Administration**

---

## 📚 Additional Resources

- [Open-Meteo Weather API](https://open-meteo.com/)
- [OpenRouter AI API](https://openrouter.ai/)
- [Node.js Documentation](https://nodejs.org/)
- [Express.js Guide](https://expressjs.com/)
- [Leaflet.js Maps](https://leafletjs.com/)

---

**Last Updated:** April 2026 | **Version:** 1.0.0
