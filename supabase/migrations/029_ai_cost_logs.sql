-- AI 호출 비용 로그 (owner 대시보드 실시간 합산용)
create table if not exists public.ai_cost_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  academy_id uuid references public.academies (id) on delete set null,
  engine text not null,
  kind text not null default 'extract',
  prompt_tokens int not null default 0,
  output_tokens int not null default 0,
  thoughts_tokens int not null default 0,
  estimated_cost_krw numeric(12, 4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_cost_logs_created_at_idx
  on public.ai_cost_logs (created_at desc);

create index if not exists ai_cost_logs_academy_created_idx
  on public.ai_cost_logs (academy_id, created_at desc);

alter table public.ai_cost_logs enable row level security;
