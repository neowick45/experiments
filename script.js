// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
const paddleWidth = 10;
const paddleHeight = 100;
const ballRadius = 7;
let playerScore = 0;
let opponentScore = 0;
const winningScore = 5; // Or any score you prefer

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
const player = new Paddle(0, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, 'blue', 8);
const opponent = new Paddle(canvas.width - paddleWidth, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, 'red', 8);
const ball = new Ball(canvas.width / 2, canvas.height / 2, ballRadius, 'white', 5, 5);

// Scoreboard
const scoreboard = document.getElementById('scoreboard');

// Update Scoreboard
function updateScoreboard() {
  scoreboard.textContent = `Player: ${playerScore} - Opponent: ${opponentScore}`;
}

// Clear Canvas
function clearCanvas() {
  ctx.fillStyle = 'black';
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

// Reset Ball
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speedX = -ball.speedX; // Change direction
  ball.speedY = 5; // Reset Y speed
}

// Game Loop
function gameLoop() {
  clearCanvas();
  drawPaddles();
  drawBall();
  updateScoreboard();

  // Ball Movement
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Collision Detection: Ball with top/bottom walls
  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.speedY = -ball.speedY;
  }

  // Collision Detection: Ball with paddles
  // Player paddle
  if (ball.x - ball.radius < player.x + player.width &&
      ball.y > player.y &&
      ball.y < player.y + player.height &&
      ball.speedX < 0) { // Ensure ball is moving towards player
    ball.speedX = -ball.speedX;
  }
  // Opponent paddle
  if (ball.x + ball.radius > opponent.x &&
      ball.y > opponent.y &&
      ball.y < opponent.y + opponent.height &&
      ball.speedX > 0) { // Ensure ball is moving towards opponent
    ball.speedX = -ball.speedX;
  }

  // Scoring
  if (ball.x - ball.radius < 0) { // Opponent scores
    opponentScore++;
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) { // Player scores
    playerScore++;
    resetBall();
  }
  
  // Check for Winner
  if (playerScore === winningScore || opponentScore === winningScore) {
    // For now, just log the winner and stop the game
    console.log(playerScore === winningScore ? "Player wins!" : "Opponent wins!");
    // A more sophisticated win screen or reset option could be added here
    return; // Stop the game loop
  }


  // Player Paddle Movement (Mouse)
  canvas.addEventListener('mousemove', (event) => {
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
  });

  // Basic Opponent AI (follows the ball)
  const opponentLevel = 0.05; // How quickly the opponent reacts
  opponent.y += (ball.y - (opponent.y + opponent.height / 2)) * opponentLevel;
   // Keep opponent paddle within canvas bounds
  if (opponent.y < 0) {
    opponent.y = 0;
  }
  if (opponent.y + opponent.height > canvas.height) {
    opponent.y = canvas.height - opponent.height;
  }


  requestAnimationFrame(gameLoop);
}

// Start Game
updateScoreboard(); // Initial scoreboard display
gameLoop();
