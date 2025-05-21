// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
const playerColor = 'rgba(50, 150, 255, 1)'; // A distinct blue
const opponentColor = 'rgba(255, 100, 100, 1)'; // A distinct red
const paddleWidth = 10;
const paddleHeight = 100;
const ballRadius = 7;
let playerScore = 0;
let opponentScore = 0;
const winningScore = 10; // Or any score you prefer
const initialBallSpeedX = 5; // Initial horizontal speed of the ball
const speedIncrement = 0.2; // How much the ball speeds up on each paddle hit
const boostMultiplier = 1.8; // For slingshot effect

let gameState = 'startScreen'; // Possible values: 'startScreen', 'playing', 'paused', 'gameOver'
let winner = null; // To store the winner of the game

// Sound Effects
const paddleHitSound = new Audio('https://cdn.jsdelivr.net/gh/Calinou/kenney-interface-sounds@master/addons/kenney_interface_sounds/click_001.wav');
const wallHitSound = new Audio('https://cdn.jsdelivr.net/gh/Calinou/kenney-interface-sounds@master/addons/kenney_interface_sounds/drop_001.wav');
const scoreSound = new Audio('https://cdn.jsdelivr.net/gh/Calinou/kenney-interface-sounds@master/addons/kenney_interface_sounds/confirmation_001.wav');

// Particles
let particles = [];

// Goal Flash Effect
let flashSide = null; // 'left', 'right', or null
let flashTimer = 0; // Duration of the flash in frames
const flashDuration = 15; // Approx 0.25 seconds at 60FPS

// Screen Shake Effect
let shakeDuration = 0; // Duration of the shake in frames
const shakeIntensity = 5; // Max pixel offset for the shake

// Gravity Points
let gravityPoints = [];
const gravityPointSpawnInterval = 3000; // milliseconds (3 seconds)
const gravityPointSize = 10;
const gravityPointStrength = 15; // Significantly increased strength
const gravityPointFallSpeed = 1;
const gravityPointColor = 'yellow';
let framesSinceLastSpawn = 0;

// Orbit Effect Variables
let orbitEffectAngle = 0;
const orbitFrequency = 0.05; // Adjust for faster/slower wobble
const orbitAmplitude = 0.1;  // Adjust for more/less pronounced wobble

class GravityPoint {
    constructor(x, y, size, strength, fallSpeed, color = gravityPointColor) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.strength = strength;
        this.fallSpeed = fallSpeed;
        this.color = color;
        this.active = true;
    }

    update() {
        this.y += this.fallSpeed;
        if (this.y - this.size > canvas.height) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function spawnGravityPoint() {
    const x = Math.random() * (canvas.width - gravityPointSize * 2) + gravityPointSize;
    const y = -gravityPointSize; 
    gravityPoints.push(new GravityPoint(x, y, gravityPointSize, gravityPointStrength, gravityPointFallSpeed, gravityPointColor));
}

// Game State Screens
function drawStartScreen() {
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PONG GAME', canvas.width / 2, canvas.height / 3);
  ctx.font = '20px Arial';
  ctx.fillText('Press ENTER to Start', canvas.width / 2, canvas.height / 2);
  ctx.font = '16px Arial';
  ctx.fillText('Move your paddle with the mouse. First to ' + winningScore + ' points wins.', canvas.width / 2, canvas.height / 2 + 40);
  ctx.fillText("Press 'P' to Pause/Resume during gameplay.", canvas.width / 2, canvas.height / 2 + 70);
  ctx.fillText("Collect yellow orbs for points, or use their gravity to 'slingshot' the ball!", canvas.width / 2, canvas.height / 2 + 100);
}

function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
  ctx.font = '20px Arial';
  ctx.fillText('Press ENTER to Resume', canvas.width / 2, canvas.height / 2 + 40);
}

function drawGameOverScreen() {
  let winnerColorFill = 'rgba(0, 0, 0, 0.7)'; 
  if (winner === 'Player') {
    winnerColorFill = player.color;
  } else if (winner === 'Opponent') {
    winnerColorFill = opponent.color;
  }

  ctx.fillStyle = winnerColorFill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white'; 
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);
  ctx.font = '30px Arial'; 
  ctx.fillText(`${winner} wins!`, canvas.width / 2, canvas.height / 2);
  ctx.font = '20px Arial';
  ctx.fillText('Press ENTER to Play Again', canvas.width / 2, canvas.height / 2 + 50);
}

