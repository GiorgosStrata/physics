const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const radiusInput = document.getElementById('radius');
const speedInput = document.getElementById('speed');
const massInput = document.getElementById('mass');
const angleInput = document.getElementById('angle');
const colorInput = document.getElementById('color');
const energyRetentionInput = document.getElementById('energyRetention');
const clearBtn = document.getElementById('clear');
const pauseBtn = document.getElementById('pauseResume');
const speedUpBtn = document.getElementById('speedUp');

let balls = [];
let paused = false;
let collisionCount = 0;  // Tracks number of collisions
let timeScale = 1;  // Simulation speed multiplier (1x, 2x, 4x)

// Preview ball data
let previewPos = null;
let isMouseDown = false;

class Ball {
  constructor(x, y, radius, mass, velocity, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.mass = mass;
    this.velocity = velocity;
    this.color = color;
    this.prevX = x; // Store previous position for wall collisions
    this.prevY = y;
  }

  draw() {
    // Draw ball
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 10, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Draw momentum label above ball (momentum = mass * speed)
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    const momentum = (this.mass * speed).toFixed(2);
    ctx.fillStyle = 'white';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${momentum} kg·m/s`, this.x, this.y - this.radius * 10 - 5);

    // Draw velocity arrow
    this.drawVelocityArrow();
  }

  drawVelocityArrow() {
    const arrowLength = 30; // length in pixels for max speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

    if (speed === 0) return; // no arrow if no velocity

    // Normalize velocity to get direction
    const dirX = this.velocity.x / speed;
    const dirY = this.velocity.y / speed;

    // Arrow endpoint
    const endX = this.x + dirX * arrowLength;
    const endY = this.y + dirY * arrowLength;

    // Draw arrow line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrow head
    const headLength = 8;
    const angle = Math.atan2(dirY, dirX);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(endX, endY);
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;
    // Apply timeScale only to position updates
    this.x += this.velocity.x * timeScale;
    this.y += this.velocity.y * timeScale;
    this.wallCollision();
    this.draw();
  }

  wallCollision() {
    const retention = parseFloat(energyRetentionInput.value) / 100;
    const scale = Math.sqrt(retention);
    const minSpeed = 0.01; // Minimum speed threshold to prevent energy creep

    // Check for left or right wall collision
    if (this.x - this.radius * 10 <= 0 && this.prevX - this.radius * 10 > 0) {
      this.velocity.x *= -1 * scale;
      if (Math.abs(this.velocity.x) < minSpeed) this.velocity.x = 0;
      collisionCount++;
    } else if (this.x + this.radius * 10 >= canvas.width && this.prevX + this.radius * 10 < canvas.width) {
      this.velocity.x *= -1 * scale;
      if (Math.abs(this.velocity.x) < minSpeed) this.velocity.x = 0;
      collisionCount++;
    }

    // Check for top or bottom wall collision
    if (this.y - this.radius * 10 <= 0 && this.prevY - this.radius * 10 > 0) {
      this.velocity.y *= -1 * scale;
      if (Math.abs(this.velocity.y) < minSpeed) this.velocity.y = 0;
      collisionCount++;
    } else if (this.y + this.radius * 10 >= canvas.height && this.prevY + this.radius * 10 < canvas.height) {
      this.velocity.y *= -1 * scale;
      if (Math.abs(this.velocity.y) < minSpeed) this.velocity.y = 0;
      collisionCount++;
    }
  }
}

function resolveCollision(ball1, ball2) {
  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;
  const distance = Math.hypot(dx, dy);

  if (distance < ball1.radius * 10 + ball2.radius * 10) {
    // Calculate relative velocity
    const relVelX = ball2.velocity.x - ball1.velocity.x;
    const relVelY = ball2.velocity.y - ball1.velocity.y;
    
    // Dot product of relative velocity and position difference
    const dotProduct = relVelX * dx + relVelY * dy;

    // Only resolve if balls are approaching (dot product < 0)
    if (dotProduct < 0) {
      collisionCount++; // Increase collision count for new collisions

      const angle = Math.atan2(dy, dx);
      const m1 = ball1.mass;
      const m2 = ball2.mass;

      const u1 = rotate(ball1.velocity, angle);
      const u2 = rotate(ball2.velocity, angle);

      const v1 = { x: ((m1 - m2) * u1.x + 2 * m2 * u2.x) / (m1 + m2), y: u1.y };
      const v2 = { x: ((m2 - m1) * u2.x + 2 * m1 * u1.x) / (m1 + m2), y: u2.y };

      const vFinal1 = rotate(v1, -angle);
      const vFinal2 = rotate(v2, -angle);

      // Apply kinetic energy retention factor
      const retention = parseFloat(energyRetentionInput.value) / 100;
      const minSpeed = 0.01; // Minimum speed threshold
      ball1.velocity = { 
        x: Math.abs(vFinal1.x * Math.sqrt(retention)) < minSpeed ? 0 : vFinal1.x * Math.sqrt(retention), 
        y: Math.abs(vFinal1.y * Math.sqrt(retention)) < minSpeed ? 0 : vFinal1.y * Math.sqrt(retention) 
      };
      ball2.velocity = { 
        x: Math.abs(vFinal2.x * Math.sqrt(retention)) < minSpeed ? 0 : vFinal2.x * Math.sqrt(retention), 
        y: Math.abs(vFinal2.y * Math.sqrt(retention)) < minSpeed ? 0 : vFinal2.y * Math.sqrt(retention) 
      };
    }
  }
}

function rotate(velocity, angle) {
  return {
    x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
    y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
  };
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!paused) {
    balls.forEach((ball, index) => {
      ball.update();
      for (let j = index + 1; j < balls.length; j++) {
        resolveCollision(ball, balls[j]);
      }
    });
  } else {
    // Draw balls but no update on pause
    balls.forEach(ball => ball.draw());
  }

  // Draw preview ball if mouse down
  if (isMouseDown && previewPos) {
    const radius = parseFloat(radiusInput.value) || 1;
    const speed = parseFloat(speedInput.value) || 0;
    const angle = parseFloat(angleInput.value) * Math.PI / 180 || 0;
    const mass = parseFloat(massInput.value) || 10;
    const color = colorInput.value || '#00ff00';

    const velocity = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };

    // Draw preview ball with some transparency
    ctx.beginPath();
    ctx.arc(previewPos.x, previewPos.y, radius * 10, 0, Math.PI * 2);
    ctx.fillStyle = hexToRGBA(color, 0.5);
    ctx.fill();
    ctx.closePath();

    // Momentum label above preview ball
    const momentum = (mass * speed).toFixed(2);
    ctx.fillStyle = 'white';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${momentum} kg·m/s`, previewPos.x, previewPos.y - radius * 10 - 5);

