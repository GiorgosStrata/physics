const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

let balls = [];
let isMouseDown = false;
let previewPos = null;
let paused = false;
let collisionCount = 0;

// DOM elements
const massInput = document.getElementById('mass');
const speedInput = document.getElementById('speed');
const angleInput = document.getElementById('angle');
const radiusInput = document.getElementById('radius');
const colorInput = document.getElementById('color');
const pauseBtn = document.getElementById('pauseBtn');
const clearBtn = document.getElementById('clearBtn');

class Ball {
  constructor(x, y, radius, mass, velocity, color) {
    this.position = { x, y };
    this.velocity = velocity;
    this.radius = radius;
    this.mass = mass;
    this.color = color;
  }

  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    if (this.position.x - this.radius < 0 || this.position.x + this.radius > canvas.width) {
      this.velocity.x *= -1;
    }
    if (this.position.y - this.radius < 0 || this.position.y + this.radius > canvas.height) {
      this.velocity.y *= -1;
    }
  }
}

function resolveCollision(b1, b2) {
  const dx = b2.position.x - b1.position.x;
  const dy = b2.position.y - b1.position.y;
  const dist = Math.hypot(dx, dy);

  if (dist < b1.radius + b2.radius) {
    collisionCount++;

    const angle = Math.atan2(dy, dx);
    const m1 = b1.mass;
    const m2 = b2.mass;
    const u1 = rotate(b1.velocity, angle);
    const u2 = rotate(b2.velocity, angle);

    const v1 = {
      x: (u1.x * (m1 - m2) + 2 * m2 * u2.x) / (m1 + m2),
      y: u1.y
    };
    const v2 = {
      x: (u2.x * (m2 - m1) + 2 * m1 * u1.x) / (m1 + m2),
      y: u2.y
    };

    b1.velocity = rotate(v1, -angle);
    b2.velocity = rotate(v2, -angle);

    const overlap = b1.radius + b2.radius - dist;
    const correctionX = (overlap / 2) * Math.cos(angle);
    const correctionY = (overlap / 2) * Math.sin(angle);

    b1.position.x -= correctionX;
    b1.position.y -= correctionY;
    b2.position.x += correctionX;
    b2.position.y += correctionY;
  }
}

function rotate(velocity, angle) {
  return {
    x: velocity.x * Math.cos(angle) + velocity.y * Math.sin(angle),
    y: -velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
  };
}

function drawArrow(from, to) {
  const headLength = 10;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.strokeStyle = 'black';
  ctx.stroke();
}

function applyAlignmentAssist(x, y) {
  for (let ball of balls) {
    if (Math.abs(ball.position.y - y) < 15) {
      return { x, y: ball.position.y };
    }
  }
  return { x, y };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Collision count (top left)
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Collisions: ${collisionCount}`, 10, 20);

  // Kinetic energy (top right)
  const totalKE = balls.reduce((sum, b) => {
    const speed = Math.hypot(b.velocity.x, b.velocity.y);
    return sum + 0.5 * b.mass * speed * speed;
  }, 0);
  ctx.textAlign = 'right';
  ctx.fillText(`Energy: ${totalKE.toFixed(1)} J`, canvas.width - 10, 20);

  balls.forEach(ball => {
    ball.update();

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.stroke();

    // Velocity arrow
    drawArrow(ball.position, {
      x: ball.position.x + ball.velocity.x * 10,
      y: ball.position.y + ball.velocity.y * 10
    });

    // Momentum label above
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${(ball.mass * speed).toFixed(1)} kg·m/s`, ball.position.x, ball.position.y - ball.radius - 10);
  });

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveCollision(balls[i], balls[j]);
    }
  }

  // Preview
  if (isMouseDown && previewPos) {
    const radius = parseFloat(radiusInput.value);
    ctx.beginPath();
    ctx.arc(previewPos.x, previewPos.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'gray';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Preview arrow
    const speed = parseFloat(speedInput.value);
    const angle = parseFloat(angleInput.value) * Math.PI / 180;
    drawArrow(previewPos, {
      x: previewPos.x + speed * Math.cos(angle) * 10,
      y: previewPos.y + speed * Math.sin(angle) * 10
    });
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!paused) draw();
}

canvas.addEventListener('mousedown', e => {
  if (e.button === 0) {
    isMouseDown = true;
    updatePreviewPosition(e);
  } else if (e.button === 2) {
    isMouseDown = false;
    previewPos = null;
  }
});

canvas.addEventListener('mousemove', e => {
  if (isMouseDown) {
    updatePreviewPosition(e);
  }
});

canvas.addEventListener('mouseup', e => {
  if (e.button === 0 && isMouseDown && previewPos) {
    const radius = parseFloat(radiusInput.value);
    const speed = parseFloat(speedInput.value);
    const angle = parseFloat(angleInput.value) * Math.PI / 180;
    const mass = parseFloat(massInput.value);
    const color = colorInput.value;

    const velocity = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };

    balls.push(new Ball(previewPos.x, previewPos.y, radius, mass, velocity, color));
    isMouseDown = false;
    previewPos = null;
  }
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
});

function updatePreviewPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  previewPos = applyAlignmentAssist(x, y);
}

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

clearBtn.addEventListener('click', () => {
  balls = [];
  collisionCount = 0;
});

animate();