class Particle {
  constructor(x, y, vx, vy, size, color, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = life; 
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

function createParticles(x, y, direction) {
  const count = 10; 
  for (let i = 0; i < count; i++) {
    const speed = Math.random() * 2 + 1; 
    const angle = (Math.random() - 0.5) * Math.PI / 2; 
    const vx = Math.cos(angle) * speed * direction;
    const vy = Math.sin(angle) * speed;
    const size = Math.random() * 2 + 1; 
    const life = Math.random() * 30 + 30; 
    particles.push(new Particle(x, y, vx, vy, size, 'white', life));
  }
}

// Paddle Class
class Paddle {
  constructor(x, y, width, height, color, speed) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.speed = speed;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Ball Class
class Ball {
  constructor(x, y, radius, color, speedX, speedY) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.speedX = speedX;
    this.speedY = speedY;
    this.lastHitBy = null; // 'player' or 'opponent'
    this.slingshotCandidatePoint = null; // Stores the gravity point the ball might slingshot from
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}

// Game Objects
const player = new Paddle(0, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, playerColor, 8);
const opponent = new Paddle(canvas.width - paddleWidth, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, opponentColor, 10); // Increased speed from 8 to 10
const ball = new Ball(canvas.width / 2, canvas.height / 2, ballRadius, 'white', initialBallSpeedX, 5);

// Scoreboard
const scoreboard = document.getElementById('scoreboard');

// Update Scoreboard
function updateScoreboard() {
  scoreboard.textContent = `Player: ${playerScore} - Opponent: ${opponentScore}`;
}

// Clear Canvas
function clearCanvas() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw Paddles
function drawPaddles() {
  player.draw();
  opponent.draw();
}

// Draw Ball
function drawBall() {
  ball.draw();
}

// Handle Particles
function handleParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// Reset Ball
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speedX = (ball.speedX > 0 ? -initialBallSpeedX : initialBallSpeedX); 
  ball.speedY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 3); 
  ball.slingshotCandidatePoint = null; // Reset slingshot candidate on ball reset
}

function resetGame() {
  playerScore = 0;
  opponentScore = 0;
  updateScoreboard();
  resetBall(); 
  ball.x = canvas.width / 2; 
  ball.y = canvas.height / 2;
  ball.lastHitBy = null; 
  player.y = canvas.height / 2 - paddleHeight / 2; 
  opponent.y = canvas.height / 2 - paddleHeight / 2; 
  gravityPoints = []; 
  framesSinceLastSpawn = 0; 
  orbitEffectAngle = 0; 
  gameState = 'playing';
}

// Game Loop
function gameLoop() {
  let shookThisFrame = false;
  if (shakeDuration > 0 && gameState === 'playing') { 
    ctx.save();
    const offsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
    const offsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
    ctx.translate(offsetX, offsetY);
    shakeDuration--;
    shookThisFrame = true;
  }

  clearCanvas();

  if (flashTimer > 0 && (gameState === 'playing' || gameState === 'paused')) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; 
    if (flashSide === 'left') {
      ctx.fillRect(0, 0, canvas.width / 2, canvas.height);
    } else if (flashSide === 'right') {
      ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
    }
    flashTimer--;
    if (flashTimer === 0) {
      flashSide = null;
    }
  }

