/* client.js — 靜態版 API（GitHub Pages / Artifact 用）
 * 讀 window.__DATA__（後端預先算好的每日快照）＋ localStorage（個人資料，只存本機瀏覽器）。
 * 設定 window.__API__，lib.js 會改用它取代 fetch。views.js / app.js 完全不用改。
 */
(function(){
  const D = window.__DATA__ || {};
  const LS = {
    key:(t)=>'spx_'+t,
    read(t){ try{ return JSON.parse(localStorage.getItem(this.key(t))||'[]'); }catch(e){ return []; } },
    write(t,rows){ try{ localStorage.setItem(this.key(t), JSON.stringify(rows)); }catch(e){} },
    kvRead(){ try{ return JSON.parse(localStorage.getItem('spx_kv')||'{}'); }catch(e){ return {}; } },
    kvWrite(o){ try{ localStorage.setItem('spx_kv', JSON.stringify(o)); }catch(e){} },
  };
  const now=()=>new Date().toISOString().slice(0,19);
  const nextId=(rows)=> rows.reduce((m,r)=>Math.max(m,r.id||0),0)+1;

  const Store = {
    list(t, filter){ let r=LS.read(t); if(filter) r=r.filter(filter); return r.slice().sort((a,b)=>(b.id||0)-(a.id||0)); },
    add(t, cols){ const rows=LS.read(t); const id=nextId(rows); rows.push(Object.assign({id,updated:now()},cols)); LS.write(t,rows); return id; },
    update(t, id, cols){ const rows=LS.read(t); const i=rows.findIndex(r=>r.id==id); if(i>=0){ rows[i]=Object.assign(rows[i],cols,{updated:now()}); LS.write(t,rows);} },
    del(t, id){ LS.write(t, LS.read(t).filter(r=>r.id!=id)); },
    exportAll(){ const o={_meta:{exported:now(),app:'stock-platform-static'}}; ['holdings','homework','screens','journal','sim','notes','progress'].forEach(t=>o[t]=LS.read(t)); o.kv=LS.kvRead(); return o; },
    importAll(data){ ['holdings','homework','screens','journal','sim','notes','progress'].forEach(t=>{ if(data[t]) LS.write(t,data[t]); }); if(data.kv) LS.kvWrite(data.kv); },
  };

  const norm=(x)=>{ if(!x) return x; x=String(x).trim(); return (D.nameIndex&&D.nameIndex[x])||x; };
  const P=(v)=>Promise.resolve(v);

  // ---- 讀取類（查表）----
  function get(path, params){
    params=params||{};
    switch(path){
      case '/meta': return P(Object.assign({}, D.meta, {tools:D.tools, nameOf:D.nameOf}));
      case '/search': {
        const q=(params.q||'').trim(); const out=[];
        if(q) (D.searchIndex||[]).forEach(s=>{ if(s.code===q||s.code.includes(q)||s.name.includes(q)) out.push(s); });
        return P({q, results: out.slice(0,20)});
      }
      case '/stock': { const c=norm(params.code); return P(D.stock[c] || {error:'not_found', code:c, hint:D.stockHint}); }
      case '/valuation': { const c=norm(params.code); return P(D.valuation[c] || {error:'not_found', code:c}); }
      case '/company': { const c=norm(params.code); return P(D.company[c] || {error:'not_found', code:c}); }
      case '/revenue': return P(revenue(params));
      case '/revenue-sector': return P(D.revenueSector);
      case '/etf': { const f=params.fund||D.etfDefault; const dates=D.etfDates[f]; const dt=(params.date&&dates.includes(params.date))?params.date:dates[dates.length-1]; return P(D.etf[f][dt]); }
      case '/etf-summary': return P(D.etfSummary);
      case '/disposals': return P(D.disposals);
      case '/mascore': return P(D.mascore);
      case '/chip': { const c=norm(params.code); return P(Object.assign({}, D.chipAll, {detail: (c&&D.chipDetail[c])||null})); }
      case '/sectors': return P(D.sectors);
      case '/industries': return P(D.industries);
      case '/industry': return P(D.industry[params.id] || {error:'not_found'});
      case '/daily': return P(D.daily);
      case '/materials': return P(materials());
      case '/health': return P(health());
      case '/holdings': return P({rows: Store.list('holdings')});
      case '/homework': return P({rows: Store.list('homework', r=> !params.kind || r.kind===params.kind)});
      case '/screens': return P({rows: Store.list('screens')});
      case '/journal': return P({rows: Store.list('journal')});
      case '/sim': return P({rows: Store.list('sim')});
      case '/notes': return P({rows: Store.list('notes')});
      case '/settings': return P({rules: D.rules, updateTimes: D.meta.updateTimes||[], opsLog:[], static:true});
      case '/export': return P(Store.exportAll());
      default: return P({error:'no_route', path});
    }
  }

  function send(method, path, body, params){
    body=body||{}; params=params||{};
    if(path==='/screen') return P(screen(body));
    if(path==='/reload') return P({ok:true, asOf:D.meta.asOf, livePrices:!!D.meta.livePrices, static:true});
    if(path==='/import'){ Store.importAll(body); return P({ok:true}); }
    if(path==='/progress'){ upsertProgress(body.mat_id, body.done); return P({ok:true}); }
    if(path==='/settings'){ const kv=LS.kvRead(); if(body.rules)kv.rules=body.rules; LS.kvWrite(kv); return P({ok:true, note:'靜態版：參數已存本機，但數字為快照、需重新產生才會重算'}); }
    // 個人清單表 CRUD
    const table = path.replace('/','');
    if(['holdings','homework','screens','journal','sim','notes'].includes(table)){
      if(method==='POST') return P({id: Store.add(table, rowCols(table, body))});
      if(method==='PUT'){ Store.update(table, body.id, rowCols(table, body)); return P({ok:true}); }
      if(method==='DELETE'){ Store.del(table, params.id); return P({ok:true}); }
    }
    return P({error:'no_route', path});
  }

  function rowCols(table, body){
    if(table==='holdings') return {code:norm(body.code), cost:num(body.cost), shares:num(body.shares), note:body.note||''};
    if(table==='homework') return {kind:body.kind, day:body.day, payload:JSON.stringify(body.payload||null)};
    if(table==='screens') return {name:body.name, conds:JSON.stringify(body.conds||null)};
    if(table==='notes') return {ref:body.ref, body:body.body};
    return {name:body.name||'', payload:JSON.stringify(body.payload||null)};
  }
  const num=(x)=>{ const v=parseFloat(x); return isNaN(v)?null:v; };

  // ---- 少量互動運算 ----
  function revenue(params){
    let rows=(D.revenueRows||[]).slice();
    if(params.market) rows=rows.filter(r=>r.market===params.market);
    const ym=num(params.yoyMin); if(ym!=null) rows=rows.filter(r=>r.yoy>=ym);
    const mm=num(params.momMin); if(mm!=null) rows=rows.filter(r=>r.mom>=mm);
    const sort=params.sort||'yoy'; const desc=(params.order||'desc')==='desc';
    rows.sort((a,b)=>{const av=a[sort]==null?-1e9:a[sort],bv=b[sort]==null?-1e9:b[sort];return desc?bv-av:av-bv;});
    return {asOf:D.meta.asOf, count:rows.length, rows};
  }

  function screen(conds){
    conds=conds||{}; const out=[];
    (D.screenData||[]).forEach(s=>{
      const reasons=[]; let ok=true;
      const need=(v,cond,k,val,txt)=>{ if(v==null||isNaN(v)) return; const p=cond; ok=ok&&p; reasons.push({k, val:val, need:txt, ok:p}); };
      if(conds.maScoreMin!=null){ const p=s.maScore>=conds.maScoreMin; ok=ok&&p; reasons.push({k:'均線分數',val:s.maScore,need:'≥'+conds.maScoreMin,ok:p}); }
      if(conds.yoyMin!=null){ const p=s.revYoy!=null&&s.revYoy>=conds.yoyMin; ok=ok&&p; reasons.push({k:'營收年增',val:s.revYoy,need:'≥'+conds.yoyMin+'%',ok:p}); }
      if(conds.net5Min!=null){ const p=s.net5!=null&&s.net5>=conds.net5Min; ok=ok&&p; reasons.push({k:'法人近5日',val:s.net5,need:'≥'+conds.net5Min+'張',ok:p}); }
      if(conds.chipMin!=null){ const p=s.chip!=null&&s.chip>=conds.chipMin; ok=ok&&p; reasons.push({k:'籌碼週變化',val:s.chip,need:'≥'+conds.chipMin+'%',ok:p}); }
      if(conds.sectorTop!=null){ const p=s.sectorRank!=null&&s.sectorRank<=conds.sectorTop; ok=ok&&p; reasons.push({k:'族群名次',val:s.sectorRank,need:'≤'+conds.sectorTop,ok:p}); }
      if(conds.defenseHeld){ const p=s.defenseHeld; ok=ok&&p; reasons.push({k:'防守',val:s.defenseLabel,need:'守住',ok:p}); }
      if(ok && reasons.length) out.push({code:s.code, name:s.name, industry:s.industry, chg:s.chg, reasons});
    });
    return {asOf:D.meta.asOf, count:out.length, rows:out, hint: out.length?null:'沒有符合股票；可放寬均線分數或營收門檻'};
  }

  function health(){
    const stops=(D.rules&&D.rules.personalStops)||[3,5];
    const out=Store.list('holdings').map(h=>{
      const b=D.healthBase[norm(h.code)];
      if(!b) return {id:h.id, code:h.code, error:'查無此股（快照未含）', cost:h.cost, shares:h.shares};
      const pnl={amt: h.shares?Math.round((b.close-h.cost)*h.shares):null, pct: h.cost?Math.round((b.close-h.cost)/h.cost*100*100)/100:null};
      return {id:h.id, code:b.code, name:b.name, cost:h.cost, shares:h.shares, note:h.note, close:b.close, chg:b.chg,
        pnl, fund:b.fund, chip:b.chip, tech:b.tech, comp:b.comp, grade:b.grade,
        defMonth:b.defMonth, defLow3:b.defLow3, redHalf:b.redHalf};
    });
    return {asOf:D.meta.asOf, rows:out};
  }

  function materials(){
    const prog=progressMap();
    return {materials:(D.materials||[]).map(m=>Object.assign({}, m, {done: !!prog[m.id]}))};
  }
  function progressMap(){ const kv=LS.kvRead(); return kv.progress||{}; }
  function upsertProgress(id, done){ const kv=LS.kvRead(); kv.progress=kv.progress||{}; if(done)kv.progress[id]=1; else delete kv.progress[id]; LS.kvWrite(kv); }

  window.__API__ = {
    get, send,
    post(p,b,q){return send('POST',p,b,q);},
    put(p,b){return send('PUT',p,b);},
    del(p,q){return send('DELETE',p,null,q);},
  };
})();
