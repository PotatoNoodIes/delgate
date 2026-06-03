# DelGate AI Freight Assistant

An AI-powered freight quote assistant for DelGate Logistics. Get accurate Canadian freight quotes through natural conversation with Alex, your virtual freight coordinator.

## Tech Stack

- **Nuxt 3** — SSR framework
- **Tailwind CSS** — Styling
- **Groq API** — AI inference (LLM)
- **Google Maps API** — Route distance calculation
- **Vitest** — Unit testing

## Prerequisites

- Node.js 22+
- npm

## Local Installation

### 1. Clone the repository

```bash
git clone https://github.com/PotatoNoodIes/delgate.git
cd delgate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# ── Required ──────────────────────────────────────────
GROQ_API_KEY=gsk_your_groq_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# ── Optional: Email via SMTP ───────────────────────────
# Any SMTP provider works (Gmail, SendGrid, Mailgun, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=DelGate Freight <noreply@delgate.ca>

# ── Optional: Currency ────────────────────────────────
# CAD → USD conversion rate (default: 0.74)
CAD_TO_USD_RATE=0.74
```

**Getting API keys:**
- **Groq:** Sign up at [console.groq.com](https://console.groq.com) and create an API key
- **Google Maps:** Enable the Maps JavaScript API and Geocoding API in [Google Cloud Console](https://console.cloud.google.com)

### 4. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Running Tests

```bash
npm run test
```

## Building for Production

```bash
npm run build
```

The production build outputs to `.output/`. To run it:

```bash
node .output/server/index.mjs
```

Or with a custom port:

```bash
NITRO_PORT=3002 node .output/server/index.mjs
```
