# Vercel Deployment Guide

This guide explains how to deploy the chatbot application to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- A [Neon account](https://neon.tech) (free tier available)
- Your code pushed to GitHub, GitLab, or Bitbucket
- API keys for required services

## Database: Neon Postgres

This application uses **Neon Postgres** for data storage. Neon is a serverless Postgres provider that works seamlessly with Vercel's serverless functions.

### What's Stored in Postgres

| Feature | Table | Data Stored |
|---------|-------|-------------|
| Analytics | `analytics_events` | Chat metrics, token usage |
| Admin Auth | `admin_users`, `admin_sessions` | Admin users, sessions |
| Audit Logs | `audit_logs` | Admin activity logs |
| Ticket Extensions | `ticket_attachments`, `ticket_comments` | Ticket metadata |

### Setting Up Neon Postgres

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **Create Project**
3. Choose a project name and region (choose closest to your Vercel deployment)
4. Copy the connection string from the dashboard
5. Add it as `DATABASE_URL` in your Vercel environment variables

**Free tier includes:**
- 0.5 GB storage
- 190 compute hours/month
- Autoscaling and auto-suspend

The database schema is automatically created on first use - no manual migration needed.

---

## Environment Variables

Configure these in Vercel Dashboard → Project → Settings → Environment Variables.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key from [Anthropic Console](https://console.anthropic.com/) | `sk-ant-api03-...` |
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@host/db?sslmode=require` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your production URL | Auto-detected by Vercel |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token | - |
| `HUBSPOT_PIPELINE_ID` | HubSpot ticket pipeline ID | - |
| `HUBSPOT_STAGE_OPEN` | Pipeline stage ID for "Open" | `1` |
| `HUBSPOT_STAGE_IN_PROGRESS` | Pipeline stage ID for "In Progress" | `2` |
| `HUBSPOT_STAGE_RESOLVED` | Pipeline stage ID for "Resolved" | `3` |
| `HUBSPOT_STAGE_CLOSED` | Pipeline stage ID for "Closed" | `4` |

### Sentry Variables (Error Tracking)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client-side errors |
| `SENTRY_DSN` | Sentry DSN for server-side errors |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map uploads |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |

---

## Deployment Steps

### Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech) and sign in
2. Click **New Project**
3. Enter a project name (e.g., `chatbot`)
4. Select a region close to your users
5. Click **Create Project**
6. On the dashboard, find the **Connection string** and copy it
   - Make sure to select "Pooled connection" for serverless

### Step 2: Prepare Your Repository

1. Ensure all changes are committed and pushed:
   ```bash
   git add -A
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. Verify `.gitignore` excludes sensitive files:
   ```
   .env.local
   .env.sentry-build-plugin
   data/
   ```

### Step 3: Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your repository
3. Select the repository containing this project

### Step 4: Configure Project Settings

On the configuration screen:

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (leave as default)
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 5: Add Environment Variables

1. Expand the **Environment Variables** section
2. Add each variable:
   - `ANTHROPIC_API_KEY` - Your Claude API key
   - `DATABASE_URL` - The Neon connection string from Step 1
   - Any other optional variables you need
3. For `NEXT_PUBLIC_APP_URL`, use your Vercel domain:
   - `https://your-project.vercel.app` (default)
   - Or your custom domain once configured

### Step 6: Deploy

1. Click **Deploy**
2. Wait for the build to complete (2-5 minutes)
3. Visit your deployment URL to verify

---

## Post-Deployment Configuration

### Create Admin User

After deployment, create an admin user to access the dashboard:

**Option 1: Using Vercel CLI (recommended)**
1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull .env.local`
4. Run setup script: `npm run setup-admin`

**Option 2: Direct database access**
1. Go to your Neon dashboard
2. Open the SQL Editor
3. Run the SQL to create an admin user (hash password with bcrypt first)

### Custom Domain (Optional)

1. Go to Project → Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

### HubSpot Integration

1. Create a [HubSpot Private App](https://developers.hubspot.com/docs/api/private-apps):
   - Settings → Integrations → Private Apps → Create
   - Grant `tickets` read/write scope
   - Copy the access token

2. Get pipeline stage IDs:
   - Settings → Objects → Tickets → Pipelines
   - Click each stage to see its ID in the URL

3. Add the environment variables to Vercel

### Sentry Configuration

The Sentry DSN is currently hardcoded in config files. For production:

1. Create a new Sentry project for production
2. Update environment variables in Vercel
3. Optionally update sample rates for production:
   - `tracesSampleRate`: Lower to 0.1-0.2 for high traffic
   - `replaysSessionSampleRate`: Keep at 0.1 or lower

---

## Build Configuration

### Framework Settings

The project is configured with:

- **Next.js 16** with App Router
- **Turbopack** for development
- **TypeScript** strict mode
- **Tailwind CSS 4**

### Sentry Source Maps

Source maps are configured to upload during production builds. Ensure `SENTRY_AUTH_TOKEN` is set for this to work.

If builds fail due to Sentry, you can disable source map uploads:

```bash
# In Vercel Environment Variables
SENTRY_AUTH_TOKEN=  # Leave empty to skip uploads
```

---

## Monitoring & Health Checks

### Health Endpoint

The application exposes a health check at `/api/health`:

```bash
curl https://your-app.vercel.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "anthropic": "ok",
    "hubspot": "ok",
    "database": "ok"
  }
}
```

### Vercel Analytics (Optional)

Enable Vercel Analytics for additional monitoring:

1. Project → Analytics → Enable
2. No code changes required

---

## Troubleshooting

### Build Failures

**Sentry upload errors**
- Verify `SENTRY_AUTH_TOKEN` is correct
- Check organization and project names in `next.config.ts`

**Type errors**
- Run `npm run build` locally to debug
- Ensure all dependencies are in `package.json`

### Runtime Errors

**"ANTHROPIC_API_KEY is required"**
- Add the environment variable in Vercel dashboard
- Redeploy after adding variables

**"DATABASE_URL environment variable is not set"**
- Add the Neon connection string to Vercel environment variables
- Make sure to redeploy after adding

**Database connection errors**
- Verify the connection string is correct
- Check that you're using the pooled connection URL
- Ensure SSL mode is enabled (`?sslmode=require`)

**Ticket creation fails**
- Verify HubSpot access token is valid
- Check pipeline and stage IDs match your HubSpot setup

### Function Timeouts

Vercel Serverless Functions have execution limits:
- Hobby: 10 seconds
- Pro: 60 seconds

The chat API typically responds in 2-5 seconds, well within limits.

---

## Local Development

To develop locally:

1. Copy `.env.local.example` to `.env.local`
2. Fill in your environment variables:
   - Get `DATABASE_URL` from your Neon dashboard
   - Get `ANTHROPIC_API_KEY` from Anthropic console
3. Run `npm run dev`

For production database access locally:
1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull .env.local`

