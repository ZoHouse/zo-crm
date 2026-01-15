-- ============================================================
-- ZO CRM - Supabase Database Schema
-- Run this in Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- ================================
-- 1. COMPANIES TABLE
-- ================================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,        -- extracted from email (google.com, stripe.com)
  industry text,
  size text,                 -- startup, small, medium, enterprise
  website text,
  linkedin text,
  location text,
  notes text,
  contact_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================
-- 2. CONTACTS TABLE (Main table)
-- ================================
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  
  -- Basic Info
  first_name text,
  last_name text,
  email text unique not null,
  phone text,
  
  -- Company Info
  company text,
  company_id uuid references companies(id) on delete set null,
  job_title text,
  
  -- Relationship Management
  relationship_stage text default 'lead' 
    check (relationship_stage in ('lead', 'engaged', 'partner', 'vip', 'inactive')),
  lead_score integer default 0,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  
  -- Source Tracking
  source text,           -- luma, csv_import, manual, referral
  source_detail text,    -- event name, file name, referrer name
  
  -- Social & Web3
  telegram text,
  twitter text,
  linkedin text,
  whatsapp text,
  instagram text,
  eth_address text,
  solana_address text,
  
  -- Luma synced data
  luma_user_id text,
  events_attended integer default 0,
  total_spent numeric(10,2) default 0,
  
  -- Quick notes
  notes text,
  
  -- Flexible extra data
  custom_fields jsonb default '{}',
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================
-- 3. TAGS TABLE
-- ================================
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text default '#6B7280',
  description text,
  contact_count integer default 0,
  created_at timestamptz default now()
);

-- Contact-Tags junction table (many-to-many)
create table if not exists contact_tags (
  contact_id uuid references contacts(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (contact_id, tag_id)
);

-- ================================
-- 4. ACTIVITIES TABLE
-- ================================
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  
  type text not null 
    check (type in ('note', 'call', 'email', 'meeting', 'whatsapp', 'telegram', 'task', 'other')),
  title text,
  content text,
  
  -- For tasks/followups
  due_at timestamptz,
  completed_at timestamptz,
  
  -- Extra data (call duration, meeting link, etc.)
  metadata jsonb default '{}',
  
  created_at timestamptz default now()
);

-- ================================
-- 5. IMPORTS TABLE
-- ================================
create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  status text default 'pending' 
    check (status in ('pending', 'processing', 'completed', 'failed')),
  total_rows integer,
  imported_count integer default 0,
  duplicate_count integer default 0,
  error_count integer default 0,
  column_mapping jsonb,      -- {"Email": "email", "Full Name": "first_name"}
  errors jsonb,              -- [{row: 5, error: "invalid email"}]
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================================
-- INDEXES (for fast queries)
-- ============================================================
create index if not exists idx_contacts_email on contacts(email);
create index if not exists idx_contacts_company_id on contacts(company_id);
create index if not exists idx_contacts_stage on contacts(relationship_stage);
create index if not exists idx_contacts_source on contacts(source);
create index if not exists idx_contacts_luma_user_id on contacts(luma_user_id);
create index if not exists idx_contacts_next_followup on contacts(next_followup_at) where next_followup_at is not null;

create index if not exists idx_activities_contact on activities(contact_id);
create index if not exists idx_activities_type on activities(type);
create index if not exists idx_activities_created on activities(created_at desc);

create index if not exists idx_companies_domain on companies(domain);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

create trigger companies_updated_at
  before update on companies
  for each row execute function update_updated_at();

-- Update company contact count when contacts change
create or replace function update_company_contact_count()
returns trigger as $$
begin
  -- Decrement old company count
  if old.company_id is not null then
    update companies set contact_count = contact_count - 1 where id = old.company_id;
  end if;
  
  -- Increment new company count
  if new.company_id is not null then
    update companies set contact_count = contact_count + 1 where id = new.company_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger contacts_company_count
  after insert or update of company_id or delete on contacts
  for each row execute function update_company_contact_count();

