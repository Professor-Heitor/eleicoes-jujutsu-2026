/**
 * @fileoverview HTML5 Canvas 2D Cursed Energy Particle & Kokusen Lightning Engine
 * Dynamically scales particle density, velocity, and collision sparks based on
 * the electoral vote share between Satoru Gojo (Left) and Ryomen Sukuna (Right).
 */

export class CursedParticlesEngine {
  constructor(canvasId = 'cursed-particles-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.gojoShare = 50;
    this.sukunaShare = 50;
    this.particles = [];
    this.sparks = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.animFrameId = null;

    if (this.canvas && this.ctx) {
      this.handleResize = this.handleResize.bind(this);
      window.addEventListener('resize', this.handleResize);
      this.handleResize();
      this.initParticles();
      this.start();
    }
  }

  handleResize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  setPowerBalance(gojoPct) {
    const clamped = Math.max(0, Math.min(100, Number(gojoPct) || 50));
    this.gojoShare = clamped;
    this.sukunaShare = 100 - clamped;
  }

  createParticle(side) {
    const isGojo = side === 'gojo';
    const boundaryX = (this.gojoShare / 100) * this.width;

    const x = isGojo
      ? Math.random() * Math.max(boundaryX, this.width * 0.15)
      : boundaryX + Math.random() * Math.max(this.width - boundaryX, this.width * 0.15);

    const y = Math.random() * this.height;
    const gojoPalette = ['#00f2fe', '#0066ff', '#9333ea', '#e879f9'];
    const sukunaPalette = ['#ff0844', '#dc2626', '#ff6a00', '#fca5a5'];
    const palette = isGojo ? gojoPalette : sukunaPalette;

    return {
      side,
      x,
      y,
      radius: 1.4 + Math.random() * 3.4,
      vx: isGojo ? (0.35 + Math.random() * 1.1) : -(0.35 + Math.random() * 1.1),
      vy: -0.4 - Math.random() * 1.1,
      alpha: 0.25 + Math.random() * 0.65,
      color: palette[Math.floor(Math.random() * palette.length)],
      pulseSpeed: 0.02 + Math.random() * 0.04,
      pulsePhase: Math.random() * Math.PI * 2
    };
  }

  initParticles() {
    this.particles = [];
    const totalCount = 96;
    for (let i = 0; i < totalCount; i++) {
      const side = i < totalCount / 2 ? 'gojo' : 'sukuna';
      this.particles.push(this.createParticle(side));
    }
  }

  spawnKokusenSpark(collisionX) {
    if (this.sparks.length > 26) return;
    const centerY = this.height * (0.35 + Math.random() * 0.35);
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5.5;
    const colors = ['#ffffff', '#00f2fe', '#ff0844', '#d946ef'];

    this.sparks.push({
      x: collisionX + (Math.random() - 0.5) * 28,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.03 + Math.random() * 0.04,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1.5 + Math.random() * 2.5
    });
  }

  start() {
    const renderLoop = () => {
      this.updateAndDraw();
      this.animFrameId = requestAnimationFrame(renderLoop);
    };
    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  updateAndDraw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const collisionX = (this.gojoShare / 100) * this.width;
    const gojoMultiplier = 0.4 + (this.gojoShare / 50) * 0.85;
    const sukunaMultiplier = 0.4 + (this.sukunaShare / 50) * 0.85;

    // Update & render cursed energy particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const mult = p.side === 'gojo' ? gojoMultiplier : sukunaMultiplier;

      p.x += p.vx * mult;
      p.y += p.vy * mult;
      p.pulsePhase += p.pulseSpeed;

      const currentAlpha = p.alpha * (0.65 + 0.35 * Math.sin(p.pulsePhase)) * Math.min(mult, 1.35);

      // Respawn if out of bounds or crossed collision front
      if (
        p.y < -20 ||
        (p.side === 'gojo' && p.x > collisionX + 35) ||
        (p.side === 'sukuna' && p.x < collisionX - 35)
      ) {
        if (Math.random() < 0.32) {
          this.spawnKokusenSpark(collisionX);
        }
        this.particles[i] = this.createParticle(p.side);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(1, currentAlpha));
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12 * mult;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * Math.min(mult, 1.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Update & render collision sparks (Kokusen)
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;

      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = s.life;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.shadowBlur = 14;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 2.2, s.y - s.vy * 2.2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
