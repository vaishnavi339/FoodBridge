# 🍽️ FoodBridge — Smart Food Distribution System

> **AI-powered platform connecting surplus food donors with NGOs & communities in real time.**

[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-blue)](/)
[![ML](https://img.shields.io/badge/ML-Python%20Flask-yellow)](/)
[![DB](https://img.shields.io/badge/Database-SQLite-lightgrey)](/)

---

## 🚀 Quick Start (3 commands)

Open **3 separate terminal windows** and run one command in each:

### Terminal 1 — Backend (Port 5000)
```bash
cd backend
npm install
node seed.js        # populate demo data (run once)
npm run dev
```

### Terminal 2 — ML Service (Port 5001)
```bash
cd ml-service
pip install -r requirements.txt
python api.py
```

### Terminal 3 — Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@foodbridge.org | admin123 |
| **Donor** (Taj Hotel) | rajesh@tajhotel.com | password123 |
| **Donor** (FreshMart) | priya@freshmart.com | password123 |
| **Donor** (Spice Route) | amit@spiceroute.com | password123 |
| **NGO** (Meera Foundation) | meera@meerafoundation.org | password123 |
| **NGO** (Asha Foundation) | sunita@ashafoundation.org | password123 |
| **NGO** (Annapurna Kitchen) | info@annapurna.org | password123 |
| **Volunteer** | vikram@volunteer.com | password123 |
| **Volunteer** | neha@volunteer.com | password123 |

---

## 🏗️ Project Structure

```
Food_Distribution_Model/
├── backend/               # Node.js + Express REST API (Port 5000)
│   ├── models/            # Sequelize models: User, FoodListing, Claim, Notification
│   ├── routes/            # auth, listings, claims, partners, admin, notifications
│   ├── services/          # matchingEngine.js (smart algorithm), notificationService.js
│   ├── socket/            # Real-time WebSocket handler (Socket.io)
│   ├── middleware/        # JWT auth + role-based access control
│   ├── seed.js            # Demo data seeder (run before first use)
│   └── server.js          # Entry point
│
├── frontend/              # Next.js 14 App Router (Port 3000)
│   └── src/app/
│       ├── page.js                    # Landing page
│       ├── login/                     # Login
│       ├── signup/                    # Multi-step registration
│       ├── map/page.js                # Live Food Map (main feature)
│       ├── donor/dashboard/           # Donor dashboard + analytics
│       ├── donor/create-listing/      # Post food with geocoding
│       ├── receiver/dashboard/        # NGO dashboard
│       ├── volunteer/dashboard/       # Volunteer task + delivery map
│       └── admin/                     # Admin analytics + user management
│
└── ml-service/            # Python Flask ML API (Port 5001)
    ├── api.py             # REST endpoints: /predict/ngo, /predict/demand, /predict/full
    ├── train_model.py     # Train demand + claim prediction models
    ├── generate_data.py   # Synthetic training data generator
    └── models/
        ├── model_demand.pkl           # Random Forest Regressor
        ├── model_claim.pkl            # Random Forest Classifier
        ├── city_classifier.pkl        # City name → coordinates
        ├── ngo_database.json          # 1200+ Indian cities with NGO data
        └── indian_cities_geodata.json # Lat/lng for 1200+ cities
```

---

## ✨ Key Features

### 🗺️ Live Food Map
- Dark-themed Leaflet map with color-coded urgency markers:
  - 🔴 **Red** = expiring in < 2 hours
  - 🟠 **Amber** = expiring in 2–6 hours
  - 🟢 **Green** = plenty of time
- Click any marker for full food details

### 🤖 AI NGO Finder
- Type any Indian city → ML model finds NGOs → map pans and marks them
- Covers **1200+ Indian cities** with geodata
- City alias support: "Bangalore", "Bombay", "Madras", "Calcutta" all work

### ⚡ Smart Matching Algorithm
```
Score = (Distance × 0.40) + (Urgency × 0.35) + (Fairness × 0.25) + (AI Boost)

- Distance: Haversine formula, max 50km radius
- Urgency:  Inversely proportional to hours until expiry
- Fairness: NGOs that have received less get higher priority
- AI Boost: ML model demand prediction (0–1 score × 10)
```

### 🔌 Real-Time Notifications (Socket.io)
- New listing → instant notification to all nearby NGOs
- Listing claimed → donor gets notified
- Delivery status updates → both donor + NGO see live updates

### 📍 Address Geocoding
- Type any address → "Find on Map" → coordinates auto-fill
- Uses **OpenStreetMap Nominatim** (free, no API key)

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user profile |

### Listings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/listings` | Get all listings (filters: status, foodType, lat, lng, radius) |
| POST | `/api/listings` | Create listing (donor only) |
| GET | `/api/listings/:id/matches` | Smart-ranked NGO matches |

### Claims (Delivery)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/claims` | NGO claims a listing |
| PUT | `/api/claims/:id/status` | Update: approved → picked_up → delivered |

### ML Service
| Method | Endpoint | Description |
|---|---|---|
| POST | `localhost:5001/predict/ngo` | City → NGOs with lat/lng |
| POST | `localhost:5001/predict/demand` | Predict food demand (kg) |
| POST | `localhost:5001/predict/full` | Combined AI boost score |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform analytics |
| GET | `/api/admin/users` | All users with management |

---

## 🛠️ Environment Setup

### Backend `.env`
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=foodbridge_secret_key_2024
ML_API_URL=http://localhost:5001
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_ML_URL=http://localhost:5001
```

---

## 🌱 Re-Seed Database

If you want to reset to fresh demo data:
```bash
cd backend
node seed.js
```

This creates:
- 11 users (1 admin, 3 donors, 5 NGOs, 2 volunteers)
- 6 live food listings (1 red urgent, 2 amber, 3 green)
- 4 completed past deliveries (for impact numbers)
- 18 notifications across all accounts

---

## 📊 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Leaflet.js |
| Backend | Node.js, Express, Socket.io |
| Database | SQLite via Sequelize ORM |
| Auth | JWT (JSON Web Tokens) |
| ML Service | Python, Flask, scikit-learn |
| Maps | OpenStreetMap (Nominatim + CartoDB dark tiles) |
| Real-time | Socket.io WebSockets |

---

## 📞 Support

For issues, check that all 3 services are running:
- `http://localhost:5000/api/health` → `{ "status": "ok" }`
- `http://localhost:5001/health` → `{ "status": "ok" }`
- `http://localhost:3000` → Frontend loads
