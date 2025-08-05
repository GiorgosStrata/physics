const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const radiusInput = document.getElementById('radius');
const speedInput = document.getElementById('speed');
const massInput = document.getElementById('mass');
const angleInput = document.getElementById('angle');
const colorInput = document.getElementById('color');
const clearBtn = document.getElementById('clear');
const pauseBtn = document.getElementById('pauseResume');

let balls = [];
let paused = false;

class Ball {
  constructor(x, y, radius, mass, velocity, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.mass = mass;
    this.velocity = velocity;
    this.color = color;
  }

  draw() {
    // Ball
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 10, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Speed label
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2).toFixed(2);
    ctx.fillStyle = 'white';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${speed} m/s`, this.x, this.y - this.radius * 10 - 5);
  }

  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.wallCollision();
    this.draw();
  }

  wallCollision() {
    if (this.x - this.radius * 10 <= 0 || this.x + this.radius * 10 >= canvas.width) {
      this.velocity.x *= -1;
    }
    if (this.y - this.radius * 10 <= 0 || this.y + this.radius * 10 >= canvas.height) {
      this.velocity.y *= -1;
    }
  }
}

function resolveCollision(ball1, ball2) {
  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;
  const distance = Math.hypot(dx, dy);

  if (distance < ball1.radius * 10 + ball2.radius * 10) {
    const angle = Math.atan2(dy, dx);
    const m1 = ball1.mass;
    const m2 = ball2.mass;

    const u1 = rotate(ball1.velocity, angle);
    const u2 = rotate(ball2.velocity, angle);

    const v1 = { x: ((m1 - m2) * u1.x + 2 * m2 * u2.x) / (m1 + m2), y: u1.y };
    const v2 = { x: ((m2 - m1) * u2.x + 2 * m1 * u1.x) / (m1 + m2), y: u2.y };

    const vFinal1 = rotate(v1, -angle);
    const vFinal2 = rotate(v2, -angle);

    ball1.velocity = vFinal1;
    ball2.velocity = vFinal2;
  }
}

function rotate(velocity, angle) {
  return {
    x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
    y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
  };
}

function animate() {
  if (!paused) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    balls.forEach((ball, index) => {
      ball.update();
      for (let j = index + 1; j < balls.length; j++) {
        resolveCollision(ball, balls[j]);
      }
    });
  }
  requestAnimationFrame(animate);
}

// Alignment helper: snap if close to another ball's X or Y
function applyAlignmentAssist(x, y) {
  for (const other of balls) {
    const dx = Math.abs(x - other.x);
    const dy = Math.abs(y - other.y);
    if (dx < 10) return { x: other.x, y }; // snap X
    if (dy < 10) return { x, y: other.y }; // snap Y
  }
  return { x, y };
}

// Add ball on canvas click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  ({ x, y } = applyAlignmentAssist(x, y));

  const radius = parseFloat(radiusInput.value);
  const speed = parseFloat(speedInput.value);
  const angle = parseFloat(angleInput.value) * Math.PI / 180;
  const mass = parseFloat(massInput.value);
  const color = colorInput.value;

  const velocity = {
    x: speed * Math.cos(angle),
    y: speed * Math.sin(angle)
  };

  const ball = new Ball(x, y, radius, mass, velocity, color);
  balls.push(ball);
});

clearBtn.addEventListener('click', () => {
  balls = [];
});

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});

animate();
