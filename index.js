import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID;
const kakaoApiKey = process.env.KAKAO_API_KEY;

// 책 제목으로 카카오 API에서 표지 가져오기
async function getBookCover(title) {
  const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(title)}`, {
    headers: {
      Authorization: kakaoApiKey,
    },
  });
  const data = await res.json();
  console.log("📦 카카오 API 응답:", JSON.stringify(data, null, 2));

  if (!data.documents || data.documents.length === 0) {
    console.log(`❌ "${title}" 검색 결과 없음`);
    return null;
  }

  return data.documents[0].thumbnail || null;
}

// 노션에 커버 업데이트
async function updateNotionPage(pageId, coverUrl) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "patch",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cover: {
        type: "external",
        external: {
          url: coverUrl,
        },
      },
    }),
  });

  const data = await res.json();
  console.log("📦 Notion API 응답:", JSON.stringify(data, null, 2));
}

// 전체 흐름 자동 실행
async function run() {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  const pages = data.results;

  for (const page of pages) {
    const pageId = page.id;
    const cover = page.cover;
    const title = page.properties.이름?.title?.[0]?.plain_text;
  
    // 표지가 완전히 없는 경우에만
    if (!cover && title) {
      console.log(`🔍 표지 없는 항목: "${title}"`);
      const coverUrl = await getBookCover(title);
  
      if (coverUrl) {
        await updateNotionPage(pageId, coverUrl);
        console.log(`✅ "${title}" 표지 업데이트 완료`);
      } else {
        console.log(`❌ "${title}" 표지 못 찾음`);
      }
    } else {
      console.log(`⏩ "${title}" 은(는) 이미 표지 있음, 건너뜀`);
    }
  }
}

run();
