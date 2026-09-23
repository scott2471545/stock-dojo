/* views.js — 各工具畫面。每個 view 回傳 DOM 片段，router 掛到 #view。 */
const Views = {};
let META = null;

/* 戰情室（盤中）外部連結——用絕對網址，Artifact 與 GitHub Pages 都能開 */
const WARROOM_BASE = 'https://scott2471545.github.io/stock-dojo/';
const WARROOM = [
  {name:'族群強弱牆', page:'index.html', use:'51 族群紅綠強弱一覽', icon:'🧱'},
  {name:'四象限', page:'quadrant.html', use:'個股當日% × 族群強弱%', icon:'🎯'},
  {name:'開盤突破K', page:'breakout.html', use:'5分K 突破起漲確認', icon:'📈'},
  {name:'處置監獄', page:'dispose.html', use:'處置中／出獄名單', icon:'🔒'},
  {name:'逢黑觀察', page:'hei.html', use:'逢黑貼線買點', icon:'⚫'},
  {name:'籌碼比較', page:'chip_compare.html', use:'族群籌碼對照', icon:'💰'},
  {name:'記分板', page:'scoreboard.html', use:'均線分數／強弱記分', icon:'🏅'},
  {name:'空方觀察', page:'short.html', use:'弱勢空單觀察', icon:'🔻'},
];
const warUrl = (p)=> WARROOM_BASE + p;

/* ---------- 共用小元件 ---------- */
function h2(title, tagHtml){ return `<h2>${title}${tagHtml?`<span class="tag">${tagHtml}</span>`:''}</h2>`; }
function pageTitle(icon,name,sub){ return `<div class="pagetitle">${icon} ${name}</div>${sub?`<div class="pagesub">${sub}</div>`:''}`; }
function demoTag(){ return '<span class="demo-tag">示範</span>'; }
function goStock(code){ Router.go('diag',{code}); }

function defenseGrid(def){
  const line=(l)=>{
    if(!l) return '';
    const pill = l.held==null?'':l.held?'<span class="pill held">✓ 守住</span>':'<span class="pill broke">✕ 跌破</span>';
    const dc = l.distPct==null?'flat':l.distPct>=0?'up':'down';
    return `<div class="def when-${l.when}"><div class="dl">${l.label}${l.demo?' '+demoTag():''}<small>${l.when==='today'?'本交易日盤中判定':'收盤後・下一交易日'}</small></div>
      <div class="dv"><div class="price mono">${fmt(l.value)}</div><div class="dist mono ${dc}">距現價 ${l.distPct==null?'—':(l.distPct>0?'+':'')+fmt(l.distPct)+'%'}</div></div>${pill}</div>`;
  };
  const L=def.lines;
  return `<div class="def-grid">${line(L.monthToday)}${line(L.monthNext)}${line(L.low3Today)}${line(L.low3Next)}${line(L.redHalfNext)}</div>
    <div class="legend"><i style="color:var(--teal)">▎本交易日判定價</i><i style="color:var(--gold)">▎下一交易日價</i><i>月線=20日均・三日低=不含當日前三日低</i></div>`;
}

/* ================= 首頁 ================= */
Views.home = async ()=>{
  const c=el('div');
  const demo = META.demo ? `<div class="demo-banner">⚠ <b>示範資料</b>・截至 ${META.asOf} 收盤・非即時行情。${esc(META.note||'')}</div>`:'';
  c.appendChild(el('div','hero',`<h1>🏠 台股工作台</h1><div class="pagesub">盤中看戰情室、盤後進研究書房・僅供研究學習，不構成投資建議</div>
    <div class="chips" style="margin-top:8px"><span class="chip" onclick="Router.go('diag',{code:'2426'})">🩺 個股問診</span>
    <span class="chip" onclick="Router.go('health')">💰 持股健診</span>
    <span class="chip" onclick="Router.go('daily')">📰 波段日報</span>
    <span class="chip" onclick="Router.go('mascore')">🏆 均線分數榜</span></div>${demo}`));
  // 🔴 盤中・戰情室（外部連結，新分頁開）
  c.appendChild(el('div','grp-title','🔴 盤中・戰情室（即時族群/技術）'));
  const wgrid=el('div','grid2');
  WARROOM.forEach(w=>{const card=el('div','tool-card');
    card.innerHTML=`<div class="tc-name">${w.icon} ${esc(w.name)} ↗</div><div class="tc-use">${esc(w.use)}</div><div class="tc-foot">戰情室・盤中即時</div>`;
    card.onclick=()=>window.open(warUrl(w.page),'_blank','noopener');wgrid.appendChild(card);});
  c.appendChild(wgrid);
  c.appendChild(el('div','grp-title','🔵 盤後・研究書房（收盤研究/學習）'));
  // 最近查詢
  const rec=getRecent();
  if(rec.length){const r=el('div','card',h2('🕘 最近查詢'));const ch=el('div','chips');
    rec.forEach(x=>{const b=el('span','chip',`${x.code} ${esc(x.name)}`);b.onclick=()=>goStock(x.code);ch.appendChild(b);});
    r.appendChild(ch);c.appendChild(r);}
  // 今日資料更新狀態
  const upd=el('div','card',h2('📅 今日資料狀態', META.demo?'示範':''));
  (META.updateTimes||[]).forEach(u=>upd.appendChild(el('div','mini-note',`・${esc(u.tool)}：${esc(u.time)}（${esc(u.note)}）`)));
  c.appendChild(upd);
  // 工具分組卡
  const groups={};(META.tools||[]).forEach(t=>{(groups[t.group]=groups[t.group]||[]).push(t)});
  Object.keys(groups).forEach(g=>{
    c.appendChild(el('div','grp-title',g));
    const grid=el('div','grid2');
    groups[g].forEach(t=>{const card=el('div','tool-card',
      `<div class="tc-name">${esc(t.name)}</div><div class="tc-use">${esc(t.use)}</div><div class="tc-foot">資料日 ${META.asOf}</div>`);
      card.onclick=()=>Router.go(t.id);grid.appendChild(card);});
    c.appendChild(grid);
  });
  return c;
};

/* ================= 新手教學 ================= */
Views.guide = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('🎓','新手教學・第一次使用','看數字前先確認：這是哪一天的資料？盤中還是收盤？');
  c.appendChild(el('div','card',h2('選單怎麼分')+
    (META.tools||[]).reduce((a,t)=>a+`<div class="mini-note">・<b style="color:var(--text)">${esc(t.name)}</b>（${esc(t.group)}）：${esc(t.use)}</div>`,'')));
  const basics=[['台股顏色','紅色=上漲、綠色=下跌（和美股相反）。本站全程紅漲綠跌，並搭 ▲▼ 與文字，不只靠顏色。'],
    ['資料日期','每個數字都標「資料所屬日」。示範資料統一為 '+META.asOf+' 收盤。'],
    ['盤中 vs 收盤','盤中快照會變動、收盤數據才定案。防守價分「本交易日判定價」與「下一交易日價」兩欄，別混用。']];
  const b=el('div','card',h2('三個基本觀念'));basics.forEach(([k,v])=>b.appendChild(el('div','mini-note',`・<b style="color:var(--text)">${k}</b>：${v}`)));
  c.appendChild(b);
  const t=el('div','card',h2('每個工具怎麼讀')+`<div class="mini-note">每個工具頁上方都有「這個數字代表什麼／適合回答什麼／常見誤判」三行說明。</div>`);
  const jump=el('div','chips','');['diag','revenue','mascore','etf','disposals'].forEach(id=>{const t2=(META.tools||[]).find(x=>x.id===id);if(t2){const ch=el('span','chip',t2.name);ch.onclick=()=>Router.go(id);jump.appendChild(ch);}});
  t.appendChild(jump);c.appendChild(t);
  return c;
};

