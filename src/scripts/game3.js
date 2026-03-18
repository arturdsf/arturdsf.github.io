// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
    PLAYER: {
        BASE_WIDTH: 100,
        BASE_HEIGHT: 100,
        SPEED_DESKTOP: 400, // pixels per second
        SPEED_MOBILE: 5, // drag multiplier
        INVULNERABLE_DURATION: 1.5, // seconds
    },
    OBSTACLES: {
        BASE_SPEED: 250, // pixels per second
        SPAWN_RATE_MIN: 0.8, // seconds
        SPAWN_RATE_MAX: 2.5, // seconds
        TYPES: [
            { type: 'normal', chance: 0.6, width: 80, height: 80 },
            { type: 'fast', chance: 0.25, width: 70, height: 70, speedMult: 1.5 },
            { type: 'kamikaze', chance: 0.1, width: 60, height: 60, speedMult: 1.2 },
            { type: 'boss', chance: 0.05, width: 120, height: 120, hp: 2 }
        ]
    },
    LETTERS: {
        BASE_SPEED: 150, // slower than obstacles
        SPAWN_RATE_MIN: 2.0,
        SPAWN_RATE_MAX: 4.0,
        SIZE: 40
    },
    GAME: {
        METERS_UNIT: 100, // pixels = 1 meter
        STARTING_LIVES: 3,
        PARALLAX_SPEED: 100,
    }
};

const ASSETS = {
    images: {
        playerDesktop: document.getElementById('player-desktop'),
        playerMobile: document.getElementById('player-mobile'),
        tronco: document.getElementById('tronco'),
        ventania: document.getElementById('ventania'),
        buraco: document.getElementById('buraco'),
        fundo: document.getElementById('fundo'),
    },
    getObstacleImage(type) {
        switch (type) {
            case 'normal': return this.images.tronco;
            case 'fast': return this.images.ventania;
            case 'kamikaze': return this.images.ventania;
            case 'boss': return this.images.buraco;
            default: return this.images.tronco;
        }
    }
};

// ==========================================
// 2. ENGINE & INPUT
// ==========================================
class Engine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.isMobile = false;

        this.lastTime = 0;
        this.isRunning = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        // Adjusted mobile detection to treat anything below 768px as mobile logic
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || this.width < 768;
    }

    start(updateFn, drawFn) {
        this.updateFn = updateFn;
        this.drawFn = drawFn;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.isRunning = false;
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        let dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap dt to prevent huge jumps if tab was inactive
        if (dt > 0.1) dt = 0.1;

        if (this.updateFn) this.updateFn(dt);
        if (this.drawFn) this.drawFn(this.ctx);

        requestAnimationFrame((time) => this.loop(time));
    }
}

class InputManager {
    constructor(canvas, isMobile) {
        this.keys = {};
        this.touch = { active: false, x: 0, y: 0 };
        this.isMobile = isMobile;

        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('touchstart', e => {
            this.touch.active = true;
            this.touch.x = e.touches[0].clientX;
            this.touch.y = e.touches[0].clientY;
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
            // Prevent default zooming/scrolling on mobile
            e.preventDefault();
            this.touch.x = e.touches[0].clientX;
            this.touch.y = e.touches[0].clientY;
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            this.touch.active = false;
        });
    }

    updateMobileState(isMobile) {
        this.isMobile = isMobile;
    }
}

// ==========================================
// 3. ENTITIES (Player, Obstacles, Letters)
// ==========================================
class Player {
    constructor(engine) {
        this.engine = engine;
        this.facingRight = true; // Faces right by default (from left to right)
        this.reset();
    }

    reset() {
        this.width = CONFIG.PLAYER.BASE_WIDTH * (this.engine.isMobile ? 0.6 : 1);
        this.height = CONFIG.PLAYER.BASE_HEIGHT * (this.engine.isMobile ? 0.6 : 1);
        this.x = this.engine.width - 50 - this.width;
        this.y = this.engine.height / 2 - this.height / 2;
        this.invulnerableTime = CONFIG.PLAYER.INVULNERABLE_DURATION;
        this.facingRight = false;
    }

