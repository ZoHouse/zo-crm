# Lead Management System - Comprehensive Specification

## Overview

Lead Management is a **kanban-style pipeline view** of the Contacts database. Leads are NOT a separate entity - they ARE contacts filtered by `relationship_stage`. This ensures data consistency and eliminates duplication.

## Core Architecture

### Data Model

```
contacts table (existing)
├── id                    - Primary key
├── first_name, last_name - Name fields
├── email                 - Required, unique identifier
├── phone                 - Contact phone
├── company               - Company name
├── job_title             - Role/position
├── relationship_stage    - Pipeline stage (lead, contact, engaged, partner, vip, inactive)
├── lead_score            - 0-100 scoring
├── source                - Where they came from (luma, manual, csv, referral, website)
├── source_detail         - Specific event/campaign
├── notes                 - Quick notes
├── tags                  - JSON array of tags
├── created_at            - When added
├── updated_at            - Last modified
└── ...other fields
```

### Pipeline Stages

| Stage | Description | Typical Actions |
|-------|-------------|-----------------|
| `lead` | New/Unqualified | Initial outreach, qualification |
| `contact` | Contacted/Qualified | Follow-up, nurturing |
| `engaged` | Active conversation | Demos, proposals, negotiations |
| `partner` | Converted/Customer | Onboarding, relationship building |
| `vip` | High-value relationship | Priority support, upsells |
| `inactive` | Cold/Lost | Re-engagement campaigns |

---

## Features Specification

### 1. Kanban Board

#### 1.1 Column Display
- [x] Show all 6 stages as columns
- [x] Column header with stage name, color indicator, count
- [x] Scrollable card list within each column
- [ ] Collapsible columns
- [ ] Column reordering (future)

#### 1.2 Drag & Drop
- [x] Drag cards between columns
- [x] Visual feedback during drag (overlay, highlight)
- [x] Optimistic UI update
- [x] API persistence on drop
- [ ] Reorder within column (priority sorting)
- [ ] Multi-select drag

---

### 2. Lead Cards

#### 2.1 Card Display
- [x] Avatar with initials
- [x] Full name (linked to contact detail)
- [x] Job title
- [x] Company
- [x] Email
- [x] Lead score (if > 0)
- [x] Source badge
- [x] Last updated date
- [ ] Phone number (optional display)
- [ ] Tags display
- [ ] Days in stage indicator

#### 2.2 Card Actions (NEW)
- [ ] **Edit button** - Opens edit modal with all fields
- [ ] **Delete button** - Removes lead with confirmation
- [ ] **Quick actions menu** (three dots):
  - [ ] Add note
  - [ ] Change stage (dropdown)
  - [ ] Adjust lead score
  - [ ] Copy email
  - [ ] View full contact

#### 2.3 Card Click Behavior
- [x] Click name → Navigate to contact detail page
- [ ] Click elsewhere → Expand card inline OR open quick view modal

---

### 3. Create Lead

#### 3.1 Add Lead Modal (Enhanced)
- [x] First name, Last name
- [x] Email (required)
- [x] Company
- [x] Job title
- [x] Phone
- [x] Assigned to stage
- [ ] **Link to existing contact** (search/select)
- [ ] Source selection dropdown
- [ ] Initial lead score
- [ ] Tags input
- [ ] Notes field
- [ ] Create & Add Another option

#### 3.2 Duplicate Detection
- [ ] Check if email already exists
- [ ] Warn user and offer to:
  - View existing contact
  - Update existing contact's stage
  - Create anyway (if different person)

---

### 4. Edit Lead

#### 4.1 Edit Modal
- [ ] All contact fields editable
- [ ] Stage selector (with visual pipeline)
- [ ] Lead score slider (0-100)
- [ ] Source & source detail
- [ ] Tags management (add/remove)
- [ ] Notes editor (rich text or markdown)
- [ ] Save / Cancel buttons
- [ ] Delete option (with confirmation)

#### 4.2 Inline Quick Edit
- [ ] Double-click field to edit
- [ ] Quick stage change dropdown
- [ ] Quick score adjustment

---

### 5. Delete Lead

#### 5.1 Single Delete
- [ ] Delete button on card hover/menu
- [ ] Confirmation modal: "Delete [Name]? This will remove the contact entirely."
- [ ] Option to "Move to Inactive" instead of delete
- [ ] Undo option (5 second window)

#### 5.2 Bulk Delete
- [x] Clear All button (deletes everything)
- [ ] Multi-select cards with checkboxes
- [ ] "Delete Selected" action
- [ ] Batch delete with progress indicator

---

### 6. Search & Filter

#### 6.1 Global Search
- [ ] Search bar above kanban board
- [ ] Search by name, email, company
- [ ] Results highlight matching cards
- [ ] Filter columns to show only matches