/* ================= 個股問診 ================= */
Views.diag = async (q)=>{
  const c=el('div');
  const code=q.code||'2426';
  const d=await API.get('/stock',{code});
  if(d.error){c.appendChild(el('div','card',h2('查無股票')+`<div class="note">${esc(d.hint||'')}</div>`));return c;}
  pushRecent(d.code,d.name);
  // header
  c.appendChild(el('div','card',
    `<div class="head-row"><span class="name">${esc(d.name)}</span><span class="code">${d.code}</span>
      <span class="sector" onclick="Router.go('industry',{id:'${d.industry}'})">🏭 ${esc(d.industryName)}</span></div>
     <div class="price-row"><span class="px mono ${dirClass(d.chg)}">${fmt(d.close)}</span>
      <span class="chg mono ${dirClass(d.chg)}">${arrow(d.chg)} ${signPct(d.chg)}</span></div>
     <div class="note">📅 ${d.asOf} 收盤・昨收 ${fmt(d.prevClose)}｜來源 ${esc(d.prov.source)}・${d.prov.demo?'示範資料':'正式'}</div>
     <div class="chips" style="margin-top:8px">${(META.warroomCodes||[]).includes(d.code)?`<a class="chip" href="${warUrl('突破_'+d.code+'.html')}" target="_blank" rel="noopener">🔴 盤中突破K ↗</a>`:''}<a class="chip" href="${WARROOM_BASE}" target="_blank" rel="noopener">🧱 族群牆 ↗</a></div>`));
  // 總覽
  const ov=el('div','card',h2('🩺 個股總覽', d.defenses.statusLabel));
  ov.appendChild(el('div','chips',
    `<span class="badge ${d.strength.tone}">${d.strength.grade}${d.strength.score!=null?'｜綜合 '+d.strength.score:''}</span>
     <span style="font-size:14px">紅綠燈 <b class="up">🔴 ${d.redgreen.red}</b> ・ <b class="down">🟢 ${d.redgreen.green}</b></span>`));
  const dl=d.defenses.lines;
  ov.appendChild(el('div','note',`🛡️ 下一交易日：月線 ${fmt(dl.monthNext.value)}（${dl.monthNext.held?'守住':'跌破'}）、三日低 ${fmt(dl.low3Next.value)}（${dl.low3Next.held?'守住':'跌破'}）`));
  const vd=el('div','verdict',`<div class="head">📝 白話結論：${esc(d.verdict.head)}</div>`);
  const ul=el('ul','vlist');
  d.verdict.support.forEach(t=>ul.appendChild(el('li','s',`<span class="ico">▲</span><span>支持上漲：${esc(t)}</span>`)));
  d.verdict.conflict.forEach(t=>ul.appendChild(el('li','c',`<span class="ico">⚠</span><span>矛盾/中性：${esc(t)}</span>`)));
  d.verdict.against.forEach(t=>ul.appendChild(el('li','a',`<span class="ico">▼</span><span>轉弱：${esc(t)}</span>`)));
  vd.appendChild(ul);ov.appendChild(vd);
  ov.appendChild(el('div','note','強弱分級與紅綠燈為<b>示範規則（待確認）</b>，非原站公式。'));
  c.appendChild(ov);
  // 七科
  const S=d.subjects;const sub=el('div','card',h2('📋 七科問診')+`<div class="note">近10交易日/近8週/近4月・缺漏顯示「無資料」不補零</div>`);
  const box=el('div','subjects');
  const mk=(name,val,sub2,detail,demo)=>{const dt=el('details','subj');
    dt.innerHTML=`<summary><span class="s-name">${name}${demo?' '+demoTag():''}</span><span class="s-val">${val}<div class="s-sub">${sub2||''}</div></span><span class="s-sub">▼</span></summary><div class="detail">${detail||''}</div>`;return dt;};
  box.appendChild(mk('均線分數',`${S.maScore.value}<span class="s-sub" style="display:inline">/15</span>`,S.maScore.isBull?'多方區':'偏弱',
    `<div class="row"><span>站上均線/創新高/多頭排列</span><b>${S.maScore.above}・${S.maScore.newHigh}・${S.maScore.align}</b></div><div class="explain">🔎 站上6均線+創6新高+多頭排列滿15；≥8多方。</div><div class="row"><span>近10日</span>${spark(S.maScore.spark10)}</div>`));
  box.appendChild(mk('族群名次',`第 ${S.sectorRank.value??'—'}`,`共 ${S.sectorRank.total} 族`,`<div class="explain">🔎 所屬族群在 ${S.sectorRank.total} 族中的強度名次，越小越前段。</div>`));
  box.appendChild(mk('個股族內名次',`第 ${S.inRank.value??'—'}/${S.inRank.total}`,'同族當日強弱',`<div class="explain">🔎 同族 ${S.inRank.total} 檔，本檔今日排第 ${S.inRank.value}。</div>`));
  box.appendChild(mk('大戶持股(集保)',S.chip&&S.chip.weekPct!=null?`${S.chip.weekPct>0?'+':''}${fmt(S.chip.weekPct)} pp`:(S.chip&&S.chip.big!=null?`${fmt(S.chip.big,1)}%`:'<span class="nodata">無資料</span>'),S.chip&&S.chip.big!=null?`大戶佔 ${fmt(S.chip.big,1)}%`:'',S.chip?`<div class="row"><span>資料週</span><span>${esc(S.chip.asOf||'')}</span></div><div class="explain">🔎 集保 ≥400張大戶持股比率的『週』變化(百分點)。增＝大戶進、減＝大戶出。</div><div class="row"><span>近8週大戶%</span>${spark(S.chip.spark8w)}</div>`:''));
  box.appendChild(mk('本益比',S.estPE.value!=null?fmt(S.estPE.value,1):'<span class="nodata">無資料</span>',S.estPE.real?'官方當日':(S.estPE.value!=null?`落點 ${esc(S.estPE.layer||'')}`:esc(S.estPE.reason||'')),`<div class="explain">🔎 ${S.estPE.real?'TWSE/TPEx 當日本益比。':(S.estPE.value==null?'獲利太薄或資料不足時不硬估。':'本平台自有估值模型。')}</div>`+(S.estPE.value!=null?`<div class="row"><span></span><span class="lk" onclick="Router.go('valuation',{code:'${d.code}'})">看估值河流圖 →</span></div>`:'')));
  box.appendChild(mk('營收成長',S.revenue?`${S.revenue.yoy>0?'+':''}${fmt(S.revenue.yoy,1)}%`:'<span class="nodata">無資料</span>',S.revenue?`${S.revenue.month} 年增`:'',S.revenue?`<div class="row"><span>單月/月增/累計</span><b>${S.revenue.cur}億・${S.revenue.mom>0?'+':''}${fmt(S.revenue.mom,1)}%・累計${S.revenue.cumYoy>0?'+':''}${fmt(S.revenue.cumYoy,1)}%</b></div><div class="row"><span>首次公布</span><span>${S.revenue.firstPub}</span></div>`:''));
  box.appendChild(mk('法人買賣超',S.inst?`${(S.inst.today??S.inst.net5)>0?'+':''}${fmtInt(S.inst.today??S.inst.net5)} 張`:'<span class="nodata">無資料</span>',S.inst?`當日三大法人`:'',S.inst?`<div class="row"><span>外資/投信/自營</span><b>${fmtInt(S.inst.foreign)}/${fmtInt(S.inst.invest)}/${fmtInt(S.inst.dealer)}</b></div><div class="row"><span>資料日</span><span>${esc(S.inst.asOf||d.asOf)}</span></div>${S.inst.spark10?`<div class="row"><span>近10日</span>${spark(S.inst.spark10)}</div>`:''}<div class="explain">🔎 三大法人當日買賣超（TWSE/TPEx）。</div>`:''));
  sub.appendChild(box);c.appendChild(sub);
  // 防守
  const df=el('div','card',h2('🛡️ 防守價位')+`<div class="note">現價 ${fmt(d.close)}。<b>本交易日判定價</b>與<b>下一交易日價</b>分開，避免混淆。</div>`);
  df.innerHTML+=`<div class="badge ${d.defenses.tone==='ok'?'ok':d.defenses.tone==='warn'?'warn':'danger'}" style="margin-bottom:8px">${d.defenses.tone==='ok'?'✓':d.defenses.tone==='warn'?'⚠':'✕'} ${d.defenses.statusLabel}</div>`+defenseGrid(d.defenses);
  c.appendChild(df);
  // 成本
  c.appendChild(costCard(d.code, d.close));
  // 同族
  c.appendChild(peerCard(d));
  // 族群
  const sc=el('div','card',h2('🔥 族群強度・今日名單'));
  d.sectorStrength.forEach(s=>{const it=el('div','item');
    it.innerHTML=`<div class="r1"><span class="nm">${s.rank}. ${esc(s.name)}${s.id===d.industry?' <span class="tag ok">本股</span>':''}</span><span class="rt bars"><span class="b bs">強${s.strong}</span><span class="b bm">中${s.mid}</span><span class="b bw">弱${s.weak}</span></span></div>`;
    if((s.today||[]).length){const r2=el('div','r2');s.today.forEach(cd=>{const a=el('span','lk',cd);a.onclick=(e)=>{e.stopPropagation();goStock(cd);};r2.appendChild(a);});it.appendChild(r2);}
    sc.appendChild(it);});
  c.appendChild(sc);
  return c;
};

