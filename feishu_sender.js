import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getDate = () => {
  const add0 = n => n < 10 ? '0' + n : '' + n;
  const d = new Date();
  return '' + d.getFullYear() + add0(d.getMonth() + 1) + add0(d.getDate());
};

const DATE = getDate();
const NEWS_PATH = path.join(__dirname, 'news', DATE + '.md');
const WEBHOOK_URL = process.env.FEISHU_WEBHOOK;
const REPO_URL = 'https://github.com/ClooperT/xin-wen-lian-bo';
const NEWS_URL = REPO_URL + '/blob/master/news/' + DATE + '.md';

function parseNews(md) {
  // Extract abstract (between ## 新闻摘要 and ## 详细新闻)
  const lines = md.split('\n');
  const absIdx = lines.findIndex(l => l.trim() === '## 新闻摘要');
  const detIdx = lines.findIndex(l => l.trim() === '## 详细新闻');
  let abstract = '';
  if (absIdx >= 0 && detIdx > absIdx) {
    abstract = lines.slice(absIdx + 1, detIdx)
      .map(l => l.replace(/<[^>]*>/g, '').trim())
      .filter(l => l)
      .join('\n');
  }
  
  // Extract titles and their CCTV links
  const titles = [];
  const links = [];
  // Find all ### headings for news titles
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('### ')) {
      const title = l.replace(/^### /, '');
      titles.push(title);
      // Look for [查看原文](url) after this heading
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
  
  // Abstract section
  content.push([{ tag: 'text', text: '📋 新闻摘要' }]);
  if (abstract) {
    const absLines = abstract.split('\n').filter(l => l.trim());
    for (const line of absLines.slice(0, 25)) {
      content.push([{ tag: 'text', text: line }]);
    }
  }
  
  content.push([{ tag: 'text', text: '' }]);
  content.push([{ tag: 'text', text: '📰 今日新闻（共' + titles.length + '则）' }]);
  
  // Each news item: title text + clickable link
  for (let i = 0; i < titles.length; i++) {
    const t = titles[i];
    const link = links[i] || '';
    // Truncate long titles
    const shortTitle = t.length > 35 ? t.substring(0, 35) + '...' : t;
    if (link) {
      content.push([
        { tag: 'text', text: '• ' + shortTitle + '  ' },
        { tag: 'a', text: '查看原文→', href: link }
      ]);
    } else {
      content.push([{ tag: 'text', text: '• ' + shortTitle }]);
    }
  }
  
  content.push([{ tag: 'text', text: '' }]);
  content.push([
    { tag: 'a', text: '📖 查看完整文字稿（GitHub）', href: NEWS_URL }
  ]);
  
  return {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '📺 《新闻联播》 (' + date + ')',
          content: content
        }
      }
    }
  };
}

async function main() {
  if (!WEBHOOK_URL) {
    console.error('错误: 未设置 FEISHU_WEBHOOK 环境变量');
    process.exit(1);
  }

  if (!fs.existsSync(NEWS_PATH)) {
    console.log('新闻文件不存在: ' + NEWS_PATH + '，跳过发送');
    process.exit(0);
  }

  const md = fs.readFileSync(NEWS_PATH, 'utf-8');
  const { abstract, titles, links } = parseNews(md);
  const msg = buildMessage(DATE, abstract, titles, links);
  
  console.log('正在发送飞书消息...');
  console.log('日期: ' + DATE);
  console.log('新闻则数: ' + titles.length);
  console.log('链接数: ' + links.length);
  
  const resp = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  });
  
  if (!resp.ok) {
    console.error('HTTP 状态码: ' + resp.status);
    const text = await resp.text();
    console.error('响应: ' + text);
    process.exit(1);
  }
  
  const result = await resp.json();
  if (result.code === 0) {
    console.log('✅ 飞书消息发送成功');
  } else {
    console.error('❌ 飞书消息发送失败, code=' + result.code + ', msg=' + result.msg);
    process.exit(1);
  }
}

await main();