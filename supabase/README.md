# Supabase SQL 안내

## 평소에는 이것만 쓰면 됩니다

파일: **[`setup.sql`](./setup.sql)**

1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인  
2. 프로젝트 선택 → **SQL Editor** → **New query**  
3. `supabase/setup.sql` 내용 **전체** 복사 → 붙여넣기  
4. **Run** (실행)

이미 테이블이 있어도 다시 실행해도 됩니다.  
건의사항·오답 키워드·사진 버킷까지 한 번에 맞춰집니다.

---

## 지금 “건의사항 테이블이 없다”만 고치려면

그래도 **`setup.sql` 전체 실행**을 추천합니다.  
급하면 아래만 실행해도 됩니다.

```sql
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists suggestions_created_at_idx
  on public.suggestions (created_at desc);

alter table public.suggestions enable row level security;

drop policy if exists "suggestions_insert_own" on public.suggestions;
create policy "suggestions_insert_own"
  on public.suggestions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "suggestions_select_own" on public.suggestions;
create policy "suggestions_select_own"
  on public.suggestions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "suggestions_select_admin" on public.suggestions;
create policy "suggestions_select_admin"
  on public.suggestions for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and (
          p.academy_id is null
          or p.academy_id = suggestions.academy_id
          or suggestions.academy_id is null
        )
    )
  );
```

실행 후 앱에서 건의 보내기를 다시 시도하세요.

---

## `migrations/` 폴더는?

예전처럼 기능을 추가할 때마다 나눠 둔 **이력 파일**입니다.  
앞으로는 **쓰지 않아도 됩니다.** `setup.sql`이 최신 전체를 담고 있습니다.

새 기능을 DB에 넣을 때는:
1. `setup.sql`에 반영하고  
2. (선택) `migrations/`에 이력용 조각을 남깁니다.