  if (gameState === 'startScreen') {
    drawPaddles(); 
    drawBall(); 
    drawStartScreen();
  } else if (gameState === 'playing') {
    let slingshotBoostAppliedThisFrame = false;

    // Spawn Gravity Points
    framesSinceLastSpawn++;
    if ((framesSinceLastSpawn * (1000 / 60)) >= gravityPointSpawnInterval) {
        spawnGravityPoint();
        framesSinceLastSpawn = 0;
    }

    // Update Gravity Points (movement and off-screen removal)
    for (let i = gravityPoints.length - 1; i >= 0; i--) {
        const point = gravityPoints[i];
        point.update();
        if (!point.active) { // Check if point moved off-screen
            gravityPoints.splice(i, 1);
            if (ball.slingshotCandidatePoint === point) { // If it was a candidate, nullify
                ball.slingshotCandidatePoint = null;
            }
        }
    }
    
    // Apply Gravity Pull & Update Slingshot Candidate
    // The candidate is the last point in the array that influences the ball this frame.
    // If a point was a candidate and is no longer influencing, the escape check handles it.
    for (const point of gravityPoints) {
        if (!point.active) continue;
        const dx = point.x - ball.x;
        const dy = point.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const activationRadius = 150; 

        if (distance < activationRadius && distance > 0) {
            const forceMagnitude = point.strength / (distance * distance);
            let forceX = (dx / distance) * forceMagnitude;
            let forceY = (dy / distance) * forceMagnitude;
            const maxForce = 0.5;
            const totalForce = Math.sqrt(forceX * forceX + forceY * forceY);
            if (totalForce > maxForce) {
                forceX = (forceX / totalForce) * maxForce;
                forceY = (forceY / totalForce) * maxForce;
            }
            ball.speedX += forceX;
            ball.speedY += forceY;
            ball.slingshotCandidatePoint = point; // Update current influencer
        }
    }
    
    // Apply Orbit Effect
    orbitEffectAngle += 1;
    const currentBallSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    if (currentBallSpeed > 0) {
        const dirX = ball.speedX / currentBallSpeed;
        const dirY = ball.speedY / currentBallSpeed;
        const perpX = -dirY;
        const perpY = dirX;
        const orbitForce = Math.sin(orbitEffectAngle * orbitFrequency) * orbitAmplitude;
        ball.speedX += perpX * orbitForce;
        ball.speedY += perpY * orbitForce;
    }

    // Slingshot by ESCAPE logic
    if (ball.slingshotCandidatePoint && ball.slingshotCandidatePoint.active && !slingshotBoostAppliedThisFrame) {
        const dxCandidate = ball.slingshotCandidatePoint.x - ball.x;
        const dyCandidate = ball.slingshotCandidatePoint.y - ball.y;
        const distanceToCandidate = Math.sqrt(dxCandidate * dxCandidate + dyCandidate * dyCandidate);
        const activationRadius = 150; 

        if (distanceToCandidate > activationRadius) { 
            ball.speedX *= boostMultiplier;
            ball.speedY *= boostMultiplier;
            // console.log("Slingshot by ESCAPING radius!");
            ball.slingshotCandidatePoint = null; 
            slingshotBoostAppliedThisFrame = true;
        }
    }
    
    // Cap overall ball speed
    const maxBallSpeed = 15; 
    let currentSpeedMagnitude = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    if (currentSpeedMagnitude > maxBallSpeed) {
        ball.speedX = (ball.speedX / currentSpeedMagnitude) * maxBallSpeed;
        ball.speedY = (ball.speedY / currentSpeedMagnitude) * maxBallSpeed;
    }

    // Ball Movement (actual position update)
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Collision Detection: Ball with top/bottom walls
    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
      ball.speedY = -ball.speedY;
      wallHitSound.play();
    }

    // Collision Detection: Ball with paddles
    // Player paddle
    if (ball.x - ball.radius < player.x + player.width &&
        ball.x - ball.radius > player.x && 
        ball.y + ball.radius > player.y &&
        ball.y - ball.radius < player.y + player.height &&
        ball.speedX < 0) { 
      ball.speedX = -ball.speedX; 
      ball.speedX += speedIncrement; 
      let deltaY = ball.y - (player.y + player.height / 2);
      ball.speedY = deltaY * 0.35; 
      paddleHitSound.play();
      createParticles(player.x + player.width, ball.y, 1);
      ball.lastHitBy = 'player';
      ball.slingshotCandidatePoint = null; // Paddle hit resets slingshot candidate
    }
    // Opponent paddle
    if (ball.x + ball.radius > opponent.x &&
        ball.x + ball.radius < opponent.x + opponent.width && 
        ball.y + ball.radius > opponent.y &&
        ball.y - ball.radius < opponent.y + opponent.height &&
        ball.speedX > 0) { 
      ball.speedX = -ball.speedX; 
      ball.speedX -= speedIncrement; 
      let deltaY = ball.y - (opponent.y + opponent.height / 2);
      ball.speedY = deltaY * 0.35; 
      paddleHitSound.play();
      createParticles(opponent.x, ball.y, -1);
      ball.lastHitBy = 'opponent';
      ball.slingshotCandidatePoint = null; // Paddle hit resets slingshot candidate
    }

