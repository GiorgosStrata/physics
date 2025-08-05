const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// UI Elements
const radiusInput = document.getElementById('radius');
const speedInput = document.getElementById('speed');
const angleInput = document.getElementById('angle');
const massInput = document.getElementById('mass');
const colorInput = document.getElementById('color');
const clearBtn = document.getElementById('clear');
const pauseResumeBtn = document.getElementById('pauseResume');

class Ball {
  constructor(x, y, vx, vy, r, color, mass) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = r;
    this.mass = mass;
    this.color = color;
    this.dragging = false;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    if (!this.dragging && !paused) {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x - this.r < 0 || this.x + this.r > canvas.width) this.vx *= -1;
      if (this.y - this.r < 0 || this.y + this.r > canvas.height) this.vy *= -1;
    }

    this.draw();
  }

  isMouseOver(mx, my) {
    return Math.hypot(this.x - mx, this.y - my) <= this.r;
  }
}

function resolveCollision(b1, b2) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const distance = Math.hypot(dx, dy);

  if (distance < b1.r + b2.r) {
    const angle = Math.atan2(dy, dx);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    const v1 = { x: b1.vx * cos + b1.vy * sin, y: b1.vy * cos - b1.vx * sin };
    const v2 = { x: b2.vx * cos + b2.vy * sin, y: b2.vy * cos - b2.vx * sin };

    const m1 = b1.mass;
    const m2 = b2.mass;
    const vxTotal = v1.x - v2.x;
    v1.x = ((m1 - m2) * v1.x + 2 * m2 * v2.x) / (m1 + m2);
    v2.x = vxTotal + v1.x;

    const finalV1 = {
      x: v1.x * cos - v1.y * sin,
      y: v1.y * cos + v1.x * sin
    };
    const finalV2 = {
      x: v2.x * cos - v2.y * sin,
      y: v2.y * cos + v2.x * sin
    };

    b1.vx = finalV1.x;
    b1.vy = finalV1.y;
    b2.vx = finalV2.x;
    b2.vy = finalV2.y;

    const overlap = 0.5 * (b1.r + b2.r - distance + 1);
    const offsetX = overlap * cos;
    const offsetY = overlap * sin;

    b1.x -= offsetX;
    b1.y -= offsetY;
    b2.x += offsetX;
    b2.y += offsetY;
  }
}

const balls = [];
let paused = false;

// Add new ball on click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const r = parseFloat(radiusInput.value);
  const speed = parseFloat(speedInput.value);
  const angleDeg = parseFloat(angleInput.value);
  const angleRad = angleDeg * Math.PI / 180;
  const vx = Math.cos(angleRad) * speed;
  const vy = Math.sin(angleRad) * speed;
  const color = colorInput.value;
  const mass = parseFloat(massInput.value);

  balls.push(new Ball(x, y, vx, vy, r, color, mass));
});

// Dragging support
let draggingBall = null;

canvas.addEventListener('mousedown', (e) => {
  const x = e.clientX;
  const y = e.clientY;
  for (let ball of balls) {
    if (ball.isMouseOver(x, y)) {
      draggingBall = ball;
      ball.dragging = true;
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (draggingBall) {
    draggingBall.x = e.clientX;
    draggingBall.y = e.clientY;
    draggingBall.vx = 0;
    draggingBall.vy = 0;
  }
});

canvas.addEventListener('mouseup', () => {
  if (draggingBall) {
    draggingBall.dragging = false;
    draggingBall = null;
  }
});

// Clear all
clearBtn.addEventListener('click', () => {
  balls.length = 0;
});

// Pause/Resume toggle
pauseResumeBtn.addEventListener('click', () => {
  paused = !paused;
  pauseResumeBtn.textContent = paused ? 'Resume' : 'Pause';
});

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  balls.forEach(ball => ball.update());

  if (!paused) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        resolveCollision(balls[i], balls[j]);
      }
    }
  }

  requestAnimationFrame(animate);
}

animate();