function costCard(code, close){
  const c=el('div','card',h2('💰 持股成本分析')+`<div class="note">輸入成本與股數即時算損益（未扣手續費/稅）。<b>技術防守線</b>與<b>個人停損線</b>分開。</div>`);
  c.innerHTML+=`<div class="row2"><div><label>買進成本（元）</label><input id="cc" type="number" inputmode="decimal" placeholder="例 100.34"></div><div><label>持有股數</label><input id="cs" type="number" inputmode="numeric" placeholder="例 3000"></div></div>
    <div class="divider-label">🧑 個人停損線（可調）</div><div class="chips">停損 <input id="cp1" type="number" value="3" style="width:64px"> % ・ <input id="cp2" type="number" value="5" style="width:64px"> %</div>
    <div id="cout"><div class="mini-note" style="margin-top:8px">輸入成本後開始計算。</div></div>`;
  const recalc=async()=>{
    const cost=parseFloat(c.querySelector('#cc').value); const shares=parseFloat(c.querySelector('#cs').value)||0;
    const p1=parseFloat(c.querySelector('#cp1').value)||3, p2=parseFloat(c.querySelector('#cp2').value)||5;
    const out=c.querySelector('#cout');
    if(!cost||cost<=0){out.innerHTML='<div class="mini-note" style="margin-top:8px">輸入成本後開始計算。</div>';return;}
    const r=await API.post('/screen',{}); // warm noop (keep parity) -- actual calc below client-side via defense
    const dd=await API.get('/stock',{code});
    const def=dd.defenses; const pnl=(px)=>({amt:shares?Math.round((px-cost)*shares):null,pct:Math.round((px-cost)/cost*10000)/100});
    const now=pnl(close);
    let html=`<div class="chips" style="margin:12px 0"><span class="px mono ${dirClass(now.pct)}" style="font-size:24px;font-weight:800">${now.amt==null?'—':(now.amt>0?'+':'')+fmtInt(now.amt)} 元</span><span class="mono ${dirClass(now.pct)}" style="font-weight:800">${arrow(now.pct)} ${signPct(now.pct)}</span></div>
      <div class="mini-note">現價 ${fmt(close)}｜成本 ${fmt(cost)}${shares?'｜'+fmtInt(shares)+' 股':'（未輸入股數，只算%）'}・未扣費用</div>`;
    html+=`<div class="divider-label">🛡️ 技術防守線跌破時・相對成本</div><div class="def-grid">`;
    ['monthNext','low3Next','redHalfNext'].forEach(k=>{const l=def.lines[k];if(l.value==null)return;const p=pnl(l.value);
      html+=`<div class="def"><div class="dl">${l.label}${l.demo?' '+demoTag():''}<small>跌到 ${fmt(l.value)} 時</small></div><div class="dv"><div class="price mono ${dirClass(p.pct)}">${signPct(p.pct)}</div><div class="dist mono">${p.amt==null?'':(p.amt>0?'+':'')+fmtInt(p.amt)+' 元'}</div></div></div>`;});
    html+=`</div><div class="divider-label">🧑 個人停損線</div><div class="def-grid">`;
    [p1,p2].forEach(pp=>{const price=Math.round(cost*(1-pp/100)*100)/100;const held=close>=price;const dist=Math.round((close-price)/price*10000)/100;
      html+=`<div class="def"><div class="dl">停損 -${pp}%<small>停損價 ${fmt(price)}</small></div><div class="dv"><div>${held?'<span class="pill held">✓ 未觸及</span>':'<span class="pill broke">✕ 已觸及</span>'}</div><div class="dist mono">距現價 ${dist>0?'+':''}${fmt(dist)}%</div></div></div>`;});
    html+=`</div><div class="mini-note" style="margin-top:8px">⚠ 技術防守線是網站算的參考位；個人停損線是你自訂的風險線，用途不同、不可混為一談。</div>`;
    out.innerHTML=html;
  };
  ['cc','cs','cp1','cp2'].forEach(id=>c.querySelector('#'+id).addEventListener('input',recalc));
  // 預帶 2426 測試值
  if(code==='2426'){setTimeout(()=>{c.querySelector('#cc').value='100.34';c.querySelector('#cs').value='3000';recalc();},0);}
  return c;
}

function peerCard(d){
  const c=el('div','card',h2('👥 同族比較')+`<div class="note">點任一檔切換問診。可排序與依防守狀態篩選。</div>`);
  let sortKey='chg',dir=-1,filter='all';
  const fr=el('div','chips');['all:全部','held:守住','single-break:單破','double-break:雙破'].forEach(x=>{const[k,l]=x.split(':');const ch=el('span','chip'+(k==='all'?' active':''),l);ch.onclick=()=>{filter=k;fr.querySelectorAll('.chip').forEach(z=>z.classList.remove('active'));ch.classList.add('active');draw();};fr.appendChild(ch);});
  c.appendChild(fr);const body=el('div','scroll-x');c.appendChild(body);
  function draw(){let rows=d.peers.slice();
    if(filter!=='all')rows=rows.filter(r=>r.defStatus===filter);
    rows.sort((a,b)=>{const av=a[sortKey],bv=b[sortKey];if(av==null)return 1;if(bv==null)return -1;return (av-bv)*dir;});
    const th=(k,l)=>`<th class="${sortKey===k?'active':''}" data-k="${k}">${l}${sortKey===k?(dir<0?' ↓':' ↑'):''}</th>`;
    let html=`<table class="t"><thead><tr><th class="name">股票</th>${th('chg','漲跌%')}${th('maScore','均線')}${th('chip','籌碼%')}${th('pe','PE')}<th>強弱</th><th>防守</th></tr></thead><tbody>`;
    rows.forEach(r=>{html+=`<tr class="${r.self?'self':''}"><td class="name"><span class="lk" data-go="${r.code}">${esc(r.name)} <small style="color:var(--muted)">${r.code}</small></span></td>
      <td class="mono ${dirClass(r.chg)}">${arrow(r.chg)}${fmt(r.chg)}</td><td class="mono">${r.maScore??'—'}</td>
      <td class="mono ${dirClass(r.chip)}">${r.chip==null?'—':(r.chip>0?'+':'')+fmt(r.chip,1)}</td><td class="mono">${r.pe==null?'—':fmt(r.pe,1)}</td>
      <td>${esc(r.grade)}</td><td>${r.defStatus==='held'?'守住':r.defStatus==='single-break'?'單破':'雙破'}</td></tr>`;});
    html+='</tbody></table>';body.innerHTML=html;
    body.querySelectorAll('th[data-k]').forEach(t=>t.onclick=()=>{const k=t.dataset.k;if(sortKey===k)dir*=-1;else{sortKey=k;dir=-1;}draw();});
    body.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
  }
  draw();return c;
}

/* ================= 我的持股健診 ================= */
Views.health = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('💰','我的持股健診','貼上持股→整批算損益＋基本/籌碼/技術＋防守。以 2426 成本100.34 驗收。');
  // 新增/管理持股
  const mgr=el('div','card',h2('我的持股')+`<div class="row3"><input id="hc" placeholder="代號或名稱"><input id="hcost" type="number" placeholder="成本"><input id="hsh" type="number" placeholder="股數"></div>
    <div style="margin-top:8px"><input id="hnote" placeholder="備註（可空）"></div>
    <div style="margin-top:8px"><button class="btn" id="hadd">＋ 新增持股</button> <button class="btn ghost" id="hbulk">批次貼上</button></div>
    <div id="hbulkbox" class="hidden" style="margin-top:8px"><textarea id="hta" placeholder="一行一檔，例：2426 100.34 3000 備註"></textarea><button class="btn sm" id="hbulkgo">解析新增</button></div>`);
  c.appendChild(mgr);
  const listCard=el('div','card',h2('健診結果'));const body=el('div');listCard.appendChild(body);c.appendChild(listCard);
  async function refresh(){
    const d=await API.get('/health');
    if(!d.rows.length){body.innerHTML='<div class="empty">尚未加入持股。上方新增，或批次貼上。</div>';return;}
    const rows=d.rows.slice();
    let html='<div class="scroll-x"><table class="t"><thead><tr><th class="name">股票</th><th>成本/股數</th><th>損益%</th><th>綜合</th><th>基本</th><th>籌碼</th><th>技術</th><th>月線</th><th>三日低</th><th></th></tr></thead><tbody>';
    rows.forEach(r=>{
      if(r.error){html+=`<tr><td class="name">${r.code}</td><td colspan="8" class="down">${esc(r.error)}</td><td><span class="lk" data-del="${r.id||''}">刪</span></td></tr>`;return;}
      html+=`<tr><td class="name"><span class="lk" data-go="${r.code}">${esc(r.name)} <small style="color:var(--muted)">${r.code}</small></span></td>
        <td class="mono">${fmt(r.cost)}／${fmtInt(r.shares)}</td>
        <td class="mono ${dirClass(r.pnl.pct)}">${signPct(r.pnl.pct)}<div class="mini-note">${r.pnl.amt==null?'':(r.pnl.amt>0?'+':'')+fmtInt(r.pnl.amt)}</div></td>
        <td class="mono"><b>${r.comp}</b></td><td class="mono">${r.fund??'—'}</td><td class="mono">${r.chip??'—'}</td><td class="mono">${r.tech??'—'}</td>
        <td class="mono">${fmt(r.defMonth)}</td><td class="mono">${fmt(r.defLow3)}</td>
        <td><span class="lk" data-go="${r.code}">問診</span></td></tr>`;});
    html+='</tbody></table></div><div class="mini-note" style="margin-top:6px">綜合=基本/籌碼/技術平均（0-100，示範規則）。防守為下一交易日價。</div>';
    body.innerHTML=html;
    body.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
  }
  // 管理列（刪除）
  async function manageList(){
    const d=await API.get('/holdings');
    const box=el('div','list');
    d.rows.forEach(h=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm">${esc(h.code)}</span><span class="cd">成本 ${fmt(h.cost)}・${fmtInt(h.shares)} 股</span><span class="rt lk" data-del="${h.id}">刪除</span></div>${h.note?`<div class="r2">${esc(h.note)}</div>`:''}`;box.appendChild(it);});
    mgr.querySelector('#hmlist')?.remove();box.id='hmlist';mgr.appendChild(box);
    box.querySelectorAll('[data-del]').forEach(a=>a.onclick=async()=>{await API.del('/holdings',{id:a.dataset.del});await manageList();await refresh();});
  }
  mgr.querySelector('#hadd').onclick=async()=>{
    const code=mgr.querySelector('#hc').value.trim();if(!code)return toast('請輸入代號');
    await API.post('/holdings',{code,cost:mgr.querySelector('#hcost').value,shares:mgr.querySelector('#hsh').value,note:mgr.querySelector('#hnote').value});
    mgr.querySelector('#hc').value=mgr.querySelector('#hcost').value=mgr.querySelector('#hsh').value=mgr.querySelector('#hnote').value='';
    await manageList();await refresh();toast('已新增');
  };
  mgr.querySelector('#hbulk').onclick=()=>mgr.querySelector('#hbulkbox').classList.toggle('hidden');
  mgr.querySelector('#hbulkgo').onclick=async()=>{
    const lines=mgr.querySelector('#hta').value.split(/\n/).map(x=>x.trim()).filter(Boolean);
    for(const ln of lines){const p=ln.split(/[\s,]+/);if(!p[0])continue;await API.post('/holdings',{code:p[0],cost:p[1],shares:p[2],note:p.slice(3).join(' ')});}
    mgr.querySelector('#hta').value='';await manageList();await refresh();toast(`已加入 ${lines.length} 檔`);
  };
  await manageList();await refresh();
  return c;
};

