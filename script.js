const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Ball {
  constructor(x, y, vx, vy, r, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = r;
    this.mass = r; // use radius as mass for simplicity
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Wall collisions
    if (this.x - this.r < 0 || this.x + this.r > canvas.width) this.vx *= -1;
    if (this.y - this.r < 0 || this.y + this.r > canvas.height) this.vy *= -1;

    this.draw();
  }
}

// Collision detection and resolution
function resolveCollision(b1, b2) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const distance = Math.hypot(dx, dy);

  if (distance < b1.r + b2.r) {
    // Calculate angle, sin, cos
    const angle = Math.atan2(dy, dx);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    // Rotate velocities
    const v1 = { x: b1.vx * cos + b1.vy * sin, y: b1.vy * cos - b1.vx * sin };
    const v2 = { x: b2.vx * cos + b2.vy * sin, y: b2.vy * cos - b2.vx * sin };

    // Exchange x-velocities (1D elastic collision)
    const m1 = b1.mass;
    const m2 = b2.mass;

    const vxTotal = v1.x - v2.x;
    v1.x = ((m1 - m2) * v1.x + 2 * m2 * v2.x) / (m1 + m2);
    v2.x = vxTotal + v1.x;

    // Rotate velocities back
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

    // Push balls apart
    const overlap = 0.5 * (b1.r + b2.r - distance + 1);
    const offsetX = overlap * cos;
    const offsetY = overlap * sin;

    b1.x -= offsetX;
    b1.y -= offsetY;
    b2.x += offsetX;
    b2.y += offsetY;
  }
}

// Generate random balls
const balls = [];
for (let i = 0; i < 15; i++) {
  let r = 20 + Math.random() * 10;
  let x = Math.random() * (canvas.width - 2 * r) + r;
  let y = Math.random() * (canvas.height - 2 * r) + r;
  let vx = (Math.random() - 0.5) * 4;
  let vy = (Math.random() - 0.5) * 4;
  let color = `hsl(${Math.random() * 360}, 100%, 60%)`;

  const newBall = new Ball(x, y, vx, vy, r, color);

  // Prevent overlapping at spawn
  let overlapping = false;
  for (let j = 0; j < balls.length; j++) {
    const dx = newBall.x - balls[j].x;
    const dy = newBall.y - balls[j].y;
    const distance = Math.hypot(dx, dy);
    if (distance < newBall.r + balls[j].r) {
      overlapping = true;
      break;
    }
  }

  if (!overlapping) balls.push(newBall);
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  balls.forEach(ball => ball.update());

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveCollision(balls[i], balls[j]);
    }
  }

  requestAnimationFrame(animate);
}

animate();
