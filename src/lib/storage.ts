import {
  Ticket,
  AuditEvent,
  CategoryKey,
  Severity,
  CATEGORY_DEPARTMENT_MAP,
  TicketStatus
} from '../types';

export const STORAGE_KEY_TICKETS = 'civiclens_tickets_v1';
export const STORAGE_KEY_EVENTS = 'civiclens_events_v1';

// BroadcastChannel for instant cross-tab sync
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('civiclens');
  }
} catch {
  // ignore
}

export function notifyChange() {
  try {
    channel?.postMessage({ type: 'UPDATE', timestamp: Date.now() });
  } catch {
    // fallback
  }
}

export function subscribeToChanges(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_TICKETS || e.key === STORAGE_KEY_EVENTS || !e.key) {
      callback();
    }
  };
  const onMessage = () => {
    callback();
  };

  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onMessage);

  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onMessage);
  };
}

/**
 * Generate Tracking code format: "CL-" + 6 random uppercase alphanumerics
 */
export function generateTrackingCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CL-${code}`;
}

/**
 * Priority Score calculation:
 * severity weight (Low 10, Medium 25, High 50, Critical 100)
 * + 10 * ln(1 + report_count - 1)
 * + 0.5 * min(age in hours, 24)
 * + 15 if the sensitive_location flag
 */
export function computePriorityScore(
  severity: Severity,
  reportCount: number,
  createdAt: string,
  hazardFlags: string[] = []
): number {
  const severityWeights: Record<Severity, number> = {
    Low: 10,
    Medium: 25,
    High: 50,
    Critical: 100,
  };
  const baseWeight = severityWeights[severity] || 10;
  
  // 10 * ln(1 + report_count - 1) => 10 * ln(reportCount)
  const countFactor = 10 * Math.log(Math.max(1, reportCount));

  // 0.5 * min(age in hours, 24)
  const ageInHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  const ageFactor = 0.5 * Math.min(ageInHours, 24);

  // + 15 if sensitive_location flag
  const sensitiveBonus = hazardFlags.includes('sensitive_location') ? 15 : 0;

  return Math.round((baseWeight + countFactor + ageFactor + sensitiveBonus) * 10) / 10;
}

/**
 * Haversine formula to compute distance in meters between two lat/lng coordinates.
 */
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Word overlap similarity (Jaccard) on translated text
 */
export function wordOverlapSimilarity(text1: string, text2: string): number {
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'in', 'a', 'an', 'and', 'or', 'for', 'our', 'of', 'to', 'this', 'there', 'are', 'not', 'our']);
  const tokenize = (t: string) => {
    return new Set(
      t.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।॥]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w))
    );
  };
  const set1 = tokenize(text1);
  const set2 = tokenize(text2);
  if (set1.size === 0 || set2.size === 0) return 0;
  let matches = 0;
  for (const w of set1) {
    if (set2.has(w)) matches++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union > 0 ? matches / union : 0;
}

/**
 * Downscale image via client-side canvas
 * Max 800px wide, JPEG quality 0.7
 */
export function downscaleImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxWidth = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Safe localStorage getters and setters wrapped in try/catch
 */
export function getStoredTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error('Error reading tickets from localStorage:', err);
    return [];
  }
}

export function saveStoredTickets(tickets: Ticket[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    notifyChange();
    return true;
  } catch (err: any) {
    console.error('Error saving tickets to localStorage:', err);
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      // Try stripping photo_data_url on the newest tickets to save
      try {
        const withoutPhotos = tickets.map(t => ({ ...t, photo_data_url: null }));
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(withoutPhotos));
        notifyChange();
        return true;
      } catch (inner) {
        console.error('Failed recovery from quota exceeded:', inner);
      }
    }
    return false;
  }
}

export function getStoredEvents(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error('Error reading events from localStorage:', err);
    return [];
  }
}

export function logAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): void {
  try {
    const events = getStoredEvents();
    const newEvent: AuditEvent = {
      ...event,
      id: 'EVT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      created_at: new Date().toISOString(),
    };
    events.unshift(newEvent);
    // Keep last 200 events
    const trimmed = events.slice(0, 200);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(trimmed));
    notifyChange();
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
}

/**
 * Initial 6 realistic sample tickets for Bengaluru
 */
export const SAMPLE_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    tracking_code: 'CL-48291',
    raw_text: 'Live wire snapped and hanging into rainwater puddle near Gandhi Chowk bus stand. Sparks visible.',
    translated_text: 'Live wire snapped and hanging into rainwater puddle near Gandhi Chowk bus stand. Sparks visible.',
    language: 'English',
    lat: 12.9716,
    lng: 77.5946,
    category: 'electricity',
    severity: 'Critical',
    severity_reason: 'Live electrical wire in standing rainwater creates high electrocution risk.',
    department: 'Electricity Department',
    confidence: 0.96,
    priority_score: 115.4,
    status: 'triaged',
    report_count: 3,
    hazard_flags: ['live_wire', 'standing_water'],
    summary: 'Live wire hanging into puddle near Gandhi Chowk',
    parent_ticket_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'TKT-002',
    tracking_code: 'CL-2025-0887',
    raw_text: 'Open manhole right outside the primary school gate. Small children can fall in.',
    translated_text: 'Open manhole right outside the primary school gate. Small children can fall in.',
    language: 'English',
    lat: 12.9850,
    lng: 77.6050,
    category: 'drainage',
    severity: 'High',
    severity_reason: 'Open manhole adjacent to school entrance posing critical fall danger.',
    department: 'Drainage Department',
    confidence: 0.94,
    priority_score: 68.2,
    status: 'triaged',
    report_count: 1,
    hazard_flags: ['open_manhole', 'sensitive_location'],
    summary: 'Open manhole near primary school gate',
    parent_ticket_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'TKT-003',
    tracking_code: 'CL-2025-0882',
    raw_text: 'Main drinking water line burst on 100 Feet Road. Thousands of liters of water wasting.',
    translated_text: 'Main drinking water line burst on 100 Feet Road. Thousands of liters of water wasting.',
    language: 'English',
    lat: 12.9620,
    lng: 77.6380,
    category: 'water',
    severity: 'Medium',
    severity_reason: 'Pressurized water pipe leak causing street flooding and resource loss.',
    department: 'Water Board',
    confidence: 0.92,
    priority_score: 33.5,
    status: 'triaged',
    report_count: 2,
    hazard_flags: [],
    summary: 'Main water pipe leak causing street flooding',
    parent_ticket_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
  {
    id: 'TKT-004',
    tracking_code: 'CL-2025-0839',
    raw_text: 'Huge tree bough collapsed on 4th Main Road, road completely blocked for vehicles.',
    translated_text: 'Huge tree bough collapsed on 4th Main Road, road completely blocked for vehicles.',
    language: 'English',
    lat: 12.9350,
    lng: 77.6150,
    category: 'trees',
    severity: 'High',
    severity_reason: 'Fallen tree obstructing vehicular traffic on main arterial route.',
    department: 'Parks and Trees Department',
    confidence: 0.91,
    priority_score: 52.8,
    status: 'triaged',
    report_count: 1,
    hazard_flags: ['road_blocked'],
    summary: 'Fallen tree branch obstructing road',
    parent_ticket_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: 'TKT-005',
    tracking_code: 'CL-2025-0828',
    raw_text: 'Metallic cylinder making humming noise near bus stop shelter.',
    translated_text: 'Metallic cylinder making humming noise near bus stop shelter.',
    language: 'English',
    lat: 12.9280,
    lng: 77.5830,
    category: 'other',
    severity: 'Low',
    severity_reason: 'Unclear category keywords; requires manual officer review.',
    department: 'General Administration',
    confidence: 0.32,
    priority_score: 11.2,
    status: 'needs_review',
    report_count: 1,
    hazard_flags: [],
    summary: 'Unidentified vibrating metal object near bus shelter',
    parent_ticket_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: 'TKT-006',
    tracking_code: 'CL-2025-0874',
    raw_text: 'Streetlights flickering on 2nd Cross residential lane since yesterday.',
    translated_text: 'Streetlights flickering on 2nd Cross residential lane since yesterday.',
    language: 'English',
    lat: 12.9340,
    lng: 77.6200,
    category: 'electricity',
    severity: 'Low',
    severity_reason: 'Single pole outage reported in residential lane.',
    department: 'Electricity Department',
    confidence: 0.88,
    priority_score: 11.8,
    status: 'triaged',
    report_count: 1,
    hazard_flags: [],
    summary: 'Streetlight flickering on 2nd Cross',
    parent_ticket_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
  },
];

/**
 * Initialize storage with 6 sample tickets if empty
 */
export function initializeStorageIfNeeded(): void {
  try {
    const tickets = getStoredTickets();
    if (tickets.length === 0) {
      saveStoredTickets(SAMPLE_TICKETS);
      SAMPLE_TICKETS.forEach(t => {
        logAuditEvent({
          ticket_id: t.id,
          event_type: 'created',
          old_value: null,
          new_value: `Initial ticket seeded with status ${t.status}`,
          actor: 'System',
        });
      });
    }
  } catch (err) {
    console.error('Failed to initialize sample data:', err);
  }
}

/**
 * Find duplicate parent ticket
 */
export function findDuplicateParent(
  newTicket: Ticket,
  allTickets: Ticket[]
): Ticket | null {
  for (const existing of allTickets) {
    // Parent must be open, have same category, and have parent_ticket_id === null
    if (
      existing.id !== newTicket.id &&
      existing.parent_ticket_id === null &&
      existing.status !== 'resolved' &&
      existing.category === newTicket.category
    ) {
      // 1. If lat/lng exist on both and within 150m
      if (
        newTicket.lat != null &&
        newTicket.lng != null &&
        existing.lat != null &&
        existing.lng != null
      ) {
        const dist = haversineDistanceMeters(
          newTicket.lat,
          newTicket.lng,
          existing.lat,
          existing.lng
        );
        if (dist <= 150) {
          return existing;
        }
      }

      // 2. Otherwise if created within 24h and word overlap > 0.5
      const hoursDiff =
        Math.abs(
          new Date(newTicket.created_at).getTime() -
            new Date(existing.created_at).getTime()
        ) /
        (1000 * 60 * 60);

      if (hoursDiff <= 24) {
        const sim = wordOverlapSimilarity(
          newTicket.translated_text || newTicket.raw_text,
          existing.translated_text || existing.raw_text
        );
        if (sim >= 0.5) {
          return existing;
        }
      }
    }
  }
  return null;
}
