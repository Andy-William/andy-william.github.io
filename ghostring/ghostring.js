const TREE = {"guess": "C3", "candidates_count": 25, "branches": {"Hot": {"guess": "B3", "candidates_count": 4, "branches": {"Warm": {"guess": "C2", "candidates_count": 3, "branches": {"Warm": {"guess": "C4", "candidates_count": 2, "branches": {"Warm": {"guess": "D3", "candidates_count": 1, "branches": {}, "final": true}}}}}}}, "Warm": {"guess": "B2", "candidates_count": 8, "branches": {"Warm": {"guess": "A3", "candidates_count": 4, "branches": {"Warm": {"guess": "B4", "candidates_count": 1, "branches": {}, "final": true}, "Cold": {"guess": "C1", "candidates_count": 2, "branches": {"Warm": {"guess": "D2", "candidates_count": 1, "branches": {}, "final": true}}}}}, "Cold": {"guess": "C5", "candidates_count": 3, "branches": {"Warm": {"guess": "D4", "candidates_count": 1, "branches": {}, "final": true}, "Cold": {"guess": "E3", "candidates_count": 1, "branches": {}, "final": true}}}}}, "Cold": {"guess": "A2", "candidates_count": 12, "branches": {"Hot": {"guess": "A1", "candidates_count": 1, "branches": {}, "final": true}, "Warm": {"guess": "A4", "candidates_count": 2, "branches": {"Cold": {"guess": "B1", "candidates_count": 1, "branches": {}, "final": true}}}, "Cold": {"guess": "D5", "candidates_count": 8, "branches": {"Hot": {"guess": "E5", "candidates_count": 1, "branches": {}, "final": true}, "Warm": {"guess": "B5", "candidates_count": 2, "branches": {"Cold": {"guess": "E4", "candidates_count": 1, "branches": {}, "final": true}}}, "Cold": {"guess": "D1", "candidates_count": 4, "branches": {"Hot": {"guess": "E1", "candidates_count": 1, "branches": {}, "final": true}, "Warm": {"guess": "E2", "candidates_count": 1, "branches": {}, "final": true}, "Cold": {"guess": "A5", "candidates_count": 1, "branches": {}, "final": true}}}}}}}}};

const COLS = "ABCDE";
let node = TREE;
let path = []; // {cell, hint}
let shot = 1;
let over = false;

function cellCoord(label){
  const c = COLS.indexOf(label[0]) + 1;
  const r = parseInt(label.slice(1));
  return [c,r];
}

function renderGrid(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  grid.appendChild(document.createElement('div')); // corner
  for(let c=1;c<=5;c++){
    const h = document.createElement('div');
    h.className='cell header'; h.textContent = COLS[c-1];
    grid.appendChild(h);
  }
  for(let r=1;r<=5;r++){
    const rh = document.createElement('div');
    rh.className='cell header'; rh.textContent = r;
    grid.appendChild(rh);
    for(let c=1;c<=5;c++){
      const label = COLS[c-1]+r;
      const div = document.createElement('div');
      div.className='cell empty';
      div.textContent='';
      const hist = path.find(p=>p.cell===label);
      if(hist){
        div.classList.remove('empty');
        div.classList.add(hist.hint.toLowerCase());
        div.textContent = hist.cell;
      }
      if(!over && label === node.guess){
        div.classList.remove('empty');
        div.classList.add('current');
        div.textContent = label;
      }
      grid.appendChild(div);
    }
  }
}

function renderStatus(){
  const s = document.getElementById('status');
  if(over){
    s.innerHTML = path[path.length-1].hint==='Win'
      ? `🎉 Found it at <b>${path[path.length-1].cell}</b> in ${path.length} shot${path.length>1?'s':''}!`
      : `Done.`;
  } else {
    s.innerHTML = `Shot <b>${shot}</b>: take a picture of <b>${node.guess}</b>, then tap the hint you get.`;
  }
}

function renderButtons(){
  const row = document.getElementById('btnrow');
  row.innerHTML = '';
  if(over){ return; }
  const opts = [
    {key:'Win', cls:'b-win', label:'🎯 Win'},
    {key:'Hot', cls:'b-hot', label:'🔥 Hot (1)'},
    {key:'Warm', cls:'b-warm', label:'🌤️ Warm (2)'},
    {key:'Cold', cls:'b-cold', label:'❄️ Cold (3+)'},
  ];
  opts.forEach(o=>{
    const btn = document.createElement('button');
    btn.className = o.cls;
    btn.textContent = o.label;
    const available = o.key==='Win' || (node.branches && node.branches[o.key]);
    btn.disabled = !available;
    btn.onclick = ()=>choose(o.key);
    row.appendChild(btn);
  });
}

function renderHistory(){
  const h = document.getElementById('history');
  if(path.length===0){ h.innerHTML=''; return; }
  h.innerHTML = path.map(p=>`<b>${p.cell}</b> → ${p.hint}`).join(' &nbsp;·&nbsp; ');
}

function choose(hint){
  path.push({cell: node.guess, hint});
  if(hint==='Win' || shot>=5){
    over = true;
  } else {
    node = node.branches[hint];
    shot++;
  }
  render();
}

function reset(){
  node = TREE; path = []; shot = 1; over = false;
  render();
}

function render(){
  renderGrid(); renderStatus(); renderButtons(); renderHistory();
}

document.getElementById('resetBtn').onclick = reset;

// Full tree listing
function buildFullTree(n, prefix, container){
  const line = document.createElement('div');
  line.className = 'pathline';
  line.innerHTML = prefix + (prefix?' → ':'') + `<b>${n.guess}</b> <span style="color:#2fa86c;font-weight:700;">= WIN</span>`;
  container.appendChild(line);
  ['Hot','Warm','Cold'].forEach(cat=>{
    if(n.branches && n.branches[cat]){
      const tagPrefix = prefix + (prefix?' → ':'') + `<b>${n.guess}</b> <span class="tag ${cat.toLowerCase()}">${cat}</span>`;
      buildFullTree(n.branches[cat], tagPrefix, container);
    }
  });
}
buildFullTree(TREE, '', document.getElementById('fullTree'));

render();
