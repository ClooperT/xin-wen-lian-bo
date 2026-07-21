import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATE = (() => { const a = n => n < 10 ? '0' + n : '' + n; const d = new Date(); return '' + d.getFullYear() + a(d.getMonth() + 1) + a(d.getDate()); })();
const NEWS_PATH = path.join(__dirname, 'news', DATE + '.md');
const WEBHOOK_URL = process.env.FEISHU_WEBHOOK;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const SYSTEM_PROMPT = "你定位为专业宏观产业策略分析师，专门解读每日 7 点央视新闻，只做 A 股行业板块逻辑推演，绝不推荐个股、不预测个股涨跌、不给出买卖点位。\n\n我将发送当日完整央视新闻内容，请严格按以下统一流程分析：\n\n**第一步：市场环境定位**\n结合当前大盘所处的点位区间、成交量、市场情绪周期（冰点/修复/高潮），判断该轮新闻驱动力所处的宏观定价语境——是已有预期的落地，还是超预期的增量信息。\n\n**第二步：信息筛选提纯**\n过滤：纯社会民生琐事、无产业关联的单纯灾害救援纪实、文娱文体、无关普通海外快讯、社会案件娱乐类内容。\n灾害类过滤：仅报道人员受灾、抢险安置、城镇损毁，未提及农作物、矿产、能源、大宗商品产量与供给的纯灾情新闻。\n灾害类保留：涉及国内粮食主产区、经济作物种植带、海外大宗商品产区、矿产/油气基地、水产养殖区的极端天气、地质灾害，且新闻提及减产、供给收缩、价格波动、保供政策、救灾农资补贴的资讯。\n强制保留：顶层国家级产业政策、科技攻关、能源转型、基建、高端制造、农业扶持、外贸关税、行业新规、产业补贴、重大项目、央行财政政策、涉外贸易壁垒、产业合作、地方配套产业政策。\n\n**第三步：单条新闻定性**\n每条产业资讯单独标注属性：【短期事件催化 - 脉冲行情（约1周内）】【中期政策主线 - 机构驱动（1-3个月）】【长期产业趋势 - 基本面兑现（2-5年）】，提炼底层核心驱动逻辑（政策/技术/供需/成本）。\n\n**第四步：行业生命周期定位**\n标注该细分赛道当前所处阶段（导入期/高速成长期/成熟期/衰退期），并说明不同阶段下同类政策的受益弹性系数差异。\n\n**第五步：全产业链分层拆解**\n分三档划分受益强度，标注利空承压板块：高弹性核心细分板块、低弹性间接受益板块、利空压制板块。\n\n**第六步：趋势与行情持续性判断**\n结合政策层级、赛道市场空间、行业当前渗透率，预判题材持续周期、市场资金偏好方向，预判行业未来2-5年发展大趋势。\n\n**第七步：海外对标/联动效应检查**\n该产业方向是否存在明确的海外映射？若有，标注联动强度和逻辑映射关系。\n\n**第八步：预期差判断**\n该新闻内容是否已在此前政策吹风、重要会议通稿、部委例行发布中被提前消化？市场是否已对此方向充分定价？\n\n**第九步：统一汇总全维度潜在风险**\n政策落地不及预期、行业产能过剩引发价格战、原材料价格大幅波动、利好提前被股价透支、下游终端需求疲软、行业监管收紧。\n\n**第十步：后续关键跟踪指标**\n列出未来1-3个月需要重点跟踪的具体数据发布节点、政策节点、行业事件。\n\n**输出格式要求：**\n每一步的输出只写核心结论，用\"|\"符号做分隔符，不要用任何markdown符号（不要用*、#、-等），每条结论用纯文字描述。例如：\n\n第一步 | 市场处于修复期，本次新闻属于已有政策预期的落地确认\n第二步 | 保留3条产业资讯：1.节能降碳新政策 2.国际AI合作 3.区域基建规划\n第三步 | 节能降碳：长期趋势，政策驱动；AI合作：中期主线，技术驱动\n第四步 | 节能降碳：高速成长期，政策弹性大\n第五步 | 高弹性：光伏设备、储能、碳交易；低弹性：传统能源设备\n第六步 | 预计持续2-3个月，资金偏好新能源赛道\n第七步 | 美股新能源龙头先行，A股跟随补涨\n第八步 | 节能降碳已有充分预期，注意利好兑现\n第九步 | 行业产能过剩、原材料价格波动\n第十步 | 关注8月能源局数据发布、9月碳交易市场扩容\n\n**全文末尾强制标注：**\n以上分析基于公开新闻内容的产业逻辑推演，未考虑个别公司治理、资金面博弈、大股东减持等非产业因素。以上内容不构成任何投资建议。";

