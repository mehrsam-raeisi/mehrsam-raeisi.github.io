(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const restartBtn = document.getElementById('restart');

  // simple resize helper (keep CSS size, scale internal resolution by DPR)
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  function fitCanvas(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', fitCanvas);
  // initial fitting
  fitCanvas();

  // Game tuning for easier, friendlier play
  const groundY = 150; // in CSS pixels
  const gravity = 0.6; // gentler gravity
  const jumpImpulse = -14; // stronger jump
  let baseSpeed = 3; // slower base speed
  let speed = baseSpeed;
  let spawnTimer = 0;
  let obstacles = [];
  let score = 0;
  let running = false;
  let gameOver = false;
  let started = false;

  // best score persistence
  const BEST_KEY = 'dino_best_score';
  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
  bestEl.textContent = 'Best: ' + best;

  const player = {
    x: 60,
    y: groundY - 40,
    w: 40,
    h: 40,
    vy: 0,
    onGround: true,
    jump() {
      if (this.onGround && !gameOver) { this.vy = jumpImpulse; this.onGround = false; }
    },
    update() {
      this.vy += gravity;
      this.y += this.vy;
      if (this.y >= groundY - this.h) { this.y = groundY - this.h; this.vy = 0; this.onGround = true; }
    },
    draw() {
      // friendly rounded dino
      ctx.fillStyle = '#1f2937';
      roundRect(ctx, this.x, this.y, this.w, this.h, 6, true, false);
      // simple eye
      ctx.fillStyle = '#fff'; ctx.fillRect(this.x + this.w - 12, this.y + 10, 4, 4);
    }
  };

  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    if (typeof r === 'undefined') r=5;
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function spawnObstacle(){
    // easier: larger obstacles but less frequent
    const h = 26 + Math.random()*26;
    const w = 18 + Math.random()*20;
    const startX = (canvas.getBoundingClientRect().width || 800) + 20;
    obstacles.push({x: startX, y: groundY - h, w, h});
  }

  function update(){
    if (!running || gameOver) return;
    // gentle speed up as score grows
    speed = baseSpeed + Math.min(3, score / 200);
    spawnTimer -= 1;
    if (spawnTimer <= 0){
      spawnObstacle();
      spawnTimer = 70 + Math.floor(Math.random()*80) - Math.floor(score/10);
      if (spawnTimer < 40) spawnTimer = 40;
    }
    // move obstacles
    for (let i = obstacles.length -1; i >=0; i--){
      obstacles[i].x -= speed;
      if (obstacles[i].x + obstacles[i].w < -50) obstacles.splice(i,1);
    }
    player.update();
    // collisions
    for (let ob of obstacles){
      if (rectsOverlap(player.x, player.y, player.w, player.h, ob.x, ob.y, ob.w, ob.h)){
        gameOver = true; running = false; overlay.textContent = 'Game Over — press Restart or R'; overlay.classList.remove('hidden');
        // update best
        if (Math.floor(score) > best){ best = Math.floor(score); localStorage.setItem(BEST_KEY, best); bestEl.textContent = 'Best: ' + best; }
        return;
      }
    }
    score += 0.2 * (speed/3);
    scoreEl.textContent = 'Score: ' + Math.floor(score);
  }

  function rectsOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  function draw(){
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    ctx.clearRect(0,0,W,H);
    // background
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);
    // ground
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY + 1); ctx.lineTo(W, groundY + 1); ctx.stroke();
    // player
    player.draw();
    // obstacles
    ctx.fillStyle = '#0f172a';
    for (let ob of obstacles){ ctx.fillRect(ob.x, ob.y, ob.w, ob.h); }
    // small helpful hint when not started
    if (!started && !gameOver){ overlay.textContent = 'Tap or press Space to start'; overlay.classList.remove('hidden'); }
    drawScore();
  }

  function drawScore(){
    // already using DOM for score; draw nothing extra here
  }

  function loop(){ update(); draw(); requestAnimationFrame(loop); }

  // Input handling
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Space' || e.code === 'ArrowUp'){
      e.preventDefault();
      if (!started){ startGame(); }
      if (!gameOver) player.jump();
    }
    if (e.key === 'r' || e.key === 'R') restart();
  });
  canvas.addEventListener('click', ()=>{ if (!started) startGame(); if (!gameOver) player.jump(); });
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); if (!started) startGame(); if (!gameOver) player.jump(); }, {passive:false});
  restartBtn.addEventListener('click', ()=>{ restart(); startGame(); });

  function startGame(){ if (gameOver) return; started = true; running = true; overlay.classList.add('hidden'); }

  function restart(){ obstacles = []; score = 0; speed = baseSpeed; spawnTimer = 60; gameOver = false; running = false; started = false; player.y = groundY - player.h; player.vy = 0; player.onGround = true; scoreEl.textContent = 'Score: 0'; overlay.textContent = 'Tap or press Space to start'; overlay.classList.remove('hidden'); }

  // start the loop
  restart();
  requestAnimationFrame(loop);
})();