    // Collision Detection: Ball with Gravity Points
    for (let i = gravityPoints.length - 1; i >= 0; i--) {
        const point = gravityPoints[i];
        if (!point.active) continue;

        const dx = point.x - ball.x;
        const dy = point.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + point.size) { // Collision with gravity point
            // Slingshot effect if this point was the candidate and is now being collected
            if (ball.slingshotCandidatePoint === point && !slingshotBoostAppliedThisFrame) { 
                ball.speedX *= boostMultiplier;
                ball.speedY *= boostMultiplier;
                // console.log("Slingshot by COLLECTING point: ", point.x, point.y);
                slingshotBoostAppliedThisFrame = true;
            }
            ball.slingshotCandidatePoint = null; // Point is collected, so it can't be a candidate
            point.active = false; // Deactivate the point
            
            if (ball.lastHitBy === 'player') {
                playerScore++;
            } else if (ball.lastHitBy === 'opponent') {
                opponentScore++;
            }
            updateScoreboard(); 
            if (playerScore >= winningScore || opponentScore >= winningScore) {
                winner = playerScore >= winningScore ? 'Player' : 'Opponent';
                gameState = 'gameOver';
                break; // Exit loop early if game is over
            }
        }
    }
    if (gameState !== 'gameOver') { // Only filter if game is not over
        gravityPoints = gravityPoints.filter(p => p.active);
    }


    // Final speed cap after all modifications, including collection slingshot
    currentSpeedMagnitude = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    if (currentSpeedMagnitude > maxBallSpeed) { // Ensure this uses the updated maxBallSpeed
        ball.speedX = (ball.speedX / currentSpeedMagnitude) * maxBallSpeed;
        ball.speedY = (ball.speedY / currentSpeedMagnitude) * maxBallSpeed;
    }
    
    // Scoring (Out of Bounds)
    if (gameState === 'playing') { // Check if still playing before this scoring
        if (ball.x - ball.radius < 0) { // Opponent scores
            opponentScore++;
            scoreSound.play();
            flashSide = 'right'; 
            flashTimer = flashDuration;
            shakeDuration = 15; 
            if (opponentScore >= winningScore) {
                winner = 'Opponent';
                gameState = 'gameOver';
            } else {
                resetBall();
            }
        } else if (ball.x + ball.radius > canvas.width) { // Player scores
            playerScore++;
            scoreSound.play();
            flashSide = 'left'; 
            flashTimer = flashDuration;
            shakeDuration = 15; 
            if (playerScore >= winningScore) {
                winner = 'Player';
                gameState = 'gameOver';
            } else {
                resetBall();
            }
        }
    }
    
    // Player Paddle Movement (Mouse) - already handled by event listener

    // Basic Opponent AI (follows the ball)
    const opponentLevel = 0.05; 
    let targetY = ball.y - (opponent.height / 2);
    let idealMove = (targetY - opponent.y) * opponentLevel;
    
    const actualMove = Math.max(-opponent.speed, Math.min(opponent.speed, idealMove));
    opponent.y += actualMove;

    if (opponent.y < 0) {
      opponent.y = 0;
    }
    if (opponent.y + opponent.height > canvas.height) {
      opponent.y = canvas.height - opponent.height; 
    }
    
    drawPaddles();
    drawBall();
    handleParticles(); 
    gravityPoints.forEach(point => point.draw(ctx)); 
    updateScoreboard();

  } else if (gameState === 'paused') {
    drawPaddles();
    drawBall();
    handleParticles(); 
    gravityPoints.forEach(point => point.draw(ctx)); 
    updateScoreboard();
    drawPauseScreen();
  } else if (gameState === 'gameOver') {
    drawPaddles();
    drawBall();
    handleParticles(); 
    gravityPoints.forEach(point => point.draw(ctx)); 
    updateScoreboard();
    drawGameOverScreen();
  }

  if (shookThisFrame) {
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

// Player Paddle Movement (Mouse) - Moved outside gameLoop for cleaner structure
canvas.addEventListener('mousemove', (event) => {
  if (gameState === 'playing') { // Only move paddle if game is playing
    let rect = canvas.getBoundingClientRect();
    let root = document.documentElement;
    let mouseY = event.clientY - rect.top - root.scrollTop;
    player.y = mouseY - player.height / 2;

    // Keep paddle within canvas bounds
    if (player.y < 0) {
      player.y = 0;
    }
    if (player.y + player.height > canvas.height) {
      player.y = canvas.height - player.height;
    }
  }
});

// Keyboard input handler
window.addEventListener('keydown', function(event) {
  switch (gameState) {
    case 'startScreen':
      if (event.key === 'Enter') {
        resetGame();
      }
      break;
    case 'playing':
      if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        gameState = 'paused';
      }
      break;
    case 'paused':
      if (event.key === 'Enter') {
        gameState = 'playing';
      }
      break;
    case 'gameOver':
      if (event.key === 'Enter') {
        gameState = 'startScreen'; 
      }
      break;
  }
});


// Start Game
gameLoop();
