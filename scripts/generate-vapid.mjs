/**
 * VAPID 키 생성 (웹 푸시용)
 * node scripts/generate-vapid.mjs
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("아래 값을 .env.local 과 Vercel 환경변수에 넣으세요.\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@remind.app`);