#### 6.2 Filters Panel
- [ ] Filter by source (luma, manual, etc.)
- [ ] Filter by lead score range
- [ ] Filter by date added
- [ ] Filter by tags
- [ ] Filter by company
- [ ] Save filter presets

#### 6.3 Sorting
- [ ] Sort within columns by:
  - Lead score (high to low)
  - Date added (newest/oldest)
  - Last updated
  - Alphabetical

---

### 7. Lead Scoring

#### 7.1 Manual Scoring
- [ ] Score slider in edit modal (0-100)
- [ ] Quick +/- buttons on card
- [ ] Score badges: Hot (80+), Warm (50-79), Cold (<50)

#### 7.2 Auto-Scoring (Future)
- [ ] Points for email engagement
- [ ] Points for event attendance
- [ ] Points for activity recency
- [ ] Decay for inactivity

---

### 8. Activity & Notes

#### 8.1 Quick Notes
- [ ] Add note from card menu
- [ ] Note appears in activity timeline
- [ ] Pin important notes

#### 8.2 Activity Timeline (on card expand/detail)
- [ ] Stage changes
- [ ] Notes added
- [ ] Score changes
- [ ] Emails sent (if integrated)
- [ ] Events attended

---

### 9. Bulk Operations

- [ ] Select multiple cards (Ctrl/Cmd + Click)
- [ ] Select all in column
- [ ] Bulk actions:
  - [ ] Move to stage
  - [ ] Delete selected
  - [ ] Add tag
  - [ ] Export selected

---

### 10. Analytics Dashboard (Future)

- [ ] Conversion funnel visualization
- [ ] Leads by source pie chart
- [ ] Average time in each stage
- [ ] Lead score distribution
- [ ] Weekly/monthly new leads trend

---

## API Endpoints

### Existing
- `GET /api/leads` - Fetch all leads (via page.tsx server component)
- `POST /api/leads` - Create new lead
- `PATCH /api/leads/[id]/stage` - Update lead stage
- `DELETE /api/leads/clear` - Clear all leads

### Needed
- `PATCH /api/leads/[id]` - Update lead (all fields)
- `DELETE /api/leads/[id]` - Delete single lead
- `GET /api/leads/search?q=` - Search leads
- `POST /api/leads/bulk` - Bulk operations
- `GET /api/contacts/search?q=` - Search existing contacts (for linking)

---

## UI Components Needed

### New Components
1. `LeadCardMenu` - Dropdown menu with actions
2. `EditLeadModal` - Full edit form
3. `DeleteConfirmModal` - Single delete confirmation
4. `SearchBar` - Global search input
5. `FilterPanel` - Filter controls
6. `ContactPicker` - Search & select existing contact
7. `ScoreSlider` - Lead score input
8. `TagInput` - Tag management

### Enhanced Components
1. `KanbanCard` - Add menu button, edit/delete actions
2. `AddLeadModal` - Add contact linking, more fields
3. `KanbanColumn` - Add sorting controls

---

## Implementation Priority

### Phase 1 (Current Sprint)
1. ✅ Basic kanban board
2. ✅ Drag & drop stages
3. ✅ Add lead modal
4. ✅ Clear all leads
5. 🔲 **Edit lead modal**
6. 🔲 **Delete single lead**
7. 🔲 **Card action menu**

### Phase 2
1. 🔲 Search functionality
2. 🔲 Filter by source
3. 🔲 Link to existing contact
4. 🔲 Duplicate detection
5. 🔲 Lead score editing

### Phase 3
1. 🔲 Activity timeline
2. 🔲 Quick notes
3. 🔲 Bulk operations
4. 🔲 Tags support

### Phase 4
1. 🔲 Analytics dashboard
2. 🔲 Auto-scoring
3. 🔲 Custom stages
4. 🔲 Email integration

---

## Relationship with Contacts

### Key Principle
> A Lead IS a Contact. The Lead Management board is a **filtered view** of contacts where we focus on pipeline progression.

### Sync Behavior
- Creating a lead → Creates a contact
- Editing a lead → Edits the contact
- Deleting a lead → Deletes the contact
- Contact stage change → Reflects in kanban
- Contact edit → Reflects in kanban card

### Navigation
- Clicking lead card → `/contacts/[id]` (full contact detail)
- Contact detail shows current stage
- Can change stage from contact detail page

---

## Technical Notes

### Performance
- Virtualize long lists (>50 cards per column)
- Paginate initial load if >500 total leads
- Debounce search input
- Optimistic updates for drag & drop

### State Management
- Local state for UI (drag state, modals)
- Server state via fetch + revalidation
- Consider React Query for caching (future)

### Accessibility
- Keyboard navigation for kanban
- Screen reader announcements for drag & drop
- Focus management in modals
