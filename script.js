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
const gravityPointStrength = 3; // Adjusted for less aggressive pull initially
const gravityPointFallSpeed = 1;
const gravityPointColor = 'yellow'; // Added constant for color
let framesSinceLastSpawn = 0;

// Orbit Effect Variables
let orbitEffectAngle = 0;
const orbitFrequency = 0.05; // Adjust for faster/slower wobble
const orbitAmplitude = 0.1;  // Adjust for more/less pronounced wobble

class GravityPoint {
    constructor(x, y, size, strength, fallSpeed, color = gravityPointColor) { // Use the constant
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
    const x = Math.random() * (canvas.width - gravityPointSize * 2) + gravityPointSize; // Ensure it's fully within canvas width
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
  ctx.fillText('Move your paddle with the mouse. First to 5 points wins.', canvas.width / 2, canvas.height / 2 + 40);
  ctx.fillText("Press 'P' to Pause/Resume during gameplay.", canvas.width / 2, canvas.height / 2 + 70);
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = '25px Arial';
  ctx.fillText(`${winner} wins!`, canvas.width / 2, canvas.height / 2);
  ctx.font = '20px Arial';
  ctx.fillText('Press ENTER to Play Again', canvas.width / 2, canvas.height / 2 + 40);
}

class Particle {
  constructor(x, y, vx, vy, size, color, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = life; // Lifespan in frames
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
  const count = 10; // Number of particles
  for (let i = 0; i < count; i++) {
    const speed = Math.random() * 2 + 1; // Random speed between 1 and 3
    const angle = (Math.random() - 0.5) * Math.PI / 2; // Spread angle (e.g., -45 to +45 degrees from impact normal)
    const vx = Math.cos(angle) * speed * direction;
    const vy = Math.sin(angle) * speed;
    const size = Math.random() * 2 + 1; // Random size between 1 and 3
    const life = Math.random() * 30 + 30; // Random lifespan (30-60 frames)
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
const opponent = new Paddle(canvas.width - paddleWidth, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, opponentColor, 8);
const ball = new Ball(canvas.width / 2, canvas.height / 2, ballRadius, 'white', initialBallSpeedX, 5);

// Scoreboard
const scoreboard = document.getElementById('scoreboard');

// Update Scoreboard
function updateScoreboard() {
  scoreboard.textContent = `Player: ${playerScore} - Opponent: ${opponentScore}`;
}

// Clear Canvas
function clearCanvas() {
  // Fill the canvas with a semi-transparent black to create a trail effect
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
  // Reset ball speed to initial values, alternating direction
  ball.speedX = (ball.speedX > 0 ? -initialBallSpeedX : initialBallSpeedX); // Keep alternating direction
  ball.speedY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 3); // Random initial Y speed
}

function resetGame() {
  playerScore = 0;
  opponentScore = 0;
  updateScoreboard();
  resetBall();
  ball.x = canvas.width / 2; // Ensure ball starts in center
  ball.y = canvas.height / 2;
  ball.lastHitBy = null; // Reset who last hit the ball
  player.y = canvas.height / 2 - paddleHeight / 2; // Reset player paddle
  opponent.y = canvas.height / 2 - paddleHeight / 2; // Reset opponent paddle
  gravityPoints = []; // Clear existing gravity points
  framesSinceLastSpawn = 0; // Reset spawn timer
  orbitEffectAngle = 0; // Reset orbit angle
  gameState = 'playing';
}

// Game Loop
function gameLoop() {
  let shookThisFrame = false;
  if (shakeDuration > 0 && gameState === 'playing') { // Only shake if playing
    ctx.save();
    const offsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
    const offsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
    ctx.translate(offsetX, offsetY);
    shakeDuration--;
    shookThisFrame = true;
  }

  clearCanvas();

  // Draw flash effect if active (and game is playing or paused)
  if (flashTimer > 0 && (gameState === 'playing' || gameState === 'paused')) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent white
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
    drawPaddles(); // Draw paddles in their initial position
    drawBall(); // Draw ball in its initial position
    drawStartScreen();
  } else if (gameState === 'playing') {
    // Spawn Gravity Points
    framesSinceLastSpawn++;
    if ((framesSinceLastSpawn * (1000 / 60)) >= gravityPointSpawnInterval) { // Assuming 60 FPS
        spawnGravityPoint();
        framesSinceLastSpawn = 0;
    }

    // Update and Draw Gravity Points
    for (let i = gravityPoints.length - 1; i >= 0; i--) {
        const point = gravityPoints[i];
        point.update();
        if (!point.active) {
            gravityPoints.splice(i, 1);
        }
    }

    // Apply Gravity Pull
    for (const point of gravityPoints) {
        if (!point.active) continue;
        const dx = point.x - ball.x;
        const dy = point.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const activationRadius = 150; 

        if (distance < activationRadius && distance > 0) {
            const forceMagnitude = point.strength / (distance * distance); // Simple inverse square
            let forceX = (dx / distance) * forceMagnitude;
            let forceY = (dy / distance) * forceMagnitude;

            // Cap the force to prevent extreme acceleration
            const maxForce = 0.1; // Adjust as needed
            const totalForce = Math.sqrt(forceX * forceX + forceY * forceY);
            if (totalForce > maxForce) {
                forceX = (forceX / totalForce) * maxForce;
                forceY = (forceY / totalForce) * maxForce;
            }
            
            ball.speedX += forceX;
            ball.speedY += forceY;
        }
    }

    // Apply Orbit Effect
    orbitEffectAngle += 1;
    const currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    if (currentSpeed > 0) { // Avoid division by zero and effect on stationary ball
        const dirX = ball.speedX / currentSpeed;
        const dirY = ball.speedY / currentSpeed;
        const perpX = -dirY;
        const perpY = dirX;
        const orbitForce = Math.sin(orbitEffectAngle * orbitFrequency) * orbitAmplitude;
        ball.speedX += perpX * orbitForce;
        ball.speedY += perpY * orbitForce;
    }
    
    // Cap overall ball speed AFTER gravity and orbit effects
    const maxBallSpeed = 10; // Adjust as needed
    const newSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    if (newSpeed > maxBallSpeed) {
        ball.speedX = (ball.speedX / newSpeed) * maxBallSpeed;
        ball.speedY = (ball.speedY / newSpeed) * maxBallSpeed;
    }

    // Ball Movement
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
    }

    // Collision Detection: Ball with Gravity Points
    for (let i = gravityPoints.length - 1; i >= 0; i--) {
        const point = gravityPoints[i];
        if (!point.active) continue;

        const dx = point.x - ball.x;
        const dy = point.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + point.size) {
            point.active = false; // Remove point
            // Optional: Play collection sound
            // Optional: Create collection particles
            if (ball.lastHitBy === 'player') {
                playerScore++;
            } else if (ball.lastHitBy === 'opponent') {
                opponentScore++;
            }
            updateScoreboard(); // Update score immediately
            // Check for winner after collecting a point
            if (playerScore >= winningScore) {
                winner = 'Player';
                gameState = 'gameOver';
            } else if (opponentScore >= winningScore) {
                winner = 'Opponent';
                gameState = 'gameOver';
            }
        }
    }
    gravityPoints = gravityPoints.filter(p => p.active);


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
    const opponentLevel = 0.05; // How quickly the opponent reacts (determines how fast it tries to reach the ball's y)
    let targetY = ball.y - (opponent.height / 2);
    let idealMove = (targetY - opponent.y) * opponentLevel;
    