/* ================= 營收成長榜 ================= */
Views.revenue = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('📈','營收成長榜','月營收年增/月增排行。未公布顯示「尚未公布」不填零。');
  const ctrl=el('div','card',`<div class="row3"><div><label>市場</label><select id="mk"><option value="">全部</option><option>上市</option><option>上櫃</option></select></div>
    <div><label>年增≥%</label><input id="yy" type="number" placeholder="不限"></div><div><label>排序</label><select id="sort"><option value="yoy">年增</option><option value="mom">月增</option><option value="cur">營收規模</option></select></div></div>`);
  c.appendChild(ctrl);const body=el('div','card');c.appendChild(body);
  async function load(){
    const d=await API.get('/revenue',{market:ctrl.querySelector('#mk').value,yoyMin:ctrl.querySelector('#yy').value,sort:ctrl.querySelector('#sort').value});
    let html=h2(`共 ${d.count} 檔`,'資料 '+d.asOf)+`<div class="note"><span class="lk" id="cp">複製名單（純文字）</span></div><div class="scroll-x"><table class="t"><thead><tr><th class="name">股票</th><th>本月(億)</th><th>年增%</th><th>月增%</th><th>累計年增%</th><th>市場</th></tr></thead><tbody>`;
    d.rows.forEach(r=>{html+=`<tr><td class="name"><span class="lk" data-go="${r.code}">${esc(r.name)} <small style="color:var(--muted)">${r.code}</small></span>${r.warn?' <span class="demo-tag">'+esc(r.warn)+'</span>':''}</td>
      <td class="mono">${fmt(r.cur,0)}</td><td class="mono ${dirClass(r.yoy)}">${signPct(r.yoy)}</td><td class="mono ${dirClass(r.mom)}">${signPct(r.mom)}</td><td class="mono ${dirClass(r.cumYoy)}">${signPct(r.cumYoy)}</td><td>${r.market}</td></tr>`;});
    html+='</tbody></table></div>';body.innerHTML=html;
    body.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
    body.querySelector('#cp').onclick=()=>copyText(d.rows.map(r=>`${r.code} ${r.name} 年增${r.yoy}%`).join('\n'));
  }
  ctrl.querySelectorAll('select,input').forEach(e=>e.addEventListener('input',load));await load();return c;
};

Views['revenue-sector']=async()=>{
  const c=el('div');c.innerHTML=pageTitle('📊','營收成長榜・族群版','各族成長家數比例。未公布算「未公布」不算成長。');
  const d=await API.get('/revenue-sector');
  d.sectors.forEach(s=>{const card=el('div','card',h2(`${esc(s.name)}`,`${s.posRatio}% 成長`));
    card.appendChild(el('div','note',`成員 ${s.total}・已公布 ${s.published}・年增為正 ${s.posYoy}／${s.total}`));
    const list=el('div','list');s.members.forEach(m=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${m.code}">${esc(m.name)}</span><span class="cd">${m.code}</span><span class="rt mono ${dirClass(m.yoy)}">${signPct(m.yoy)}</span></div>`;list.appendChild(it);});
    card.appendChild(list);card.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));c.appendChild(card);});
  return c;
};

/* ================= ETF 持股雷達 ================= */
Views.etf = async (q)=>{
  const c=el('div');c.innerHTML=pageTitle('📡','主動式 ETF 持股雷達','公開持股變化／清單變化，非市場實際成交。');
  const d=await API.get('/etf',{fund:q.fund,date:q.date});
  const ctrl=el('div','card','');
  const fsel=`<select id="fsel">${d.funds.map(f=>`<option value="${f.id}" ${f.id===d.fund?'selected':''}>${esc(f.name)} (${f.id})</option>`).join('')}</select>`;
  const fund=d.funds.find(f=>f.id===d.fund);
  const dsel=`<select id="dsel">${fund.dates.map(dt=>`<option ${dt===d.date?'selected':''}>${dt}</option>`).join('')}</select>`;
  ctrl.innerHTML=`<div class="row2"><div><label>基金</label>${fsel}</div><div><label>資料日</label>${dsel}</div></div><div class="note">相較 ${d.prevDate||'—'}｜金額用 ${d.rows[0]?d.asOf:''} 股價估算</div>`;
  c.appendChild(ctrl);
  const body=el('div','card',h2('持股清單'));
  const list=el('div','list');
  d.rows.forEach(r=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${r.code}">${esc(r.name)}</span><span class="cd">${r.code}</span><span class="rt mono ${dirClass(r.chgShares)}">${r.chgShares==null?'新增':(r.chgShares>0?'+':'')+fmtInt(r.chgShares)+' 張'}</span></div>
    <div class="r2">股數 <b>${fmtInt(r.shares)}</b>・權重 <b>${fmt(r.weight)}%</b>・估值 <b>${r.est==null?'—':fmtInt(r.est)}</b></div>`;list.appendChild(it);});
  body.appendChild(list);c.appendChild(body);
  // 合計增減
  const sum=await API.get('/etf-summary');
  const sc=el('div','card',h2('追蹤基金合計・單日增減前十','公開持股'));
  const two=el('div','row2');
  const mkcol=(title,arr,cls)=>{const b=el('div');b.appendChild(el('div','divider-label',title));arr.forEach(r=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${r.code}">${esc(r.name)}</span><span class="rt mono ${cls}">${r.chg>0?'+':''}${fmtInt(r.chg)}</span></div>`;b.appendChild(it);});return b;};
  two.appendChild(mkcol('📈 增加',sum.inc,'up'));two.appendChild(mkcol('📉 減少',sum.dec,'down'));
  sc.appendChild(two);c.appendChild(sc);
  // 各基金貢獻
  const cc=el('div','card',h2('🧩 各基金對總變化的貢獻'));
  (sum.contrib||[]).forEach(x=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm">${esc(x.name)}</span><span class="cd">${x.fund}</span><span class="rt mono ${dirClass(x.net)}">${x.net>0?'+':''}${fmtInt(x.net)} 張</span></div>
    <div class="riverbar" style="height:8px;background:var(--line)"><div style="position:absolute;left:0;top:0;height:8px;width:${x.pct}%;background:var(--gold);border-radius:6px"></div></div><div class="r2">占總變化 ${x.pct}%・對比 ${x.prevDate||'—'}</div>`;cc.appendChild(it);});
  c.appendChild(cc);
  // 共同持股
  if((sum.common||[]).length){const kc=el('div','card',h2('🤝 共同持股（≥2 檔基金）'));
    sum.common.forEach(r=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${r.code}">${esc(r.name)}</span><span class="cd">${r.code}</span><span class="rt">${r.funds} 檔基金・合計 ${fmtInt(r.shares)} 張</span></div>`;kc.appendChild(it);});c.appendChild(kc);}
  c.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
  ctrl.querySelector('#fsel').onchange=e=>Router.go('etf',{fund:e.target.value});
  ctrl.querySelector('#dsel').onchange=e=>Router.go('etf',{fund:d.fund,date:e.target.value});
  return c;
};

