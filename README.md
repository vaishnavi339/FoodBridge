# 🍽️ FoodBridge — Smart Food Distribution System

A full-stack web platform that intelligently connects surplus food donors with nearby NGOs and communities in real time. Features a smart matching engine, live maps, real-time WebSocket tracking, and AI-powered demand prediction.

![FoodBridge](https://img.shields.io/badge/FoodBridge-Reduce%20Food%20Waste-10b981?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?style=flat-square)
![Python](https://img.shields.io/badge/Python-ML%20Model-3776AB?style=flat-square)

## 🌟 Features

### Core
- **Role-based Registration** — Donors (restaurants, hotels, events, grocery stores) and Receivers (NGOs, volunteers, community kitchens)
- **Food Listing Portal** — Upload food type, quantity, photos, expiry time, and pickup location
- **Location-based Discovery** — Live dark-themed map showing nearby available food with urgency-coded markers

### Intelligence
- **Smart Matching Algorithm** — Scores receivers by distance (40%), urgency (35%), and demand fairness (25%)
- **AI Prediction Model** — Forecasts demand by area/food type and flags high-spoilage-risk listings

### Real-Time
- **WebSocket-powered Tracking** — Live status updates from listing to delivery confirmation
- **Push Notifications** — In-app notifications with real-time updates via Socket.io
- **Multi-channel Alerts** — SMS (Twilio), Push (Firebase), Email (SendGrid) stubs ready for production

### Analytics
- **Admin Dashboard** — Full oversight with impact metrics (kg saved, deliveries, communities served)
- **Leaderboards** — Top donors and receivers ranked by contribution

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Maps | Leaflet.js + react-leaflet (Carto dark tiles) |
| Backend | Node.js + Express REST API |
| Auth | JWT (JSON Web Tokens) |
| Database | SQLite via Sequelize ORM |
| Real-time | Socket.io |
| ML Model | Python + scikit-learn + Flask |
| Notifications | Twilio / Firebase / SendGrid (stubs) |

## 📁 Project Structure

```
Food_Distribution_Model/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/       # JWT auth + role-based access
│   ├── models/          # Sequelize models (User, FoodListing, Claim, Notification)
│   ├── routes/          # REST API endpoints
│   ├── services/        # Matching engine + notification service
│   ├── socket/          # WebSocket event handlers
│   ├── server.js        # Express + Socket.io entry point
│   └── seed.js          # Demo data seeder
├── frontend/
│   └── src/
│       ├── app/         # Next.js App Router pages
│       ├── components/  # Reusable UI components
│       ├── context/     # Auth + Socket providers
│       └── services/    # API client
└── ml-model/
    ├── api.py           # Flask prediction service
    └── requirements.txt # Python dependencies
```

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
npm install
node seed.js    # Creates demo users, listings, claims
npm run dev     # Starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # Starts on http://localhost:3000
```

### 3. ML Model (optional)

```bash
cd ml-model
pip install -r requirements.txt
python api.py   # Starts on http://localhost:8000
```

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodbridge.org | admin123 |
| Donor | rajesh@tajhotel.com | password123 |
| NGO | meera@meerafoundation.org | password123 |
| Volunteer | vikram@volunteer.com | password123 |

## 🧠 Smart Matching Algorithm

The matching engine scores receivers using a weighted composite:

```
Score = (Distance × 0.40) + (Urgency × 0.35) + (Demand Fairness × 0.25)
```

- **Distance (40%)**: Haversine distance calculation, max 50km radius
- **Urgency (35%)**: Time-to-expiry urgency scoring
- **Demand Fairness (25%)**: Inverse of total received + verified org bonus

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user profile

### Food Listings
- `GET /api/listings` — Browse available listings (with location/filter params)
- `POST /api/listings` — Create new listing (donors)
- `GET /api/listings/:id/matches` — Get ranked receiver matches

### Claims
- `POST /api/claims` — Claim a listing
- `PUT /api/claims/:id/status` — Update delivery status

### Admin
- `GET /api/admin/stats` — Dashboard analytics
- `GET /api/admin/users` — User management

## 🌍 Social Impact

- Reduces food waste at the source
- Ensures faster, fairer distribution based on need
- Creates a transparent, data-driven surplus food supply chain
- Scales across cities with location-based intelligence

## 📄 License

MIT — Built with ❤️ to reduce food waste and feed communities.
