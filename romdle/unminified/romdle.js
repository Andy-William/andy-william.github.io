import { wordleHash, calculate, eligibleWord } from "./util.js"

const COLORS = ['red', 'yellow', 'green'];

document.getElementById('loadBtn').addEventListener('click', renderGrid);
document.getElementById('solveBtn').addEventListener('click', solveRomdle);

const urlParams = new URLSearchParams(window.location.search);
const preFilledWords = urlParams.get('words') || ''
const preFilledColors = urlParams.get('colors') || ''

if( preFilledWords.length > 0 ){
  document.getElementById('guesses').value = preFilledWords.match(/.{1,5}/g).join("\n");
  renderGrid();
  if( preFilledColors.length > 0 ){
    let colors = Array.from(preFilledColors)
    document.querySelectorAll('.row').forEach(row => {
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
  const grid = document.getElementById('grid');

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
        setColumnLetterColor(i, word[i], newIndex, rowIndex)
      });

      row.appendChild(tile);
    }

    grid.appendChild(row);
  });
  document.getElementById("colorHint").style.display='';
  document.getElementById("solveBtn").style.display='block';
}

function setColumnLetterColor(column, letter, color, idx){
  const grid = document.getElementById('grid');
  Array.from(grid.children).forEach((row, i)=>{
    if( i<idx ) return;
    let tile = row.children[column]
    if( tile.textContent == letter ){
      tile.dataset.colorIndex = color;
      COLORS.forEach(color => tile.classList.remove(color));
      tile.classList.add(COLORS[color]);
    }
  })
}

function solveRomdle() {
  const solveBtn = document.getElementById('solveBtn');
  document.getElementById('answercontainer').style.display='flex';
  const resultsDiv = document.getElementById('results');
  const suggestionDiv = document.getElementById('suggestions');

  solveBtn.disabled = true;
  solveBtn.textContent = "Solving...";
  resultsDiv.innerHTML = "<p>Loading...</p>";
  suggestionDiv.innerHTML = "<p>Loading...</p>";
  setTimeout(()=>{
    realSolveRomdle().then(()=>{
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

async function realSolveRomdle() {
  const rows = Array.from(document.getElementById('grid').querySelectorAll('.row'));

  let letters = []
  let colors = []

  rows.forEach(row => {
    let letter = ""
    let color = ""
    const tiles = row.querySelectorAll('.tile');
    tiles.forEach((tile, i) => {
      letter += tile.textContent;
      color += tile.dataset.colorIndex;
    });
    letters.push(letter)
    colors.push(color)
  });

  let mustHave = []
  for( let idx in colors ){
    for( let i=0 ; i<5 ; i++ ){
      if( colors[idx][i]!="0" ) mustHave.push(letters[idx][i])
    }
  }

  await Promise.all(init)
  let answers = romdletxt.filter(word => eligibleWord(word.trim(), mustHave)).map(word => word.trim().toUpperCase())
  let words = words5txt.filter(word => eligibleWord(word.trim(), mustHave)).map(word => word.trim().toUpperCase())

  let solutions = [...answers]
  let engSolutions = [...words]

  for( let i=0 ; i<colors.length ; i++ ){
    solutions = solutions.filter(word => wordleHash(letters[i], word) == colors[i])
    engSolutions = engSolutions.filter(word => wordleHash(letters[i], word) == colors[i])
  }

  class Answer {
    constructor(word, remaining, combination){
      this.word = word // the word
      this.remaining = remaining // remaining possible answer
      this.combination = combination // possible color combination (higher value)
    }
    static compare(a,b){
      return a.remaining-b.remaining || b.combination-a.combination
    }
    lte(a){
      return Answer.compare(this, a) <= 0
    }
    lt(a){
      return Answer.compare(this, a) <= -1
    }
    toString(){
      return this.word + ' - ' + this.remaining  + ' - ' + this.combination
    }
  }

  function bestRomdleAnswer(words, allWords){
    if( allWords.length == 0 ) return []
    let answers = calculate(words, allWords)
    answers = answers.map(a=>new Answer(a[0], a[1], a[2]))
    answers = answers.sort((a,b)=>Answer.compare(a,b))
    return answers
  }

  let globalMinValue = new Answer("", 99999, 0)
  let ans = bestRomdleAnswer(solutions, solutions)
  if( ans.length > 0 ){
    globalMinValue = ans[0]
  }
  ans = ans.filter(a=>a.lte(globalMinValue))
  console.log(ans.map(a=>a.toString()))

  let ans2 = bestRomdleAnswer(solutions, answers)
  ans2 = ans2.filter(a=>a.lt(globalMinValue))
  if( ans2.length>0 ){
    globalMinValue = ans2[0]
  }
  console.log(ans2.map(a=>a.toString()))

  let ans3 = bestRomdleAnswer(solutions, words)
  ans3 = ans3.filter(a=>a.lt(globalMinValue))
  console.log(ans3.map(a=>a.toString()))

  let sortedAns = ans3.map(a => a.word).concat(ans2.map(a => a.word)).concat(ans.map(a => a.word))

  let resultDiv = document.getElementById('results')
  fillWordList(resultDiv, solutions)
  fillWordList(document.getElementById('suggestions'), sortedAns)

  const maybeDiv = document.createElement('div')
  const solset = new Set(solutions)
  maybeDiv.textContent = 'Other words that fit: ' + engSolutions.filter(w=>!solset.has(w)).join(", ")
  maybeDiv.classList.add('hint')
  resultDiv.appendChild(maybeDiv)
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
