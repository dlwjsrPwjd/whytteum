import "./env.js";
import { prisma } from "./prismaClient.js";
import { summarizeTopTopics } from "./collectors/youtube.js";

// 수집(npm run collect) 안에서도 매번 실행되지만, 요약만 따로 다시 돌리고 싶을 때 사용
async function main() {
  await summarizeTopTopics();
  await prisma.$disconnect();
}

main();