function cleanMarkdown(text) {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s*/g, '').replace(/---+/g, '').replace(/>\s*/g, '').replace(/\|\|/g, '|').trim();
}

function splitAnalysis(text) {
  const sixthIdx = text.indexOf('第六步');
  if (sixthIdx > 0 && sixthIdx < text.length / 2) {
    return { part1: text.substring(0, sixthIdx).trim(), part2: text.substring(sixthIdx).trim() };
  }
  const mid = Math.floor(text.length / 2);
  const splitAt = text.indexOf('\n', mid);
  return { part1: text.substring(0, splitAt > 0 ? splitAt : mid).trim(), part2: text.substring(splitAt > 0 ? splitAt : mid).trim() };
}

function buildMessage(title, content, icon) {
  const lines = content.split('\n').filter(l => l.trim());
  const msgContent = [];
  msgContent.push([{ tag: 'text', text: icon + ' ' + title }]);
  msgContent.push([{ tag: 'text', text: '━━━━━━━━━━━━━━━━━' }]);
  msgContent.push([{ tag: 'text', text: '' }]);
  for (const line of lines) {
    const cleaned = cleanMarkdown(line);
    if (cleaned) {
      if (cleaned.startsWith('|')) {
        const parts = cleaned.substring(1).split('|').map(s => s.trim()).filter(s => s);
        if (parts.length >= 2) {
          msgContent.push([{ tag: 'text', text: '\n📌 ' + parts[0] }]);
          msgContent.push([{ tag: 'text', text: '  ' + parts.slice(1).join(' | ') }]);
        } else {
          msgContent.push([{ tag: 'text', text: cleaned }]);
        }
      } else {
        msgContent.push([{ tag: 'text', text: cleaned }]);
      }
    }
  }
  msgContent.push([{ tag: 'text', text: '' }]);
  msgContent.push([{ tag: 'text', text: '—————————————————' }]);
  msgContent.push([{ tag: 'text', text: '由 DeepSeek AI 分析生成' }]);
  return {
    msg_type: 'post',
    content: { post: { zh_cn: { title: icon + ' ' + title + ' (' + DATE + ')', content: msgContent } } }
  };
}

async function sendMessage(msg) {
  const resp = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  });
  if (!resp.ok) { const err = await resp.text(); throw new Error('Feishu error: ' + resp.status + ' ' + err); }
  const r = await resp.json();
  if (r.code !== 0) throw new Error('Feishu api error: code=' + r.code + ' msg=' + r.msg);
  return r;
}

async function main() {
  if (!DEEPSEEK_KEY) { console.log('未设置 DEEPSEEK_API_KEY，跳过'); process.exit(0); }
  if (!WEBHOOK_URL) { console.error('未设置 FEISHU_WEBHOOK'); process.exit(1); }
  if (!fs.existsSync(NEWS_PATH)) { console.log('新闻文件不存在，跳过'); process.exit(0); }

  const md = fs.readFileSync(NEWS_PATH, 'utf-8');
  const text = md.replace(/<[^>]*>/g, '').trim();
  const input = text.length > 8000 ? text.substring(0, 8000) + '\n\n[截取]' : text;

  console.log('正在调用 DeepSeek 分析...');
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_KEY },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: input }], temperature: 0.3, max_tokens: 2500 })
  });
  if (!resp.ok) { const err = await resp.text(); throw new Error('DeepSeek API error: ' + resp.status); }
  const data = await resp.json();
  const analysis = data.choices[0].message.content;
  console.log('分析完成，共 ' + analysis.length + ' 字');

  const { part1, part2 } = splitAnalysis(analysis);
  console.log('第一部分: ' + part1.length + ' 字');
  console.log('第二部分: ' + part2.length + ' 字');

  const msg1 = buildMessage('产业逻辑分析', part1, '📊');
  const msg2 = buildMessage('交易参考与风险', part2, '📈');

  await sendMessage(msg1);
  console.log('✅ 第一条（产业逻辑分析）已发送');
  await sendMessage(msg2);
  console.log('✅ 第二条（交易参考与风险）已发送');
}

await main();