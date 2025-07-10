const COLORS = ['red', 'yellow', 'green'];

document.getElementById('loadBtn').addEventListener('click', renderGrid);
document.getElementById('solveBtn').addEventListener('click', solveDuodle);

const urlParams = new URLSearchParams(window.location.search);
const preFilledWords = urlParams.get('words') || ''
const preFilledColors = urlParams.get('colors') || ''

if( preFilledWords.length > 0 ){
  document.getElementById('guesses').value = preFilledWords.match(/.{1,5}/g).join("\n");
  renderGrid();
  if( preFilledColors.length > 0 ){
    let colors = Array.from(preFilledColors)
    document.querySelectorAll('.row').forEach(row => {
      console.log(row)
      row.querySelectorAll('.tile').forEach(tile => {
        let color = colors.shift()
        if( color ){
          tile.dataset.colorIndex = color
          COLORS.forEach(color => tile.classList.remove(color));
          tile.classList.add(COLORS[color]);
        }
      })
    });
  }
}

function renderGrid() {
  const input = document.getElementById('guesses').value.trim().toUpperCase();
  const lines = input.replace(/[^a-zA-Z]+/g, '').match(/.{5}/g)?.filter(line => line.length === 5) || [];
  const grids = [document.getElementById('grid1'),document.getElementById('grid2')];

  for( let grid of grids ){
    // Save current grid state
    const previousTiles = [];
    // Smart state map
    const knownColors = [{},{},{},{},{}]
    grid.querySelectorAll('.row').forEach(row => {
      const tiles = Array.from(row.querySelectorAll('.tile'));
      previousTiles.push(tiles.map((tile, idx) => {
        knownColors[idx][tile.textContent] = parseInt(tile.dataset.colorIndex);
        // if this letter exists, set other red place as yellow
        if( knownColors[idx][tile.textContent]!=0 ){
          for( let i=0 ; i<5 ; i++ ){
            if( !knownColors[i][tile.textContent] || knownColors[i][tile.textContent] == 0 ){
              knownColors[i][tile.textContent] = 1;
            }
          }
        }
        return {
          letter: tile.textContent,
          colorIndex: parseInt(tile.dataset.colorIndex)
        }
      }));
    });

    grid.innerHTML = '';

    lines.forEach((word, rowIndex) => {
      const row = document.createElement('div');
      row.classList.add('row');

      for (let i = 0; i < 5; i++) {
        const tile = document.createElement('div');
      const prevTile = previousTiles?.[rowIndex]?.[i];
        const prevMatch = prevTile?.letter === word[i];

        const colorIndex = prevMatch ? prevTile.colorIndex : knownColors[i][word[i]] || 0;

        tile.classList.add('tile', COLORS[colorIndex]);
        tile.textContent = word[i];
        tile.dataset.colorIndex = colorIndex;

        tile.addEventListener('click', () => {
          let newIndex = (parseInt(tile.dataset.colorIndex) + 1) % COLORS.length;
          setColumnLetterColor(grid.id, i, word[i], newIndex, rowIndex)
        });

        row.appendChild(tile);
      }

      grid.appendChild(row);
    });
  }
  document.getElementById("colorHint").style.display='';
  document.getElementById("previewGrid").style.display='';
  document.getElementById("solveBtn").style.display='block';
}

function setColumnLetterColor(gridId, column, letter, color, idx) {
  const grid = document.getElementById(gridId)
  Array.from(grid.children).forEach((row, i) => {
    if( i<idx ) return;
    let tile = row.children[column]
    if (tile.textContent == letter) {
      tile.dataset.colorIndex = color
      COLORS.forEach((color) => tile.classList.remove(color))
      tile.classList.add(COLORS[color])
    }
  })
}

function solveDuodle() {
  const solveBtn = document.getElementById('solveBtn');
  document.getElementById('answercontainer').style.display='flex';
  const results1Div = document.getElementById('results1');
  const results2Div = document.getElementById('results2');
  const suggestionDiv = document.getElementById('suggestions');

  solveBtn.disabled = true;
  solveBtn.textContent = "Solving...";
  results1Div.innerHTML = "<p>Loading...</p>";
  results2Div.innerHTML = "<p>Loading...</p>";
  suggestionDiv.innerHTML = "<p>Loading...</p>";
  setTimeout(()=>{
    realSolveDuodle().then(()=>{
      solveBtn.disabled = false;
      solveBtn.textContent = "Solve";
    });
  },50)
}


