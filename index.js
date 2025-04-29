import fetch from "node-fetch"; // fetch 쓸 수 있게 import
import dotenv from "dotenv";
dotenv.config(); // 꼭 맨 위에서 실행

// 1. 설정
const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID;
const kakaoApiKey = process.env.KAKAO_API_KEY;

// 2. 책 제목으로 책 표지 가져오기
async function getBookCover(title) {
    const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(title)}`, {
      headers: {
        Authorization: kakaoApiKey
      }
    });
  
    const data = await res.json();
  
    console.log("📦 카카오 API 응답:", JSON.stringify(data, null, 2)); // 응답 전체 출력!
  
    if (!data.documents || data.documents.length === 0) {
      console.log(`❌ "${title}" 검색 결과 없음`);
      return null;
    }
  
    return data.documents[0].thumbnail || null;
  }
  
// 3. 노션에 표지 업데이트하기
async function updateNotionPage(pageId, coverUrl) {
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'patch',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cover: {
        type: "external",
        external: {
          url: coverUrl
        }
      }
    })
  });
}

// 4. 전체 흐름
async function run(title, pageId) {
  const coverUrl = await getBookCover(title);
  if (coverUrl) {
    await updateNotionPage(pageId, coverUrl);
    console.log(`✅ ${title} - 표지 업데이트 완료`);
  } else {
    console.log(`❌ ${title} - 표지 찾을 수 없음`);
  }
}


