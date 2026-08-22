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

// whisper chance if answer n times incorrectly
function calcWhisperChance(n){
  if( n == 0 ) return 0
  return Math.pow(2,n-1)/(25-n)
}

class Guess{
  constructor(idx, possible, depth=1){
    this.idx = idx
    this.possible = [...possible]
    this.depth = depth
    this.mintotalstep = 0
    this.losechance = 0
    this.totalcount = 0
    if( this.possible.length == 1 ){
      this.win = true
      return
    }
    if( this.depth == 5 && this.possible.length > 1 ){
      this.invalid = true
      return
    }
    this.results = {
      0: [],
      1: [],
      2: [],
      3: [],
    }
    for( let p of this.possible ){
      let res = calc(idx, p)
      this.results[res].push(p)
      if( this.results[res].length == this.possible.length ){
        this.invalid = true
      }
    }
    this.children = {}
  }

  calcChildren(){
    if( this.depth >= 5 ) return
    for( let [k,v] of Object.entries(this.results) ){
      let result = []

      if( v.length == 1 ) {
        if( k==0 ){
          this.totalcount++
          this.mintotalstep += this.depth
        } else{
          this.totalcount++
          this.mintotalstep += this.depth+1
          this.losechance += calcWhisperChance(this.depth)
        }
      }
      if( v.length <= 1 ) continue
      for( let i of ALL_POSSIBLE ){
        let res = new Guess(i, v, this.depth+1)
        result.push(res)
        if( res.invalid ){
          continue
        }
        res.calcChildren()
      }
      result = result.filter(r=>r.win==true)
      if( result.length == 0 ){
        this.invalid = true
        return
      }
      let mintotalstep = Math.min(...result.map(r=>r.mintotalstep))
      this.mintotalstep += mintotalstep
      let losechance = Math.min(...result.map(r=>r.losechance))
      let currentlosechance = calcWhisperChance(this.depth)
      this.losechance += (currentlosechance + (1-currentlosechance) * losechance) * result[0].totalcount
      // this.children[k] = result.filter(r=>r.mintotalstep == mintotalstep)
      this.children[k] = result.filter(r=>r.losechance == losechance)
      // this.children[k] = result
      this.totalcount += result[0].totalcount
    }
    this.losechance /= this.totalcount
    this.win = true
  }
}

let ans = {}
for( let i of [32] ){
  ans[i] = new Guess(i, ALL_POSSIBLE)
  ans[i].calcChildren2()
  console.log(i, 1-ans[i].losechance, ans[i].mintotalstep/ALL_POSSIBLE.length)
}

inspek = ans[32]
console.log(inspek, 1-inspek.losechance, inspek.mintotalstep/inspek.totalcount, inspek.totalcount)
