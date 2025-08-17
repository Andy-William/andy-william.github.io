import { wordleHash, calculate, eligibleWord } from "./util.js"

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let solutions = [];
let currentGuess = 0;
let gameOver = false;
let mustHave = [];

let romdletxt = [];
let words5txt = [];
let eviltxt = [];
let init = [
  fetch('romdle.txt').then(response => response.text()).then(text=> romdletxt = text.split('\n').filter(word => word.trim()).map(word => word.trim().toUpperCase())),
  fetch('words5.txt').then(response => response.text()).then(text=> words5txt = text.split('\n').filter(word => word.trim()).map(word => word.trim().toUpperCase())),
  fetch('evil.txt').then(response => response.text()).then(text=> eviltxt = text.split('\n').filter(word => word.trim()).map(word => word.trim().toUpperCase()))
];

const board = document.getElementById("board");
const guessInput = document.getElementById("guessInput");
document.getElementById("resetBtn").addEventListener("click", startGame);
const errorSubmit = document.getElementById("errorSubmit");

function initBoard() {
  board.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement("div");
    row.className = "row";
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement("div");
      tile.className = "tile gray"; // default wrong color
      tile.textContent = "";
      tile.dataset.row = r;
      tile.dataset.col = c;

      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

async function startGame() {
  currentGuess = 0;
  gameOver = false;
  mustHave = [];
  guessInput.value = "";
  guessInput.focus();
  errorSubmit.textContent = "";
  initBoard();
  await Promise.all(init);
  solutions = [...eviltxt];
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
}

function bestRomdleAnswer(words, allWords){
  if( allWords.length == 0 ) return []
  let answers = calculate(words, allWords)
  answers = answers.map(a=>new Answer(a[0], a[1], a[2]))
  answers = answers.sort((a,b)=>Answer.compare(a,b))
  return answers[0]
}

function findWorstHash(guess, words){
  let hashWords = {};
  let maxNeed = 0;
  let worstAnswer = new Answer("", -1, 0);
  let ans = "22222";

  for( let word of words ){
    let hash = wordleHash(guess, word)
    hashWords[hash] ||= []
    hashWords[hash].push(word)
  }

  for( let hash in hashWords ){
    if( hashWords[hash].length < maxNeed ) continue;
    if( hash=="22222" ) continue;

    let currentMustHave = []
    for( let i in hash ){
      if( hash[i]!="0" ) currentMustHave.push(guess[i])
    }

    let words = words5txt.filter(word => eligibleWord(word.trim(), currentMustHave)).map(word => word.trim().toUpperCase())

    let best = bestRomdleAnswer(hashWords[hash], words);
    if( worstAnswer.remaining < best.remaining || (worstAnswer.remaining == best.remaining && hashWords[hash].length > hashWords[ans].length) ){
      worstAnswer = best;
      ans = hash;
      maxNeed = worstAnswer.remaining;
      mustHave = currentMustHave;
    }
  }

  // First answer was optimized to only check hard words. This speeds up calculation and make it harder to guess.
  // However we need to add all possible answer for next guesses
  if( currentGuess == 0 ){
    solutions = romdletxt.filter(word => wordleHash(guess, word)==ans)
  } else{
    solutions = hashWords[ans]
  }
  return ans;
}

function submitGuess(guess) {
  if( gameOver ) return;
  guess = guess.toUpperCase();
  if( guess.length !== WORD_LENGTH ){
    errorSubmit.textContent = "Invalid word length!"
    return;
  } else if ( !eligibleWord(guess, mustHave) ){
    errorSubmit.textContent = "Must contain " + Array.from(new Set(mustHave)).join(", ") + "!"
    return;
  } else if( !words5txt.includes(guess) && !romdletxt.includes(guess) ){
    errorSubmit.textContent = "Not in word list!"
    return;
  } else{
    errorSubmit.textContent = ""
  }

  const rowTiles = document.querySelectorAll(`.row:nth-child(${currentGuess + 1}) .tile`);

  let wh = findWorstHash(guess, solutions)
  for (let i = 0; i < wh.length ; i++) {
    rowTiles[i].textContent = guess[i];
    rowTiles[i].classList.remove("red", "yellow", "green", "gray");

    if( wh[i] == "2" ){
      rowTiles[i].classList.add("green");
    } else if( wh[i] == "1" ){
      rowTiles[i].classList.add("yellow");
    } else {
      rowTiles[i].classList.add("red");
    }
  }

  currentGuess++;

  if( wh == "22222" ) {
    gameOver = true;
    errorSubmit.textContent = "You win!";
  } else if (currentGuess >= MAX_GUESSES) {
    gameOver = true;
    errorSubmit.textContent = `Game over! The word was ${solutions[0]}`;
  }

  guessInput.value = "";
}

guessInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    submitGuess(guessInput.value);
  }
});

startGame();