---

## Cost Considerations

### Vercel

- **Hobby (Free)**: 100GB bandwidth, suitable for low traffic
- **Pro ($20/month)**: Higher limits, team features

### Neon Postgres

- **Free tier**: 0.5GB storage, 190 compute hours/month
- **Launch ($19/month)**: 10GB storage, 300 compute hours
- **Scale**: Usage-based pricing

### Anthropic API

- **Claude Haiku 4.5**: ~$0.25/M input tokens, $1.25/M output tokens
- Average chat costs ~$0.001-0.003 per message

### Sentry

- **Free tier**: 5K errors/month, 50 replays
- **Team ($26/month)**: Higher limits, more features

---

## Security Checklist

Before going live:

- [ ] All API keys are in environment variables (not hardcoded)
- [ ] `.env.local` and `.env.sentry-build-plugin` are in `.gitignore`
- [ ] Rate limiting is enabled on all API routes
- [ ] Admin dashboard is protected with authentication
- [ ] CORS is handled by Next.js (same-origin only)
- [ ] Sentry DSN is for production project (not development)
- [ ] Database connection uses SSL (`?sslmode=require`)

---

## Quick Reference

| Action | Command/URL |
|--------|-------------|
| Local dev | `npm run dev` |
| Build locally | `npm run build` |
| Run tests | `npm test` |
| Setup admin | `npm run setup-admin` |
| Vercel dashboard | `vercel.com/dashboard` |
| Neon dashboard | `console.neon.tech` |
| Redeploy | Push to main branch |
| View logs | Vercel Dashboard → Deployments → Functions |
| Pull env vars | `vercel env pull .env.local` |
