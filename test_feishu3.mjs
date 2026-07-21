import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATE = "20260720";
const NEWS_PATH = path.join(__dirname, 'news', DATE + '.md');
const WEBHOOK_URL = "https://open.feishu.cn/open-apis/bot/v2/hook/a1d18263-d729-43a7-a8fd-e557b53fe048";
const REPO_URL = "https://github.com/ClooperT/xin-wen-lian-bo";
const NEWS_URL = REPO_URL + "/blob/master/news/" + DATE + ".md";

function parseNews(md) {
  const lines = md.split("\n");
  const absIdx = lines.findIndex(l => l.trim() === "## 新闻摘要");
  const detIdx = lines.findIndex(l => l.trim() === "## 详细新闻");
  let abstract = "";
  if (absIdx >= 0 && detIdx > absIdx) {
    abstract = lines.slice(absIdx + 1, detIdx)
      .map(l => l.replace(/<[^>]*>/g, "").trim())
      .filter(l => l)
      .join("\n");
  }
  const titles = [];
  const links = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("### ")) {
      const title = l.replace(/^### /, "");
      titles.push(title);
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const m = lines[j].match(/\[查看原文\]\(([^)]+)\)/);
        if (m) {
          links.push(m[1]);
          break;
        }
      }
    }
  }
  return { abstract, titles, links };
}

function buildMessage(date, abstract, titles, links) {
  const content = [];
  content.push([{ tag: "text", text: "📋 新闻摘要" }]);
  if (abstract) {
    const absLines = abstract.split("\n").filter(l => l.trim());
    for (const line of absLines.slice(0, 25)) {
      content.push([{ tag: "text", text: line }]);
    }
  }
  content.push([{ tag: "text", text: "" }]);
  content.push([{ tag: "text", text: "📰 今日新闻（共" + titles.length + "则）" }]);
  // Each news title is a clickable link directly to CCTV
  for (let i = 0; i < titles.length; i++) {
    const t = titles[i];
    const link = links[i] || "";
    if (link) {
      content.push([{ tag: "a", text: "• " + t, href: link }]);
    } else {
      content.push([{ tag: "text", text: "• " + t }]);
    }
  }
  content.push([{ tag: "text", text: "" }]);
  content.push([
    { tag: "a", text: "📖 查看完整文字稿（GitHub）", href: NEWS_URL }
  ]);
  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: "📺 《新闻联播》 (" + date + ")",
          content: content
        }
      }
    }
  };
}

const md = fs.readFileSync(NEWS_PATH, "utf-8");
const { abstract, titles, links } = parseNews(md);
const msg = buildMessage(DATE, abstract, titles, links);

console.log("日期: " + DATE);
console.log("新闻则数: " + titles.length + ", 链接数: " + links.length);
console.log("--- 前3条预览 ---");
for (let i = 0; i < Math.min(3, titles.length); i++) {
  console.log("  " + (i+1) + ". " + titles[i].substring(0, 35) + "...");
  console.log("     链接: " + links[i]);
}
console.log("---");
const body = JSON.stringify(msg);
console.log("消息总长度: " + body.length + " bytes");

const resp = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: body
});
const result = await resp.json();
console.log(result.code === 0 ? "✅ 发送成功" : "❌ 失败: code=" + result.code + ", msg=" + result.msg);
