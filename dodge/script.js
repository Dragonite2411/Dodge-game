// Simple "Dodge the falling blocks" game using Canvas.
// Controls: Left / Right arrow keys or touch / drag / mouse.
// Save score in localStorage.

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // UI
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const muteBtn = document.getElementById('muteBtn');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('highScore');
  const finalScoreEl = document.getElementById('finalScore');

  let W = canvas.width;
  let H = canvas.height;

  let lastTime = 0;
  let accum = 0;
  let running = false;
  let paused = false;
  let score = 0;
  let highScore = +localStorage.getItem('dodge_high') || 0;
  highEl.textContent = highScore;

  // Player
  const player = {
    w: 64,
    h: 14,
    x: W / 2 - 32,
    y: H - 40,
    speed: 600, // px/s
    vx: 0
  };

  // Obstacles
  let obstacles = [];
  let spawnTimer = 0;
  let spawnInterval = 0.9; // seconds
  let difficultyTimer = 0;

  // Sound (simple)
  let muted = false;
  const beep = (freq = 440, time = 0.05, vol = 0.05) => {
    if (muted) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = vol;
      o.start();
      o.stop(ac.currentTime + time);
      setTimeout(()=>ac.close(), (time+0.05)*1000);
    } catch(e){}
  };

  function reset() {
    obstacles = [];
    spawnTimer = 0;
    spawnInterval = 0.9;
    difficultyTimer = 0;
    score = 0;
    scoreEl.textContent = '0';
    player.x = W/2 - player.w/2;
    player.vx = 0;
  }

  function spawnObstacle() {
    const minW = 20, maxW = 96;
    const w = Math.floor(Math.random() * (maxW - minW) + minW);
    const x = Math.floor(Math.random() * (W - w - 10) + 5);
    const baseSpeed = 120 + Math.random() * 120 + Math.min(score, 400) * 0.15;
    const color = `hsl(${Math.floor(200 + Math.random() * 120)},70%,55%)`;
    obstacles.push({
      x, y: -20, w, h: 16 + Math.random()*28,
      vy: baseSpeed, color
    });
  }

  function update(dt) {
    if (!running || paused) return;

    // Move player
    player.x += player.vx * dt;
    if (player.x < 6) player.x = 6;
    if (player.x + player.w > W-6) player.x = W - 6 - player.w;

    // Spawn logic
    spawnTimer += dt;
    difficultyTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnObstacle();
    }

    // Gradually increase difficulty
    if (difficultyTimer > 3 && spawnInterval > 0.35) {
      spawnInterval *= 0.98; // spawn slightly faster over time
      difficultyTimer = 0;
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.vy * dt;
      // simple horizontal sway
      o.x += Math.sin((o.y + i*13) * 0.01) * 8 * dt;
      if (o.y > H + 40) {
        obstacles.splice(i, 1);
        score += 1;
        scoreEl.textContent = score;
        if (score % 10 === 0) beep(880, 0.05, 0.04);
      }
    }

    // Collision detection (AABB)
    for (let o of obstacles) {
      if (rectIntersect(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)) {
        // Game over
        beep(160, 0.4, 0.08);
        endGame();
        return;
      }
    }
  }

  function rectIntersect(ax,ay,aw,ah,bx,by,bw,bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function draw() {
    // Background
    ctx.fillStyle = '#031018';
    ctx.fillRect(0,0,W,H);

    // Player
    // Glow
    ctx.fillStyle = 'rgba(78,225,164,0.12)';
    ctx.fillRect(player.x - 8, player.y - 10, player.w + 16, player.h + 30);
    // Main
    ctx.fillStyle = '#4ee1a4';
    roundRect(ctx, player.x, player.y, player.w, player.h, 6, true, false);

    // Obstacles
    for (let o of obstacles) {
      ctx.fillStyle = o.color;
      roundRect(ctx, o.x, o.y, o.w, o.h, 6, true, false);
      // small highlight
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(o.x + 6, o.y + 4, Math.max(6, o.w * 0.2), Math.min(6, o.h * 0.25));
    }

    // subtle score at top right (already in HUD but double)
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0,0,W,40);
  }

  function roundRect(ctx,x,y,w,h,r, fill, stroke){
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function endGame() {
    running = false;
    overlay.classList.add('show');
    finalScoreEl.textContent = `Score: ${score}`;
    // update high score
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('dodge_high', highScore);
      highEl.textContent = highScore;
      finalScoreEl.textContent += ' — NEW HIGH!';
    }
  }

  // Main loop
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = (ts - lastTime) / 1000;
    lastTime = ts;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // Input handling
  const keys = { left: false, right: false };
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    updatePlayerVelocity();
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    updatePlayerVelocity();
  });

  function updatePlayerVelocity(){
    if (keys.left && !keys.right) player.vx = -player.speed;
    else if (keys.right && !keys.left) player.vx = player.speed;
    else player.vx = 0;
  }

  // Mouse / touch: allow dragging or tapping side
  let dragging = false;
  function canvasPos(e){
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.max(0, Math.min(rect.width, cx)) * (W / rect.width);
  }
  canvas.addEventListener('mousedown', e => {
    dragging = true;
    const px = canvasPos(e);
    movePlayerToward(px);
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const px = canvasPos(e);
    movePlayerToward(px);
  });
  window.addEventListener('mouseup', e => dragging = false);

  canvas.addEventListener('touchstart', e => {
    dragging = true;
    const px = canvasPos(e);
    movePlayerToward(px);
  }, {passive:true});
  window.addEventListener('touchmove', e => {
    if (!dragging) return;
    const px = canvasPos(e);
    movePlayerToward(px);
  }, {passive:true});
  window.addEventListener('touchend', e => dragging = false);

  function movePlayerToward(px){
    // Snap player center toward px
    const center = player.w / 2;
    player.x = px - center;
    // clamp
    if (player.x < 6) player.x = 6;
    if (player.x + player.w > W - 6) player.x = W - 6 - player.w;
  }

  // Buttons
  startBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
    reset();
    running = true;
    lastTime = 0;
    beep(880, 0.05, 0.04);
  });

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  });

  // Resize handling (keeps internal canvas resolution fixed to initial size,
  // but scales CSS for responsiveness)
  function fitCanvas(){
    const maxW = Math.min(window.innerWidth - 40, 480);
    const scale = maxW / W;
    canvas.style.width = Math.round(W * scale) + 'px';
    canvas.style.height = Math.round(H * scale) + 'px';
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // Start the loop
  requestAnimationFrame(loop);

  // Friendly focus / blur handling
  window.addEventListener('blur', () => { paused = true; });
  window.addEventListener('focus', () => { paused = false; });

})();