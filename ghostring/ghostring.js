// ---- Ghostring solver engine: candidate sets as 25-bit masks ----
const COLS="ABCDE";
const CELLS=[]; for(let c=0;c<5;c++) for(let r=0;r<5;r++) CELLS.push([c,r]);
const LABEL=CELLS.map(([c,r])=>COLS[c]+(r+1));
const IDX={}; LABEL.forEach((l,i)=>IDX[l]=i);

// CAT[g][t]: 0=win 1=hot 2=warm 3=cold
const CAT=[];
for(let g=0;g<25;g++){
  CAT.push(new Uint8Array(25));
  for(let t=0;t<25;t++){
    const d=Math.abs(CELLS[g][0]-CELLS[t][0])+Math.abs(CELLS[g][1]-CELLS[t][1]);
    CAT[g][t]= d===0?0 : d===1?1 : d===2?2 : 3;
  }
}
// partition masks: PART[g][mask] computed on the fly
function parts(g,mask){
  let h=0,w=0,c=0;
  let m=mask;
  while(m){
    const t=31-Math.clz32(m & -m);
    m &= m-1;
    const k=CAT[g][t];
    if(k===1) h|=1<<t; else if(k===2) w|=1<<t; else if(k===3) c|=1<<t;
  }
  return [h,w,c];
}
const pc = m => { let n=0; while(m){ m&=m-1; n++; } return n; };

const W={1:1,2:2,3:4,4:8,5:16};
const risk = s => Math.min(1, W[s]/((26-s)-1));

// ---- Hard mode: maximise win probability ----
const wpMemo=new Map();
function WP(mask,shot){
  const n=pc(mask);
  if(n===0) return 1;
  if(shot>5) return 0;
  if(n===1) return 1;
  const key=mask*8+shot;
  const hit=wpMemo.get(key); if(hit!==undefined) return hit;
  const pw=risk(shot);
  let best=-1;
  for(let g=0;g<25;g++){
    let v=(mask>>>g&1)?1/n:0;
    const [h,w,c]=parts(g,mask);
    if(h) v+=(pc(h)/n)*(1-pw)*WP(h,shot+1);
    if(w) v+=(pc(w)/n)*(1-pw)*WP(w,shot+1);
    if(c) v+=(pc(c)/n)*(1-pw)*WP(c,shot+1);
    if(v>best) best=v;
  }
  wpMemo.set(key,best);
  return best;
}
function wpOf(mask,shot,g){
  const n=pc(mask);
  if(n===0) return 1;
  if(shot>5) return 0;
  const pw=risk(shot);
  let v=(mask>>>g&1)?1/n:0;
  const [h,w,c]=parts(g,mask);
  if(h) v+=(pc(h)/n)*(1-pw)*WP(h,shot+1);
  if(w) v+=(pc(w)/n)*(1-pw)*WP(w,shot+1);
  if(c) v+=(pc(c)/n)*(1-pw)*WP(c,shot+1);
  return v;
}

// ---- Normal mode: minimise total path length ----
const tMemo=new Map();
function T(mask,left){
  const n=pc(mask);
  if(n===0) return 0;
  if(left<=0) return Infinity;
  if(n===1) return 1;
  const key=mask*8+left;
  const hit=tMemo.get(key); if(hit!==undefined) return hit;
  let best=Infinity;
  for(let g=0;g<25;g++){
    const [h,w,c]=parts(g,mask);
    let cost=n;
    if(h) cost+=T(h,left-1);
    if(cost===Infinity) continue;
    if(w) cost+=T(w,left-1);
    if(cost===Infinity) continue;
    if(c) cost+=T(c,left-1);
    if(cost<best) best=cost;
  }
  tMemo.set(key,best);
  return best;
}
function tOf(mask,left,g){
  const n=pc(mask);
  if(n===0) return 0;
  if(left<=0) return Infinity;
  const [h,w,c]=parts(g,mask);
  let cost=n;
  if(h) cost+=T(h,left-1);
  if(w) cost+=T(w,left-1);
  if(c) cost+=T(c,left-1);
  return cost;
}

// score a guess in the active mode; higher = better for hard, lower = better for normal
function evaluate(mask,shot,hard){
  const out=[];
  for(let g=0;g<25;g++){
    out.push(hard? wpOf(mask,shot,g) : tOf(mask,6-shot,g));
  }
  return out;
}
function bestSet(mask,shot,hard){
  const sc=evaluate(mask,shot,hard);
  let best = hard ? Math.max(...sc) : Math.min(...sc.filter(x=>x<Infinity));
  const eq=[];
  for(let g=0;g<25;g++) if(Math.abs(sc[g]-best)<1e-12) eq.push(g);
  return {best, eq, sc};
}


// ---------------- state ----------------
const FULL=(1<<25)-1;
let hard=false, mask=FULL, shot=1, hist=[], sel=null, over=false, won=false;