    update(dt, input) {
        if (this.invulnerableTime > 0) {
            this.invulnerableTime -= dt;
        }

        this.width = CONFIG.PLAYER.BASE_WIDTH * (this.engine.isMobile ? 0.6 : 1);
        this.height = CONFIG.PLAYER.BASE_HEIGHT * (this.engine.isMobile ? 0.6 : 1);

        const speed = CONFIG.PLAYER.SPEED_DESKTOP * dt;

        let movedLeft = false;
        let movedRight = false;

        if (input.keys['ArrowUp'] || input.keys['KeyW']) this.y -= speed;
        if (input.keys['ArrowDown'] || input.keys['KeyS']) this.y += speed;
        if (input.keys['ArrowLeft'] || input.keys['KeyA']) { this.x -= speed; movedLeft = true; }
        if (input.keys['ArrowRight'] || input.keys['KeyD']) { this.x += speed; movedRight = true; }

        if (input.touch.active) {
            const dx = input.touch.x - (this.x + this.width / 2);
            const dy = input.touch.y - (this.y + this.height / 2);

            // Apply smooth linear interpolation to follow the finger to remove the jitter/flick
            this.x += dx * 5 * dt;
            this.y += dy * 5 * dt;

            if (dx < -5) movedLeft = true;
            if (dx > 5) movedRight = true;
        }

        // Logic for flipping scale based on movement direction
        if (movedRight) this.facingRight = true;
        else if (movedLeft) this.facingRight = false;

        // Clamp to screen
        this.x = Math.max(0, Math.min(this.engine.width - this.width, this.x));
        this.y = Math.max(0, Math.min(this.engine.height - this.height, this.y));
    }

    draw(ctx) {
        const isBlinking = this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 10) % 2 === 0;
        if (isBlinking) return;

        const img = this.engine.isMobile ? ASSETS.images.playerMobile : ASSETS.images.playerDesktop;

        ctx.save();

        // Translate to the player's position
        // If facingRight is true, flip horizontally since the original asset might be facing left
        // Wait, "jogador deve andar para a esquerda e virar (scaleX(-1)) quando for para o outro lado"
        // Let's assume asset faces left by default. If it faces right by default, we just flip the logic.
        // We'll translate to center, scale conditionally, then draw.
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.translate(centerX, centerY);

        // Adjust facing scale properly (since native asset faces right, scale(1) is right)
        ctx.scale(this.facingRight ? 1 : -1, 1);

        if (img && img.complete) {
            ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#4f7942';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.restore();
    }
}

class EntityManager {
    constructor(engine) {
        this.engine = engine;

        this.obstacles = [];
        this.letters = [];
        this.particles = [];
        this.stars = [];

        this.obstacleTimer = 0;
        this.letterTimer = 0;

        this.pools = {
            obstacles: [],
            letters: [],
            particles: []
        };

        this.initStars();
    }

    initStars() {
        this.stars = Array.from({ length: 80 }, () => ({
            x: Math.random() * this.engine.width * 2,
            y: Math.random() * this.engine.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.4 + 0.1,
            alpha: Math.random() * 0.4 + 0.2
        }));
    }

    reset() {
        this.pools.obstacles.push(...this.obstacles.splice(0, this.obstacles.length));
        this.pools.letters.push(...this.letters.splice(0, this.letters.length));
        this.pools.particles.push(...this.particles.splice(0, this.particles.length));

        this.obstacleTimer = 0;
        this.letterTimer = 0;
    }