/* ================= 估值河流圖（歷史股價線 + 估值帶） ================= */
Views.valuation = async (q)=>{
  const c=el('div');c.innerHTML=pageTitle('🌊','估值河流圖','歷史股價落在哪一估值帶；虧損/資料不足不硬畫便宜區。');
  c.appendChild(searchInline('valuation'));
  const code=q.code;if(!code){c.appendChild(el('div','empty','輸入股號查估值。'));return c;}
  const d=await API.get('/valuation',{code});if(d.error){c.appendChild(el('div','card',`查無 ${esc(code)}`));return c;}
  const v=d.valuation;
  const card=el('div','card',h2(`${esc(d.name)} ${d.code}`,(v.real?'真實':'示範')+' '+d.asOf));
  if(!v.ok){card.appendChild(el('div','badge warn',v.reason));card.appendChild(el('div','note','虧損或本益比無資料時不提供估值，不硬畫便宜區。'));c.appendChild(card);return c;}
  card.appendChild(riverChart(d.series, v, d.span));
  card.innerHTML+=`<div class="chips" style="margin-top:8px">${v.labels.map((l,i)=>`<span class="chip">${l} ${fmt(v.prices[i],0)}</span>`).join('')}</div>
    <div class="note" style="margin-top:8px">現價 <b class="mono">${fmt(v.close)}</b>・落在 <b>${esc(v.layer)}</b>・距合理中值 ${fmt(v.mid)} 為 <span class="${dirClass(v.distMidPct)}">${signPct(v.distMidPct)}</span></div>
    <div class="mini-note" style="margin-top:8px">${v.real?`近四季 EPS <b>${fmt(v.eps)}</b>（現價÷官方本益比 ${fmt(v.per,1)}）・合理基準本益比 <b>${fmt(v.basePE,1)}</b>${d.industryPE?`（同業中位數）`:'（自身PER）'}。`:`示範 EPS ${fmt(v.eps)}。`}${esc(v.note)}</div>
    <div class="mini-note">價格線：${esc(d.span||'')}。EPS 以近四季（trailing）近似、非預估；財報換季後會更新。</div>`;
  c.appendChild(card);return c;
};
function riverChart(series, v, span){
  const W=560,H=240,padL=44,padR=10,padT=10,padB=22;
  const closes=series.map(s=>s.close);
  const lo=Math.min(v.prices[0], ...closes), hi=Math.max(v.prices[3], ...closes);
  const rng=(hi-lo)||1;
  const X=i=>padL+i*(W-padL-padR)/Math.max(1,series.length-1);
  const Y=val=>padT+(1-(val-lo)/rng)*(H-padT-padB);
  const bandCols=['rgba(31,191,117,.16)','rgba(53,201,181,.14)','rgba(242,177,52,.14)','rgba(255,90,95,.16)']; // 便宜→昂貴
  const edges=[lo, ...v.prices, hi];
  let bands='';
  const segs=[[lo,v.prices[0]],[v.prices[0],v.prices[1]],[v.prices[1],v.prices[2]],[v.prices[2],v.prices[3]],[v.prices[3],hi]];
  const segCols=['rgba(31,191,117,.10)',...bandCols];
  segs.forEach((s,i)=>{const y1=Y(s[1]),y2=Y(s[0]);bands+=`<rect x="${padL}" y="${y1}" width="${W-padL-padR}" height="${Math.max(0,y2-y1)}" fill="${segCols[i]||'transparent'}"/>`;});
  // 估值線
  let lines='';v.prices.forEach((p,i)=>{const y=Y(p);lines+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--line)" stroke-dasharray="3 3"/><text x="2" y="${y+3}" fill="var(--muted)" font-size="9">${fmt(p,0)}</text>`;});
  // 股價折線
  const pts=series.map((s,i)=>`${X(i).toFixed(1)},${Y(s.close).toFixed(1)}`).join(' ');
  const lastY=Y(series[series.length-1].close),lastX=X(series.length-1);
  const wrap=el('div');
  wrap.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="border-radius:8px;background:var(--card-2)">
    ${bands}${lines}
    <polyline fill="none" stroke="var(--gold)" stroke-width="2" points="${pts}"/>
    <circle cx="${lastX}" cy="${lastY}" r="3" fill="var(--gold)"/>
    <text x="${padL}" y="${H-6}" fill="var(--muted)" font-size="9">${esc(span||'較早')}</text>
    <text x="${W-padR}" y="${H-6}" fill="var(--muted)" font-size="9" text-anchor="end">現在</text>
  </svg>`;
  return wrap;
}

/* ================= 處置股 ================= */
Views.disposals = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('🔒','處置股查詢','官方公告；推算區醒目標示「尚未獲官方公告確認」。');
  const d=await API.get('/disposals');
  const sec=(title,arr,warn)=>{const card=el('div','card',h2(title, warn?'尚未官方確認':''));
    if(!arr.length){card.appendChild(el('div','empty','（今日無）'));}
    arr.forEach(x=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm">${esc(x.name)}</span><span class="cd">${x.code}・${x.market}</span><span class="rt">${esc(x.status||x.reason||'')}</span></div>
      <div class="r2">${x.noticeDate?`公告 <b>${x.noticeDate}</b>・生效 <b>${x.effDate}</b>・撮合 <b>${esc(x.match)}</b>・解除 <b>${x.releaseDate}</b>${x.daysToRelease!=null?`・距解除 <b>${x.daysToRelease}</b> 交易日`:''}`:esc(x.reason)+(x.need?`・${esc(x.need)}`:'')}</div>
      ${x.official?`<div class="r2"><a href="${x.official}" target="_blank" rel="noopener">官方公告 →</a></div>`:''}`;card.appendChild(it);});
    return card;};
  c.appendChild(sec('🔴 處置中',d.active));
  c.appendChild(sec('🆕 新公告',d.new));
  c.appendChild(sec('👀 推算觀察（未公告）',d.watch,true));
  return c;
};

/* ================= 均線分數排行 ================= */
Views.mascore = async (q)=>{
  const c=el('div');c.innerHTML=pageTitle('🏆','均線分數排行','15 分自有計分，全市場榜。每條件可展開核對。');
  const d=await API.get('/mascore');
  const rc=el('div','card',h2('計分規則（公開）')+`<div class="mini-note">站上均線 ${d.rule.aboveMAs.join('/')}（每條+1）＋創新高 ${d.rule.newHigh.join('/')}（每個+1，上限12）＋多頭排列 20>60,60>120,120>240（各+1）＝ 滿15，≥8 多方。</div>`);
  c.appendChild(rc);
  const body=el('div','card',h2(`前 ${d.rows.length} 檔`,'資料 '+d.asOf));
  let html='<div class="scroll-x"><table class="t"><thead><tr><th>#</th><th class="name">股票</th><th>分數</th><th>站上</th><th>創高</th><th>排列</th></tr></thead><tbody>';
  d.rows.forEach((r,i)=>{html+=`<tr><td>${i+1}</td><td class="name"><span class="lk" data-go="${r.code}">${esc(r.name)} <small style="color:var(--muted)">${r.code}</small></span></td>
    <td class="mono"><b>${r.score}</b>/15 ${r.bull?'<span class="tag ok">多</span>':''}</td><td class="mono">${r.above}</td><td class="mono">${r.newHigh}</td><td class="mono">${r.align}</td></tr>`;});
  html+='</tbody></table></div>';body.innerHTML+=html;
  body.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));c.appendChild(body);return c;
};

/* ================= 系統選股 ================= */
Views.screen = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('🔍','系統選股','多條件交集。每檔列逐項符合原因與原始值。');
  const f=el('div','card',h2('條件')+`<div class="row2">
    <div><label>均線分數 ≥</label><input id="s_ma" type="number" placeholder="不限"></div>
    <div><label>營收年增 ≥ %</label><input id="s_yoy" type="number" placeholder="不限"></div>
    <div><label>法人近5日 ≥ 張</label><input id="s_net" type="number" placeholder="不限"></div>
    <div><label>籌碼週變化 ≥ %</label><input id="s_chip" type="number" placeholder="不限"></div>
    <div><label>族群名次 ≤</label><input id="s_sec" type="number" placeholder="不限"></div>
    <div style="display:flex;align-items:flex-end"><label style="margin:0"><input type="checkbox" id="s_def" style="width:auto"> 只要防守守住</label></div></div>
    <div style="margin-top:10px"><button class="btn" id="run">選股</button> <button class="btn ghost" id="save">儲存條件</button> <span id="saved" class="mini-note"></span></div>`);
  c.appendChild(f);const body=el('div','card');c.appendChild(body);
  const conds=()=>{const g=id=>{const v=f.querySelector('#'+id).value;return v===''?null:parseFloat(v);};
    return {maScoreMin:g('s_ma'),yoyMin:g('s_yoy'),net5Min:g('s_net'),chipMin:g('s_chip'),sectorTop:g('s_sec'),defenseHeld:f.querySelector('#s_def').checked};};
  async function run(){const d=await API.post('/screen',conds());
    if(!d.count){body.innerHTML=h2('無符合股票')+`<div class="note">${esc(d.hint||'')}</div>`;return;}
    let html=h2(`符合 ${d.count} 檔`,'資料 '+d.asOf)+`<div class="note"><span class="lk" id="cp">複製名單</span></div><div class="list">`;
    d.rows.forEach(r=>{html+=`<div class="item"><div class="r1"><span class="nm lk" data-go="${r.code}">${esc(r.name)}</span><span class="cd">${r.code}</span><span class="rt mono ${dirClass(r.chg)}">${arrow(r.chg)}${fmt(r.chg)}%</span></div>
      <div class="r2">${r.reasons.map(x=>`<span>${x.ok?'✅':'❌'} ${esc(x.k)} ${x.val==null?'無':x.val}（${esc(x.need)}）</span>`).join('')}</div></div>`;});
    html+='</div>';body.innerHTML=html;
    body.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
    body.querySelector('#cp').onclick=()=>copyText(d.rows.map(r=>`${r.code} ${r.name}`).join('\n'));
  }
  f.querySelector('#run').onclick=run;
  f.querySelector('#save').onclick=async()=>{const name=prompt('條件組名稱？','我的選股'+new Date().toISOString().slice(5,10));if(!name)return;await API.post('/screens',{name,conds:conds()});f.querySelector('#saved').textContent='已儲存';};
  return c;
};

