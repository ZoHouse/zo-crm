# Event Creation Feature - Product Feature Document

## Overview

This document outlines the Event Creation feature for the Zohm CRM platform, enabling users to create, manage, and organize events at Zo House locations with integrated place discovery and tagging capabilities inspired by Nomadtable.

**Feature URL**: https://zohm.vercel.app/events
**Target Release**: Q1 2026
**Related Branch**: `claude/add-event-creation-feature-FwG7h`

---

## 1. Feature Summary

The Event Creation feature allows Zo House operators and community managers to:
- Create and manage events at different Zo House locations (nodes)
- Associate events with specific venues/places with tag-based discovery
- Track event bookings and attendees
- Manage event visibility and status
- Provide detailed event information including timing, location, and descriptions

---

## 2. User Stories

### Primary User Stories

**As a Zo House operator**, I want to:
- Create events for my specific location (node)
- Set event details including name, description, dates, and location
- Mark events as active/inactive to control visibility
- Upload cover images to promote events
- Add custom questions for event registration

**As a community member**, I want to:
- Browse events by location/node
- Filter events by category and tags
- See upcoming events at different Zo House locations
- Register for events with custom registration questions

**As a community manager**, I want to:
- Track which events are hosted by which operators
- See event attendance across different nodes
- Manage event categories for better organization
- Find suitable places/venues using tag-based search

---

## 3. Feature Requirements

### 3.1 Core Fields (from UI Screenshots)

#### Booking Information Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Event Name** | Text Input | Yes | Name of the event (max 200 chars) |
| **Hosted By** | Dropdown | No | Select from list of hosts/operators |
| **Operator** | Dropdown | Yes | Event operator responsible for the event |
| **Node** | Dropdown | Yes | Zo House location (Koramangala, Whitefield, etc.) |
| **Category** | Dropdown | Yes | Event category (Workshop, Networking, Social, etc.) |
| **About Event** | Rich Text Area | Yes | Detailed event description with character counter |
| **Starts At** | DateTime Picker | Yes | Event start date and time |
| **Ends At** | DateTime Picker | Yes | Event end date and time |
| **Location** | Text Input / Place Picker | No | Specific venue or room within the node |
| **Status** | Radio Button | Yes | Active/Inactive (default: Inactive) |

#### Cover Image Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Cover Image** | File Upload | No | Event banner image (16:9 aspect ratio required) |

#### Additional Features

- **Add Questions** button: Opens modal to create custom registration questions
- Form validation with inline error messages (red borders and text)
- Character counter for description field (visible at bottom right)
- Auto-save draft functionality

### 3.2 Validation Rules

1. **Event Name**:
   - Required, min 3 characters, max 200 characters
   - No special characters except: `-`, `&`, `'`, `.`

2. **Operator**:
   - Required field
   - Must be valid operator from system

3. **Category**:
   - Required field
   - Must select from predefined categories

4. **Dates**:
   - Start date must be in the future (or within 1 hour for immediate events)
   - End date must be after start date
   - Both required

5. **Cover Image**:
   - Must be 16:9 aspect ratio
   - Max file size: 5MB
   - Supported formats: JPG, PNG, WebP

6. **Description**:
   - Max 5000 characters
   - HTML/rich text formatting supported

### 3.3 Place Discovery Integration (Nomadtable-inspired)

To support location selection, implement tag-based place discovery:

```typescript
interface Place {
  id: string
  name: string
  node: string // Zo House location
  type: 'event_space' | 'coworking' | 'meeting_room' | 'outdoor' | 'cafe'
  capacity: number
  tags: string[] // e.g., ['projector', 'whiteboard', 'catering', 'wifi']
  amenities: string[]
  photos: string[]
  pricePerHour?: number
  availability: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}
```

**Tag Categories**:
- **Equipment**: projector, sound-system, microphone, whiteboard, tv-screen
- **Amenities**: wifi, ac, catering, parking, wheelchair-accessible
- **Atmosphere**: quiet, collaborative, outdoor, natural-light
- **Size**: intimate (< 10), small (10-25), medium (25-50), large (50+)

---

## 4. Data Model

### 4.1 Database Schema

#### Events Table

```typescript
interface Event {
  // Primary
  id: string // UUID
  eventName: string
  slug: string // URL-friendly version

  // Ownership & Organization
  hostedBy?: string // User ID or name
  operator: string // Required - operator user ID
  node: string // Required - Zo House location
  category: string // Required - event category

  // Details
  description: string // Rich text
  location?: string // Specific venue/room
  coverImage?: string // URL to uploaded image

  // Timing
  startsAt: Date
  endsAt: Date
  timezone: string // Default: 'Asia/Kolkata'

  // Status & Visibility
  status: 'active' | 'inactive' | 'draft' | 'cancelled'
  visibility: 'public' | 'private' | 'members_only'

  // Capacity & Registration
  maxCapacity?: number
  registrationRequired: boolean
  registrationDeadline?: Date

  // Tracking
  viewCount: number
  registrationCount: number
  checkedInCount: number

  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string // User ID
  tags: string[] // Array of tags for filtering
}
```

