/**
 * 飞机大战 — WeChat Mini Program Game
 * Canvas 2D rendering, touch control, particle effects
 */

const app = getApp()

Page({
  data: {},

  // ========== Lifecycle ==========
  onLoad() {
    this.initCanvas()
  },

  onShow() {
    if (this.canvas && !this.animFrame) {
      this.startGame()
    }
  },

  onHide() {
    this.stopLoop()
  },

  onUnload() {
    this.stopLoop()
  },

  // ========== Canvas Init ==========
  initCanvas() {
    const that = this
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        const sys = wx.getSystemInfoSync()
        const dpr = sys.pixelRatio
        canvas.width = sys.windowWidth * dpr
        canvas.height = sys.windowHeight * dpr
        ctx.scale(dpr, dpr)

        that.canvas = canvas
        that.ctx = ctx
        that.W = sys.windowWidth
        that.H = sys.windowHeight

        that.startGame()
      })
  },

  // ========== Game Init ==========
  startGame() {
    this.stopLoop()

    // Game state
    this.state = 'playing'    // 'playing' | 'paused' | 'over'
    this.score = 0
    this.lives = 3
    this.level = 1
    this.kills = 0
    this.frame = 0
    this.invincible = 0       // invincibility frames after hit

    // Player
    this.player = {
      x: this.W / 2,
      y: this.H * 0.82,
      w: 48,
      h: 56,
      speed: 6,
      shootTimer: 0,
      shootInterval: 15,      // frames between shots
      power: 1,               // 1=single, 2=double, 3=triple
      powerTimer: 0,
    }

    // Bullets
    this.bullets = []

    // Enemies
    this.enemies = []
    this.enemySpawnTimer = 0
    this.enemySpawnInterval = 40

    // Power-ups
    this.powerups = []

    // Particles (explosions)
    this.particles = []

    // Stars (background)
    this.stars = []
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
      })
    }

    // Touch tracking
    this.touchActive = false
    this.touchX = this.player.x
    this.touchY = this.player.y

    // Start loop
    this.lastTime = Date.now()
    this.loop()
  },

  stopLoop() {
    if (this.animFrame) {
      this.canvas.cancelAnimationFrame(this.animFrame)
      this.animFrame = null
    }
  },

  // ========== Game Loop ==========
  loop() {
    if (!this.canvas) return
    this.animFrame = this.canvas.requestAnimationFrame(() => this.loop())

    this.frame++
    const now = Date.now()
    const dt = Math.min(now - this.lastTime, 33) // cap at ~30fps equivalent
    this.lastTime = now

    if (this.state === 'playing') {
      this.update(dt)
    }
    this.render()
  },

  // ========== Update ==========
  update(dt) {
    this.updatePlayer()
    this.updateBullets()
    this.updateEnemies()
    this.updatePowerups()
    this.updateParticles()
    this.spawnEnemies()
    this.checkCollisions()
    this.checkLevel()
    this.updateStars()

    if (this.invincible > 0) this.invincible--
    if (this.player.powerTimer > 0) {
      this.player.powerTimer--
      if (this.player.powerTimer === 0) {
        this.player.power = 1
      }
    }
  },

  // --- Player ---
  updatePlayer() {
    if (this.touchActive) {
      const dx = this.touchX - this.player.x
      const dy = this.touchY - this.player.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 2) {
        this.player.x += (dx / dist) * Math.min(dist, this.player.speed)
        this.player.y += (dy / dist) * Math.min(dist, this.player.speed)
      }
    }

    // Clamp to screen
    this.player.x = Math.max(this.player.w / 2, Math.min(this.W - this.player.w / 2, this.player.x))
    this.player.y = Math.max(this.player.h / 2, Math.min(this.H - this.player.h / 2, this.player.y))

    // Auto shoot
    this.player.shootTimer++
    if (this.player.shootTimer >= this.player.shootInterval) {
      this.player.shootTimer = 0
      this.fireBullets()
    }
  },

  fireBullets() {
    const p = this.player
    if (p.power === 1) {
      this.addBullet(p.x, p.y - p.h / 2, 0, -10)
    } else if (p.power === 2) {
      this.addBullet(p.x - 8, p.y - p.h / 2, 0, -10)
      this.addBullet(p.x + 8, p.y - p.h / 2, 0, -10)
    } else {
      this.addBullet(p.x, p.y - p.h / 2, 0, -12)
      this.addBullet(p.x - 14, p.y - p.h / 3, -1, -10)
      this.addBullet(p.x + 14, p.y - p.h / 3, 1, -10)
    }
  },

  addBullet(x, y, vx, vy) {
    this.bullets.push({ x, y, vx, vy, w: 4, h: 14 })
  },

  // --- Enemies ---
  spawnEnemies() {
    this.enemySpawnTimer++
    const interval = Math.max(12, this.enemySpawnInterval - this.level * 3)
    if (this.enemySpawnTimer >= interval) {
      this.enemySpawnTimer = 0
      this.spawnEnemy()
    }
  },

  spawnEnemy() {
    const types = ['small', 'small', 'small', 'medium', 'medium']
    // Boss every 300 score
    if (this.score > 0 && this.score % 300 < 20 && !this.enemies.some(e => e.type === 'boss')) {
      types.push('boss')
    }
    const type = types[Math.floor(Math.random() * types.length)]

    let w, h, hp, speed, score
    switch (type) {
      case 'small':
        w = 36; h = 36; hp = 1; speed = 2.5 + this.level * 0.3; score = 10
        break
      case 'medium':
        w = 48; h = 48; hp = 3; speed = 1.5 + this.level * 0.2; score = 30
        break
      case 'boss':
        w = 72; h = 72; hp = 8 + this.level * 2; speed = 1; score = 100
        break
    }

    this.enemies.push({
      type, w, h, hp, hpMax: hp, speed, score,
      x: Math.random() * (this.W - w - 40) + 20 + w / 2,
      y: -h,
      frame: 0,
    })
  },

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      e.y += e.speed
      e.frame++

      // Slight horizontal movement for variety
      if (e.type === 'medium') {
        e.x += Math.sin(e.frame * 0.05) * 0.5
      }
      if (e.type === 'boss') {
        e.x += Math.sin(e.frame * 0.03) * 1
      }

      // Remove if off screen
      if (e.y > this.H + e.h) {
        this.enemies.splice(i, 1)
      }
    }
  },

  // --- Bullets ---
  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.x += b.vx
      b.y += b.vy
      if (b.y < -20 || b.y > this.H + 20 || b.x < -20 || b.x > this.W + 20) {
        this.bullets.splice(i, 1)
      }
    }
  },

  // --- Power-ups ---
  updatePowerups() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i]
      p.y += 2
      p.frame++
      if (p.y > this.H + 30) {
        this.powerups.splice(i, 1)
        continue
      }
      // Check collision with player
      if (this.rectCollide(this.player, p)) {
        this.applyPowerup(p.type)
        this.powerups.splice(i, 1)
      }
    }
  },

  applyPowerup(type) {
    switch (type) {
      case 'double':
        this.player.power = Math.min(3, this.player.power + 1)
        this.player.powerTimer = 600 // 10 seconds at 60fps
        break
      case 'shield':
        this.invincible = 180 // 3 seconds
        break
      case 'bomb':
        // Destroy all enemies on screen
        for (const e of this.enemies) {
          this.spawnExplosion(e.x, e.y, e.type === 'boss' ? 20 : 10)
          this.score += e.score
        }
        this.enemies = []
        break
    }
  },

  // --- Particles ---
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  },

  spawnExplosion(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5
      const speed = 1.5 + Math.random() * 3
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        color: Math.random() < 0.5 ? '#ff6600' : '#ffcc00',
        size: 2 + Math.random() * 4,
      })
    }
  },

  // --- Background stars ---
  updateStars() {
    for (const s of this.stars) {
      s.y += s.speed
      if (s.y > this.H) {
        s.y = 0
        s.x = Math.random() * this.W
      }
      s.twinkle += 0.05
    }
  },

  // --- Level ---
  checkLevel() {
    const newLevel = Math.floor(this.kills / 15) + 1
    if (newLevel > this.level && newLevel <= 10) {
      this.level = newLevel
      // Brief level-up effect
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: this.W / 2, y: this.H / 2,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          color: '#00ffff',
          size: 3 + Math.random() * 5,
        })
      }
    }
  },

  // --- Collisions ---
  checkCollisions() {
    // Bullet vs Enemy
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi]
      let hit = false
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei]
        if (this.pointInRect(b.x, b.y, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
          this.bullets.splice(bi, 1)
          e.hp--
          hit = true
          if (e.hp <= 0) {
            this.destroyEnemy(ei, e)
          } else {
            // Hit flash particle
            this.particles.push({
              x: b.x, y: b.y,
              vx: 0, vy: 0,
              life: 8, maxLife: 8,
              color: '#fff', size: 3,
            })
          }
          break
        }
      }
      if (hit) continue
    }

    // Enemy vs Player
    if (this.invincible > 0) return
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei]
      // Shrink hitbox a bit for fairness
      const margin = 10
      if (this.rectCollide(
        { x: this.player.x, y: this.player.y, w: this.player.w - margin, h: this.player.h - margin },
        e
      )) {
        this.hitPlayer()
        this.destroyEnemy(ei, e)
      }
    }
  },

  destroyEnemy(index, enemy) {
    this.spawnExplosion(enemy.x, enemy.y, enemy.type === 'boss' ? 25 : enemy.type === 'medium' ? 14 : 8)
    this.score += enemy.score
    this.kills++
    this.enemies.splice(index, 1)

    // Chance to drop power-up
    const dropChance = enemy.type === 'boss' ? 1.0 : enemy.type === 'medium' ? 0.3 : 0.08
    if (Math.random() < dropChance) {
      const types = ['double', 'double', 'shield', 'bomb']
      this.powerups.push({
        type: types[Math.floor(Math.random() * types.length)],
        x: enemy.x, y: enemy.y,
        w: 24, h: 24,
        frame: 0,
      })
    }
  },

  hitPlayer() {
    this.lives--
    this.invincible = 120 // 2 seconds
    this.player.power = 1
    this.player.powerTimer = 0

    // Big explosion
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 5
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color: '#ff4444',
        size: 3 + Math.random() * 6,
      })
    }

    // Vibrate
    wx.vibrateShort({ type: 'heavy' })

    if (this.lives <= 0) {
      this.gameOver()
    }
  },

  gameOver() {
    this.state = 'over'
    wx.vibrateLong()

    // Save high score
    const highScore = wx.getStorageSync('planeHighScore') || 0
    if (this.score > highScore) {
      wx.setStorageSync('planeHighScore', this.score)
    }
  },

  // ========== Render ==========
  render() {
    const ctx = this.ctx
    const W = this.W
    const H = this.H

    // Clear
    ctx.clearRect(0, 0, W, H)

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#050520')
    bg.addColorStop(0.5, '#0a0a30')
    bg.addColorStop(1, '#101040')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Stars
    for (const s of this.stars) {
      const alpha = 0.4 + Math.sin(s.twinkle) * 0.3
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.state === 'playing') {
      this.renderPlayer(ctx)
      this.renderBullets(ctx)
      this.renderEnemies(ctx)
      this.renderPowerups(ctx)
      this.renderParticles(ctx)
    }

    // HUD
    this.renderHUD(ctx)

    // Game Over
    if (this.state === 'over') {
      this.renderGameOver(ctx)
    }
  },

  renderPlayer(ctx) {
    if (this.invincible > 0 && Math.floor(this.invincible / 6) % 2 === 0) return

    const { x, y, w, h } = this.player
    ctx.save()
    ctx.translate(x, y)

    // Engine glow
    const glow = ctx.createRadialGradient(0, h / 2, 2, 0, h / 2 + 8, 20)
    glow.addColorStop(0, 'rgba(100,180,255,0.9)')
    glow.addColorStop(0.5, 'rgba(50,120,255,0.4)')
    glow.addColorStop(1, 'rgba(0,50,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(-10, h / 2 - 5, 20, 22)

    // Body
    ctx.fillStyle = '#4488ff'
    ctx.beginPath()
    ctx.moveTo(0, -h / 2)
    ctx.lineTo(-w / 2 + 6, h / 4)
    ctx.lineTo(-w / 6, h / 3)
    ctx.lineTo(0, h / 2)
    ctx.lineTo(w / 6, h / 3)
    ctx.lineTo(w / 2 - 6, h / 4)
    ctx.closePath()
    ctx.fill()

    // Cockpit
    ctx.fillStyle = '#aaddff'
    ctx.beginPath()
    ctx.ellipse(0, -2, 8, 14, 0, 0, Math.PI * 2)
    ctx.fill()

    // Wings
    ctx.fillStyle = '#3366cc'
    ctx.beginPath()
    ctx.moveTo(-w / 2 + 4, h / 5)
    ctx.lineTo(-w / 2, h / 3 + 4)
    ctx.lineTo(-w / 6 + 2, h / 4)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(w / 2 - 4, h / 5)
    ctx.lineTo(w / 2, h / 3 + 4)
    ctx.lineTo(w / 6 - 2, h / 4)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  },

  renderBullets(ctx) {
    ctx.fillStyle = '#ffdd44'
    for (const b of this.bullets) {
      // Glow
      ctx.shadowColor = '#ffdd44'
      ctx.shadowBlur = 6
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)
      ctx.shadowBlur = 0
    }
  },

  renderEnemies(ctx) {
    for (const e of this.enemies) {
      ctx.save()
      ctx.translate(e.x, e.y)

      if (e.type === 'small') {
        // Small enemy - red triangle/diamond
        ctx.fillStyle = '#ff4444'
        ctx.beginPath()
        ctx.moveTo(0, -e.h / 2)
        ctx.lineTo(e.w / 2, 0)
        ctx.lineTo(0, e.h / 2)
        ctx.lineTo(-e.w / 2, 0)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#cc0000'
        ctx.beginPath()
        ctx.arc(0, 0, e.w / 5, 0, Math.PI * 2)
        ctx.fill()
      } else if (e.type === 'medium') {
        // Medium enemy - purple hexagon-ish
        ctx.fillStyle = '#cc44ff'
        ctx.beginPath()
        ctx.moveTo(0, -e.h / 2)
        ctx.lineTo(e.w / 2, -e.h / 5)
        ctx.lineTo(e.w / 2, e.h / 5)
        ctx.lineTo(0, e.h / 2)
        ctx.lineTo(-e.w / 2, e.h / 5)
        ctx.lineTo(-e.w / 2, -e.h / 5)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#8800cc'
        ctx.beginPath()
        ctx.arc(0, 0, e.w / 4, 0, Math.PI * 2)
        ctx.fill()

        // HP bar
        if (e.hp < e.hpMax) {
          const barW = e.w * 0.7
          const barH = 3
          ctx.fillStyle = '#333'
          ctx.fillRect(-barW / 2, -e.h / 2 - 8, barW, barH)
          ctx.fillStyle = '#ff0'
          ctx.fillRect(-barW / 2, -e.h / 2 - 8, barW * (e.hp / e.hpMax), barH)
        }
      } else if (e.type === 'boss') {
        // Boss - large red/gold ship
        ctx.fillStyle = '#ff2222'
        ctx.beginPath()
        ctx.moveTo(0, -e.h / 2)
        ctx.lineTo(e.w / 3, -e.h / 4)
        ctx.lineTo(e.w / 2, -e.h / 6)
        ctx.lineTo(e.w / 2, e.h / 6)
        ctx.lineTo(e.w / 3, e.h / 4)
        ctx.lineTo(0, e.h / 3)
        ctx.lineTo(-e.w / 3, e.h / 4)
        ctx.lineTo(-e.w / 2, e.h / 6)
        ctx.lineTo(-e.w / 2, -e.h / 6)
        ctx.lineTo(-e.w / 3, -e.h / 4)
        ctx.closePath()
        ctx.fill()

        // Details
        ctx.fillStyle = '#ffaa00'
        ctx.beginPath()
        ctx.arc(0, -5, e.w / 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffdd00'
        ctx.beginPath()
        ctx.arc(0, -5, e.w / 8, 0, Math.PI * 2)
        ctx.fill()

        // HP bar
        const barW = e.w * 0.8
        const barH = 5
        ctx.fillStyle = '#333'
        ctx.fillRect(-barW / 2, -e.h / 2 - 10, barW, barH)
        ctx.fillStyle = '#ff4444'
        ctx.fillRect(-barW / 2, -e.h / 2 - 10, barW * (e.hp / e.hpMax), barH)
      }

      ctx.restore()
    }
  },

  renderPowerups(ctx) {
    for (const p of this.powerups) {
      const pulse = 1 + Math.sin(p.frame * 0.15) * 0.2
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.scale(pulse, pulse)
      ctx.fillStyle = p.type === 'double' ? '#44ff44' : p.type === 'shield' ? '#44aaff' : '#ff8844'
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const icon = p.type === 'double' ? '⚡' : p.type === 'shield' ? '🛡' : '💣'
      // Fallback to text if emoji doesn't render well
      const letter = p.type === 'double' ? 'P' : p.type === 'shield' ? 'S' : 'B'
      ctx.fillText(letter, 0, 1)
      ctx.restore()
    }
  },

  renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba')
      if (p.color.startsWith('#')) {
        const r = parseInt(p.color.slice(1, 3), 16)
        const g = parseInt(p.color.slice(3, 5), 16)
        const b = parseInt(p.color.slice(5, 7), 16)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  renderHUD(ctx) {
    // Score
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`🏆 ${this.score}`, 16, 12)

    // Level
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#aaa'
    ctx.fillText(`Lv.${this.level}`, 16, 38)

    // Lives
    ctx.textAlign = 'right'
    let hearts = ''
    for (let i = 0; i < this.lives; i++) hearts += '❤️'
    ctx.fillText(hearts, this.W - 16, 12)

    // Power indicator
    if (this.player.power > 1) {
      const sec = Math.ceil(this.player.powerTimer / 60)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#ff0'
      ctx.fillText(`⚡x${this.player.power} ${sec}s`, this.W - 16, 38)
    }

    // Invincible indicator
    if (this.invincible > 0) {
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#4af'
      ctx.fillText('🛡 Shield', this.W - 16, this.player.power > 1 ? 54 : 38)
    }
  },

  renderGameOver(ctx) {
    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, this.W, this.H)

    // Game Over text
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 40px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GAME OVER', this.W / 2, this.H / 2 - 50)

    // Score
    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#ffd700'
    ctx.fillText(`得分: ${this.score}`, this.W / 2, this.H / 2)

    // High score
    const highScore = wx.getStorageSync('planeHighScore') || 0
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#aaa'
    ctx.fillText(`最高分: ${Math.max(highScore, this.score)}`, this.W / 2, this.H / 2 + 35)

    // Level
    ctx.fillText(`到达第 ${this.level} 关 | 击毁 ${this.kills} 架`, this.W / 2, this.H / 2 + 60)

    // Restart button
    const btnW = 180, btnH = 50, btnY = this.H / 2 + 100
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    this.roundRect(ctx, this.W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 25)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText('🔄 再来一局', this.W / 2, btnY)

    // Store button position for click detection
    this._restartBtn = {
      x: this.W / 2 - btnW / 2,
      y: btnY - btnH / 2,
      w: btnW,
      h: btnH,
    }

    // Share button
    const shareY = btnY + 70
    ctx.fillStyle = '#44aaff'
    ctx.beginPath()
    this.roundRect(ctx, this.W / 2 - btnW / 2, shareY - btnH / 2, btnW, btnH, 25)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText('📤 分享好友', this.W / 2, shareY)

    this._shareBtn = {
      x: this.W / 2 - btnW / 2,
      y: shareY - btnH / 2,
      w: btnW,
      h: btnH,
    }
  },

  // ========== Touch Events ==========
  onTouchStart(e) {
    if (this.state === 'over') {
      const t = e.touches[0]
      const x = t.x, y = t.y
      if (this._restartBtn && this.pointInRect(x, y, this._restartBtn.x, this._restartBtn.y, this._restartBtn.w, this._restartBtn.h)) {
        this.startGame()
        return
      }
      if (this._shareBtn && this.pointInRect(x, y, this._shareBtn.x, this._shareBtn.y, this._shareBtn.w, this._shareBtn.h)) {
        this.onShare()
        return
      }
      return
    }

    const t = e.touches[0]
    this.touchActive = true
    this.touchX = t.x
    this.touchY = t.y
  },

  onTouchMove(e) {
    if (this.state !== 'playing') return
    const t = e.touches[0]
    this.touchX = t.x
    this.touchY = t.y
  },

  onTouchEnd(e) {
    this.touchActive = false
  },

  // ========== Share ==========
  onShare() {
    // Triggered by button or share menu
  },

  onShareAppMessage() {
    return {
      title: `马翼龙的飞机大战 - 得分 ${this.score}！来挑战我吧 ✈️`,
      path: '/pages/game/game',
    }
  },

  // ========== Helpers ==========
  rectCollide(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
           Math.abs(a.y - b.y) < (a.h + b.h) / 2
  },

  pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  },
})
