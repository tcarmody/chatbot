# Vercel Deployment Guide

This guide explains how to deploy the chatbot application to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- Your code pushed to GitHub, GitLab, or Bitbucket
- API keys for required services

## Database: Vercel Postgres

This application uses **Vercel Postgres** for data storage, which is fully compatible with Vercel's serverless environment.

### What's Stored in Postgres

| Feature | Table | Data Stored |
|---------|-------|-------------|
| Analytics | `analytics_events` | Chat metrics, token usage |
| Admin Auth | `admin_users`, `admin_sessions` | Admin users, sessions |
| Audit Logs | `audit_logs` | Admin activity logs |
| Ticket Extensions | `ticket_attachments`, `ticket_comments` | Ticket metadata |

### Setting Up Vercel Postgres

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Choose a region close to your deployment
5. The connection strings will be automatically added to your environment variables

The database schema is automatically created on first use - no manual migration needed.

---

## Environment Variables

Configure these in Vercel Dashboard → Project → Settings → Environment Variables.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key from [Anthropic Console](https://console.anthropic.com/) | `sk-ant-api03-...` |

### Database Variables (Auto-configured)

When you create a Vercel Postgres database, these are automatically set:

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Main connection string |
| `POSTGRES_PRISMA_URL` | Prisma-compatible URL |
| `POSTGRES_URL_NO_SSL` | Connection without SSL |
| `POSTGRES_URL_NON_POOLING` | Direct connection |
| `POSTGRES_USER` | Database username |
| `POSTGRES_HOST` | Database host |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DATABASE` | Database name |

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

### Step 1: Prepare Your Repository

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

### Step 2: Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your repository
3. Select the repository containing this project

### Step 3: Create Vercel Postgres Database

1. After import, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Name your database (e.g., `chatbot-db`)
4. Select region (choose same as your deployment)
5. Click **Create**
6. The environment variables are automatically linked

### Step 4: Configure Project Settings

On the configuration screen:

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (leave as default)
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 5: Add Environment Variables

1. Expand the **Environment Variables** section
2. Add each variable from the tables above
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

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull .env.local`
4. Run setup script: `npm run setup-admin`

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

**Database connection errors**
- Verify Vercel Postgres is linked to your project
- Check that `POSTGRES_URL` is set in environment variables

**Ticket creation fails**
- Verify HubSpot access token is valid
- Check pipeline and stage IDs match your HubSpot setup

### Function Timeouts

Vercel Serverless Functions have execution limits:
- Hobby: 10 seconds
- Pro: 60 seconds

The chat API typically responds in 2-5 seconds, well within limits.

---

## Local Development with Vercel Postgres

To develop locally with the production database:

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull .env.local`
4. Run development server: `npm run dev`

Alternatively, for isolated local development, you can use a local PostgreSQL instance and update `.env.local` with its connection string.

---

## Cost Considerations

### Vercel

- **Hobby (Free)**: 100GB bandwidth, suitable for low traffic
- **Pro ($20/month)**: Higher limits, team features

### Vercel Postgres

- **Free tier**: 256MB storage, 60 compute hours/month
- **Pro**: Higher limits included with Vercel Pro

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
- [ ] Vercel Postgres is in same region as deployment

---

## Quick Reference

| Action | Command/URL |
|--------|-------------|
| Local dev | `npm run dev` |
| Build locally | `npm run build` |
| Run tests | `npm test` |
| Setup admin | `npm run setup-admin` |
| Vercel dashboard | `vercel.com/dashboard` |
| Redeploy | Push to main branch |
| View logs | Vercel Dashboard → Deployments → Functions |
| Pull env vars | `vercel env pull .env.local` |
