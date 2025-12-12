// HubSpot API Client for Ticket Management

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

interface HubSpotTicketProperties {
  subject: string;
  content?: string;
  hs_pipeline_stage: string;
  hs_pipeline?: string;
  hs_ticket_priority?: string;
  // Custom properties - these need to be created in HubSpot first
  user_email?: string;
  user_name?: string;
  category?: string;
  conversation_context?: string;
}

interface HubSpotTicketResponse {
  id: string;
  properties: {
    subject: string;
    content?: string;
    hs_pipeline_stage: string;
    hs_pipeline?: string;
    hs_ticket_priority?: string;
    hs_object_id: string;
    hs_ticket_id?: string;
    createdate: string;
    hs_lastmodifieddate: string;
    user_email?: string;
    user_name?: string;
    category?: string;
    conversation_context?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}

interface HubSpotSearchResponse {
  total: number;
  results: HubSpotTicketResponse[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

// HubSpot pipeline stage IDs - these are the default stages
// You may need to update these based on your HubSpot configuration
// Get your pipeline stages from: HubSpot Settings > Objects > Tickets > Pipelines
export const HUBSPOT_PIPELINE_STAGES = {
  open: process.env.HUBSPOT_STAGE_OPEN || '1', // "New" or "Open" stage
  in_progress: process.env.HUBSPOT_STAGE_IN_PROGRESS || '2', // "In Progress" stage
  resolved: process.env.HUBSPOT_STAGE_RESOLVED || '3', // "Resolved" stage
  closed: process.env.HUBSPOT_STAGE_CLOSED || '4', // "Closed" stage
} as const;

// Map HubSpot stage IDs back to our status strings
export function mapStageToStatus(stageId: string): 'open' | 'in_progress' | 'resolved' | 'closed' {
  const stageMap: Record<string, 'open' | 'in_progress' | 'resolved' | 'closed'> = {
    [HUBSPOT_PIPELINE_STAGES.open]: 'open',
    [HUBSPOT_PIPELINE_STAGES.in_progress]: 'in_progress',
    [HUBSPOT_PIPELINE_STAGES.resolved]: 'resolved',
    [HUBSPOT_PIPELINE_STAGES.closed]: 'closed',
  };
  return stageMap[stageId] || 'open';
}

// HubSpot priority mapping
export const HUBSPOT_PRIORITY_MAP = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
} as const;

export function mapPriorityFromHubSpot(priority: string | undefined): 'low' | 'medium' | 'high' {
  const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
    'LOW': 'low',
    'MEDIUM': 'medium',
    'HIGH': 'high',
  };
  return priorityMap[priority || ''] || 'medium';
}

function getAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is not set');
  }
  return token;
}

async function hubspotRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  const accessToken = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('HubSpot API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
  }

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Create a new ticket in HubSpot
export async function createHubSpotTicket(ticket: {
  user_email: string;
  user_name?: string;
  subject: string;
  description: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  conversation_context?: string;
}): Promise<{ ticketId: string; properties: HubSpotTicketResponse['properties'] }> {
  const properties: HubSpotTicketProperties = {
    subject: ticket.subject,
    content: ticket.description,
    hs_pipeline_stage: HUBSPOT_PIPELINE_STAGES[ticket.status || 'open'],
    hs_ticket_priority: HUBSPOT_PRIORITY_MAP[ticket.priority || 'medium'],
    user_email: ticket.user_email,
    user_name: ticket.user_name,
    category: ticket.category,
    conversation_context: ticket.conversation_context,
  };

  // Add pipeline if configured
  if (process.env.HUBSPOT_PIPELINE_ID) {
    properties.hs_pipeline = process.env.HUBSPOT_PIPELINE_ID;
  }

  const response = await hubspotRequest<HubSpotTicketResponse>(
    '/crm/v3/objects/tickets',
    {
      method: 'POST',
      body: JSON.stringify({ properties }),
    }
  );

  return {
    ticketId: response.id,
    properties: response.properties,
  };
}

// Get a ticket by ID
export async function getHubSpotTicket(ticketId: string): Promise<HubSpotTicketResponse | null> {
  try {
    const properties = [
      'subject',
      'content',
      'hs_pipeline_stage',
      'hs_pipeline',
      'hs_ticket_priority',
      'createdate',
      'hs_lastmodifieddate',
      'user_email',
      'user_name',
      'category',
      'conversation_context',
    ].join(',');

    const response = await hubspotRequest<HubSpotTicketResponse>(
      `/crm/v3/objects/tickets/${ticketId}?properties=${properties}`
    );

    return response;
  } catch (error) {
    console.error('Error fetching HubSpot ticket:', error);
    return null;
  }
}