#### Event Categories Table

```typescript
interface EventCategory {
  id: string
  name: string // 'Workshop', 'Networking', 'Social', 'Hackathon'
  slug: string
  icon?: string
  color?: string // Hex color for UI
  description?: string
  active: boolean
}
```

#### Event Questions Table (for custom registration)

```typescript
interface EventQuestion {
  id: string
  eventId: string // FK to events
  question: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox'
  options?: string[] // For select/multiselect
  required: boolean
  order: number
}
```

#### Places Table (for location discovery)

```typescript
interface Place {
  id: string
  name: string
  node: string // FK to nodes/locations
  type: string
  capacity: number
  description?: string
  tags: string[]
  amenities: string[]
  photos: string[]
  pricePerHour?: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 4.2 Database Migrations

Required migrations:
1. Create `events` table
2. Create `event_categories` table
3. Create `event_questions` table
4. Create `places` table
5. Create `event_registrations` table
6. Add indexes for performance

---

## 5. Technical Specifications

### 5.1 Tech Stack

- **Frontend**: Next.js 15.1, React 19, TypeScript
- **Styling**: TailwindCSS 4.0
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage for cover images
- **Icons**: Lucide React

### 5.2 API Endpoints

#### Create Event
```
POST /api/events
Body: EventCreateInput
Returns: Event
```

#### Update Event
```
PATCH /api/events/:id
Body: Partial<EventCreateInput>
Returns: Event
```

#### Get Events (List with filters)
```
GET /api/events?node=koramangala&category=workshop&status=active
Returns: Event[]
```

#### Get Event (Single)
```
GET /api/events/:id
Returns: Event
```

#### Delete Event
```
DELETE /api/events/:id
Returns: { success: boolean }
```

#### Upload Cover Image
```
POST /api/events/:id/cover-image
Body: FormData with image file
Returns: { url: string }
```

#### Add Custom Questions
```
POST /api/events/:id/questions
Body: EventQuestion[]
Returns: EventQuestion[]
```

### 5.3 Component Structure

```
/apps/web/src/app/(dashboard)/events/
├── page.tsx                    # Events list page
├── create/
│   └── page.tsx               # Create event page
├── [id]/
│   ├── page.tsx               # Event detail page
│   └── edit/
│       └── page.tsx           # Edit event page
└── components/
    ├── EventForm.tsx          # Main form component
    ├── EventCard.tsx          # Event card for list view
    ├── CoverImageUpload.tsx   # Image upload component
    ├── DateTimePicker.tsx     # Date/time selection
    ├── PlacePicker.tsx        # Place selection with tag filters
    └── QuestionBuilder.tsx    # Custom question builder
```

---

## 6. UI/UX Specifications

### 6.1 Create Event Page Layout

**Header**:
- Title: "Create Event" (dark background)
- Close button (X) on left
- "Add Questions" button on right (yellow/green)

**Main Content** (2-column layout):

**Left Column - Booking Info** (~60% width):
- Event Name input
- Hosted By dropdown
- Operator dropdown (required)
- Node dropdown (required)
- Status radio (Inactive/Active)
- Category dropdown (required)
- About Event textarea (rich text)
- Starts At datepicker
- Ends At datepicker
- Location input/picker

**Right Column - Cover Image** (~40% width):
- Image upload area with dashed border
- Upload icon
- "Upload Image" text
- "Must be in Ratio 16:9" helper text
- Image preview when uploaded

### 6.2 Form States

**Default State**:
- All fields empty/unselected
- Status defaulted to "Inactive"
- Cover image showing upload placeholder

**Validation Error State**:
- Red border around invalid fields
- Error message below field in red text
- "This field is required" message

**Loading State**:
- Disable form during submission
- Show loading spinner on submit button
- Prevent duplicate submissions

**Success State**:
- Toast notification: "Event created successfully"
- Redirect to event detail page

### 6.3 Design Tokens

**Colors** (based on screenshot):
- Background: `#1a1a1a` (dark)
- Input background: `#2a2a2a`
- Input border: `#3a3a3a`
- Error border: `#dc2626` (red)
- Error text: `#dc2626`
- Primary button: `#c4f547` (yellow-green)
- Text primary: `#ffffff`
- Text secondary: `#9ca3af`

**Typography**:
- Form labels: 14px, semi-bold
- Input text: 16px, regular
- Error text: 13px, regular
- Button text: 15px, medium

**Spacing**:
- Form field gap: 24px
- Label to input gap: 8px
- Section gap: 32px

---

## 7. Implementation Plan

