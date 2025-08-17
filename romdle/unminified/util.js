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
    result[i][2] = Math.max(1, Object.keys(counts).length)
  }
  return result
}

function eligibleWord(word, mustHave){
  if( word == "" ) return false;
  word = word.toUpperCase();
  for( let letter of mustHave ){
    if( !word.includes(letter.toUpperCase()) ) return false;
    // let word2 = word.replace(RegExp(letter, "i"), "")
    // if( word2 == word ) return false
    // word = word2
  }
  return true
}

export { wordleHash, calculate, eligibleWord };
