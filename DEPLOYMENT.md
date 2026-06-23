# Deployment Guide — IEEE DTU DSA Tracker

## Architecture
- **Frontend**: Next.js 15 → Deploy on **Vercel**
- **Backend**: Node.js/Express → Deploy on **Render** (or Railway)
- **Database**: MongoDB Atlas (already configured)

---

## Step 1: Push to GitHub

```bash
cd DSA-Tracker
git add -A
git commit -m "feat: complete IEEE DTU DSA Tracker - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/ieee-dtu-dsa-tracker.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Render

1. Go to https://render.com → Dashboard → **New Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add these **Environment Variables** (from your `.env`):
   ```
   MONGODB_URI=<your-mongodb-uri>
   JWT_SECRET=<your-jwt-secret>
   PORT=10000
   FRONTEND_ORIGIN=https://your-app.vercel.app
   GEMINI_API_KEY=<your-gemini-key>
   GROQ_API_KEY=<your-groq-key>
   OPENROUTER_API_KEY=<your-openrouter-key>
   HEAD_ADMIN_USERNAME=<your-admin-username>
   HEAD_ADMIN_EMAIL=<your-admin-email>
   HEAD_ADMIN_PASSWORD=<your-admin-password>
   VAPID_PUBLIC_KEY=<your-vapid-public-key>
   VAPID_PRIVATE_KEY=<your-vapid-private-key>
   VAPID_SUBJECT=mailto:admin@ieeedtu.in
   ```
5. Click **Deploy**
6. Note the URL (e.g., `https://ieee-dtu-dsa-tracker-api.onrender.com`)

---

## Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com → **Import Project** from GitHub
2. Select your repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (auto-detected)
4. Add these **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-vapid-public-key>
   ```
5. Click **Deploy**
6. Note the URL (e.g., `https://ieee-dtu-dsa-tracker.vercel.app`)

---

## Step 4: Update CORS

After both are deployed, update the backend's `FRONTEND_ORIGIN` env variable on Render to match your Vercel URL:
```
FRONTEND_ORIGIN=https://ieee-dtu-dsa-tracker.vercel.app
```

---

## Step 5: Verify

1. Visit your Vercel URL
2. Try admin login: `gupta_karan_` / `guptakaran2026dtu`
3. Approve a test member
4. Verify contests load, daily problem can be set, etc.

---

## MongoDB Atlas Configuration

Your MongoDB Atlas is already configured. Make sure:
- **Network Access**: Add `0.0.0.0/0` to allow connections from Render/Vercel
- **Database Access**: Ensure the user `guptakaranport` has readWrite permissions

---

## Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Update `FRONTEND_ORIGIN` on Render to match Vercel URL |
| Backend 503 | Render free tier sleeps after 15min inactivity — first request takes ~30s to wake |
| AI features fail | Get valid API keys (Gemini from aistudio.google.com, Groq from console.groq.com) |
| PWA not working | PWA requires HTTPS — works automatically on Vercel |
| Push notifications | Only work on HTTPS (Vercel provides this) |
