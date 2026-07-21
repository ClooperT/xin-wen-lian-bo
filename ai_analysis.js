import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATE = (() => { const a = n => n < 10 ? '0' + n : '' + n; const d = new Date(); return '' + d.getFullYear() + a(d.getMonth() + 1) + a(d.getDate()); })();
const NEWS_PATH = path.join(__dirname, 'news', DATE + '.md');
const WEBHOOK_URL = process.env.FEISHU_WEBHOOK;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const SYSTEM_PROMPT = "你定位为专业宏观产业策略分析师，专门解读每日 7 点央视新闻，只做 A 股行业板块逻辑推演，绝不推荐个股、不预测个股涨跌、不给出买卖点位。\n我将发送当日完整央视新闻内容，请严格按以下统一流程分析：\n**第一步：市场环境定位**\n结合当前大盘所处的点位区间、成交量、市场情绪周期（冰点/修复/高潮），判断该轮新闻驱动力所处的宏观定价语境——是已有预期的落地，还是超预期的增量信息。\n**第二步：信息筛选提纯（修订版过滤/保留细则）**\n过滤内容：纯社会民生琐事、无产业关联的单纯灾害救援纪实、文娱文体、无关普通海外快讯、社会案件娱乐类内容。\n灾害类区分规则（重点）：\n过滤：仅报道人员受灾、抢险安置、城镇损毁，未提及农作物、矿产、能源、大宗商品产量与供给的纯灾情新闻。\n保留：涉及国内粮食主产区、经济作物种植带、海外大宗商品产区、矿产/油气基地、水产养殖区的极端天气、地质灾害，且新闻提及减产、供给收缩、价格波动、保供政策、救灾农资补贴的资讯——这类直接改变供需，会驱动农业、化工、资源板块行情。\n强制保留产业类资讯：顶层国家级产业政策、科技攻关、能源转型、基建、高端制造、农业扶持、外贸关税、行业新规、产业补贴、重大项目、央行财政政策、涉外贸易壁垒、产业合作、地方配套产业政策。\n**第三步：单条新闻定性**\n每条产业资讯单独标注属性：\n【短期事件催化 - 脉冲行情（约1周内）】\n【中期政策主线 - 机构驱动（1-3个月）】\n【长期产业趋势 - 基本面兑现（2-5年）】\n提炼底层核心驱动逻辑（政策 / 技术 / 供需 / 成本）。\n**第四步：行业生命周期定位**\n标注该细分赛道当前所处阶段（导入期 / 高速成长期 / 成熟期 / 衰退期），并说明不同阶段下同类政策的受益弹性系数差异。\n**第五步：全产业链分层拆解**（上游原材料 → 中游设备/零部件制造 → 下游终端运营 → 配套服务）\n分三档划分受益强度，同时标注利空承压板块：\n① 高弹性核心细分板块：业务高度绑定主线，业绩直接拉动，行情弹性最大；\n② 低弹性间接受益板块：仅少量业务关联，利好传导滞后，多为跟风行情；\n③ 利空压制板块：行业需求萎缩、政策限制、产品被替代。\n**第六步：趋势与行情持续性判断**\n结合政策层级（顶层国家级 / 地方落地）、赛道市场空间、行业当前渗透率，预判题材持续周期、市场资金偏好方向，预判行业未来2-5年发展大趋势。\n**第七步：海外对标 / 联动效应检查**\n该产业方向是否存在明确的海外映射？若有，标注联动强度和逻辑映射关系（如：美股龙头先行 → A 股跟随补涨，或海外政策 → 国内出口链受益）。\n**第八步：预期差判断**\n该新闻内容是否已在此前政策吹风、重要会议通稿、部委例行发布中被提前消化？市场是否已对此方向充分定价？若已有充分预期，利好兑现时需警惕高点。\n**第九步：统一汇总全维度潜在风险**\n政策落地不及预期\n行业产能过剩引发价格战\n原材料价格大幅波动\n利好提前被股价透支\n下游终端需求疲软\n行业监管收紧\n**第十步：后续关键跟踪指标**\n列出未来1-3个月需要重点跟踪的具体数据发布节点、政策节点、行业事件，用于验证或修正当前判断。\n**输出格式**\n条理清晰分段分层，每条资讯独立分析，逻辑层层递进，不用笼统大类概括，必须精准到细分赛道。\n**全文末尾强制统一标注：**\n以上分析基于公开新闻内容的产业逻辑推演，未考虑个别公司治理、资金面博弈、大股东减持等非产业因素。以上内容不构成任何投资建议，股价走势同时受大盘、市场资金、情绪、估值多重因素影响。";

