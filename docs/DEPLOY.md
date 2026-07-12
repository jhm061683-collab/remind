# Re:mind — 인터넷 URL로 배포하기 (Vercel + Supabase)

로컬(`localhost`)이 아니라 **어디서든 접속 가능한 URL**을 만들려면 아래 순서를 따르세요.  
지금 쓰는 Supabase·계정(`student` / `student123`)을 그대로 쓸 수 있습니다.

---

## 1. Supabase 준비 (이미 했다면 SQL만 추가)

SQL Editor에서 아래 마이그레이션을 **순서대로** 실행했는지 확인하세요.

1. `001_initial_schema.sql`
2. `002_question_reflection.sql`
3. `003_activity.sql`
4. `004_extra_images.sql` ← **2장 사진용 (새로 추가)**

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

4. **Deploy** 클릭

몇 분 후 `https://프로젝트이름.vercel.app` 같은 URL이 생깁니다.

---

## 4. Supabase 인증 URL 설정 (필수)

배포 URL에서 로그인이 되려면 Supabase에 URL을 등록해야 합니다.

**Supabase Dashboard → Authentication → URL Configuration**

| 항목 | 예시 |
|------|------|
| **Site URL** | `https://프로젝트이름.vercel.app` |
| **Redirect URLs** | `https://프로젝트이름.vercel.app/**` |

저장 후 Vercel 사이트에서 `student` / `student123` 으로 로그인 테스트.

---

## 5. 학생에게 줄 때

- URL: `https://프로젝트이름.vercel.app`
- 아이디: `student` (또는 `student@demo.app`)
- 비밀번호: `student123`

같은 Supabase DB를 쓰므로 **집·학원·폰 어디서든** 같은 문제가 보입니다.

---

## 자주 하는 실수

| 증상 | 해결 |
|------|------|
| 로그인 안 됨 | Supabase Redirect URLs 에 Vercel 주소 추가 |
| 데이터 안 보임 | Vercel 환경변수에 Supabase URL/키 확인 후 **Redeploy** |
| 사진 업로드 실패 | `001` 마이그레이션의 Storage 버킷 생성 여부 확인 |
| 2장 사진 안 됨 | `004_extra_images.sql` 실행 |

---

## 나중에 도메인 연결

Vercel → Project → Settings → Domains 에서 `remind.학원.com` 같은 주소를 연결할 수 있습니다.

---

**요약:** 급하게 고치기보다 **Supabase(데이터) + Vercel(화면 URL)** 로 나누면, 나중에 기능을 추가해도 구조를 유지하기 쉽습니다.
