/**
 * TEST 학원 가상 데이터 시드
 *
 * 학원 코드: TEST
 * 로그인: admin / admin123, teacher / teacher123, student / student123
 *
 * 실행: npm.cmd run supabase:seed-test
 *
 * 필요: .env.local
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const ACADEMY_CODE = "TEST";
const ACADEMY_NAME = "테스트학원";
const SEED_TAG = "seed-test";
const PASSWORD_ADMIN = "admin123";
const PASSWORD_TEACHER = "teacher123";
const PASSWORD_STUDENT = "student123";
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const SUBJECTS = [
  { id: "math", name: "수학" },
  { id: "english", name: "영어" },
  { id: "korean", name: "국어" },
];

const WRONG_REASONS = [
  "조건 오독",
  "연산 실수",
  "개념 부족",
  "시간 부족",
  "풀이 전략 부족",
];

const TEACHERS = [
  {
    username: "teacher",
    displayName: "이선생",
    nickname: "이선생",
    phone: "01011110001",
  },
  {
    username: "teacher2",
    displayName: "김선생",
    nickname: "김선생",
    phone: "01011110002",
  },
  {
    username: "teacher3",
    displayName: "박선생",
    nickname: "박선생",
    phone: "01011110003",
  },
];

const STUDENTS = [
  { username: "student", displayName: "김학생", schoolLevel: "high", gradeNumber: 1, phone: "01022220001" },
  { username: "parkseo", displayName: "박서준", schoolLevel: "high", gradeNumber: 1, phone: "01022220002" },
  { username: "leemina", displayName: "이민아", schoolLevel: "high", gradeNumber: 1, phone: "01022220003" },
  { username: "choijun", displayName: "최준호", schoolLevel: "high", gradeNumber: 1, phone: "01022220004" },
  { username: "jangye", displayName: "장예린", schoolLevel: "high", gradeNumber: 1, phone: "01022220005" },
  { username: "junghae", displayName: "정하은", schoolLevel: "high", gradeNumber: 2, phone: "01022220006" },
  { username: "kangtae", displayName: "강태민", schoolLevel: "high", gradeNumber: 2, phone: "01022220007" },
  { username: "yunseo", displayName: "윤서연", schoolLevel: "high", gradeNumber: 2, phone: "01022220008" },
  { username: "baesiu", displayName: "배시우", schoolLevel: "high", gradeNumber: 2, phone: "01022220009" },
  { username: "hanji", displayName: "한지후", schoolLevel: "middle", gradeNumber: 3, phone: "01022220010" },
  { username: "ohsoo", displayName: "오수아", schoolLevel: "middle", gradeNumber: 3, phone: "01022220011" },
  { username: "shindo", displayName: "신도윤", schoolLevel: "middle", gradeNumber: 3, phone: "01022220012" },
];

const CLASSES = [
  {
    name: "고1 수학반",
    schoolLevel: "high",
    gradeNumber: 1,
    teacherUsernames: ["teacher", "teacher2"],
    studentUsernames: ["student", "parkseo", "leemina", "choijun", "jangye"],
  },
  {
    name: "고2 수학반",
    schoolLevel: "high",
    gradeNumber: 2,
    teacherUsernames: ["teacher2"],
    studentUsernames: ["junghae", "kangtae", "yunseo", "baesiu"],
  },
  {
    name: "중3 영어반",
    schoolLevel: "middle",
    gradeNumber: 3,
    teacherUsernames: ["teacher3"],
    studentUsernames: ["hanji", "ohsoo", "shindo"],
  },
  {
    name: "고1 국어반",
    schoolLevel: "high",
    gradeNumber: 1,
    teacherUsernames: ["teacher", "teacher3"],
    studentUsernames: ["student", "parkseo", "leemina"],
  },
];

const MATH_PROBLEMS = [
  { latex: "이차함수 $y=x^2-4x+3$ 의 꼭짓점 좌표를 구하시오.", answer: "(2,-1)" },
  { latex: "$\\sqrt{12}+\\sqrt{27}$ 을 간단히 하시오.", answer: "5\\sqrt{3}" },
  { latex: "방정식 $2x-y=0$ 을 만족하는 한 점을 구하시오.", answer: "(1,2)" },
  { latex: "$\\dfrac{\\sqrt{5}}{2}$ 의 값을 소수 둘째 자리까지 어림하시오.", answer: "1.12" },
  { latex: "원 $x^2+y^2=1$ 위의 점 중 $x$ 축과의 교점을 구하시오.", answer: "(\\pm 1,0)" },
  { latex: "$a_1+a_2=10$, $a_1-a_2=2$ 일 때 $a_1$ 의 값을 구하시오.", answer: "6" },
  { latex: "두 수 $a,b$ 의 평균 $\\dfrac{a+b}{2}$ 가 7일 때 $a+b$ 를 구하시오.", answer: "14" },
  { latex: "$\\sqrt{29}$ 가 $5$ 와 $6$ 사이에 있음을 설명하시오.", answer: "5^2 < 29 < 6^2" },
];

const ENGLISH_PROBLEMS = [
  { latex: "다음 빈칸에 알맞은 단어를 쓰시오.\nShe is looking forward to _____ the concert.", answer: "seeing" },
  { latex: "다음 문장을 과거형으로 바꾸시오.\nThey go to the library every Friday.", answer: "They went to the library every Friday." },
  { latex: "밑줄 친 부분과 같은 뜻의 단어를 고르시오.\nThe exam was quite **difficult**.", answer: "hard" },
  { latex: "다음 대화를 완성하시오.\nA: How often do you exercise?\nB: _____", answer: "Three times a week." },
  { latex: "다음 문장의 어법상 틀린 곳을 고치시오.\nHe don't like spicy food.", answer: "He doesn't like spicy food." },
  { latex: "다음 글을 한 문장으로 요약하시오.\nMany students review notes right after class to remember better.", answer: "수업 직후 노트를 복습하면 기억이 오래 간다." },
];

const KOREAN_PROBLEMS = [
  { latex: "다음 문장에서 주어와 서술어를 찾으시오.\n가을 바람이 창문을 흔든다.", answer: "주어: 가을 바람이 / 서술어: 흔든다" },
  { latex: "다음 시구의 화자의 정서를 쓰시오.\n잎새에 이는 바람에도 나는 괴로워했다.", answer: "괴로움, 상처받기 쉬운 마음" },
  { latex: "다음 중 맞춤법이 바른 것을 고르시오.\n되요 / 돼요", answer: "돼요" },
  { latex: "다음 글의 중심 화제를 한 줄로 쓰시오.\n오답 노트는 틀린 이유를 남기는 습관이 핵심이다.", answer: "오답 노트의 핵심은 틀린 이유를 남기는 것" },
  { latex: "다음 문장을 높임 표현으로 바꾸시오.\n선생님이 교실에 들어왔다.", answer: "선생님께서 교실에 들어오셨다." },
  { latex: "다음 단어의 뜻을 쓰시오.\n역설", answer: "겉보기와 반대되는 참뜻을 드러내는 표현" },
];

function loadEnvLocal() {
  if (!existsSync(envPath)) {
    console.error("❌ .env.local 파일이 없습니다.");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function authEmailFor(username) {
  return `test-${username}@seed.remind.app`;
}

async function ensureAcademy(supabase) {
  const { data: existing, error } = await supabase
    .from("academies")
    .select("id, name, code, status")
    .ilike("code", ACADEMY_CODE)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    console.log(`⏭  학원 ${ACADEMY_CODE} 이미 있음 (${existing.id})`);
    return existing.id;
  }

  const { data, error: insertError } = await supabase
    .from("academies")
    .insert({ name: ACADEMY_NAME, code: ACADEMY_CODE, status: "trial" })
    .select("id")
    .single();
  if (insertError || !data) {
    throw new Error(insertError?.message ?? "학원 생성 실패");
  }
  console.log(`✅ 학원 ${ACADEMY_CODE} 생성 (${data.id})`);
  return data.id;
}

async function ensureSubscription(supabase, academyId) {
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_per_student_krw")
    .eq("code", "trial")
    .maybeSingle();

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { error } = await supabase.from("academy_subscriptions").upsert(
    {
      academy_id: academyId,
      plan_id: plan?.id ?? null,
      status: "trial",
      price_per_student_krw: Number(plan?.price_per_student_krw ?? 0),
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "academy_id" },
  );
  if (error) {
    console.warn("⚠️  구독 정보 저장 실패:", error.message);
  } else {
    console.log("✅ 체험 구독 연결");
  }
}

async function findProfile(supabase, academyId, username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role, academy_id")
    .eq("academy_id", academyId)
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureUser(supabase, academyId, input) {
  const existing = await findProfile(supabase, academyId, input.username);
  if (existing) {
    console.log(`⏭  ${input.role} ${input.username} 이미 있음`);
    return existing.id;
  }

  const email = authEmailFor(input.username);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      role: input.role,
      display_name: input.displayName,
      username: `seedtmp-${input.username}-${Date.now()}`,
      is_director: Boolean(input.isDirector),
    },
  });
  if (error || !data.user) {
    throw new Error(`${input.username} 생성 실패: ${error?.message ?? "unknown"}`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    academy_id: academyId,
    role: input.role,
    display_name: input.displayName,
    username: input.username,
    auth_email: email,
    phone: input.phone ?? null,
    school_level: input.schoolLevel ?? null,
    grade_number: input.gradeNumber ?? null,
    is_director: Boolean(input.isDirector),
    nickname: input.nickname ?? null,
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(`${input.username} 프로필 저장 실패: ${profileError.message}`);
  }

  await supabase.from("profile_password_admin").upsert(
    {
      user_id: data.user.id,
      password_plain: input.password,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  console.log(`✅ ${input.role} ${input.username} (${input.displayName})`);
  return data.user.id;
}

async function ensureSubjects(supabase, userId) {
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: "__subjects__",
      settings: { subjects: SUBJECTS },
    },
    { onConflict: "user_id,subject_id" },
  );
  if (error) {
    console.warn(`⚠️  과목 설정 실패 (${userId}):`, error.message);
  }
}

async function ensureClass(supabase, academyId, createdBy, room, idByUsername) {
  const { data: existing } = await supabase
    .from("class_rooms")
    .select("id")
    .eq("academy_id", academyId)
    .eq("name", room.name)
    .eq("school_level", room.schoolLevel)
    .eq("grade_number", room.gradeNumber)
    .maybeSingle();

  let classId = existing?.id;
  if (!classId) {
    const { data, error } = await supabase
      .from("class_rooms")
      .insert({
        academy_id: academyId,
        name: room.name,
        school_level: room.schoolLevel,
        grade_number: room.gradeNumber,
        is_director_class: false,
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`${room.name} 반 생성 실패: ${error?.message}`);
    classId = data.id;
    console.log(`✅ 반 ${room.name}`);
  } else {
    console.log(`⏭  반 ${room.name} 이미 있음`);
  }

  const teacherRows = room.teacherUsernames
    .map((username) => idByUsername.get(username))
    .filter(Boolean)
    .map((teacherId) => ({ class_room_id: classId, teacher_id: teacherId }));
  if (teacherRows.length > 0) {
    const { error } = await supabase
      .from("class_room_teachers")
      .upsert(teacherRows, { onConflict: "class_room_id,teacher_id" });
    if (error) throw new Error(`${room.name} 선생님 배정 실패: ${error.message}`);
  }

  const studentRows = room.studentUsernames
    .map((username) => idByUsername.get(username))
    .filter(Boolean)
    .map((studentId) => ({ class_room_id: classId, student_id: studentId }));
  if (studentRows.length > 0) {
    const { error } = await supabase
      .from("class_room_students")
      .upsert(studentRows, { onConflict: "class_room_id,student_id" });
    if (error) throw new Error(`${room.name} 학생 배정 실패: ${error.message}`);
  }

  return classId;
}

function buildQuestionsForStudent(studentId, academyId, imageUrl) {
  const packs = [
    { subjectId: "math", items: MATH_PROBLEMS },
    { subjectId: "english", items: ENGLISH_PROBLEMS },
    { subjectId: "korean", items: KOREAN_PROBLEMS },
  ];
  const rows = [];
  let index = 0;
  for (const pack of packs) {
    for (const item of pack.items) {
      index += 1;
      const archived = index % 9 === 0;
      const phase = archived
        ? "completed"
        : index % 5 === 0
          ? "long"
          : index % 3 === 0
            ? "medium"
            : "short";
      const createdAt = daysAgo(index % 12);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + (archived ? 30 : index % 4));
      rows.push({
        user_id: studentId,
        academy_id: academyId,
        subject_id: pack.subjectId,
        image_url: imageUrl,
        extra_image_urls: [],
        problem_latex: item.latex,
        ocr_text: item.latex.replace(/\$/g, ""),
        entry_mode: pack.subjectId === "math" ? "ai" : "manual",
        created_by: studentId,
        created_by_role: "student",
        answer_text: item.answer,
        keywords: [SEED_TAG, pack.subjectId, `문제${index}`],
        source: `테스트 ${pack.subjectId} ${index}번`,
        wrong_reason: WRONG_REASONS[index % WRONG_REASONS.length],
        wrong_keywords: [WRONG_REASONS[index % WRONG_REASONS.length]],
        reflection_memo:
          index % 2 === 0 ? `${pack.subjectId} ${index}번 — 다시 풀어보며 개념을 정리할 것.` : null,
        phase,
        streak_count: index % 4,
        next_review_date: nextReview.toISOString(),
        last_answered_at: phase === "short" ? null : daysAgo(index % 6),
        archived,
        created_at: createdAt,
      });
    }
  }
  return rows;
}

async function ensureQuestions(supabase, academyId, studentId, imageUrl) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, keywords")
    .eq("user_id", studentId);
  if (error) throw error;
  const already = (data ?? []).some(
    (q) => Array.isArray(q.keywords) && q.keywords.includes(SEED_TAG),
  );
  if (already) {
    return { inserted: 0, skipped: true };
  }

  const rows = buildQuestionsForStudent(studentId, academyId, imageUrl);
  const { data: inserted, error: insertError } = await supabase
    .from("questions")
    .insert(rows)
    .select("id, created_at, archived");
  if (insertError) throw insertError;

  const events = [];
  for (const q of inserted ?? []) {
    events.push({
      user_id: studentId,
      event_type: "registered",
      question_id: q.id,
      created_at: q.created_at,
    });
    if (q.archived) {
      events.push({
        user_id: studentId,
        event_type: "archived",
        question_id: q.id,
        created_at: q.created_at,
      });
    } else if (Math.random() < 0.45) {
      events.push({
        user_id: studentId,
        event_type: "reviewed",
        question_id: q.id,
        created_at: daysAgo(Math.floor(Math.random() * 5)),
      });
    }
  }
  if (events.length > 0) {
    const { error: eventError } = await supabase.from("activity_events").insert(events);
    if (eventError) {
      console.warn("⚠️  활동 기록 실패:", eventError.message);
    }
  }

  return { inserted: rows.length, skipped: false };
}

async function ensurePlaceholderImage(supabase) {
  const path = "seed-test/placeholder.png";
  const { error } = await supabase.storage
    .from("question-images")
    .upload(path, PLACEHOLDER_PNG, {
      contentType: "image/png",
      upsert: true,
    });
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.warn("⚠️  플레이스홀더 업로드 실패, data URL 사용:", error.message);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  }
  return supabase.storage.from("question-images").getPublicUrl(path).data.publicUrl;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== TEST 학원 시드 ===\n");

  const academyId = await ensureAcademy(supabase);
  await ensureSubscription(supabase, academyId);
  const imageUrl = await ensurePlaceholderImage(supabase);

  const adminId = await ensureUser(supabase, academyId, {
    username: "admin",
    displayName: "테스트원장",
    password: PASSWORD_ADMIN,
    role: "admin",
    isDirector: true,
    phone: "01000000001",
  });

  const idByUsername = new Map();
  for (const teacher of TEACHERS) {
    const id = await ensureUser(supabase, academyId, {
      ...teacher,
      password: PASSWORD_TEACHER,
      role: "sub_admin",
      isDirector: false,
    });
    idByUsername.set(teacher.username, id);
  }

  for (const student of STUDENTS) {
    const id = await ensureUser(supabase, academyId, {
      ...student,
      password: PASSWORD_STUDENT,
      role: "student",
    });
    idByUsername.set(student.username, id);
    await ensureSubjects(supabase, id);
  }

  for (const room of CLASSES) {
    await ensureClass(supabase, academyId, adminId, room, idByUsername);
  }

  const teacherCycle = TEACHERS.map((t) => idByUsername.get(t.username)).filter(Boolean);
  for (const [index, student] of STUDENTS.entries()) {
    const studentId = idByUsername.get(student.username);
    const teacherId = teacherCycle[index % teacherCycle.length];
    if (!studentId || !teacherId) continue;
    const { error } = await supabase.from("student_assignments").upsert(
      {
        academy_id: academyId,
        sub_admin_id: teacherId,
        student_id: studentId,
      },
      { onConflict: "student_id" },
    );
    if (error) {
      console.warn(`⚠️  ${student.username} 담당 배정 실패:`, error.message);
    }
  }

  let questionTotal = 0;
  let skippedStudents = 0;
  for (const student of STUDENTS) {
    const studentId = idByUsername.get(student.username);
    if (!studentId) continue;
    const result = await ensureQuestions(supabase, academyId, studentId, imageUrl);
    if (result.skipped) {
      skippedStudents += 1;
      console.log(`⏭  ${student.displayName} 문제 이미 있음`);
    } else {
      questionTotal += result.inserted;
      console.log(`✅ ${student.displayName} 문제 ${result.inserted}개`);
    }

    await supabase.from("login_events").insert({
      user_id: studentId,
      logged_in_at: daysAgo(student.username === "student" ? 0 : indexMod(student.username)),
    });
  }

  await supabase.from("login_events").insert({
    user_id: adminId,
    logged_in_at: new Date().toISOString(),
  });

  console.log("\n✨ 완료");
  console.log(`   학원 코드: ${ACADEMY_CODE}`);
  console.log("   원장     admin / admin123");
  console.log("   선생님   teacher / teacher123");
  console.log("   학생     student / student123");
  console.log(`   선생님 ${TEACHERS.length}명, 학생 ${STUDENTS.length}명, 반 ${CLASSES.length}개`);
  console.log(`   새로 넣은 문제 ${questionTotal}개 (이미 있던 학생 ${skippedStudents}명)`);
  console.log("   owner(PLATFORM) 학원 목록에서 테스트학원이 보여야 합니다.");
}

function indexMod(username) {
  let hash = 0;
  for (const ch of username) hash = (hash + ch.charCodeAt(0)) % 6;
  return hash;
}

main().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});