    // Cap the movement by opponent.speed
    const actualMove = Math.max(-opponent.speed, Math.min(opponent.speed, idealMove));
    opponent.y += actualMove;

     // Keep opponent paddle within canvas bounds
    if (opponent.y < 0) {
      opponent.y = 0;
    }
    if (opponent.y + opponent.height > canvas.height) {
      opponent.y = canvas.height - opponent.height; 
    }
    
    drawPaddles();
    drawBall();
    handleParticles(); // Visual particles for paddle hits
    gravityPoints.forEach(point => point.draw(ctx)); // Draw gravity points
    updateScoreboard();

  } else if (gameState === 'paused') {
    drawPaddles();
    drawBall();
    handleParticles(); // Keep particles animating
    gravityPoints.forEach(point => point.draw(ctx)); // Draw gravity points
    updateScoreboard();
    drawPauseScreen();
  } else if (gameState === 'gameOver') {
    drawPaddles();
    drawBall();
    handleParticles(); // Keep particles animating
    gravityPoints.forEach(point => point.draw(ctx)); // Draw gravity points
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
        // Scores and ball will be reset when 'Enter' is pressed on startScreen again
      }
      break;
  }
});


// Start Game
// updateScoreboard(); // Initial scoreboard display - now handled in resetGame/gameLoop
gameLoop();