function splitAnalysis(text) {
  var p1 = '', p2 = '', p3 = '';
  var i4 = text.indexOf('第四步');
  var i6 = text.indexOf('第六步');
  if (i4 > 0) {
    p1 = text.substring(0, i4).trim();
    if (i6 > i4) { p2 = text.substring(i4, i6).trim(); p3 = text.substring(i6).trim(); }
    else { p2 = text.substring(i4).trim(); }
  } else if (i6 > 0) {
    p1 = text.substring(0, i6).trim();
    p2 = text.substring(i6).trim();
  } else { p1 = text; }
  return { part1: p1, part2: p2, part3: p3 };
}

function buildMessage(title, content, icon) {
  const sl = ['📌 市场环境','📌 筛选产业资讯','📌 新闻定性','📌 行业生命周期','📌 产业链分层','📌 趋势与持续性','📌 海外对标','📌 预期差','📌 风险汇总','📌 跟踪指标'];
  const skip = [1]; const cn = {'一':0,'二':1,'三':2,'四':3,'五':4,'六':5,'七':6,'八':7,'九':8,'十':9};
  const msg = []; msg.push([{tag:'text',text:icon+' '+title}]); msg.push([{tag:'text',text:''}]);
  var hide = false;
  for (const l of content.split('\n').filter(x=>x.trim())) {
    var t = l.replace(/\*\*/g,'').replace(/\*/g,'').replace(/#{1,6}\s*/g,'').replace(/^[\s>|-]+/gm,'').replace(/\s{2,}/g,' ').trim();
    if (!t || t.includes('以上分析')) continue;
    var m = t.match(/第([一二三四五六七八九十\d])步/);
    if (m) {
      var idx = cn[m[1]] !== undefined ? cn[m[1]] : (parseInt(m[1])-1);
      if (idx >= 0 && idx < sl.length) { hide = skip.includes(idx); if (!hide) { msg.push([{tag:'text',text:''}]); msg.push([{tag:'text',text:sl[idx]}]); } continue; }
    }
    if (!hide) msg.push([{tag:'text',text:t}]);
  }
  msg.push([{tag:'text',text:''}]); msg.push([{tag:'text',text:'─────────────'}]); msg.push([{tag:'text',text:'由 DeepSeek AI 分析生成'}]);
  return {msg_type:'post',content:{post:{zh_cn:{title:icon+' '+title+' ('+DATE+')',content:msg}}}};
}

async function sendMessage(msg) {
  const resp = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const r = await resp.json();
  if (r.code !== 0) throw new Error('code=' + r.code);
  return r;
}

async function main() {
  if (!DEEPSEEK_KEY) { console.log('跳过'); process.exit(0); }
  if (!WEBHOOK_URL) { console.error('未设置FEISHU_WEBHOOK'); process.exit(1); }
  if (!fs.existsSync(NEWS_PATH)) { console.log('新闻文件不存在'); process.exit(0); }
  const text = fs.readFileSync(NEWS_PATH,'utf-8').replace(/<[^>]*>/g,'').trim();
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+DEEPSEEK_KEY},
    body:JSON.stringify({model:'deepseek-chat', messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:text.substring(0,8000)}], temperature:0.3, max_tokens:4000})
  });
  if (!resp.ok) throw new Error('DeepSeek ' + resp.status);
  const d = (await resp.json()).choices[0].message.content;
  console.log('分析完成，共 ' + d.length + ' 字');
  var {part1,part2,part3} = splitAnalysis(d);
  console.log('三段: ' + (part1||'').length + ' + ' + (part2||'').length + ' + ' + (part3||'').length);
  if (part1) { await sendMessage(buildMessage('市场环境与定性',part1,'📊')); console.log('✅ 1/3'); }
  if (part2) { await sendMessage(buildMessage('行业与产业链',part2,'🔬')); console.log('✅ 2/3'); }
  if (part3) { await sendMessage(buildMessage('交易参考与风险',part3,'📈')); console.log('✅ 3/3'); }
}
await main();