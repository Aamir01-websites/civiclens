# CivicLens Design Notes

## Route to Screen Mapping

| Design File | Route / View | Description & Viewport |
|-------------|--------------|-------------------------|
| `screen.png` | `/dashboard` (Sign-in state / Modal) | Officer Authentication screen ("GIGW 3.0 Secure Portal"), desktop-first with Karnataka state branding |
| `screen (1).png` | `/dashboard` (Tab: "Priority queue") | Officer Console Priority Queue table view with 4 KPI stat cards, filters, and priority-sorted complaints |
| `screen (2).png` | `/dashboard` (Ticket Detail Panel) | Officer Ticket Inspection & Override view: Evidence photo, bilingual original vs translated text, similar tickets merge strip, audit trail, AI assessment with confidence score, override and resolution controls |
| `screen (3).png` | `/dashboard` (Tab: "Map view") | Officer Geospatial Incident Map with severity pins, SLA targets, interactive pin inspection popup |
| `screen (4).png` | `/dashboard` (Tab: "Needs review") | Officer Human-in-the-Loop Triage Queue for low confidence / ambiguous complaints with AI suggestion badges and review triggers |
| `screen (5).png` | `/confirmation/:code` | Citizen Complaint Confirmation screen: tracking ID badge, copy/share actions, AI classification breakdown, routed department, GPS tag, and track CTA (mobile-first) |
| `screen (6).png` | `/report` (and `/` redirect) | Citizen 60-Second Civic Report submission: multilingual selector, issue textarea, photo proof upload with client-side canvas downscaler, GPS locator, urgency level cards, submit action (mobile-first) |
| `screen (7).png` | `/track` | Citizen Tracking screen: tracking code search, recent search pills, issue breakdown, resolution progress timeline (Received -> Triaged -> Assigned -> Resolved), SMS/WhatsApp alert opt-in (mobile-first) |

---

## Extracted Design Tokens & Color Palette

### 1. Brand & Government Identity
- **Karnataka / Tricolor Top Accent**:
  - Saffron: `#F97316` / `#EA580C`
  - White: `#FFFFFF`
  - Indian Emerald Green: `#15803D`
- **Government Portal Blue (Primary Brand)**:
  - Deep Navy (Sidebar & Footers): `#0B2545` (`rgb(11, 37, 69)`)
  - Sub-navigation Hover / Selected: `#14365D`
  - Primary Action Blue: `#1D4ED8` (`#2563EB`)
  - Light Brand Tint (Badges & Highlights): `#EFF6FF` / `#DBEAFE`
  - Footer Darkest Blue: `#06172A`

### 2. Severity Palette
- **Critical**:
  - Badge Background: `#DC2626` (Red-600) with white text
  - Soft Container / Row Tint: `#FEF2F2` (Red-50)
  - Border / Accent: `#EF4444`
- **High**:
  - Badge Background: `#C2410C` (Orange-700) or `#EA580C`
  - Soft Container / Accent: `#FFF7ED`
- **Medium**:
  - Badge Background: `#D97706` (Amber-600)
  - Soft Container: `#FEF3C7` (Amber-100)
- **Low**:
  - Badge Background: `#15803D` (Green-700)
  - Soft Container: `#F0FDF4` (Green-50)

### 3. Status Badges
- **Triaged**: Solid Royal Blue `#1D4ED8` (`text-white`)
- **Assigned / In Field**: Dark Slate Indigo `#1E293B` or `#312E81` (`text-white`)
- **Received**: Muted Slate `#64748B` (`bg-slate-100 text-slate-700`)
- **Resolved**: Emerald Green `#16A34A` (`bg-emerald-600 text-white`)
- **Needs Review**: Amber / Warm Gold `#D97706` (`bg-amber-100 text-amber-900`)

### 4. Backgrounds & Surfaces
- **Citizen Background**: `#F8FAFC` (Slate-50) with clean white cards (`#FFFFFF`)
- **Officer Background**: `#F1F5F9` (Slate-100)
- **Card Borders**: `#E2E8F0` (Slate-200)
- **Text Primary**: `#0F172A` (Slate-900)
- **Text Secondary / Muted**: `#475569` (Slate-600) / `#64748B` (Slate-500)
- **Border Radius**:
  - Cards: `rounded-2xl` (`16px`) and `rounded-3xl` (`24px`) on citizen mobile view
  - Inputs & Buttons: `rounded-xl` (`12px`) / `rounded-lg` (`8px`)
  - Chips / Pills: `rounded-full` (`9999px`)

### 5. Typography
- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)
- **Tracking Code Style**: Monospace tracking, uppercase, high contrast (`tracking-wider font-mono font-bold`)
