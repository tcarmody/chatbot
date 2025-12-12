# HubSpot Ticket Integration Setup

This guide explains how to configure the HubSpot integration for support ticket management.

## Prerequisites

- A HubSpot account (Free, Starter, Professional, or Enterprise)
- Access to HubSpot Settings (Admin permissions)

## Step 1: Create a Private App

1. Log in to your HubSpot account
2. Navigate to **Settings** (gear icon in the top navigation)
3. In the left sidebar, go to **Integrations > Private Apps**
4. Click **Create a private app**
5. Fill in the basic info:
   - **Name**: e.g., "Support Chatbot"
   - **Description**: e.g., "Integration for support ticket management"
6. Go to the **Scopes** tab
7. Under **CRM**, find and enable:
   - `tickets` - Read and Write access
8. Click **Create app**
9. Copy the **Access Token** - you'll need this for configuration

## Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Required: Your HubSpot private app access token
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Step 3: Configure Pipeline Stages (Optional)

By default, the integration uses stage IDs 1-4. If your HubSpot pipeline uses different IDs:

1. In HubSpot, go to **Settings > Objects > Tickets > Pipelines**
2. Click on your pipeline
3. Click on each stage to view its internal ID in the URL
4. Update your `.env.local`:

```bash
HUBSPOT_PIPELINE_ID=0           # Your pipeline ID (optional)
HUBSPOT_STAGE_OPEN=1            # "New" or "Open" stage ID
HUBSPOT_STAGE_IN_PROGRESS=2     # "In Progress" stage ID
HUBSPOT_STAGE_RESOLVED=3        # "Resolved" stage ID
HUBSPOT_STAGE_CLOSED=4          # "Closed" stage ID
```

## Step 4: Create Custom Properties (Recommended)

To store additional ticket metadata, create these custom properties in HubSpot:

1. Go to **Settings > Properties**
2. Select **Ticket properties**
3. Click **Create property** for each:

| Property Name | Label | Field Type |
|--------------|-------|------------|
| `user_email` | User Email | Single-line text |
| `user_name` | User Name | Single-line text |
| `category` | Category | Single-line text |
| `conversation_context` | Conversation Context | Multi-line text |

Without these custom properties, the integration will still work, but this metadata won't be stored in HubSpot.

## How It Works

### Ticket Creation
When a user submits a support ticket:
1. The ticket is created in HubSpot via the CRM API
2. The HubSpot ticket ID becomes the ticket number

### Ticket Retrieval
- Tickets are fetched directly from HubSpot
- Search by email uses HubSpot's search API
- Admin dashboard shows all tickets from HubSpot

### Status Updates
- Status changes update the HubSpot pipeline stage
- You can configure HubSpot workflows to send email notifications on status changes

## API Endpoints

The following endpoints interact with HubSpot:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tickets` | POST | Create a new ticket |
| `/api/tickets` | GET | Get ticket(s) by ID or email |
| `/api/admin/tickets` | GET | List all tickets (admin) |
| `/api/admin/tickets` | PATCH | Update ticket status |

## Troubleshooting

### "HUBSPOT_ACCESS_TOKEN environment variable is not set"
Ensure your `.env.local` file contains a valid `HUBSPOT_ACCESS_TOKEN`.

### "HubSpot API error: 401 Unauthorized"
Your access token may be invalid or expired. Generate a new one from the Private Apps settings.

### "HubSpot API error: 403 Forbidden"
Your private app may not have the required `tickets` scope. Edit the app and add the scope.

### Tickets not appearing in HubSpot
- Check the HubSpot Activity Feed for errors
- Verify the pipeline ID matches your HubSpot setup
- Ensure custom properties exist if you're using them

### Status updates not working
Verify that your `HUBSPOT_STAGE_*` environment variables match the actual stage IDs in your HubSpot pipeline.

## Rate Limits

HubSpot API has rate limits:
- **Private apps**: 100 requests per 10 seconds
- **Daily limit**: Varies by subscription tier

The integration handles standard usage well within these limits.

## Security Notes

- Never commit your `HUBSPOT_ACCESS_TOKEN` to version control
- Use environment variables for all sensitive configuration
- The access token has full read/write access to tickets - keep it secure
