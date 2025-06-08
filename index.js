import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID;
const kakaoApiKey = process.env.KAKAO_API_KEY;

// 📘 카카오 API에서 책 표지와 줄거리 가져오기
async function getBookData(title) {
  const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(title)}`, {
    headers: {
      Authorization: kakaoApiKey,
    },
  });

  const data = await res.json();
  // console.log("📦 카카오 API 응답:", JSON.stringify(data, null, 2));

  if (!data.documents || data.documents.length === 0) return null;

  const { thumbnail, contents } = data.documents[0];
  return {
    coverUrl: thumbnail || null,
    description: contents ? truncateText(contents, 200) : null,
  };
}

// ✂️ 줄거리 자르기 (1800자 + ...)
function truncateText(text, maxLength = 1800) {
  if (!text) return "";
  return text.length <= maxLength ? text : text.slice(0, maxLength) + "...";
}

// 📝 노션 페이지 업데이트
async function updateNotionPage(pageId, coverUrl, description) {
  const body = {
    properties: {},
  };

  if (description) {
    body.properties.줄거리 = {
      rich_text: [
        {
          type: "text",
          text: { content: description },
        },
      ],
    };
  }

  if (coverUrl) {
    body.cover = {
      type: "external",
      external: { url: coverUrl },
    };
  }

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "patch",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  // console.log("📦 Notion API 응답:", JSON.stringify(data, null, 2));
}

// 🔄 전체 자동화 흐름
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
    const title = page.properties.이름?.title?.[0]?.plain_text;
    const cover = page.cover;
    const description = page.properties.줄거리?.rich_text?.[0]?.plain_text;

    const hasCover = !!cover;
    const hasDescription = !!description && description.trim() !== "";

    if (title && (!hasCover || !hasDescription)) {
      console.log(`📚 "${title}" 커버 또는 줄거리 없음 → 업데이트 시도`);
      const bookData = await getBookData(title);

      if (bookData?.coverUrl || bookData?.description) {
        await updateNotionPage(pageId, bookData.coverUrl, bookData.description);
        console.log(`✅ "${title}" 업데이트 완료`);
      } else {
        console.log(`❌ "${title}" 정보 못 찾음`);
      }
    } else {
      console.log(`⏩ "${title}" 커버 및 줄거리 모두 있음 → 건너뜀`);
    }
  }
}

run();
