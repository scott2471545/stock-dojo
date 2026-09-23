/* client_ondemand.js — 全市場按需載入版 API（GitHub Pages 公開站）
 * 讀 ./idx/*.json（索引）與 ./s/<code>.json（每檔，點到才載）＋ localStorage（個人資料）。
 * 設 window.__API__，lib.js 改用它。views.js / app.js 不變。
 */
(function(){
  const D = window.__DATA__ || {};
  const P = (v)=>Promise.resolve(v);
  const _idxCache = {}, _stkCache = {};
  async function idx(name){
    if(!(name in _idxCache)){
      try{ const r = await fetch('./idx/'+name+'.json',{cache:'no-store'}); _idxCache[name] = r.ok ? await r.json() : null; }
      catch(e){ _idxCache[name] = null; }
    }
    return _idxCache[name];
  }
  async function stk(code){
    if(!(code in _stkCache)){
      try{ const r = await fetch('./s/'+code+'.json',{cache:'no-store'}); _stkCache[code] = r.ok ? await r.json() : null; }
      catch(e){ _stkCache[code] = null; }
    }
    return _stkCache[code];
  }
  const norm=(x)=>{ if(!x) return x; x=String(x).trim(); return (D.nameIndex&&D.nameIndex[x])||x; };

  // localStorage 個人資料（與 bundle 版一致）
  const LS = {
    key:(t)=>'spx_'+t,
    read(t){ try{ return JSON.parse(localStorage.getItem(this.key(t))||'[]'); }catch(e){ return []; } },
    write(t,r){ try{ localStorage.setItem(this.key(t), JSON.stringify(r)); }catch(e){} },
    kvRead(){ try{ return JSON.parse(localStorage.getItem('spx_kv')||'{}'); }catch(e){ return {}; } },
    kvWrite(o){ try{ localStorage.setItem('spx_kv', JSON.stringify(o)); }catch(e){} },
  };
  const now=()=>new Date().toISOString().slice(0,19);
  const nextId=(r)=>r.reduce((m,x)=>Math.max(m,x.id||0),0)+1;
  const Store = {
    list(t,f){ let r=LS.read(t); if(f) r=r.filter(f); return r.slice().sort((a,b)=>(b.id||0)-(a.id||0)); },
    add(t,c){ const r=LS.read(t); const id=nextId(r); r.push(Object.assign({id,updated:now()},c)); LS.write(t,r); return id; },
    update(t,id,c){ const r=LS.read(t); const i=r.findIndex(x=>x.id==id); if(i>=0){ r[i]=Object.assign(r[i],c,{updated:now()}); LS.write(t,r);} },
    del(t,id){ LS.write(t, LS.read(t).filter(x=>x.id!=id)); },
    exportAll(){ const o={_meta:{exported:now(),app:'stock-platform-ondemand'}}; ['holdings','homework','screens','journal','sim','notes','progress'].forEach(t=>o[t]=LS.read(t)); o.kv=LS.kvRead(); return o; },
    importAll(d){ ['holdings','homework','screens','journal','sim','notes','progress'].forEach(t=>{ if(d[t]) LS.write(t,d[t]); }); if(d.kv) LS.kvWrite(d.kv); },
  };
  const num=(x)=>{ const v=parseFloat(x); return isNaN(v)?null:v; };

  async function get(path, params){
    params=params||{};
    switch(path){
      case '/meta': return Object.assign({}, D.meta, {tools:D.tools, nameOf:D.nameOf});
      case '/search': { const q=(params.q||'').trim(); if(!q) return {q,results:[]};
        const all=await idx('search')||[]; const out=[];
        for(const s of all){ if(s.code===q||s.code.includes(q)||s.name.includes(q)){ out.push(s); if(out.length>=20) break; } }
        return {q, results:out}; }
      case '/stock': { const f=await stk(norm(params.code)); return f?f.stock:{error:'not_found',code:params.code,hint:'查無此代號'}; }
      case '/valuation': { const f=await stk(norm(params.code)); return f?f.valuation:{error:'not_found'}; }
      case '/company': { const f=await stk(norm(params.code)); return f?f.company:{error:'not_found',code:params.code}; }
      case '/revenue': return revenue(await idx('revenue')||[], params);
      case '/revenue-sector': return await idx('revenue-sector');
      case '/etf': { const e=await idx('etf'); const f=params.fund||e.default; const dts=Object.keys(e.etf[f]); const dt=(params.date&&e.etf[f][params.date])?params.date:dts[dts.length-1]; return e.etf[f][dt]; }
      case '/etf-summary': return await idx('etf-summary');
      case '/disposals': return await idx('disposals');
      case '/mascore': return await idx('mascore');
      case '/sectors': return await idx('sectors');
      case '/chip': { const c=norm(params.code); const base=await idx('chip'); let detail=null;
        if(c){ const f=await stk(c); if(f&&f.stock&&f.stock.subjects&&f.stock.subjects.chip){ detail={code:c,name:f.stock.name,chip:f.stock.subjects.chip,inst:f.stock.subjects.inst||{},peers:[]}; } }
        return Object.assign({},base,{detail}); }
      case '/industries': return (await idx('industries')).list;
      case '/industry': { const i=await idx('industries'); return i.detail[params.id]||{error:'not_found'}; }
      case '/daily': return await idx('daily');
      case '/materials': { const m=await idx('materials'); const prog=(LS.kvRead().progress)||{}; return {materials:(m.materials||[]).map(x=>Object.assign({},x,{done:!!prog[x.id]}))}; }
      case '/health': return await health();
      case '/holdings': return {rows: Store.list('holdings')};
      case '/homework': return {rows: Store.list('homework', r=> !params.kind || r.kind===params.kind)};
      case '/screens': return {rows: Store.list('screens')};
      case '/journal': return {rows: Store.list('journal')};
      case '/sim': return {rows: Store.list('sim')};
      case '/notes': return {rows: Store.list('notes')};
      case '/settings': return {rules:D.rules, updateTimes:(D.meta.updateTimes||[]), opsLog:[], static:true};
      case '/export': return Store.exportAll();
      default: return {error:'no_route', path};
    }
  }

  async function send(method, path, body, params){
    body=body||{}; params=params||{};
    if(path==='/screen') return await screen(body);
    if(path==='/reload') return {ok:true, asOf:D.meta.asOf, livePrices:!!D.meta.livePrices, static:true};
    if(path==='/import'){ Store.importAll(body); return {ok:true}; }
    if(path==='/progress'){ const kv=LS.kvRead(); kv.progress=kv.progress||{}; if(body.done)kv.progress[body.mat_id]=1; else delete kv.progress[body.mat_id]; LS.kvWrite(kv); return {ok:true}; }
    if(path==='/settings'){ const kv=LS.kvRead(); if(body.rules)kv.rules=body.rules; LS.kvWrite(kv); return {ok:true,note:'靜態版：參數存本機，數字為快照'}; }
    const table=path.replace('/','');
    if(['holdings','homework','screens','journal','sim','notes'].includes(table)){
      if(method==='POST') return {id: Store.add(table, rowCols(table, body))};
      if(method==='PUT'){ Store.update(table, body.id, rowCols(table, body)); return {ok:true}; }
      if(method==='DELETE'){ Store.del(table, params.id); return {ok:true}; }
    }
    return {error:'no_route', path};
  }
  function rowCols(table, body){
    if(table==='holdings') return {code:norm(body.code), cost:num(body.cost), shares:num(body.shares), note:body.note||''};
    if(table==='homework') return {kind:body.kind, day:body.day, payload:JSON.stringify(body.payload||null)};
    if(table==='screens') return {name:body.name, conds:JSON.stringify(body.conds||null)};
    if(table==='notes') return {ref:body.ref, body:body.body};
    return {name:body.name||'', payload:JSON.stringify(body.payload||null)};
  }
  function revenue(rows, params){
    rows=rows.slice();
    if(params.market) rows=rows.filter(r=>r.market===params.market);
    const ym=num(params.yoyMin); if(ym!=null) rows=rows.filter(r=>r.yoy>=ym);
    const mm=num(params.momMin); if(mm!=null) rows=rows.filter(r=>r.mom>=mm);
    const sort=params.sort||'yoy'; const desc=(params.order||'desc')==='desc';
    rows.sort((a,b)=>{const av=a[sort]==null?-1e9:a[sort],bv=b[sort]==null?-1e9:b[sort];return desc?bv-av:av-bv;});
    return {asOf:D.meta.asOf, count:rows.length, rows};
  }
  async function screen(conds){
    conds=conds||{}; const all=await idx('screen')||[]; const out=[];
    all.forEach(s=>{
      const reasons=[]; let ok=true;
      if(conds.maScoreMin!=null){ const p=s.maScore!=null&&s.maScore>=conds.maScoreMin; ok=ok&&p; reasons.push({k:'均線分數',val:s.maScore,need:'≥'+conds.maScoreMin,ok:p}); }
      if(conds.yoyMin!=null){ const p=s.revYoy!=null&&s.revYoy>=conds.yoyMin; ok=ok&&p; reasons.push({k:'營收年增',val:s.revYoy,need:'≥'+conds.yoyMin+'%',ok:p}); }
      if(conds.net5Min!=null){ const p=s.net5!=null&&s.net5>=conds.net5Min; ok=ok&&p; reasons.push({k:'法人近5日',val:s.net5,need:'≥'+conds.net5Min+'張',ok:p}); }
      if(conds.chipMin!=null){ const p=s.chip!=null&&s.chip>=conds.chipMin; ok=ok&&p; reasons.push({k:'籌碼週變化',val:s.chip,need:'≥'+conds.chipMin+'%',ok:p}); }
      if(conds.sectorTop!=null){ const p=s.sectorRank!=null&&s.sectorRank<=conds.sectorTop; ok=ok&&p; reasons.push({k:'族群名次',val:s.sectorRank,need:'≤'+conds.sectorTop,ok:p}); }
      if(conds.defenseHeld){ const p=s.defenseHeld; ok=ok&&p; reasons.push({k:'防守',val:s.defenseLabel,need:'守住',ok:p}); }
      if(ok && reasons.length) out.push({code:s.code, name:s.name, industry:s.industry, chg:s.chg, reasons});
    });
    return {asOf:D.meta.asOf, count:out.length, rows:out, hint: out.length?null:'沒有符合股票；可放寬條件'};
  }
  async function health(){
    const rows=[];
    for(const h of Store.list('holdings')){
      const f=await stk(norm(h.code));
      if(!f){ rows.push({id:h.id, code:h.code, error:'查無此股', cost:h.cost, shares:h.shares}); continue; }
      const b=f.health;
      const pnl={amt: h.shares?Math.round((b.close-h.cost)*h.shares):null, pct: h.cost?Math.round((b.close-h.cost)/h.cost*10000)/100:null};
      rows.push({id:h.id, code:b.code, name:b.name, cost:h.cost, shares:h.shares, note:h.note, close:b.close, chg:b.chg,
        pnl, fund:b.fund, chip:b.chip, tech:b.tech, comp:b.comp, grade:b.grade,
        defMonth:b.defMonth, defLow3:b.defLow3, redHalf:b.redHalf});
    }
    return {asOf:D.meta.asOf, rows};
  }

  window.__API__ = { get, send,
    post(p,b,q){return send('POST',p,b,q);}, put(p,b){return send('PUT',p,b);}, del(p,q){return send('DELETE',p,null,q);} };
})();
