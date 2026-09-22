/* app.js — 啟動：載入 meta、建選單、全域搜尋、路由渲染 */
(async function(){
  const mount = document.getElementById('view');

  async function boot(){
    META = await API.get('/meta');
    buildDrawer();
    bindSearch();
    window.addEventListener('hashchange', render);
    Router.render = render;
    render();
  }

  function buildDrawer(){
    const p = document.getElementById('drawerPanel');
    const groups = {};
    (META.tools||[]).forEach(t=>{(groups[t.group]=groups[t.group]||[]).push(t)});
    let html = `<div style="font-weight:800;font-size:16px;margin-bottom:8px">📚 台股研究書房</div>
      <a class="nav-item" href="#/home">🏠 首頁</a>`;
    Object.keys(groups).forEach(g=>{
      html += `<div class="grp">${esc(g)}</div>`;
      groups[g].forEach(t=>{ html += `<a class="nav-item" href="#/${t.id}">${esc(t.name)}<small>${esc(t.use)}</small></a>`; });
    });
    p.innerHTML = html;
    const drawer = document.getElementById('drawer');
    document.getElementById('menuBtn').onclick = ()=> drawer.classList.add('open');
    drawer.onclick = (e)=>{ if(e.target===drawer || e.target.classList.contains('nav-item')) drawer.classList.remove('open'); };
  }

  function bindSearch(){
    const inp = document.getElementById('gq');
    const sug = document.getElementById('suggest');
    const doGo = ()=>{ const v=inp.value.trim(); if(v){ sug.classList.add('hidden'); Router.go('diag',{code:v}); } };
    document.getElementById('ggo').onclick = doGo;
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter') doGo(); });
    let timer=null;
    inp.addEventListener('input', ()=>{
      clearTimeout(timer);
      const v=inp.value.trim();
      if(!v){ sug.classList.add('hidden'); return; }
      timer=setTimeout(async ()=>{
        const d = await API.get('/search',{q:v});
        if(!d.results.length){ sug.classList.add('hidden'); return; }
        sug.innerHTML = d.results.map(r=>`<div class="s-item" data-code="${r.code}"><b>${esc(r.name)}</b> <span class="code">${r.code}・${r.market}</span> <span class="mono ${dirClass(r.chg)}" style="margin-left:auto">${arrow(r.chg)}${fmt(r.chg)}%</span></div>`).join('');
        sug.classList.remove('hidden');
        sug.querySelectorAll('.s-item').forEach(it=>it.onclick=()=>{ inp.value=''; sug.classList.add('hidden'); goStock(it.dataset.code); });
      }, 180);
    });
    document.addEventListener('click', e=>{ if(!sug.contains(e.target) && e.target!==inp) sug.classList.add('hidden'); });
  }

  async function render(){
    const {view,q} = Router.parse();
    const fn = Views[view] || Views.home;
    document.title = '台股研究書房' + (view!=='home'?' · '+((META.tools||[]).find(t=>t.id===view)?.name||''):'');
    mount.innerHTML = '<div class="empty">載入中…</div>';
    try{
      const node = await fn(q);
      mount.innerHTML=''; mount.appendChild(node);
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(err){
      mount.innerHTML = `<div class="card"><h2>載入失敗</h2><div class="note">${esc(err.message||err)}</div></div>`;
      console.error(err);
    }
  }

  boot();
})();
