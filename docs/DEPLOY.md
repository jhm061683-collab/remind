# Re:mind — 인터넷 URL로 배포하기 (Vercel + Supabase)

로컬(`localhost`)이 아니라 **어디서든 접속 가능한 URL**을 만들려면 아래 순서를 따르세요.

---

## 1. Supabase SQL (이것만)

1. Supabase → **SQL Editor** → New query  
2. 프로젝트의 **`supabase/setup.sql`** 전체 복사 → 붙여넣기 → **Run**

자세한 설명: [`supabase/README.md`](../supabase/README.md)

데모 계정이 없으면:

```bash
npm.cmd run supabase:seed
npm.cmd run supabase:seed-questions
```

---

## 2. GitHub에 코드 올리기

1. [github.com](https://github.com) 에서 새 저장소 생성  
2. 이 프로젝트 폴더에서 push (`.env.local`은 **절대 올리지 마세요**)

---

## 3. Vercel 배포

1. [vercel.com](https://vercel.com) 로그인 → **Add New Project**  
2. GitHub 저장소 연결  
3. **Environment Variables** 에 추가:

| 이름 | 값 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |

4. **Deploy**

---

## 4. Supabase 인증 URL 설정 (필수)

**Supabase → Authentication → URL Configuration**

| 항목 | 예시 |
|------|------|
| **Site URL** | `https://프로젝트이름.vercel.app` |
| **Redirect URLs** | `https://프로젝트이름.vercel.app/**` |

---

## 자주 하는 실수

| 증상 | 해결 |
|------|------|
| 로그인 안 됨 | Redirect URLs 에 Vercel 주소 추가 |
| 데이터 안 보임 | Vercel 환경변수 확인 후 Redeploy |
| 사진 업로드 실패 | `setup.sql` 실행 (Storage 버킷) |
| 건의사항 테이블 없음 | `setup.sql` 실행 |

---

**요약:** DB는 **`supabase/setup.sql` 한 번**, 화면 URL은 **Vercel** 입니다.