/* ================= 籌碼變化雷達 ================= */
Views.chip = async (q)=>{
  const c=el('div');c.innerHTML=pageTitle('💥','大戶籌碼雷達','集保 ≥400張大戶持股比率的『週』變化(pp)。與日法人分開。');
  c.appendChild(searchInline('chip'));
  const d=await API.get('/chip',{code:q.code});
  if(d.detail){const x=d.detail;const card=el('div','card',h2(`${esc(x.name)} ${x.code}`));
    card.appendChild(el('div','note',`大戶週變化 <b class="${dirClass(x.chip.weekPct)}">${x.chip.weekPct==null?'—':(x.chip.weekPct>0?'+':'')+fmt(x.chip.weekPct)+' pp'}</b>・大戶佔比 <b>${fmt(x.chip.big,1)}%</b>（${esc(x.chip.asOf||'')}）｜法人當日 ${x.inst?fmtInt(x.inst.today):'—'} 張`));
    card.innerHTML+=`<div class="row"><span>近8週大戶%</span>${spark(x.chip.spark8w)}</div>`;
    const pl=el('div','list');x.peers.forEach(p=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${p.code}">${esc(p.name)}</span><span class="rt mono ${dirClass(p.weekPct)}">${p.weekPct==null?'—':(p.weekPct>0?'+':'')+fmt(p.weekPct,2)+'pp'}</span></div>`;pl.appendChild(it);});
    card.appendChild(el('div','divider-label','同族大戶週變化'));card.appendChild(pl);c.appendChild(card);}
  const two=el('div','row2');
  const mkcol=(t,arr,cls)=>{const b=el('div','card',h2(t));arr.forEach(r=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${r.code}">${esc(r.name)}</span><span class="rt mono ${cls}">${r.weekPct>0?'+':''}${fmt(r.weekPct,2)}pp</span></div>${r.big!=null?`<div class="r2">大戶佔比 ${fmt(r.big,1)}%</div>`:''}`;b.appendChild(it);});return b;};
  two.appendChild(mkcol('📈 大戶週增前十',d.inc,'up'));two.appendChild(mkcol('📉 大戶週減前十',d.dec,'down'));
  c.appendChild(two);c.appendChild(el('div','note',esc(d.note)));
  c.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));return c;
};

/* ================= 波段精選日報 ================= */
Views.daily = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('📰','波段精選日報','隔日盤前候選整理。只用當時快照，不以事後資料改寫。');
  const d=await API.get('/daily');
  c.appendChild(el('div','card',h2('頁首',d.day)+`<div class="note">大盤資料日 ${d.day}｜新處置公告 ${d.disposalsNew.length} 檔</div><div class="note"><span class="lk" id="cp">複製純文字版</span></div>`));
  const body=el('div','card',h2(`候選 ${d.candidates.length} 檔`));
  d.candidates.forEach(r=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${r.code}">${esc(r.name)}</span><span class="cd">${r.code}</span><span class="rt">分 ${r.score}</span></div>
    <div class="r2">${r.reasons.map(x=>`<span>${esc(x)}</span>`).join('・')}</div>
    <div class="r2">防守：月線 <b>${fmt(r.defMonth)}</b>・三日低 <b>${fmt(r.defLow3)}</b>${r.risk?`・<span class="down">${esc(r.risk)}</span>`:''}</div>`;body.appendChild(it);});
  c.appendChild(body);
  c.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
  c.querySelector('#cp').onclick=()=>copyText(`【波段精選日報 ${d.day}】\n`+d.candidates.map(r=>`${r.code} ${r.name}｜${r.reasons.join('、')}｜防守 月線${fmt(r.defMonth)}/三日低${fmt(r.defLow3)}`).join('\n'));
  return c;
};

/* ================= 產業研究室 ================= */
Views.industry = async (q)=>{
  const c=el('div');
  if(q.id){
    const d=await API.get('/industry',{id:q.id});
    c.innerHTML=pageTitle('🏭',d.name,esc(d.summary));
    c.appendChild(el('div','card',h2('供應鏈')+`<div class="chips">${d.chain.map(x=>`<span class="chip">${esc(x)}</span>`).join(' → ')}</div>`));
    const ac=el('div','card',h2('技術課／研究頁'));d.articles.forEach(a=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm">${esc(a.title)}</span><span class="cd">${esc(a.type)}・${a.updated}・v${a.ver}</span></div><div class="r2">${esc(a.body)}</div>${a.checkpoints?`<div class="r2">🔖 檢查點：${a.checkpoints.map(esc).join('、')}</div>`:''}`;ac.appendChild(it);});c.appendChild(ac);
    const cc=el('div','card',h2('成員公司'));d.companies.forEach(m=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${m.code}">${esc(m.name)}</span><span class="cd">${m.code}</span><span class="rt mono ${dirClass(m.yoy)}">營收${signPct(m.yoy)}</span></div><div class="r2">${esc(m.role)}・${esc(m.products)}</div>`;cc.appendChild(it);});c.appendChild(cc);
    c.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
    return c;
  }
  c.innerHTML=pageTitle('🏭','產業研究室','技術課看原理、研究頁追蹤供應鏈。');
  const d=await API.get('/industries');
  d.industries.forEach(i=>{const card=el('div','tool-card');card.innerHTML=`<div class="tc-name">${esc(i.name)}</div><div class="tc-use">${esc(i.summary)}</div><div class="tc-foot">文章 ${i.articleCount}・更新 ${i.updated||'—'}</div>`;card.onclick=()=>Router.go('industry',{id:i.id});c.appendChild(card);});
  return c;
};

/* ================= 產業個股快查 ================= */
Views.company = async (q)=>{
  const c=el('div');c.innerHTML=pageTitle('🔎','產業個股快查','公司產品/供應鏈/營收白話。無可信來源顯示待補。');
  c.appendChild(searchInline('company'));
  if(!q.code){c.appendChild(el('div','empty','輸入股號或名稱查公司。'));return c;}
  const d=await API.get('/company',{code:q.code});if(d.error){c.appendChild(el('div','card',`查無 ${esc(q.code)}`));return c;}
  const card=el('div','card',`<div class="head-row"><span class="name">${esc(d.name)}</span><span class="code">${d.code}</span><span class="sector" onclick="Router.go('industry',{id:'${d.industry}'})">🏭 ${esc(d.industryName)}</span></div>
    <div class="note">${d.market}｜來源 ${esc(d.prov.source)}・${d.prov.demo?'示範':'正式'}</div>
    <div style="margin-top:8px"><b>主要產品</b>：${esc(d.products)}</div><div style="margin-top:4px"><b>供應鏈角色</b>：${esc(d.role)}</div>
    ${d.revenue?`<div style="margin-top:4px"><b>近月營收</b>：${d.revenue.month} ${d.revenue.cur}億・年增 ${signPct(d.revenue.yoy)}</div>`:'<div class="mini-note">營收：待補</div>'}
    ${d.fin?`<div style="margin-top:4px"><b>財報</b>：單季EPS ${fmt(d.fin.epsQ)}・營益率 ${fmt(d.fin.opm,1)}%</div>`:''}`);
  const jump=el('div','chips',`<span class="chip" onclick="Router.go('diag',{code:'${d.code}'})">🩺 個股問診</span><span class="chip" onclick="Router.go('valuation',{code:'${d.code}'})">🌊 估值</span><span class="chip" onclick="Router.go('industry',{id:'${d.industry}'})">🏭 產業</span>`);
  card.appendChild(jump);c.appendChild(card);
  if(d.peers.length){const pc=el('div','card',h2('同業'));d.peers.forEach(p=>{const it=el('div','item');it.innerHTML=`<div class="r1"><span class="nm lk" data-go="${p.code}">${esc(p.name)}</span><span class="cd">${p.code}</span></div>`;pc.appendChild(it);});pc.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>Router.go('company',{code:a.dataset.go}));c.appendChild(pc);}
  return c;
};

