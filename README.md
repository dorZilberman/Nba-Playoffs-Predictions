# NBA Playoffs Predictions

A full-stack web application for making and tracking NBA Playoffs predictions. Built with Next.js, TypeScript, MongoDB, and NextAuth.js.

## Features

- **Google OAuth Authentication** - Sign in with your Google account
- **Bracket Visualization** - View the current playoff bracket with real results and predictions
- **Prediction System** - Make predictions for playoff series and Play-In games
- **Lock System** - Predictions lock when games start, preventing late changes
- **Scoring Engine** - Automatic scoring based on prediction accuracy
- **Standings Table** - View leaderboard with sortable columns
- **Admin Panel** - Manage playoff data, series, and games
- **Dark/Light Mode** - Toggle between themes
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose
- **Authentication:** NextAuth.js v5
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Date Handling:** date-fns-tz

## Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or MongoDB Atlas)
- Google OAuth credentials

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/nba-playoffs
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nba-playoffs

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin
ADMIN_EMAIL=dorzil1998@gmail.com
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local`

### 4. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Use the output as your `NEXTAUTH_SECRET` value.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Render

### 1. Prepare for Production

1. Update `NEXTAUTH_URL` in your environment variables to your production URL
2. Add production redirect URI in Google Cloud Console:
   `https://your-app.onrender.com/api/auth/callback/google`

### 2. Deploy on Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add all environment variables from `.env.local`
6. Deploy!

### 3. MongoDB on Render

- Option 1: Use MongoDB Atlas (free tier available)
- Option 2: Use Render's MongoDB addon

## Project Structure

```
app/
├── (auth)/          # Auth routes (sign-in)
├── (main)/          # Main app routes (bracket, standings, rules, admin)
├── api/             # API routes
│   ├── admin/       # Admin operations
│   ├── predictions/ # Prediction CRUD
│   ├── series/      # Series data
│   └── standings/   # Standings calculation
├── lib/
│   ├── models/      # Mongoose models
│   ├── scoring/     # Scoring engine
│   ├── locking/     # Lock checking logic
│   └── utils/       # Utilities
└── components/      # React components
    ├── bracket/     # Bracket visualization
    ├── standings/   # Standings table
    ├── admin/       # Admin components
    └── ui/          # UI components (shadcn/ui)
```

## Scoring Rules

### Play-In Games
- 2 points for correct winner
- 0 points for incorrect or missed predictions

### Playoff Series
- Base points by round:
  - First Round: 6
  - Second Round: 8
  - Conference Finals: 10
  - Finals: 12

- Exact correct prediction: base + 4
- Correct winner, wrong score: base - y (where y = difference in losing team's wins)
- Wrong winner: 0 (unless 7-game bonus applies)

### Bonuses
- Sweep bonus: +2 if predicted 4-0 and actual is 4-0
- 7-game distance bonus: +2 if predicted 4-3 but wrong team won 4-3

## Admin Usage

1. Sign in with the admin email (`ADMIN_EMAIL`)
2. Navigate to the Admin page
3. Add Play-In games and playoff series
4. Update scores and winners as games progress
5. Series and games automatically lock based on start times

## License

Private project for personal use.
