# Deployment Guide - FoodBridge 🚀

This document provides step-by-step instructions for deploying the FoodBridge platform to production.

## 🏗 Architecture Overview
- **Frontend**: Next.js (Recommended: [Vercel](https://vercel.com))
- **Backend**: Node.js Express (Recommended: [Render](https://render.com) or [Railway](https://railway.app))
- **ML Model**: Flask (Recommended: [Render](https://render.com) or [AWS Lambda](https://aws.amazon.com/lambda))
- **Database**: SQLite (default) or PostgreSQL (Recommended for production)

---

## 1. Backend Deployment (Node.js)

### Environment Variables
Configure the following in your deployment platform's dashboard:
- `PORT`: `5000`
- `NODE_ENV`: `production`
- `JWT_SECRET`: A long, random string.
- `FRONTEND_URL`: Your deployed frontend URL (e.g., `https://foodbridge.vercel.app`)

### Build & Start Commands
- **Install**: `npm install`
- **Start**: `npm start`

> [!IMPORTANT]
> If using SQLite on a platform like Render, ensure you use **Persistent Disks**, otherwise the database will be wiped on every redeploy. For true production, we recommend switching to an external PostgreSQL database.

---

## 2. Frontend Deployment (Next.js)

### Environment Variables
- `NEXT_PUBLIC_API_URL`: `https://your-backend-url.com/api`
- `NEXT_PUBLIC_SOCKET_URL`: `https://your-backend-url.com`

### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Backend API URL
  - `NEXT_PUBLIC_ML_API_URL`: ML Service URL (e.g., `https://foodbridge-ml.onrender.com`)

---

The ML service is located in the `ml-service/` folder.

### Configuration
- **Runtime**: Python 3.9+
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn api:app`

### Environment Variables
- `PORT`: Automatically set by Render.
- `CORS_ORIGIN`: Set to your frontend URL if you want to restrict access (optional).

---

## 🔐 Security Checklist
- [ ] **HTTPS**: All endpoints must be served over HTTPS.
- [ ] **Secrets**: Ensure `.env` files are NEVER committed to version control.
- [ ] **CORS**: Ensure `FRONTEND_URL` in the backend matches your actual frontend domain.
- [ ] **Rate Limiting**: Standard rate limiting is enabled, but consider using Cloudflare for DDoS protection.

---

## 🛠 Troubleshooting
- **Socket.io connection failed**: Ensure `NEXT_PUBLIC_SOCKET_URL` uses `https://` and no trailing slash.
- **Database Locked**: If using SQLite on a network drive, you might encounter locking issues. Use a local persistent volume.