/* ================= 交易功課（三種貼上區） ================= */
function homeworkView(kind, title, icon, sub, opts){
  return async ()=>{
    const c=el('div');c.innerHTML=pageTitle(icon,title,sub);
    const day=new Date().toISOString().slice(0,10);
    const n=opts.slots||3;
    let boxes='';for(let i=1;i<=n;i++)boxes+=`<div><label>來源 ${i}</label><textarea id="src${i}" placeholder="貼上名單，例：2426 鼎元 / 3081 / 華星光"></textarea></div>`;
    const f=el('div','card',h2('貼上名單（本機保存，不上傳）')+boxes+`<div style="margin-top:8px"><button class="btn" id="parse">解析交集</button> <button class="btn ghost" id="savehw">保存今日</button></div>`);
    c.appendChild(f);const body=el('div','card');c.appendChild(body);
    function parseCodes(txt){const set={};const re=/(\d{4})(?:[\s　]+([^\d\n,、]{0,6}))?/g;let m;const order=[];
      while((m=re.exec(txt))){const code=m[1];if(!set[code]){set[code]=true;order.push(code);}}return order;}
    function run(){const lists=[];for(let i=1;i<=n;i++)lists.push(parseCodes(f.querySelector('#src'+i).value));
      const count={};lists.forEach((l,idx)=>l.forEach(c2=>{(count[c2]=count[c2]||{n:0,src:[]});count[c2].n++;count[c2].src.push(idx+1);}));
      const rows=Object.entries(count).map(([code,v])=>({code,name:(META.nameOf&&META.nameOf[code])||'',n:v.n,src:v.src})).sort((a,b)=>b.n-a.n);
      if(!rows.length){body.innerHTML='<div class="empty">貼上名單後解析。</div>';return rows;}
      let html=h2(`共 ${rows.length} 檔・交集`)+`<div class="note"><span class="lk" id="cp">複製純文字</span></div><div class="list">`;
      rows.forEach(r=>{html+=`<div class="item"><div class="r1"><span class="nm lk" data-go="${r.code}">${r.code} ${esc(r.name)}</span><span class="rt">${r.n} 份${r.n>=2?' 🔥':''}</span></div><div class="r2">出現在來源：${r.src.join('、')}</div></div>`;});
      html+='</div>';body.innerHTML=html;
      body.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>goStock(a.dataset.go));
      body.querySelector('#cp').onclick=()=>copyText(rows.map(r=>`${r.code} ${r.name}（${r.n}份）`).join('\n'));
      return rows;}
    f.querySelector('#parse').onclick=run;
    f.querySelector('#savehw').onclick=async()=>{const rows=run();await API.post('/homework',{kind,day,payload:{rows,raw:[1,2,3].map(i=>f.querySelector('#src'+i)?.value)}});toast('已保存今日功課');};
    // 載入今日
    const saved=await API.get('/homework',{kind});
    if(saved.rows&&saved.rows.length){const last=saved.rows[0];try{const p=JSON.parse(last.payload);(p.raw||[]).forEach((v,i)=>{if(f.querySelector('#src'+(i+1)))f.querySelector('#src'+(i+1)).value=v||'';});run();}catch(e){}}
    return c;
  };
}
Views['hw-short']=homeworkView('short','空方觀察功課','🔪','貼多來源空單名單→交集。內容只存本機。',{slots:3});
Views['hw-day']=homeworkView('day','當沖多方觀察','🐎','貼盤中不同時間多方名單→重複出現。',{slots:3});
Views['hw-swing']=homeworkView('swing','波段多方觀察','🔥','貼收盤名單→交集（有資料自動帶防守）。',{slots:3});

/* ================= 交易複盤卡 ================= */
Views.journal = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('🧾','交易複盤卡','填單算損益、選版型、下載圖片。資料為自行填寫。');
  const f=el('div','card',h2('填寫')+`<div class="row2"><input id="jc" placeholder="代號"><input id="jn" placeholder="名稱(可空)"></div>
    <div class="row2" style="margin-top:8px"><input id="jbuy" type="number" placeholder="買進價"><input id="jsell" type="number" placeholder="賣出價"></div>
    <div class="row2" style="margin-top:8px"><input id="jsh" type="number" placeholder="股數"><input id="jfee" type="number" placeholder="費用(可空)"></div>
    <div style="margin-top:8px"><textarea id="jm" placeholder="心得"></textarea></div>
    <div class="chips" style="margin-top:8px">隱藏：<label><input type="checkbox" id="hide_sh" style="width:auto"> 股數</label><label><input type="checkbox" id="hide_amt" style="width:auto"> 金額</label></div>
    <div style="margin-top:8px"><button class="btn" id="prev">預覽</button> <button class="btn ghost" id="dl">下載圖片</button></div>`);
  c.appendChild(f);const prevWrap=el('div','card',h2('預覽'));const cv=document.createElement('canvas');cv.width=600;cv.height=340;cv.style.width='100%';cv.style.borderRadius='10px';prevWrap.appendChild(cv);c.appendChild(prevWrap);
  function draw(){const g=cv.getContext('2d');const buy=parseFloat(f.querySelector('#jbuy').value)||0,sell=parseFloat(f.querySelector('#jsell').value)||0,sh=parseFloat(f.querySelector('#jsh').value)||0,fee=parseFloat(f.querySelector('#jfee').value)||0;
    const pnl=(sell-buy)*sh-fee;const pct=buy?((sell-buy)/buy*100):0;
    g.fillStyle='#16213a';g.fillRect(0,0,600,340);g.fillStyle='#f2b134';g.fillRect(0,0,600,6);
    g.fillStyle='#e7edf7';g.font='bold 30px "Microsoft JhengHei"';g.fillText(`${f.querySelector('#jc').value} ${f.querySelector('#jn').value}`,24,56);
    g.font='16px "Microsoft JhengHei"';g.fillStyle='#9fb0cc';g.fillText('交易複盤卡（自行填寫，非券商驗證）',24,84);
    g.font='bold 40px "Microsoft JhengHei"';g.fillStyle=pct>=0?'#ff5a5f':'#1fbf75';g.fillText(`${pct>=0?'+':''}${pct.toFixed(2)}%`,24,150);
    if(!f.querySelector('#hide_amt').checked){g.font='22px "Microsoft JhengHei"';g.fillText(`${pnl>=0?'+':''}${Math.round(pnl).toLocaleString()} 元`,24,188);}
    g.fillStyle='#e7edf7';g.font='16px "Microsoft JhengHei"';let y=230;
    g.fillText(`買 ${buy}  →  賣 ${sell}`,24,y);y+=26;
    if(!f.querySelector('#hide_sh').checked){g.fillText(`股數 ${sh.toLocaleString()}`,24,y);y+=26;}
    g.fillStyle='#9fb0cc';const m=f.querySelector('#jm').value.slice(0,40);g.fillText(m,24,y);
    g.fillStyle='#2c3d5e';g.font='13px sans';g.fillText('台股研究書房',480,326);
  }
  f.querySelectorAll('input,textarea').forEach(e=>e.addEventListener('input',draw));
  f.querySelector('#prev').onclick=draw;
  f.querySelector('#dl').onclick=()=>{draw();const a=document.createElement('a');a.download='複盤卡.png';a.href=cv.toDataURL();a.click();};
  draw();return c;
};

/* ================= 個人模擬選股 ================= */
Views.sim = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('🎮','個人模擬選股練習','虛擬資金，不連券商、無排行榜。畫面標「模擬操作」。');
  const f=el('div','card',h2('新練習')+`<div class="row2"><input id="simcap" type="number" value="1000000" placeholder="模擬本金"><input id="simname" placeholder="練習名稱"></div>
    <div style="margin-top:8px"><textarea id="simpick" placeholder="選股：一行一檔，例 2426 3081 3363"></textarea></div>
    <div style="margin-top:8px"><button class="btn" id="simgo">建立並結算（等權買入・現價）</button></div>`);
  c.appendChild(f);const body=el('div','card',h2('我的模擬紀錄'));c.appendChild(body);
  async function refresh(){const d=await API.get('/sim');if(!d.rows.length){body.querySelector('.list')?.remove();body.appendChild(el('div','empty','尚無模擬紀錄。'));return;}
    body.querySelectorAll('.empty,.list').forEach(x=>x.remove());const list=el('div','list');
    d.rows.forEach(r=>{let p={};try{p=JSON.parse(r.payload)}catch(e){}const it=el('div','item');
      it.innerHTML=`<div class="r1"><span class="nm">${esc(r.name)} <span class="tag">模擬操作</span></span><span class="rt mono ${dirClass(p.retPct)}">${signPct(p.retPct)}</span></div>
        <div class="r2">本金 ${fmtInt(p.cap)}・持股 ${(p.picks||[]).join('、')}・結算 ${p.settledAsOf||''}</div><div class="r2"><span class="lk" data-del="${r.id}">刪除</span></div>`;list.appendChild(it);});
    body.appendChild(list);list.querySelectorAll('[data-del]').forEach(a=>a.onclick=async()=>{await API.del('/sim',{id:a.dataset.del});refresh();});
  }
  f.querySelector('#simgo').onclick=async()=>{
    const cap=parseFloat(f.querySelector('#simcap').value)||1000000;
    const picks=(f.querySelector('#simpick').value.match(/\d{4}/g)||[]);
    if(!picks.length)return toast('請輸入至少一檔');
    // 等權買入現價，結算用同一收盤(示範=買入即結算)；正式版可切換結算日
    let totRet=0,cnt=0;const per=cap/picks.length;const detail=[];
    for(const code of picks){const d=await API.get('/stock',{code});if(d.error)continue;const chg=d.chg||0;totRet+=chg;cnt++;detail.push({code,chg});}
    const retPct=cnt?Math.round(totRet/cnt*100)/100:0;
    await API.post('/sim',{name:f.querySelector('#simname').value||('模擬'+new Date().toISOString().slice(5,10)),
      payload:{cap,picks,retPct,detail,settledAsOf:META.asOf,note:'模擬操作・等權・示範以當日漲跌估算'}});
    toast('已建立模擬紀錄');refresh();
  };
  refresh();return c;
};