-- Update tag contact count when contact_tags change
create or replace function update_tag_contact_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update tags set contact_count = contact_count + 1 where id = new.tag_id;
    return new;
  elsif tg_op = 'DELETE' then
    update tags set contact_count = contact_count - 1 where id = old.tag_id;
    return old;
  end if;
end;
$$ language plpgsql;

create trigger contact_tags_count
  after insert or delete on contact_tags
  for each row execute function update_tag_contact_count();

-- Update last_contacted_at when activity is added
create or replace function update_contact_last_contacted()
returns trigger as $$
begin
  if new.type in ('call', 'email', 'meeting', 'whatsapp', 'telegram') then
    update contacts set last_contacted_at = new.created_at where id = new.contact_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger activities_update_last_contacted
  after insert on activities
  for each row execute function update_contact_last_contacted();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables
alter table contacts enable row level security;
alter table companies enable row level security;
alter table tags enable row level security;
alter table contact_tags enable row level security;
alter table activities enable row level security;
alter table imports enable row level security;

-- For now, allow all authenticated users full access
-- You can make this more restrictive later (team-based access, etc.)
create policy "Allow authenticated users full access to contacts"
  on contacts for all to authenticated using (true) with check (true);

create policy "Allow authenticated users full access to companies"
  on companies for all to authenticated using (true) with check (true);

create policy "Allow authenticated users full access to tags"
  on tags for all to authenticated using (true) with check (true);

create policy "Allow authenticated users full access to contact_tags"
  on contact_tags for all to authenticated using (true) with check (true);

create policy "Allow authenticated users full access to activities"
  on activities for all to authenticated using (true) with check (true);

create policy "Allow authenticated users full access to imports"
  on imports for all to authenticated using (true) with check (true);

-- ============================================================
-- SEED DATA: Default Tags
-- ============================================================
insert into tags (name, color, description) values
  ('Founder', '#8B5CF6', 'Startup founders'),
  ('Investor', '#10B981', 'VCs, Angels, LPs'),
  ('Developer', '#3B82F6', 'Engineers and developers'),
  ('Designer', '#EC4899', 'UI/UX designers'),
  ('Community', '#F59E0B', 'Community members'),
  ('Speaker', '#EF4444', 'Event speakers'),
  ('Partner', '#06B6D4', 'Business partners'),
  ('VIP', '#FBBF24', 'High-priority contacts'),
  ('Hot Lead', '#F97316', 'Active opportunities'),
  ('Follow Up', '#6366F1', 'Needs follow up')
on conflict (name) do nothing;

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- View: Contacts with their tags
create or replace view contacts_with_tags as
select 
  c.*,
  coalesce(
    array_agg(
      json_build_object('id', t.id, 'name', t.name, 'color', t.color)
    ) filter (where t.id is not null),
    '{}'
  ) as tags
from contacts c
left join contact_tags ct on c.id = ct.contact_id
left join tags t on ct.tag_id = t.id
group by c.id;

-- View: Contacts needing follow-up
create or replace view contacts_needing_followup as
select * from contacts
where next_followup_at is not null
  and next_followup_at <= now() + interval '7 days'
order by next_followup_at asc;

-- View: Recent activities
create or replace view recent_activities as
select 
  a.*,
  c.first_name,
  c.last_name,
  c.email,
  c.company
from activities a
join contacts c on a.contact_id = c.id
order by a.created_at desc
limit 100;

-- ============================================================
-- DONE! Your CRM database is ready.
-- ============================================================
-- 
-- Tables created:
--   ✓ contacts      - Your main contact database
--   ✓ companies     - Organizations (auto-linked via email domain)
--   ✓ tags          - Flexible categorization
--   ✓ contact_tags  - Many-to-many contact-tag links
--   ✓ activities    - Notes, calls, meetings, tasks
--   ✓ imports       - Track CSV uploads
--
-- Features:
--   ✓ Auto-updating timestamps
--   ✓ Contact counts on companies & tags
--   ✓ Auto-update last_contacted_at
--   ✓ Row Level Security enabled
--   ✓ Performance indexes
--   ✓ Default tags seeded
--
-- Next steps:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
--   4. Check Table Editor to see your tables
-- ============================================================