function optimal(){ return bestSet(mask, shot, hard); }

function reset(){
  mask=FULL; shot=1; hist=[]; over=false; won=false;
  sel=optimal().eq[0];
  render();
}
function setMode(h){
  hard=h;
  document.body.classList.toggle('hard',h);
  document.getElementById('btnEasy').classList.toggle('on',!h);
  document.getElementById('btnHard').classList.toggle('on',h);
  reset();
}
function pick(g){
  if(over) return;
  if(hist.some(x=>x.g===g)) return;   // already photographed
  sel=g; render();
}
function apply(hint){
  if(over||sel===null) return;
  hist.push({g:sel, hint:hint});
  if(hint==='Win'){ over=true; won=true; render(); return; }
  const [h,w,c]=parts(sel,mask);
  mask = hint==='Hot'?h : hint==='Warm'?w : c;
  shot++;
  if(pc(mask)===0 || shot>5){ over=true; render(); return; }
  sel=optimal().eq[0];
  render();
}

// ---------------- render ----------------
function renderChips(){
  const box=document.getElementById('chiprow');
  box.innerHTML='';
  if(over) return;
  const eq=optimal().eq;
  const lab=document.createElement('span');
  lab.className='chiplabel';
  lab.textContent = eq.length>1 ? 'Best squares ('+eq.length+' tied):' : 'Best square:';
  box.appendChild(lab);
  eq.forEach(function(g){
    const b=document.createElement('button');
    b.className='chip'+(g===sel?' on':'');
    b.textContent=LABEL[g];
    b.onclick=function(){ pick(g); };
    box.appendChild(b);
  });
}

function renderGrid(){
  const grid=document.getElementById('grid');
  grid.innerHTML='';
  grid.appendChild(document.createElement('div'));
  for(let c=0;c<5;c++){
    const h=document.createElement('div');
    h.className='cell header'; h.textContent=COLS[c];
    grid.appendChild(h);
  }
  const eq = over?[]:optimal().eq;
  for(let r=0;r<5;r++){
    const rh=document.createElement('div');
    rh.className='cell header'; rh.textContent=r+1;
    grid.appendChild(rh);
    for(let c=0;c<5;c++){
      const g=c*5+r, lab=LABEL[g];
      const d=document.createElement('div');
      const past=hist.find(x=>x.g===g);
      if(past){
        d.className='cell '+past.hint.toLowerCase();
        d.textContent=lab;
      } else if(!over && g===sel){
        d.className='cell current pick'; d.textContent=lab;
      } else if(eq.indexOf(g)!==-1){
        d.className='cell alt pick'; d.textContent=lab;
      } else {
        d.className='cell empty'+(over?'':' pick');
        d.textContent=over?'':lab;
      }
      if(!over && !past) d.onclick=function(){ pick(g); };
      grid.appendChild(d);
    }
  }
}

function renderStatus(){
  const s=document.getElementById('status'), rk=document.getElementById('riskline');
  if(over){
    if(won){
      const last=hist[hist.length-1];
      s.innerHTML='🎉 Found the Ghostring at <b>'+LABEL[last.g]+'</b> in '+hist.length+' shot'+(hist.length>1?'s':'')+'!';
    } else s.innerHTML='Out of films — '+pc(mask)+' square'+(pc(mask)===1?'':'s')+' still possible.';
    rk.textContent=''; return;
  }
  s.innerHTML='Shot '+shot+' of 5 — photograph <b>'+LABEL[sel]+'</b>, then tap the hint you got.';
  if(!hard){ rk.textContent=''; return; }
  const w=W[shot];
  rk.textContent='💀 '+w+' Whisper'+(w>1?'s':'')+' on the board — roughly '
    +(risk(shot)*100).toFixed(1)+'% chance this square is one.';
}

function renderCost(){
  const el=document.getElementById('costline');
  if(over||sel===null){ el.textContent=''; el.className='costline'; return; }
  const o=optimal();
  const isBest=o.eq.indexOf(sel)!==-1;
  if(isBest){
    el.className='costline ok';
    el.textContent='✓ '+LABEL[sel]+' is an optimal choice'+(o.eq.length>1?' (one of '+o.eq.length+' tied)':'');
    return;
  }
  el.className='costline bad';
  if(hard){
    const mine=wpOf(mask,shot,sel);
    el.textContent='⚠ '+LABEL[sel]+' costs you '+((o.best-mine)*100).toFixed(2)
      +' pp of win chance ('+(mine*100).toFixed(2)+'% vs '+(o.best*100).toFixed(2)+'%)';
  } else {
    const mine=tOf(mask,6-shot,sel);
    if(!isFinite(mine)) el.textContent='⚠ '+LABEL[sel]+' cannot guarantee a win within your remaining films';
    else el.textContent='⚠ '+LABEL[sel]+' averages '+(mine/pc(mask)).toFixed(2)
      +' more shots vs '+(o.best/pc(mask)).toFixed(2)+' for the best square';
  }
}