    // Draw velocity arrow on preview ball
    drawPreviewArrow(previewPos.x, previewPos.y, velocity);
  }

  // Draw collision count and total kinetic energy (in kJ)
  drawStats();

  requestAnimationFrame(animate);
}

// Draw velocity arrow for preview ball
function drawPreviewArrow(x, y, velocity) {
  const arrowLength = 30;
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
  if (speed === 0) return;

  const dirX = velocity.x / speed;
  const dirY = velocity.y / speed;

  const endX = x + dirX * arrowLength;
  const endY = y + dirY * arrowLength;

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headLength = 8;
  const angle = Math.atan2(dirY, dirX);

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(endX, endY);
  ctx.fillStyle = 'white';
  ctx.fill();
}

// Helper: convert hex color to rgba string with alpha
function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Alignment helper: snap if close to another ball's X or Y (within 10px)
function applyAlignmentAssist(x, y) {
  for (const other of balls) {
    const dx = Math.abs(x - other.x);
    const dy = Math.abs(y - other.y);
    if (dx < 10) return { x: other.x, y };
    if (dy < 10) return { x, y: other.y };
  }
  return { x, y };
}

// Draw collision count and kinetic energy (kJ)
function drawStats() {
  ctx.fillStyle = 'white';
  ctx.font = '18px monospace';
  
  // Draw collision count (top-middle)
  ctx.textAlign = 'center';
  ctx.fillText(`Collisions: ${collisionCount}`, canvas.width / 2, 25);

  // Calculate total kinetic energy: KE = 0.5 * m * v^2 (joules)
  let totalKE = 0;
  balls.forEach(ball => {
    const speed = Math.sqrt(ball.velocity.x ** 2 + this.velocity.y ** 2);
    totalKE += 0.5 * ball.mass * speed * speed;
  });

  // Convert joules to kilojoules and round
  const totalKEkJ = (totalKE / 1000).toFixed(3);

  // Draw kinetic energy in top-right
  ctx.textAlign = 'right';
  ctx.fillText(`Kinetic Energy: ${totalKEkJ} kJ`, canvas.width - 10, 25);
}

// Mouse handling for preview and placement
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {  // Left click starts placement
    isMouseDown = true;
    updatePreviewPosition(e);
  } else if (e.button === 2) { // Right click cancels placement
    isMouseDown = false;
    previewPos = null;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    updatePreviewPosition(e);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0 && isMouseDown && previewPos) {
    // Place the ball at previewPos with current inputs
    const radius = parseFloat(radiusInput.value) || 1;
    const speed = parseFloat(speedInput.value) || 0;
    const angle = parseFloat(angleInput.value) * Math.PI / 180 || 0;
    const mass = parseFloat(massInput.value) || 10;
    const color = colorInput.value || '#00ff00';

    const velocity = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };

    console.log('Placing ball at:', previewPos, 'with radius:', radius, 'speed:', speed, 'mass:', mass); // Debug log
    balls.push(new Ball(previewPos.x, previewPos.y, radius, mass, velocity, color));
    isMouseDown = false;
    previewPos = null;
  }
});

// Prevent context menu on right click on canvas
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Update preview position and apply alignment assist
function updatePreviewPosition(e) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  let aligned = applyAlignmentAssist(x, y);
  previewPos = aligned;
}

// Clear all balls and reset counters
clearBtn.addEventListener('click', () => {
  balls = [];
  collisionCount = 0;
  timeScale = 1; // Reset time scale to 1x
  speedUpBtn.textContent = 'Speed Up';
});

// Pause/Resume toggle
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

// Speed Up toggle (cycles through 1x, 2x, 4x)
speedUpBtn.addEventListener('click', () => {
  if (timeScale === 1) {
    timeScale = 2;
    speedUpBtn.textContent = 'Speed: 2x';
  } else if (timeScale === 2) {
    timeScale = 4;
    speedUpBtn.textContent = 'Speed: 4x';
  } else {
    timeScale = 1;
    speedUpBtn.textContent = 'Speed Up';
  }
});

animate();