    spawnObstacle(gameSpeedMult) {
        const types = CONFIG.OBSTACLES.TYPES;
        let def = types[types.length - 1];
        const r = Math.random();
        let cumulative = 0;
        for (let t of types) {
            cumulative += t.chance;
            if (r <= cumulative) {
                def = t;
                break;
            }
        }

        const scale = this.engine.isMobile ? 0.6 : 1;
        const w = def.width * scale;
        const h = def.height * scale;

        let y = 0;
        let attempts = 0;
        do {
            y = 50 + Math.random() * (this.engine.height - h - 100);
            attempts++;
        } while (attempts < 10 && this.obstacles.some(o => this.hitTest(this.engine.width, y, w, h, o.x, o.y, o.width, o.height)));

        let obs = this.pools.obstacles.pop() || {};
        obs.x = -100 - w;
        obs.y = y;
        obs.width = w;
        obs.height = h;
        obs.type = def.type;
        obs.speedX = CONFIG.OBSTACLES.BASE_SPEED * (def.speedMult || 1) * gameSpeedMult;
        obs.hp = def.hp || 1;
        obs.sinOffset = Math.random() * Math.PI * 2;

        this.obstacles.push(obs);
    }

    spawnLetter(targetChar, gameSpeedMult) {
        const scale = this.engine.isMobile ? 0.6 : 1;
        let l = this.pools.letters.pop() || {};
        l.x = -100 - (CONFIG.LETTERS.SIZE * scale); // Changed logic to rely on the size correctly before applying l.width
        l.y = 50 + Math.random() * (this.engine.height - 100);
        l.width = CONFIG.LETTERS.SIZE * scale;
        l.height = CONFIG.LETTERS.SIZE * scale;
        l.char = targetChar;
        l.speedX = CONFIG.LETTERS.BASE_SPEED * gameSpeedMult;
        l.pulse = Math.random() * Math.PI * 2;

        this.letters.push(l);
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            let p = this.pools.particles.pop() || {};
            p.x = x;
            p.y = y;
            p.vx = (Math.random() - 0.5) * 300;
            p.vy = (Math.random() - 0.5) * 300;
            p.life = 0.4 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.color = color;
            p.size = Math.random() * 4 + 2;
            this.particles.push(p);
        }
    }

    update(dt, gameSpeedMult, currentTargetChar) {
        // Obstacles
        this.obstacleTimer += dt * gameSpeedMult;
        const spawnRate = Math.max(
            CONFIG.OBSTACLES.SPAWN_RATE_MIN,
            CONFIG.OBSTACLES.SPAWN_RATE_MAX - (gameSpeedMult - 1)
        );
        if (this.obstacleTimer >= spawnRate) {
            this.spawnObstacle(gameSpeedMult);
            this.obstacleTimer = 0;
        }

        // Letters
        if (currentTargetChar) {
            this.letterTimer += dt;
            if (this.letters.length === 0 && this.letterTimer > 1.5) {
                this.spawnLetter(currentTargetChar, gameSpeedMult);
                this.letterTimer = 0;
            }
        }

        // Move
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let o = this.obstacles[i];
            o.x += o.speedX * dt;
            if (o.type === 'kamikaze') {
                o.y += Math.sin(o.x * 0.05 + o.sinOffset) * 100 * dt;
            }

            if (o.x > this.engine.width + 100) {
                this.pools.obstacles.push(this.obstacles.splice(i, 1)[0]);
            }
        }

        for (let i = this.letters.length - 1; i >= 0; i--) {
            let l = this.letters[i];
            l.x += l.speedX * dt;
            l.pulse += 5 * dt;

            if (l.x > this.engine.width + 100) {
                this.pools.letters.push(this.letters.splice(i, 1)[0]);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.pools.particles.push(this.particles.splice(i, 1)[0]);
            }
        }

        // Parallax BG
        this.stars.forEach(s => {
            s.x += s.speed * CONFIG.GAME.PARALLAX_SPEED * gameSpeedMult * dt;
            if (s.x > this.engine.width + 100) {
                s.x = -Math.random() * 100;
                s.y = Math.random() * this.engine.height;
            }
        });
    }

    draw(ctx) {
        // Draw Stars
        ctx.fillStyle = '#ffffff';
        this.stars.forEach(s => {
            ctx.globalAlpha = s.alpha;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;

        // Draw Letters
        this.letters.forEach(l => {
            ctx.fillStyle = `rgba(166, 124, 82, ${0.7 + Math.sin(l.pulse) * 0.3})`; // primary color (brown)
            ctx.beginPath();
            ctx.roundRect(l.x, l.y, l.width, l.height, 8);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(l.width * 0.6)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(l.char, l.x + l.width / 2, l.y + l.height / 2);
        });

        // Draw Obstacles
        this.obstacles.forEach(o => {
            const img = ASSETS.getObstacleImage(o.type);
            if (img && img.complete) {
                ctx.drawImage(img, o.x, o.y, o.width, o.height);
            } else {
                ctx.fillStyle = '#b33939'; // danger color
                ctx.fillRect(o.x, o.y, o.width, o.height);
            }
        });

        // Draw Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    hitTest(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }
}

// ==========================================
// 4. MAIN GAME MANAGER
// ==========================================
class Game {
    constructor() {
        this.engine = new Engine();
        this.input = new InputManager(this.engine.canvas, this.engine.isMobile);
        this.player = new Player(this.engine);
        this.entities = new EntityManager(this.engine);

        // Audios
        this.soundCollision = new Audio('../assets/sounds/game3_collision.mp3');
        this.soundCollect = new Audio('../assets/sounds/game3_soundOfCollect.mp3');
        this.soundLevelWin = new Audio('../assets/sounds/game3_levelConclusion.mp3');

        this.state = {
            status: 'menu',
            timeElapsed: 0,
            maxLevelReached: 1,
            scrollX: 0,
            lives: CONFIG.GAME.STARTING_LIVES,
            level: 1,
            gameSpeedMult: 1.0,
            currentWord: '',
            lettersCollected: 0
        };

        this.dictionary = ['CHIMARRAO', 'PAMPA', 'GAUCHO', 'MATE', 'FLOR', 'SERRA'];

        this.ui = {
            menu: document.getElementById('main-menu'),
            hud: document.getElementById('hud'),
            gameOver: document.getElementById('game-over'),
            levelComplete: document.getElementById('level-complete'),
            pauseMenu: document.getElementById('pause-menu'),

            score: null, // Removed
            timeElapsed: document.getElementById('timeElapsed'),
            lives: document.getElementById('lives'),
            level: document.getElementById('level'),
            wordProgress: document.getElementById('wordProgress'),

            finalTime: document.getElementById('finalTime'),
            finalLevel: document.getElementById('finalLevel'),

            completedLevel: document.getElementById('completedLevel'),
            completedWordDisplay: document.getElementById('completedWordDisplay')
        };

        this.bindEvents();
        this.loadDictionary();

        this.engine.start((dt) => this.update(dt), (ctx) => this.draw(ctx));
    }

    async loadDictionary() {
        try {
            const res = await fetch('../assets/dicionario.txt');
            if (res.ok) {
                const text = await res.text();
                const words = text.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length > 0);
                if (words.length > 0) Object.assign(this.dictionary, words);
            }
        } catch (e) {
            console.warn('Usando dicionário fallback.', e);
        }
    }

    pickWordForLevel() {
        // Levels 1-2: words up to 5 chars
        // Levels 3-4: words up to 7 chars
        // Level 5+: any words

        let pool = this.dictionary;

        if (this.state.level <= 2) {
            pool = this.dictionary.filter(w => w.length <= 5);
        } else if (this.state.level <= 4) {
            pool = this.dictionary.filter(w => w.length <= 7 && w.length > 4);
        } else {
            pool = this.dictionary.filter(w => w.length >= 6);
        }

        if (pool.length === 0) pool = this.dictionary; // fallback

        return pool[Math.floor(Math.random() * pool.length)];
    }

    bindEvents() {
        document.getElementById('btn-start').addEventListener('click', () => this.startGame(true));
        document.getElementById('btn-restart').addEventListener('click', () => this.startGame(true));
        document.getElementById('btn-restart-from-win').addEventListener('click', () => this.startGame(true));
        document.getElementById('btn-next-level').addEventListener('click', () => this.nextLevel());
        
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart-pause').addEventListener('click', () => {
            this.ui.pauseMenu.classList.add('hidden');
            this.startGame(true);
        });

        window.addEventListener('resize', () => {
            this.input.updateMobileState(this.engine.isMobile);
        });
    }

    startGame(fullReset = false) {
        if (fullReset) {
            this.state.level = 1;
            this.state.timeElapsed = 0;
            this.state.maxLevelReached = 1;
            this.state.scrollX = 0;
            this.state.gameSpeedMult = 1.0;
        }

        this.state.lives = CONFIG.GAME.STARTING_LIVES;
        this.state.currentWord = this.pickWordForLevel();
        this.state.lettersCollected = 0;

        this.player.reset();
        this.entities.reset();

        this.ui.menu.classList.add('hidden');
        this.ui.gameOver.classList.add('hidden');
        this.ui.levelComplete.classList.add('hidden');
        this.ui.pauseMenu.classList.add('hidden');
        this.ui.hud.classList.remove('hidden');
        this.ui.hud.classList.add('flex'); // Because JS frameworks sometimes mess with layout

        this.updateHUD();
        this.state.status = 'playing';
    }

    nextLevel() {
        this.state.level++;
        if (this.state.level > this.state.maxLevelReached) this.state.maxLevelReached = this.state.level;
        // Increase speed for difficulty
        this.state.gameSpeedMult = Math.min(3.0, 1.0 + (this.state.level - 1) * 0.25);
        this.startGame(false);
    }

    togglePause() {
        if (this.state.status === 'playing') {
            this.state.status = 'paused';
            this.ui.pauseMenu.classList.remove('hidden');
        } else if (this.state.status === 'paused') {
            this.state.status = 'playing';
            this.ui.pauseMenu.classList.add('hidden');
        }
    }

    endGame() {
        this.state.status = 'gameover';
        this.ui.finalTime.textContent = this.formatTime(this.state.timeElapsed);
        this.ui.finalLevel.textContent = this.state.maxLevelReached;
        this.ui.hud.classList.add('hidden');
        this.ui.hud.classList.remove('flex');
        this.ui.gameOver.classList.remove('hidden');
    }

    winLevel() {
        this.state.status = 'levelcomplete';
        this.ui.completedLevel.textContent = this.state.level;
        this.ui.completedWordDisplay.textContent = this.state.currentWord;
        
        this.soundLevelWin.currentTime = 0;
        this.soundLevelWin.play().catch(e=>console.log(e));

        this.ui.hud.classList.add('hidden');
        this.ui.hud.classList.remove('flex');
        this.ui.levelComplete.classList.remove('hidden');
    }

    updateWordProgress() {
        const word = this.state.currentWord;
        // e.g. "C H I _ _ _"
        const progress = word.split('').map((c, i) => i < this.state.lettersCollected ? c : '_').join(' ');
        this.ui.wordProgress.textContent = progress;
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    updateHUD() {
        this.ui.timeElapsed.textContent = this.formatTime(this.state.timeElapsed);
        this.ui.lives.textContent = this.state.lives;
        this.ui.level.textContent = this.state.level;
        this.updateWordProgress();
    }

    checkCollisions() {
        const hitMarginX = this.player.width * 0.2;
        const hitMarginY = this.player.height * 0.2;
        const pX = this.player.x + hitMarginX;
        const pY = this.player.y + hitMarginY;
        const pW = this.player.width - hitMarginX * 2;
        const pH = this.player.height - hitMarginY * 2;

        if (this.player.invulnerableTime <= 0) {
            for (let i = this.entities.obstacles.length - 1; i >= 0; i--) {
                let o = this.entities.obstacles[i];
                if (this.entities.hitTest(pX, pY, pW, pH, o.x + o.width * 0.2, o.y + o.height * 0.2, o.width * 0.6, o.height * 0.6)) {
                    this.state.lives--;
                    this.player.invulnerableTime = CONFIG.PLAYER.INVULNERABLE_DURATION;

                    this.soundCollision.currentTime = 0;
                    this.soundCollision.play().catch(e=>console.log(e));

                    // Explosion color = berry red (danger)
                    this.entities.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#b33939');

                    this.entities.pools.obstacles.push(this.entities.obstacles.splice(i, 1)[0]);

                    this.updateHUD();
                    if (this.state.lives <= 0) {
                        this.endGame();
                        return;
                    }
                    break;
                }
            }
        }

        for (let i = this.entities.letters.length - 1; i >= 0; i--) {
            let l = this.entities.letters[i];
            if (this.entities.hitTest(pX, pY, pW, pH, l.x, l.y, l.width, l.height)) {
                if (l.char === this.state.currentWord[this.state.lettersCollected]) {
                    this.state.lettersCollected++;

                    this.soundCollect.currentTime = 0;
                    this.soundCollect.play().catch(e=>console.log(e));

                    // Explosion color = forest green (secondary)
                    this.entities.createExplosion(l.x + l.width / 2, l.y + l.height / 2, '#4f7942');

                    // Add some value for getting a letter if desired, removed score usage
                    this.updateHUD();

                    this.entities.pools.letters.push(this.entities.letters.splice(i, 1)[0]);
                }
            }
        }
    }

    update(dt) {
        if (this.state.status !== 'playing') {
            // Stars still scroll slowly
            this.entities.stars.forEach(s => {
                s.x += s.speed * CONFIG.GAME.PARALLAX_SPEED * 0.5 * dt;
                if (s.x > this.engine.width + 100) s.x = -100;
            });
            return;
        }

        this.player.update(dt, this.input);

        let currentChar = null;
        if (this.state.lettersCollected < this.state.currentWord.length) {
            currentChar = this.state.currentWord[this.state.lettersCollected];
        }

        this.entities.update(dt, this.state.gameSpeedMult, currentChar);
        this.checkCollisions();

        this.state.timeElapsed += dt;
        this.state.scrollX += (CONFIG.GAME.METERS_UNIT / 2) * this.state.gameSpeedMult * dt;

        // Update time dynamically every frame in HUD
        this.ui.timeElapsed.textContent = this.formatTime(this.state.timeElapsed);

        // Win Condition: Word Completed
        if (this.state.lettersCollected >= this.state.currentWord.length) {
            this.winLevel();
        }
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.engine.width, this.engine.height);

        const bg = ASSETS.images.fundo;
        if (bg && bg.complete) {
            const scale = Math.max(this.engine.width / bg.naturalWidth, this.engine.height / bg.naturalHeight);
            const w = bg.naturalWidth * scale;
            const h = bg.naturalHeight * scale;

            // Scroll moving logically against the player, background goes right
            const parallaxX = (this.state.scrollX) % w;

            ctx.drawImage(bg, parallaxX, 0, w, h);
            ctx.drawImage(bg, parallaxX - w, 0, w, h);
        } else {
            // Fill an earthy fallback background
            ctx.fillStyle = '#1c1510';
            ctx.fillRect(0, 0, this.engine.width, this.engine.height);
        }

        this.entities.draw(ctx);

        if (this.state.status === 'playing' || this.state.status === 'levelcomplete' || this.state.status === 'gameover') {
            this.player.draw(ctx);
        }
    }
}

window.addEventListener('load', () => {
    window.gameInstance = new Game();
});