function renderButtons(){
  const row=document.getElementById('btnrow');
  row.innerHTML='';
  if(over) return;
  const [h,w,c]=parts(sel,mask);
  const avail={Win:(mask>>>sel&1)===1, Hot:h!==0, Warm:w!==0, Cold:c!==0};
  [['Win','b-win','🎯 Win'],['Hot','b-hot','🔥 Hot (1)'],['Warm','b-warm','🌤️ Warm (2)'],['Cold','b-cold','❄️ Cold (3+)']]
  .forEach(function(o){
    const b=document.createElement('button');
    b.className=o[1]; b.textContent=o[2];
    b.disabled=!avail[o[0]];
    b.onclick=function(){ apply(o[0]); };
    row.appendChild(b);
  });
}

function renderExtras(){
  document.getElementById('history').innerHTML =
    hist.length? hist.map(x=>'<b>'+LABEL[x.g]+'</b> → '+x.hint).join(' &nbsp;·&nbsp; ') : '';

  const od=document.getElementById('odds');
  if(hard && !over){
    const p=WP(mask,shot);
    od.innerHTML=(shot===1?'Overall win probability: <b>':'Odds you still win from here: <b>')+(p*100).toFixed(2)+'%</b>';
  } else od.innerHTML='';

  const st=document.getElementById('stats');
  if(over){ st.innerHTML=''; }
  else if(hard){
    st.innerHTML='<div><b>'+(WP(FULL,1)*100).toFixed(2)+'%</b>best possible win rate</div>'
      +'<div><b>'+pc(mask)+'</b>squares still possible</div>'
      +'<div><b>'+(6-shot)+'</b>films left</div>';
  } else {
    st.innerHTML='<div><b>≤5</b>guaranteed max shots</div>'
      +'<div><b>'+(T(FULL,5)/25).toFixed(2)+'</b>average shots</div>'
      +'<div><b>'+pc(mask)+'</b>squares still possible</div>';
  }

  document.getElementById('note').innerHTML = hard
    ? 'Per the guide, 1 Whisper is present from the start and doubles on every miss (1→2→4→8→16), so <b>even your first shot carries ~4% risk</b> and a 5th shot is near-suicide at 80%. Risk figures assume Whispers spawn uniformly at random on unguessed, non-Ghostring cells — the game does not publish that placement rule, so treat them as estimates. <b>No strategy can detect or dodge a Whisper</b>; hints only ever describe the Ghostring, so 75.85% is the ceiling, not a target to beat.'
    : 'Minimises shots and ignores Whispers. Four openings tie for best (B3, C2, C4, D3) — they are mirror images with identical odds. Switch to Hard Mode when Whispers are in play.';
}

function renderTree(){
  const box=document.getElementById('fullTree');
  box.innerHTML='';
  if(over){ box.innerHTML='<div class="pathline">Game over.</div>'; return; }
  let lines=0;
  (function walk(m,s,prefix){
    if(lines>90) return;
    const n=pc(m);
    if(n===0) return;
    if(n===1){
      const g=31-Math.clz32(m&-m);
      lines++;
      const d=document.createElement('div'); d.className='pathline';
      d.innerHTML=prefix+(prefix?' → ':'')+'<b>'+LABEL[g]+'</b> <span style="color:#2fa86c;font-weight:700;">= WIN</span>';
      box.appendChild(d); return;
    }
    if(s>5) return;
    const g=bestSet(m,s,hard).eq[0];
    lines++;
    const d=document.createElement('div'); d.className='pathline';
    const tail=(m>>>g&1)? ' <span style="color:#2fa86c;font-weight:700;">= WIN</span>'
                        : ' <span style="opacity:.55">— probe only</span>';
    d.innerHTML=prefix+(prefix?' → ':'')+'<b>'+LABEL[g]+'</b>'+tail;
    box.appendChild(d);
    const p=parts(g,m);
    [['Hot',p[0]],['Warm',p[1]],['Cold',p[2]]].forEach(function(x){
      if(x[1]) walk(x[1],s+1,prefix+(prefix?' → ':'')+'<b>'+LABEL[g]+'</b> <span class="tag '+x[0].toLowerCase()+'">'+x[0]+'</span>');
    });
  })(mask,shot,'');
}

function render(){ renderChips(); renderGrid(); renderStatus(); renderCost(); renderButtons(); renderExtras(); renderTree(); }

document.getElementById('btnReset').onclick=reset;
document.getElementById('btnEasy').onclick=function(){ setMode(false); };
document.getElementById('btnHard').onclick=function(){ setMode(true); };
reset();