// Search tickets by email
export async function searchHubSpotTicketsByEmail(email: string): Promise<HubSpotTicketResponse[]> {
  try {
    const response = await hubspotRequest<HubSpotSearchResponse>(
      '/crm/v3/objects/tickets/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'user_email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: [
            'subject',
            'content',
            'hs_pipeline_stage',
            'hs_pipeline',
            'hs_ticket_priority',
            'createdate',
            'hs_lastmodifieddate',
            'user_email',
            'user_name',
            'category',
            'conversation_context',
          ],
          sorts: [
            {
              propertyName: 'createdate',
              direction: 'DESCENDING',
            },
          ],
          limit: 100,
        }),
      }
    );

    return response.results;
  } catch (error) {
    console.error('Error searching HubSpot tickets:', error);
    return [];
  }
}

// Get all tickets with optional filters
export async function getAllHubSpotTickets(filters?: {
  status?: string;
  priority?: string;
  limit?: number;
  after?: string;
}): Promise<{ tickets: HubSpotTicketResponse[]; total: number; after?: string }> {
  try {
    const filterGroups: any[] = [];

    if (filters?.status) {
      const stageId = HUBSPOT_PIPELINE_STAGES[filters.status as keyof typeof HUBSPOT_PIPELINE_STAGES];
      if (stageId) {
        filterGroups.push({
          filters: [
            {
              propertyName: 'hs_pipeline_stage',
              operator: 'EQ',
              value: stageId,
            },
          ],
        });
      }
    }

    if (filters?.priority) {
      const hubspotPriority = HUBSPOT_PRIORITY_MAP[filters.priority as keyof typeof HUBSPOT_PRIORITY_MAP];
      if (hubspotPriority) {
        if (filterGroups.length > 0) {
          filterGroups[0].filters.push({
            propertyName: 'hs_ticket_priority',
            operator: 'EQ',
            value: hubspotPriority,
          });
        } else {
          filterGroups.push({
            filters: [
              {
                propertyName: 'hs_ticket_priority',
                operator: 'EQ',
                value: hubspotPriority,
              },
            ],
          });
        }
      }
    }

    const body: any = {
      properties: [
        'subject',
        'content',
        'hs_pipeline_stage',
        'hs_pipeline',
        'hs_ticket_priority',
        'createdate',
        'hs_lastmodifieddate',
        'user_email',
        'user_name',
        'category',
        'conversation_context',
      ],
      sorts: [
        {
          propertyName: 'createdate',
          direction: 'DESCENDING',
        },
      ],
      limit: filters?.limit || 50,
    };

    if (filterGroups.length > 0) {
      body.filterGroups = filterGroups;
    }

    if (filters?.after) {
      body.after = filters.after;
    }

    const response = await hubspotRequest<HubSpotSearchResponse>(
      '/crm/v3/objects/tickets/search',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return {
      tickets: response.results,
      total: response.total,
      after: response.paging?.next?.after,
    };
  } catch (error) {
    console.error('Error fetching all HubSpot tickets:', error);
    return { tickets: [], total: 0 };
  }
}

// Update ticket status
export async function updateHubSpotTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<boolean> {
  try {
    await hubspotRequest<HubSpotTicketResponse>(
      `/crm/v3/objects/tickets/${ticketId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          properties: {
            hs_pipeline_stage: HUBSPOT_PIPELINE_STAGES[status],
          },
        }),
      }
    );

    return true;
  } catch (error) {
    console.error('Error updating HubSpot ticket status:', error);
    return false;
  }
}

// Delete a ticket (moves to recycling bin in HubSpot)
export async function deleteHubSpotTicket(ticketId: string): Promise<boolean> {
  try {
    await hubspotRequest<void>(
      `/crm/v3/objects/tickets/${ticketId}`,
      {
        method: 'DELETE',
      }
    );

    return true;
  } catch (error) {
    console.error('Error deleting HubSpot ticket:', error);
    return false;
  }
}

// Get ticket statistics by aggregating data
export async function getHubSpotTicketStats(): Promise<{
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  by_priority: { low: number; medium: number; high: number };
}> {
  try {
    // Fetch all tickets to calculate stats
    // Note: For large volumes, you might want to use HubSpot's analytics API instead
    const allTickets = await getAllHubSpotTickets({ limit: 100 });

    const stats = {
      total: allTickets.total,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      by_priority: { low: 0, medium: 0, high: 0 },
    };

    for (const ticket of allTickets.tickets) {
      const status = mapStageToStatus(ticket.properties.hs_pipeline_stage);
      stats[status]++;

      const priority = mapPriorityFromHubSpot(ticket.properties.hs_ticket_priority);
      stats.by_priority[priority]++;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching HubSpot ticket stats:', error);
    return {
      total: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      by_priority: { low: 0, medium: 0, high: 0 },
    };
  }
}
