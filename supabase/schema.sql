-- Enable RLS
alter table auth.users enable row level security;

-- Create locations table
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null unique
);

-- Create courses table
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location_id uuid references public.locations(id),
  content_text text, -- For RAG context
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create schedules table
create table public.course_schedules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS on tables
alter table public.locations enable row level security;
alter table public.courses enable row level security;
alter table public.course_schedules enable row level security;

-- Policies (Example: Public Read, Auth Write)
create policy "Allow public read access to locations" on public.locations for select using (true);
create policy "Allow authenticated insert/update on locations" on public.locations for all using (auth.role() = 'authenticated');

create policy "Allow public read access to courses" on public.courses for select using (true);
create policy "Allow authenticated CRUD on courses" on public.courses for all using (auth.role() = 'authenticated');

create policy "Allow public read access to schedules" on public.course_schedules for select using (true);
create policy "Allow authenticated CRUD on schedules" on public.course_schedules for all using (auth.role() = 'authenticated');

-- Seed data for locations
insert into public.locations (name, country_code) values
  ('Dominican Republic', 'DO'),
  ('Venezuela', 'VE')
on conflict (country_code) do nothing;
