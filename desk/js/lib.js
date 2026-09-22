/* lib.js — 共用工具：API、格式化、DOM、走勢圖、路由、搜尋、toast */
function _clean(params){
  const o={}; if(params) for(const k in params){ const v=params[k]; if(v!=null && v!=='') o[k]=v; }
  return o;
}
// API 可插拔：靜態版（GitHub Pages / Artifact）會先設 window.__API__ 用內建資料；
// 本機版沒設就用 fetch 打後端。
const API = window.__API__ ? window.__API__ : {
  async get(path, params){
    const c=_clean(params); const qs = Object.keys(c).length ? '?' + new URLSearchParams(c) : '';
    const r = await fetch('/api'+path+qs, {cache:'no-store'});
    return r.json();
  },
  async send(method, path, body, params){
    const c=_clean(params); const qs = Object.keys(c).length ? '?' + new URLSearchParams(c) : '';
    const r = await fetch('/api'+path+qs, {method, headers:{'Content-Type':'application/json'},
      body: body!=null ? JSON.stringify(body) : undefined});
    return r.json();
  },
  post(p,b,q){return this.send('POST',p,b,q)},
  put(p,b){return this.send('PUT',p,b)},
  del(p,q){return this.send('DELETE',p,null,q)},
};

const fmt = (v,d=2)=> (v==null||isNaN(v))?'—':Number(v).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtInt = v=> (v==null||isNaN(v))?'—':Number(v).toLocaleString('zh-TW');
const signPct = v=> v==null?'無資料':`${v>0?'+':''}${fmt(v)}%`;
const dirClass = v=> v==null?'flat':v>0?'up':v<0?'down':'flat';
const arrow = v=> v==null?'':v>0?'▲':v<0?'▼':'＝';
const esc = s=> (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}

function spark(arr,opts={}){
  if(!arr||arr.length<2) return '';
  const w=opts.w||120,h=opts.h||28,pad=3;
  const min=Math.min(...arr),max=Math.max(...arr),rng=(max-min)||1;
  const pts=arr.map((v,i)=>{const x=pad+i*(w-2*pad)/(arr.length-1);let y=(v-min)/rng;if(opts.invert)y=1-y;return `${x.toFixed(1)},${(pad+(1-y)*(h-2*pad)).toFixed(1)}`;});
  let rising=arr[arr.length-1]>arr[0]; if(opts.invert)rising=arr[arr.length-1]<arr[0];
  const col=rising?'var(--up)':(arr[arr.length-1]===arr[0]?'var(--flat)':'var(--down)');
  const lp=pts[pts.length-1].split(',');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}"/><circle cx="${lp[0]}" cy="${lp[1]}" r="2.5" fill="${col}"/></svg>`;
}

function toast(msg){
  const t=el('div','toast',esc(msg));document.body.appendChild(t);
  setTimeout(()=>t.remove(),1800);
}
function copyText(txt){
  navigator.clipboard?.writeText(txt).then(()=>toast('已複製')).catch(()=>toast('複製失敗，請手動選取'));
}

/* 最近查詢（localStorage，僅本機） */
const RECENT='sp_recent';
function pushRecent(code,name){let l=[];try{l=JSON.parse(localStorage.getItem(RECENT)||'[]')}catch(e){}
  l=l.filter(x=>x.code!==code);l.unshift({code,name});l=l.slice(0,8);
  try{localStorage.setItem(RECENT,JSON.stringify(l))}catch(e){}return l;}
function getRecent(){try{return JSON.parse(localStorage.getItem(RECENT)||'[]')}catch(e){return[]}}

/* 路由：#/tool?code=xxx */
const Router={
  parse(){const h=location.hash.replace(/^#\/?/,'');const [path,qs]=h.split('?');
    const q={};if(qs)new URLSearchParams(qs).forEach((v,k)=>q[k]=v);
    return {view:path||'home',q};},
  go(view,q){const qs=q?'?'+new URLSearchParams(q):'';location.hash='#/'+view+qs;},
  replace(view,q){const qs=q?'?'+new URLSearchParams(q):'';history.replaceState(null,'','#/'+view+qs);},
};