let romdletxt = []
let words5txt = []
let init = [
  fetch('romdle.txt').then(response => response.text()).then(text=> romdletxt = text.split('\n')),
  fetch('words5.txt').then(response => response.text()).then(text=> words5txt = text.split('\n'))
]

async function realSolveDuodle() {
  const grid1 = document.getElementById('grid1');
  const grid2 = document.getElementById('grid2');
  const rows1 = Array.from(document.getElementById('grid1').querySelectorAll('.row'));
  const rows2 = Array.from(document.getElementById('grid2').querySelectorAll('.row'));

  let letters1 = []
  let letters2 = []
  let colors1 = []
  let colors2 = []

  rows1.forEach(row => {
    let letter = ""
    let color = ""
    const tiles = row.querySelectorAll('.tile');
    tiles.forEach((tile, i) => {
      letter += tile.textContent;
      color += tile.dataset.colorIndex;
    });
    letters1.push(letter)
    colors1.push(color)
  });
  rows2.forEach(row => {
    let letter = ""
    let color = ""
    const tiles = row.querySelectorAll('.tile');
    tiles.forEach((tile, i) => {
      letter += tile.textContent;
      color += tile.dataset.colorIndex;
    });
    letters2.push(letter)
    colors2.push(color)
  });

  await Promise.all(init)
  let answers = romdletxt.filter(word => word.trim()).map(word => word.trim().toUpperCase())
  let words = words5txt.filter(word => word.trim()).map(word => word.trim().toUpperCase())

  let memo = {}
  function wordleHash(guess, ans){
    guess = guess.toUpperCase()
    ans = ans.toUpperCase()
    if( memo[guess] && memo[guess][ans] ) return memo[guess][ans];
    memo[guess] = (memo[guess]||{})
    let result = [0,0,0,0,0]
    let reserve = {}
    for( let i=0 ; i<5 ; i++ ){
      if( guess[i] == ans[i] ){
        result[i] = 2
      } else {
        reserve[ans[i]] = (reserve[ans[i]]||0)+1
      }
    }

    for( let i=0 ; i<5 ; i++ ){
      if( guess[i] != ans[i] ){
        if( reserve[guess[i]] && reserve[guess[i]] > 0 ){
          reserve[guess[i]]--
          result[i] = 1
        }
      }
    }
    return memo[guess][ans] = result.join("")
  }

  var solutions1 = [...answers]
  var engSolutions1 = [...words]

  for( let i=0 ; i<colors1.length ; i++ ){
    solutions1 = solutions1.filter(word => wordleHash(letters1[i], word) == colors1[i])
    engSolutions1 = engSolutions1.filter(word => wordleHash(letters1[i], word) == colors1[i])
  }

  var solutions2 = [...answers]
  var engSolutions2 = [...words]

  for( let i=0 ; i<colors2.length ; i++ ){
    solutions2 = solutions2.filter(word => wordleHash(letters2[i], word) == colors2[i])
    engSolutions2 = engSolutions2.filter(word => wordleHash(letters2[i], word) == colors2[i])
  }

  function calculate(solutions, guesses){
    let result = new Array(guesses.length)
    for( let i=0 ; i<guesses.length ; i++ ){
      result[i] = [guesses[i], 0]
      let counts = {}
      for( let j=0 ; j<solutions.length ; j++ ){
        let hash = wordleHash(guesses[i],solutions[j])
        counts[hash] = (counts[hash]||0)+1
        if( hash=="22222" ) counts[hash]--
        if( counts[hash] > result[i][1] ) result[i][1] = counts[hash]
      }
      result[i][2] = Object.keys(counts).length
    }
    return result
  }


  class Answer {
    constructor(word, remaining1, remaining2, combination1, combination2){
      this.word = word // the word
      this.remaining1 = Math.max(remaining1, remaining2) // remaining possible answer (higher value)
      this.remaining2 = Math.min(remaining1, remaining2) // remaining possible answer (lower value)
      this.combination1 = Math.max(combination1, combination2) // possible color combination (higher value)
      this.combination2 = Math.min(combination1, combination2) // possible color combination (lower  value)
    }
    static compare(a,b){
      return a.remaining1-b.remaining1 || a.remaining2-b.remaining2 || (b.combination1*b.combination2-a.combination1*a.combination2)
    }
    lte(a){
      return Answer.compare(this, a) <= 0
    }
    lt(a){
      return Answer.compare(this, a) <= -1
    }
    toString(){
      return this.word + ' - ' + this.remaining1 + '-' + this.remaining2 + ' - ' + this.combination1 + '-' + this.combination2
    }
  }

  function bestDuoAnswer(words1, words2, allWords){
    if( allWords.length == 0 ) return []
    let result1 = calculate(words1, allWords)
    let result2 = calculate(words2, allWords)

    let result = new Array(allWords.length)
    for( let i=0 ; i<allWords.length ; i++ ){
      result[i] = new Answer(allWords[i], result1[i][1], result2[i][1], result1[i][2], result2[i][2])
    }
    result = result.sort((a,b)=>Answer.compare(a,b))
    return result
  }

  let ans = []
  if( solutions1.length == 1 && !letters1.includes(solutions1[0]) ){
    ans.push(new Answer(solutions1[0],0,0,0,0))
  }
  if( solutions2.length == 1 && !letters2.includes(solutions2[0]) ){
    ans.push(new Answer(solutions2[0],0,0,0,0))
  }
  console.log(ans.map(a=>a.toString()))

  let globalMinValue = new Answer("", 99999, 99999, 0, 0)
  let ans1 = bestDuoAnswer(solutions1, solutions2, [...new Set(solutions1.concat(solutions2))])
  if( ans1.length > 0 ){
    globalMinValue = ans1[0]
  }
  ans1 = ans1.filter(a=>a.lte(globalMinValue)).filter(a=>!letters1.includes(a.word.substring(0,5)))
  console.log(ans1)

  let ans2 = bestDuoAnswer(solutions1, solutions2, answers)
  ans2 = ans2.filter(a=>a.lt(globalMinValue))
  if( ans2.length>0 ){
    globalMinValue = ans2[0]
  }
  console.log(ans2.map(a=>a.toString()))

  let ans3 = bestDuoAnswer(solutions1, solutions2, words)
  ans3 = ans3.filter(a=>a.lt(globalMinValue))
  console.log(ans3.map(a=>a.toString()))

  let sortedAns = ans.map(a => a.word).concat(ans3.map(a => a.word)).concat(ans2.map(a => a.word)).concat(ans1.map(a => a.word))
  sortedAns = [...new Set(sortedAns)];

  let result1Div = document.getElementById('results1')
  let result2Div = document.getElementById('results2')
  fillWordList(result1Div, solutions1)
  fillWordList(result2Div, solutions2)
  fillWordList(document.getElementById('suggestions'), sortedAns)

  const maybe1Div = document.createElement('div')
  const sol1set = new Set(solutions1)
  maybe1Div.textContent = 'Other words that fit: ' + engSolutions1.filter(w=>!sol1set.has(w)).join(", ")
  maybe1Div.classList.add('hint')
  result1Div.appendChild(maybe1Div)

  const maybe2Div = document.createElement('div')
  const sol2set = new Set(solutions2)
  maybe2Div.textContent = 'Other words that fit: ' + engSolutions2.filter(w=>!sol2set.has(w)).join(", ")
  maybe2Div.classList.add('hint')
  result2Div.appendChild(maybe2Div)
}

function addWordToInput(word) {
  const textarea = document.getElementById('guesses');
  textarea.value = textarea.value + "\n" + word;
  renderGrid();
}

function fillWordList(div, words){
  div.innerHTML = '';
  words.forEach(word => {
    const wordDiv = document.createElement('div');
    wordDiv.textContent = word;
    wordDiv.classList.add('suggestion');
    wordDiv.addEventListener('click', () => {
      addWordToInput(word);
    });
    div.appendChild(wordDiv);
  });
}
