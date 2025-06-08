const canvas = document.getElementById('game');
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById('score');
const telegramId = (window.location.hash.match(/#([^?]*)/)||[])[1];

const animationSpeed = 2000/1000;  // unit per millisecond
const blockSize = 100;
const initValue = 2;
const winValue = 2048;
let score = 0;
let size = 4;
canvas.height = canvas.width = size*blockSize;

const DIRECTIONS = Object.freeze({LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40}); // also maps keyboard press

// cell class
function Cell(row, col, val){
  this.val = val;
  this.row = row;
  this.col = col;
  this.combineWith = null; // combining cells waiting for animation
  this.score = function(){
    return parseInt(this.val); 
  }
  this.levelUp = function(){
    this.val*=2; 
  }
  this.draw = function(timestamp){
    if( this.combineWith ){
      this.combineWith.row = this.row
      this.combineWith.col = this.col;
      this.combineWith.draw(timestamp);
    }
    // time passed since this function last called
    const timePassed = timestamp - (this.lastTimestamp||timestamp);
    this.lastTimestamp = timestamp;
    // size of block
    if( this.sz == undefined ) this.sz = -blockSize;
    
    if( this.x == undefined ) this.x = blockSize*this.col;
    if( this.y == undefined ) this.y = blockSize*this.row;
    const destX = blockSize*this.col;
    const destY = blockSize*this.row;
    // is block animating?
    let moving = false;
    if( this.x > destX ){
      moving=true;
      this.x -= animationSpeed*timePassed;
      if( this.x < destX ) this.x = destX;
    }
    else if( this.x < destX ){
      moving=true;
      this.x += animationSpeed*timePassed;
      if( this.x > destX ) this.x = destX;
    }
    if( this.y > destY ){
      moving=true;
      this.y -= animationSpeed*timePassed;
      if( this.y < destY ) this.y = destY;
    }
    else if( this.y < destY ){
      moving=true;
      this.y += animationSpeed*timePassed;
      if( this.y > destY ) this.y = destY;
    }
    // finished animating, can update value
    if( moving === false ){
      this.prevVal = this.val;
      this.combineWith = (this.combineWith||{combineWith:null}).combineWith;
    }
    if( this.sz > 0 ){
      ctx.fillStyle="#000000";
      ctx.fillRect(this.x+(blockSize-this.sz)/2, this.y+(blockSize-this.sz)/2, this.sz, this.sz);
      ctx.textAlign = "center";
      ctx.textBaseline="middle"; 
      ctx.font = blockSize/2+"px Arial"
      ctx.fillStyle="#FF0000";
      ctx.fillText(this.prevVal, this.x+blockSize/2, this.y+blockSize/2, this.sz)
    }
    if( this.sz < blockSize-2 ) this.sz += timePassed*animationSpeed/2;
    if( this.sz > blockSize-2 ) this.sz = blockSize-2;
  }
}

// board singleton
let board = {
  Cells: [],
  State: 'active',
  getCell: function(row, col){ // safe and parameterized accessing cell
    try{
      return this.Cells[row][col];
    } catch(err){
      return undefined;
    }
  },
  spawn: function(row, col, val){
    return this.Cells[row][col] = new Cell(row, col, val);
  },
  spawnRandom: function(){
    let empty = []
    for( let i=0 ; i<size ; i++ ){
      for( let j=0 ; j<size ; j++ ){
        if( this.Cells[i][j] ) continue;
        empty.push([i,j]);
      }
    }
    if( empty.length == 0 ) return;
    const cell = this.spawn(...empty[Math.floor(Math.random()*empty.length)], initValue);
    if( Math.random() < 0.1 ) cell.levelUp();
  },
  gravitate: function(direction){
    let transform;
    // very smart rotate index
    switch(direction){
      case DIRECTIONS.LEFT:
        transform = (i,j)=>[i,j];
        break;
      case DIRECTIONS.UP:
        transform = (i,j)=>[j,i];
        break;
      case DIRECTIONS.RIGHT:
        transform = (i,j)=>[i,size-1-j];
        break;
      case DIRECTIONS.DOWN:
        transform = (i,j)=>[size-1-j,i];
        break;
      default:
        return;
    }
    
    let changed = false;  // flag if move changed something
    const that = this;
    function moveCell(cell, row, col){
      if( cell.row == row && cell.col == col ) return;
      that.Cells[cell.row][cell.col] = undefined;
      that.Cells[row][col] = cell;
      cell.row = row;
      cell.col = col;
      changed = true;
    }
    
    for( let i=0 ; i<size ; i++ ){
      let cells = []; // cells in this line
      for( let j=0 ; j<size ; j++ ){
        const cell = this.getCell(...transform(i,j));
        if( cell ) cells.push(cell);
      }
      
      for( let j=0 ; j<cells.length ; j++ ){
        moveCell(cells[j],...transform(i,j));
        // combine!
        if( j+1<cells.length && cells[j].val == cells[j+1].val ){
            moveCell(cells[j+1],...transform(i,j));
          cells[j+1].levelUp();
          score += cells[j+1].score();
          if( cells[j+1].val== winValue ) this.State = 'win';
          cells[j+1].combineWith = cells.splice(j,1)[0];
        }
      }
    }
    return changed;
  },
  checkPossible: function(){ // check if still can move
    for( let i=0 ; i<size ; i++ ){
      for( let j=0 ; j<size ; j++ ){
        if( !this.Cells[i][j] ) return;
        const val = this.Cells[i][j].val;
        if( val == (this.getCell(i+1,j)||{}).val ) return;
        if( val == (this.getCell(i,j+1)||{}).val ) return;
      }
    }
    this.State = 'lose';
  },
  draw: function(timestamp){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.Cells.forEach(row=>row.forEach(cell=>{if(cell)cell.draw(timestamp);}));
    
    if( this.State == 'win' ){
      ctx.fillStyle = 'rgba(0, 100, 255, 0.6)'
      ctx.fillRect(0, 0, canvas.height, canvas.width);
      ctx.textAlign = "center";
      ctx.textBaseline="middle"; 
      ctx.font = blockSize + "px Arial";
      ctx.fillStyle="#FFFFFF";
      ctx.fillText('You Win!', canvas.height/2, canvas.width/2, canvas.width)
    }    
    else if( this.State == 'lose' ){
      ctx.fillStyle = 'rgba(255, 0, 100, 0.6)'
      ctx.fillRect(0, 0, canvas.height, canvas.width);
      ctx.textAlign = "center";
      ctx.textBaseline="middle"; 
      ctx.font = blockSize + "px Arial";
      ctx.fillStyle="#FFFFFF";
      ctx.fillText('You Lose', canvas.height/2, canvas.width/2, canvas.width)
    }
  },
}
for( let i=0 ; i<size ; i++ ) board.Cells[i] = [];

document.onkeydown = function (event) {
  if( board.State != 'active' ) return;
  if( board.gravitate(event.keyCode) ){
    board.spawnRandom();
    board.checkPossible();
    scoreLabel.innerHTML = 'Score: ' + score;
  }
}
board.spawnRandom();
board.spawnRandom();

function drawer(timestamp){
  board.draw(timestamp);
  window.requestAnimationFrame(drawer)
}
window.requestAnimationFrame(drawer)
