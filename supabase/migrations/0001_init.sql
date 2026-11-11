create table if not exists brand_voice (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  description text not null default '',
  samples text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  kind text not null default 'rss',
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  title text not null,
  link text not null unique,
  summary text,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references ideas(id) on delete set null,
  platform text not null check (platform in ('threads','instagram')),
  body text not null,
  image_url text,
  status text not null default 'draft' check (status in ('draft','scheduled','published','failed')),
  scheduled_at timestamptz,
  repeat_every_days int,
  published_at timestamptz,
  external_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists posts_due_idx on posts (status, scheduled_at);
create table if not exists insights (
  post_id uuid primary key references posts(id) on delete cascade,
  views int not null default 0,
  likes int not null default 0,
  replies int not null default 0,
  reposts int not null default 0,
  updated_at timestamptz not null default now()
);
-- 서버(service role)에서만 접근: RLS 켜고 정책 없음 = anon/authenticated 차단
alter table brand_voice enable row level security;
alter table sources enable row level security;
alter table ideas enable row level security;
alter table posts enable row level security;
alter table insights enable row level security;