/* ================= 學習導讀與課程 ================= */
Views.learn = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('📖','學習導讀與課程','逐幕閱讀＋完成進度。教材由本機設定管理。');
  const d=await API.get('/materials');
  const bySeries={};d.materials.forEach(m=>{(bySeries[m.series]=bySeries[m.series]||[]).push(m)});
  Object.keys(bySeries).forEach(s=>{const card=el('div','card',h2('📚 '+s));
    bySeries[s].sort((a,b)=>a.week-b.week).forEach(m=>{const dt=el('details','subj');
      dt.innerHTML=`<summary><span class="s-name">${m.done?'✅':'⬜'} 第${m.week}幕 ${esc(m.title)}</span><span class="s-sub" style="margin-left:auto">${m.minutes}分</span></summary><div class="detail"><div class="explain">${esc(m.body)}</div><div style="margin-top:8px"><button class="btn sm" data-done="${m.id}">${m.done?'標記未完成':'標記完成'}</button></div></div>`;
      dt.querySelector('[data-done]').onclick=async(e)=>{e.preventDefault();await API.post('/progress',{mat_id:m.id,done:!m.done});Router.render();};
      card.appendChild(dt);});c.appendChild(card);});
  return c;
};

/* ================= 本機設定與資料維護 ================= */
Views.settings = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('⚙️','本機設定與資料維護','只在本機可用，不含帳號/會員。預設只允許 localhost。');
  const s=await API.get('/settings');
  const rc=el('div','card',h2('計算參數（可調・可替換）')+`<div class="row2">
    <div><label>月線天數</label><input id="mw" type="number" value="${s.rules.monthWindow}"></div>
    <div><label>強勢門檻(綜合)</label><input id="strong" type="number" value="${s.rules.strong}"></div>
    <div><label>中等門檻</label><input id="mid" type="number" value="${s.rules.mid}"></div>
    <div><label>紅半規則</label><select id="rh"><option value="body-mid" ${s.rules.redHalf.id==='body-mid'?'selected':''}>K實體中點(開+收)/2</option><option value="range-mid" ${s.rules.redHalf.id==='range-mid'?'selected':''}>區間中點(高+低)/2</option></select></div></div>
    <div style="margin-top:8px"><button class="btn" id="savep">儲存參數</button> <span class="mini-note">紅半＝K實體中點（哲銘已採用），可換算法。</span></div>`);
  c.appendChild(rc);
  // 真實資料
  const live=el('div','card',h2('真實報價',META.livePrices?'已接真實':'目前示範')+`<div class="mini-note">在終端機跑 <b>python refresh_data.py</b> 抓真實報價（均線分數用還原價、防守用原始價），寫入 data/live.json；回此按「重載」即生效。<b>python refresh_data.py --off</b> 可切回全示範。</div><div style="margin-top:8px"><button class="btn ghost" id="reload">重載市場資料</button> <span id="rst" class="mini-note"></span></div>`);
  c.appendChild(live);
  live.querySelector('#reload').onclick=async()=>{const r=await API.post('/reload',{});live.querySelector('#rst').textContent=`已重載・資料日 ${r.asOf}${r.livePrices?'（真實報價）':'（示範）'}`;toast('已重載');};
  rc.querySelector('#savep').onclick=async()=>{const rules=JSON.parse(JSON.stringify(s.rules));
    rules.monthWindow=parseInt(rc.querySelector('#mw').value)||20;rules.strong=parseInt(rc.querySelector('#strong').value)||67;rules.mid=parseInt(rc.querySelector('#mid').value)||34;rules.redHalf.id=rc.querySelector('#rh').value;
    await API.post('/settings',{rules});toast('已儲存，重新整理生效');};
  const uc=el('div','card',h2('資料作業狀態'));(s.updateTimes||[]).forEach(u=>uc.appendChild(el('div','mini-note',`・${esc(u.tool)}：${esc(u.time)}（${esc(u.note)}）　最近成功：示範`)));
  uc.appendChild(el('div','note','正式版：接 scripts/stock_common.py 後，這裡顯示各來源最近成功時間、失敗原因、筆數與人工重試。'));c.appendChild(uc);
  c.appendChild(el('div','card',h2('資料來源與授權')+`<div class="mini-note">目前全為示範資料。正式版優先查核：證交所 TWSE、櫃買 TPEx、公開資訊觀測站 MOPS、基金業者、公司公告的正式資料與使用條件。需授權或無法穩定取得者，維持示範資料並標示。</div>`));
  return c;
};

/* ================= 備份 ================= */
Views.backup = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('💾','個人資料備份','匯出/匯入你的持股、功課、模擬、筆記、進度。');
  c.appendChild(el('div','card',h2('保存位置')+`<div class="mini-note">個人資料存於本機 <b>data/personal.db</b>（sqlite）。此外「最近查詢」等便利設定存在瀏覽器本機儲存空間——清除瀏覽器資料會消失，且不同裝置不會自動同步。</div>`));
  const bc=el('div','card',h2('匯出／匯入')+`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="exp">匯出 JSON</button><button class="btn ghost" id="impbtn">選擇檔案匯入</button><input id="impfile" type="file" accept="application/json" class="hidden"></div><div class="note">匯入會覆蓋現有個人資料，請先匯出備份。</div>`);
  c.appendChild(bc);
  bc.querySelector('#exp').onclick=async()=>{const d=await API.get('/export');const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.download='台股研究書房備份_'+new Date().toISOString().slice(0,10)+'.json';a.href=URL.createObjectURL(blob);a.click();toast('已匯出');};
  bc.querySelector('#impbtn').onclick=()=>bc.querySelector('#impfile').click();
  bc.querySelector('#impfile').onchange=async(e)=>{const file=e.target.files[0];if(!file)return;const txt=await file.text();try{const data=JSON.parse(txt);await API.post('/import',data);toast('已匯入');}catch(err){toast('檔案格式錯誤');}};
  return c;
};

/* ================= 規格文件 ================= */
Views.spec = async ()=>{
  const c=el('div');c.innerHTML=pageTitle('📋','功能與資料規格','逐項：輸入→處理→輸出→來源→缺值→驗收。');
  const items=[
    ['共用資料模型','股票/報價/營收/財報/法人/籌碼/ETF/處置/教材/持股，各筆帶 資料所屬日・抓取時間・來源・計算版本・正式或示範。推導值（月線/三日低/均線分數/強弱）由 backend/calc.py 統一算，各頁不重複、不矛盾。'],
    ['月線','20 個交易日收盤均。本交易日判定用昨收算、下一交易日用今收算。'],
    ['三日低','本交易日=不含當日前三日低；下一交易日=含當日近三日低。'],
    ['均線分數','站上6均線+創6新高(上限12)+多頭排列(3)=滿15，≥8多方。公開可查、每條件可展開。'],
    ['估值河流圖','預估年EPS×本益比區間四層；虧損/獲利太薄/資料不足→「無法可靠估值」，不硬畫。'],
    ['紅半','已採用（哲銘指定）：前一交易日 K 棒實體中點 (開+收)/2。設定頁可換算法。'],
    ['紅綠燈 / 強弱 / 籌碼暴增','待確認：原站未公開。以標示清楚、可在設定頁替換的示範規則實作。'],
    ['處置股','官方公告分「處置中/新公告/解除日」；推算觀察區醒目標示「尚未獲官方公告確認」。交易日曆跳週末/連假。'],
    ['個人資料','持股/功課/模擬/筆記/進度存本機 sqlite，可匯出匯入；不建帳號、不外傳。'],
    ['驗收(2426,成本100.34)','個股問診成本卡預帶 2426/100.34/3000：損益%與各防守跌破相對成本、個人停損-3%/-5%即時顯示，皆標交易日。'],
  ];
  const card=el('div','card',h2('規格逐項'));items.forEach(([k,v])=>{const dt=el('details','subj');dt.innerHTML=`<summary><span class="s-name">${esc(k)}</span></summary><div class="detail"><div class="explain">${esc(v)}</div></div>`;card.appendChild(dt);});
  c.appendChild(card);
  c.appendChild(el('div','card',h2('待確認演算法（需你確認或維持示範）')+`<div class="mini-note">1) 紅半定義　2) 紅綠燈門檻　3) 強弱分級權重　4) 籌碼暴增公式　5) 族群177名次分類來源　6) 84主力榜/預估PE正式來源。以上目前為示範規則，可在「本機設定」替換。</div>`));
  return c;
};

/* ---------- 內嵌搜尋（工具內用） ---------- */
function searchInline(view){
  const w=el('div','card',`<div class="search" style="display:flex;gap:6px"><input id="isq" placeholder="輸入代號或名稱" style="flex:1"><button class="btn" id="isgo">查詢</button></div>`);
  const go=()=>{const v=w.querySelector('#isq').value.trim();if(v)Router.go(view,{code:v});};
  w.querySelector('#isgo').onclick=go;w.querySelector('#isq').addEventListener('keydown',e=>{if(e.key==='Enter')go();});
  return w;
}
