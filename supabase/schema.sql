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
  ('Dominican Republic', 'DO'),
  ('Venezuela', 'VE')
on conflict (country_code) do nothing;

-- ------------------------------------------------------------
-- Vector Search & RAG Support
-- ------------------------------------------------------------

-- Enable pgvector
create extension if not exists vector;

-- Create course embeddings table
create table if not exists public.course_embeddings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  content text,
  embedding vector(1536), -- Optimized for OpenAI text-embedding-3-small
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.course_embeddings enable row level security;

-- Policies
create policy "Allow public read access to embeddings" on public.course_embeddings for select using (true);
create policy "Allow authenticated CRUD on embeddings" on public.course_embeddings for all using (auth.role() = 'authenticated');

-- Match active courses search function
create or replace function match_active_courses (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    c.id,
    c.title,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.course_embeddings ce
  join public.courses c on ce.course_id = c.id
  join public.course_schedules cs on cs.course_id = c.id
  where cs.is_active = true
    and 1 - (ce.embedding <=> query_embedding) > match_threshold
  order by ce.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Cleanup function for inactive courses
create or replace function public.cleanup_inactive_course_embeddings()
returns trigger as $$
begin
  if (new.is_active = false) then
    if not exists (
      select 1 from public.course_schedules 
      where course_id = new.course_id and is_active = true and id != new.id
    ) then
      delete from public.course_embeddings where course_id = new.course_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for schedule status change
drop trigger if exists on_schedule_status_change on public.course_schedules;
create trigger on_schedule_status_change
  after update of is_active on public.course_schedules
  for each row execute function public.cleanup_inactive_course_embeddings();

-- Manual cleanup helper
create or replace function public.manual_cleanup_embeddings()
returns void as $$
begin
  delete from public.course_embeddings
  where course_id not in (
    select distinct course_id from public.course_schedules where is_active = true
  );
end;
$$ language plpgsql;
