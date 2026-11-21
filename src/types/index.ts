export type CategoryKey = 
  | 'roads'
  | 'waste'
  | 'water'
  | 'electricity'
  | 'trees'
  | 'drainage'
  | 'other';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type TicketStatus = 'received' | 'triaged' | 'needs_review' | 'resolved';

export interface Ticket {
  id: string;
  tracking_code: string;
  raw_text: string;
  translated_text: string;
  language: string;
  photo_data_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  category: CategoryKey;
  severity: Severity;
  severity_reason: string;
  department: string;
  confidence: number;
  priority_score: number;
  status: TicketStatus;
  report_count: number;
  hazard_flags: string[];
  summary: string;
  parent_ticket_id: string | null;
  created_at: string; // ISO string
}

export type AuditActor = 'AI' | 'Officer' | 'System';

export interface AuditEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  old_value?: string | null;
  new_value?: string | null;
  actor: AuditActor;
  created_at: string;
}

export const CATEGORY_DEPARTMENT_MAP: Record<CategoryKey, string> = {
  roads: 'Roads Department',
  waste: 'Sanitation Department',
  water: 'Water Board',
  electricity: 'Electricity Department',
  trees: 'Parks and Trees Department',
  drainage: 'Drainage Department',
  other: 'General Administration',
};

export const CATEGORY_DISPLAY_NAMES: Record<CategoryKey, string> = {
  roads: 'Roads & Pavements',
  waste: 'Sanitation & Waste',
  water: 'Water Supply',
  electricity: 'Electrical Hazard',
  trees: 'Parks & Trees',
  drainage: 'Drainage & Sewage',
  other: 'General Administration',
};

export interface TriageResult {
  language: string;
  translated_text: string;
  category: CategoryKey;
  severity: Severity;
  severity_reason: string;
  hazard_flags: string[];
  confidence: number;
  summary: string;
}
