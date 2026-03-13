# Render Deployment Guide for NBA Playoffs Predictions

This guide will walk you through deploying your app to Render and connecting it to your MongoDB database.

## Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **MongoDB Atlas Account** - For your database (or use Render's MongoDB)

---

## Step 1: Prepare Your Code

### 1.1 Push to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NBA Playoffs Predictions app"

# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/nba-playoffs-predictions.git

# Push to GitHub
git push -u origin main
```

### 1.2 Create a `.env.example` file (optional but recommended)

Create a file showing what environment variables are needed:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Step 2: Set Up MongoDB

You have two options:

### Option A: Use MongoDB Atlas (Recommended - Same DB as Development)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster if you don't have one
3. **Network Access**: Add `0.0.0.0/0` to allow connections from anywhere (or Render's IPs)
4. **Database Access**: Ensure your user has read/write permissions
5. Get your connection string from "Connect" → "Connect your application"
6. Your connection string looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   ```

### Option B: Use Render's MongoDB (Separate from Development)

1. In Render dashboard, click "New +" → "MongoDB"
2. Choose a name and region
3. Render will provide a connection string automatically

**Note**: If you use Option A (Atlas), you can use the SAME database for both development and production!

---

## Step 3: Deploy to Render

### 3.1 Create a New Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select your repository: `nba-playoffs-predictions`

### 3.2 Configure Build Settings

Render should auto-detect Next.js, but verify these settings:

- **Name**: `nba-playoffs-predictions` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your main branch)
- **Root Directory**: Leave empty (or `.` if your app is in a subdirectory)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3.3 Set Environment Variables

In the Render dashboard, go to "Environment" tab and add:

#### Required Variables:

```
MONGODB_URI
```
Your MongoDB connection string (from Step 2)

```
NEXTAUTH_URL
```
Your Render app URL (e.g., `https://nba-playoffs-predictions.onrender.com`)
**Important**: Update this after first deployment when you know your URL!

```
NEXTAUTH_SECRET
```
Generate a random secret:
```bash
openssl rand -base64 32
```
Or use an online generator: https://generate-secret.vercel.app/32

```
GOOGLE_CLIENT_ID
```
Your Google OAuth Client ID

```
GOOGLE_CLIENT_SECRET
```
Your Google OAuth Client Secret

```
ADMIN_EMAIL
```
The email address that should have admin privileges (e.g., `dorzil1998@gmail.com`)

#### Optional (for better performance):

```
NODE_ENV=production
```

### 3.4 Configure Google OAuth for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   ```
   https://your-app-name.onrender.com/api/auth/callback/google
   ```
   (Replace `your-app-name` with your actual Render app name)

### 3.5 Deploy

1. Click "Create Web Service"
2. Render will start building and deploying
3. Wait for deployment to complete (5-10 minutes first time)

---

## Step 4: Post-Deployment Steps

### 4.1 Update NEXTAUTH_URL

After deployment, you'll get a URL like `https://nba-playoffs-predictions.onrender.com`

1. Go to your Render service → "Environment"
2. Update `NEXTAUTH_URL` to your actual Render URL
3. Save changes (this will trigger a redeploy)

### 4.2 Verify Database Connection

1. Visit your deployed app
2. Check Render logs for MongoDB connection messages
3. Try signing in to test the full flow

### 4.3 Seed Initial Data (if needed)

If you need to seed teams or create the admin user:

1. You can create a one-time script or use the admin panel
2. Or connect to MongoDB directly and add data manually

---

## Step 5: Using the Same Database (Development + Production)

If you want to use the **same MongoDB Atlas database** for both:

### Development (.env.local):
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nba-playoffs?retryWrites=true&w=majority
NEXTAUTH_URL=http://localhost:3000
```

### Production (Render Environment Variables):
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nba-playoffs?retryWrites=true&w=majority
NEXTAUTH_URL=https://your-app.onrender.com
```

**Benefits**:
- Same data in dev and prod
- Easy to test with real data
- No data migration needed

**Considerations**:
- Be careful not to delete production data during development
- Consider using separate databases for safety

---

## Troubleshooting

### Build Fails

- Check Render build logs for errors
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Database Connection Issues

- Check MongoDB Atlas Network Access (allow `0.0.0.0/0`)
- Verify connection string is correct
- Check database user permissions

### NextAuth Issues

- Ensure `NEXTAUTH_URL` matches your Render URL exactly
- Verify `NEXTAUTH_SECRET` is set
- Check Google OAuth redirect URI matches

### App Crashes on Start

- Check environment variables are all set
- Review Render logs for error messages
- Verify MongoDB connection string format

---

## Render Free Tier Limitations

- **Spins down after 15 minutes of inactivity** (wakes up on first request)
- **750 hours/month** of runtime (enough for always-on if you upgrade)
- **512 MB RAM** (should be enough for your app)

To keep it always-on, consider the **Starter Plan ($7/month)**.

---

## Next Steps

1. ✅ Deploy to Render
2. ✅ Test all functionality
3. ✅ Set up custom domain (optional)
4. ✅ Configure auto-deploy from GitHub (enabled by default)
5. ✅ Monitor logs and performance

---

## Quick Reference: Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `NEXTAUTH_URL` - Your Render app URL
- [ ] `NEXTAUTH_SECRET` - Random 32+ character string
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `ADMIN_EMAIL` - Admin user email (e.g., `dorzil1998@gmail.com`)
- [ ] `NODE_ENV=production` - Optional but recommended

---

## Support

If you encounter issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check MongoDB Atlas logs
3. Verify all environment variables are set correctly
4. Test locally with production environment variables (use `.env.production.local`)

Good luck with your deployment! 🚀