### Phase 1: Database & Backend (Week 1)
- [ ] Create database migrations for events, categories, places
- [ ] Set up Supabase tables and RLS policies
- [ ] Create API routes for CRUD operations
- [ ] Implement cover image upload to Supabase Storage
- [ ] Add validation schemas with Zod

### Phase 2: Core UI Components (Week 2)
- [ ] Build EventForm component with all fields
- [ ] Create CoverImageUpload component
- [ ] Build DateTimePicker component
- [ ] Implement form validation with error states
- [ ] Add dropdown components for operator, node, category

### Phase 3: Place Discovery (Week 3)
- [ ] Create places database and seed data
- [ ] Build PlacePicker component with tag filtering
- [ ] Implement tag-based search functionality
- [ ] Add place cards with photos and amenities
- [ ] Integrate place selection into event form

### Phase 4: Events List & Detail (Week 4)
- [ ] Build events list page with filters
- [ ] Create event card component
- [ ] Build event detail page
- [ ] Add event edit functionality
- [ ] Implement event deletion

### Phase 5: Custom Questions (Week 5)
- [ ] Build QuestionBuilder component
- [ ] Create question type templates
- [ ] Implement question ordering (drag-drop)
- [ ] Add question preview
- [ ] Save questions to database

### Phase 6: Testing & Polish (Week 6)
- [ ] End-to-end testing of event creation flow
- [ ] Form validation edge cases
- [ ] Responsive design for mobile
- [ ] Performance optimization
- [ ] Documentation and user guide

---

## 8. Success Metrics

### Key Performance Indicators (KPIs)

1. **Adoption Rate**:
   - Target: 80% of operators create at least 1 event in first month
   - Measure: Events created per operator per month

2. **Event Quality**:
   - Target: 90% of events have cover images
   - Target: 70% of events have custom questions
   - Measure: Completeness score

3. **User Engagement**:
   - Target: 100+ event views per event (average)
   - Target: 30% registration-to-view conversion rate
   - Measure: View count and registration count

4. **System Performance**:
   - Target: Event creation < 2 seconds
   - Target: Page load time < 1 second
   - Measure: Performance monitoring

### User Feedback Metrics

- Net Promoter Score (NPS) for event creation experience
- User satisfaction survey (1-5 scale)
- Feature adoption rate for place picker
- Feature adoption rate for custom questions

---

## 9. Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Recurring Events**:
   - Weekly/monthly event templates
   - Series management

2. **Event Analytics**:
   - Registration sources
   - Attendee demographics
   - Engagement metrics dashboard

3. **Integration with Calendar**:
   - Google Calendar export
   - iCal format support
   - Luma bi-directional sync

4. **Waitlist Management**:
   - Auto-waitlist when capacity reached
   - Auto-promote from waitlist

5. **Email Notifications**:
   - Event reminders
   - Registration confirmations
   - Event updates

6. **Advanced Place Features**:
   - Real-time availability calendar
   - Booking conflicts detection
   - Automated pricing calculations

---

## 10. Dependencies

### External Dependencies
- Supabase (database & storage)
- React Hook Form (form management)
- Zod (validation)
- date-fns or Day.js (date handling)

### Internal Dependencies
- Authentication system (ZoPassport)
- User/operator management
- Node/location data

### Blocking Issues
- None currently identified

---

## 11. Open Questions

1. **Operator vs Hosted By**:
   - What's the distinction between these fields?
   - Recommendation: "Operator" = responsible person, "Hosted By" = public-facing host/speaker

2. **Place Integration**:
   - Should we integrate with external venue APIs?
   - Or maintain internal database of Zo House spaces?
   - Recommendation: Start with internal database, add external APIs later

3. **Event Approval Workflow**:
   - Do events need approval before going live?
   - Should there be draft → pending → approved states?
   - Recommendation: Add approval workflow for non-operators

4. **Registration System**:
   - Build custom registration or integrate with Luma?
   - Recommendation: Build custom for better control and data ownership

5. **Pricing**:
   - Are events free or paid?
   - If paid, what payment gateway?
   - Recommendation: Phase 1 = free events only, Phase 2 = add payments

---

## 12. Appendix

### A. Example Categories
- Workshop
- Networking
- Social Mixer
- Hackathon
- Panel Discussion
- Demo Day
- Community Meetup
- Coworking Session
- Wellness Activity
- Cultural Event

### B. Example Tags for Places
- Equipment: projector, sound-system, microphone, whiteboard, tv-screen, speakers
- Amenities: wifi, ac, heating, catering, parking, wheelchair-accessible, restrooms
- Atmosphere: quiet, collaborative, outdoor, indoor, natural-light, private
- Size: intimate, small, medium, large, extra-large

### C. Reference Links
- Zohm App: https://zohm.vercel.app/
- Nomadtable (inspiration): https://nomadtable.com/
- Current branch: `claude/add-event-creation-feature-FwG7h`

---

**Document Version**: 1.0
**Last Updated**: 2026-01-20
**Author**: Product Team
**Status**: Draft for Review
