(function() {
  const STATES = Object.freeze({
    UNKNOWN: "UNKNOWN",
    COLD: "COLD",
    WARM: "WARM",
    HOT: "HOT",
    WIN: "WIN"
  })

  const STATE_DIST = Object.freeze({
    3: "COLD",
    2: "WARM",
    1: "HOT",
    0: "WIN"
  })

  const EMOJI = Object.freeze({
    UNKNOWN: "❓",
    COLD: "❄️",
    WARM: "🌤️",
    HOT: "🔥",
    WIN: "👻"
  })

  class Cell{
    constructor(row, column, state){
      this.row = row
      this.column = column
      this.state = state
    }

    distance(target){
      return Math.abs(this.row - target.row) + Math.abs(this.column - target.column)
    }

    setAnswer(){
      this.isAnswer = true
    }

    toInt(){
      return this.row*10+this.column
    }
  }

  const MAX_SHOTS = 5;

  let board;
  let candidates;
  let gameOver;
  let clickCount;
  let lastClick;

  function reset() {
    board = [];
    candidates = [];
    gameOver = false;
    clickCount = 0;
    lastClick = undefined;
    for (let r = 1; r <= 5; r++) {
      for (let c = 1; c <= 5; c++) {
        board.push(new Cell(r, c, STATES.UNKNOWN));
        candidates.push(candidates.length);
      }
    }
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Corner blank cell
    const corner = document.createElement('div');
    grid.appendChild(corner);

    // Column headers
    for (let c = 0; c < 5; c++) {
      const h = document.createElement('div');
      h.className = 'cell header';
      h.textContent = String.fromCharCode('A'.charCodeAt()+c);
      grid.appendChild(h);
    }

    for( let cell of board ){
      if( cell.column == 1 ){
        // Row header
        const rh = document.createElement('div');
        rh.className = 'cell header';
        rh.textContent = cell.row;
        grid.appendChild(rh);
      }
      const div = document.createElement('div');
      div.className = 'cell revealed';
      if( cell.state != STATES.UNKNOWN ){
        div.classList.add(cell.state.toLowerCase());
        if( cell == lastClick ){
            div.classList.add('animated');
        }
        div.textContent = EMOJI[cell.state]
      } else{
        if( gameOver ) {
          // If game is over, reveal where the Ghostring could have been
          if( cell.isAnswer ){
            div.classList.add('candidate-reveal');
            div.textContent = '👻';
          } else {
            div.classList.add('empty');
          }
        } else {
          // Playable
          div.classList.add('empty', 'playable');
          div.addEventListener('click', () => {handleCellClick(cell)});
        }
      }
      grid.appendChild(div);
    }
  }

  function getEvilFeedback(guess) {
    const groups = {
      0: [],
      1: [],
      2: [],
      3: []
    };

    candidates.forEach(c => {
      const dist = Math.min(board[c].distance(guess), 3);
      groups[dist].push(c)
    });

    // first guess is always cold
    if( clickCount == 1 ){
      candidates = groups[3]
      return STATES.COLD
    }

    // calculate colors with largest minimum path
    let result = new Guess(guess.toInt(), candidates.map(c => board[c].toInt()), clickCount)
    result.calcChildren()
    console.log(result)

    // from those, find the one with most answer candidates, prioritizing colder
    let bestHint = 0;
    let maxCount = -1;
    result.worstChoice.forEach(h => {
      if (groups[h].length >= maxCount) {
        maxCount = groups[h].length;
        bestHint = h
      }
    });

    // Update candidates to this subset
    candidates = groups[bestHint];

    return STATE_DIST[bestHint];
  }

  function handleCellClick(cell) {
    if (gameOver) return;

    clickCount += 1;
    const hint = getEvilFeedback(cell);
    cell.state = hint

    if (hint === 'Win') {
      gameOver = true;
    } else if (clickCount >= MAX_SHOTS) {
      gameOver = true;
      // set random candidate as real answer
      board[candidates[Math.floor(Math.random() * candidates.length)]].setAnswer()
    }

    renderGrid();
  }

  // Initialize once DOM is ready
  function init() {
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.onclick = reset;
    }
    reset();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // evil calculations
  function calc(a, b){
    dist = Math.abs(Math.floor(a/10)-Math.floor(b/10)) + Math.abs((a%10)-(b%10))
    if( dist >= 3 ) return 3;
    return dist
  }

  const ALL_POSSIBLE = []
  for( let r=1 ; r<=5 ; r++ ){
    for( let c=1 ; c<=5 ; c++ ){
      ALL_POSSIBLE.push(r*10+c)
    }
  }

  class Guess{
    constructor(idx, possible, depth=1){
      this.idx = idx
      this.possible = [...possible]
      this.depth = depth
      this.maxminstep = 0
      this.worstChoice = [0]
      this.results = {}
      if( this.possible.length == 1 ){
        this.maxminstep = this.depth
        this.win = true
        this.worstChoice = [calc(idx, possible[0])]
        return
      }
      if( this.depth == MAX_SHOTS && this.possible.length > 1 ){
        this.maxminstep = 100
        this.invalid = true
        this.worstChoice = [0, 1, 2, 3]
        return
      }
      this.results = {
        1: [],
        2: [],
        3: [],
      }
      for( let p of this.possible ){
        let res = calc(idx, p)
        if( res == 0 ) continue
        this.results[res].push(p)
        if( this.results[res].length == this.possible.length ){
          this.invalid = true
        }
      }
      this.children = {}
    }
    calcChildren(){
      if( this.depth >= MAX_SHOTS ) return
      for( let [k,v] of Object.entries(this.results) ){
        if( k == 0 ) continue
        if( v.length < 1 ) continue
        let result = []

        for( let i of ALL_POSSIBLE ){
          let res = new Guess(i, v, this.depth+1)
          if( res.invalid ){
            continue
          }
          result.push(res)
          res.calcChildren()
        }
        result = result.filter(r=>r.win==true)
        if( result.length == 0 ){
          this.invalid = true
          this.maxminstep = 100
          this.worstChoice = [k]
          return
        }
        let maxminstep = Math.min(...result.map(r=>r.maxminstep))
        if( maxminstep > this.maxminstep ){
          this.maxminstep = maxminstep
          this.worstChoice = [k]
        } else if( maxminstep == this.maxminstep ){
          this.worstChoice.push(k)
        }
        this.children[k] = result.filter(r=>r.maxminstep == maxminstep)
      }
      this.win = true
    }
  }
})();


