# How to Upload Your Code to GitHub

Follow these steps to upload your NBA Playoffs Predictions app to GitHub.

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `nba-playoffs-predictions` (or your preferred name)
   - **Description**: "NBA Playoffs Predictions Web App"
   - **Visibility**: Choose **Public** (free) or **Private** (if you have GitHub Pro)
   - **DO NOT** check "Initialize with README" (we already have files)
4. Click **"Create repository"**
5. **Copy the repository URL** - You'll see something like:
   - `https://github.com/YOUR_USERNAME/nba-playoffs-predictions.git`

## Step 2: Initialize Git in Your Project

Open your terminal in the project folder and run these commands:

### 2.1 Initialize Git
```bash
cd "/Users/dor/Desktop/NBA Playoffs Predictions"
git init
```

### 2.2 Add All Files
```bash
git add .
```

### 2.3 Create First Commit
```bash
git commit -m "Initial commit - NBA Playoffs Predictions app"
```

### 2.4 Rename Branch to Main (if needed)
```bash
git branch -M main
```

### 2.5 Connect to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/nba-playoffs-predictions.git
```
*(Replace `YOUR_USERNAME` with your actual GitHub username)*

### 2.6 Push to GitHub
```bash
git push -u origin main
```

You'll be prompted for your GitHub username and password (or personal access token).

## Step 3: Authentication

If you're asked for credentials:

### Option A: Personal Access Token (Recommended)
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "NBA App Upload"
4. Select scopes: Check **"repo"** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When prompted for password, paste the token instead

### Option B: GitHub CLI (Alternative)
```bash
# Install GitHub CLI first, then:
gh auth login
```

## Step 4: Verify Upload

1. Go to your GitHub repository page
2. You should see all your files
3. Check that `.env.local` is **NOT** visible (it should be in `.gitignore`)

## Troubleshooting

### "Repository not found" error
- Check the repository URL is correct
- Make sure the repository exists on GitHub
- Verify you have access to the repository

### "Authentication failed"
- Use a Personal Access Token instead of password
- Make sure the token has "repo" permissions

### "Permission denied"
- Check your GitHub username is correct
- Verify you have write access to the repository

### Files not showing up
- Make sure you ran `git add .`
- Check that files aren't in `.gitignore`
- Verify you committed: `git commit -m "message"`

## What Gets Uploaded

✅ **Will be uploaded:**
- All source code files
- `package.json` and dependencies
- Configuration files
- README and documentation

❌ **Will NOT be uploaded** (protected by `.gitignore`):
- `.env.local` - Your local environment variables
- `node_modules/` - Dependencies (will be installed on Render)
- `.next/` - Build files
- Any files with sensitive data

## Next Steps

After uploading to GitHub:
1. ✅ Your code is now backed up
2. ✅ You can deploy to Render (see `RENDER_DEPLOYMENT_GUIDE.md`)
3. ✅ You can collaborate with others
4. ✅ You can track changes with version control

## Quick Command Reference

```bash
# Initialize git
git init

# Add all files
git add .

# Commit changes
git commit -m "Your commit message"

# Connect to GitHub (first time only)
git remote add origin https://github.com/YOUR_USERNAME/nba-playoffs-predictions.git

# Push to GitHub
git push -u origin main

# For future updates:
git add .
git commit -m "Description of changes"
git push
```

---

**Need help?** Check GitHub's documentation or the troubleshooting section above.
