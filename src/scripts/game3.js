(function () {
    'use strict';

    // 1. CONFIGURAÇÕES CONSTANTES
    const CONFIG = {
        METERS_PER_FRAME: 95,
        SPAWN_DISTANCE_MIN: 8,
        OBSTACLE_MAX: 10,
        OBSTACLE_SPAWN_BASE: 90,
        OBSTACLE_SPAWN_MIN: 50,
        LETTER_OFFSCREEN: 150,
        ENEMY_OFFSCREEN: 200,
        PARTICLE_COUNT: 25,
        STAR_COUNT: 250
    };

    const ENEMY_TYPES = [
        { type: 'boss', chance: 0.04, width: 160, height: 120, hp: 4 },
        { type: 'kamikaze', chance: 0.13, width: 70, height: 70, hp: 1 },
        { type: 'fast', chance: 0.42, width: 80, height: 100, hp: 1 },
        { type: 'normal', chance: 1, width: 100, height: 100, hp: 1 }
    ];

    // 2. CACHE DE DOM E ASSETS
    const DOM = {
        canvas: document.getElementById('gameCanvas'),
        ctx: document.getElementById('gameCanvas').getContext('2d'),
        score: document.getElementById('score'),
        lives: document.getElementById('lives'),
        level: document.getElementById('level'),
        speed: document.getElementById('speed'),
        gameOver: document.getElementById('gameOver'),
        levelComplete: document.getElementById('levelComplete'),
        finalScore: document.getElementById('finalScore'),
        completedLevel: document.getElementById('completedLevel'),
        nextTarget: document.getElementById('nextTarget'),
        wordProgress: document.getElementById('wordProgress')
    };

    const SPRITES = {
        player: document.getElementById('player'),
        tronco: document.getElementById('tronco'),
        ventania: document.getElementById('ventania'),
        buraco: document.getElementById('buraco'),
        fundo: document.getElementById('fundo')
    };

    const TYPE_TO_SPRITE = { normal: 'tronco', fast: 'ventania', boss: 'buraco', kamikaze: 'ventania' };

    // 3. ESTADO DO JOGO E VARIÁVEIS GLOBAIS
    const State = {
        totalDistance: 0,
        currentTarget: 100,
        lives: 3,
        level: 1,
        gameOver: false,
        levelComplete: false,
        enemySpawnTimer: 0,
        gameSpeed: 1.0,
        lastEnemySpawnDistance: -500,
        currentWord: '',
        lettersCollected: 0,
        missedLetter: false,
        dictionary: ['NAVE', 'FOGO', 'ESTAR', 'JOGO', 'VIDA', 'FASE', 'NIVEL'] // Fallback
    };

    const Env = {
        width: 0, height: 0,
        cameraX: 0, lastTime: 0, frameCounter: 0,
        isMobile: null, mobileScale: 1,
        imagesLoaded: 0, totalImages: 0
    };

    const Input = {
        keys: {},
        touch: { active: false, x: 0, y: 0 }
    };

    const Player = { x: 50, y: 0, width: 150, height: 150, speed: 2.8, invulnerable: 0 };

    // 4. ENTIDADES E OBJECT POOLING (Otimização de Memória)
    const Entities = {
        enemies: [], particles: [], stars: [], letters: []
    };
    
    const Pools = {
        enemies: [], particles: [], letters: []
    };

    // 5. FUNÇÕES UTILITÁRIAS
    const Utils = {
        hitTest(ax, ay, aw, ah, bx, by, bw, bh) {
            return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
        },
        toScreenX(worldX) {
            return Env.width - (worldX - Env.cameraX);
        },
        pickRandomWord() {
            return State.dictionary[Math.floor(Math.random() * State.dictionary.length)];
        }
    };

    // 6. GERENCIAMENTO DE TELA E ASSETS
    async function loadDictionary() {
        try {
            const res = await fetch('../assets/dicionario.txt');
            if (res.ok) {
                const text = await res.text();
                const words = text.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length > 0);
                if (words.length > 0) State.dictionary = words;
            }
        } catch (e) {
            console.warn('Usando dicionário fallback.', e);
        }
    }

    function resizeCanvas() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        Env.width = window.innerWidth;
        Env.height = window.innerHeight;
        DOM.canvas.width = Math.round(Env.width * dpr);
        DOM.canvas.height = Math.round(Env.height * dpr);
        DOM.canvas.style.width = `${Env.width}px`;
        DOM.canvas.style.height = `${Env.height}px`;
        DOM.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (mobile !== Env.isMobile) {
            Env.isMobile = mobile;
            if (SPRITES.player) SPRITES.player.src = Env.isMobile ? '../assets/player-mobile.png' : '../assets/player.png';
            
            // Atualiza UI labels baseados no device
            const labels = [
                { el: DOM.score, m: '📱 Dist.: ', d: '🚀 Distância: ' },
                { el: DOM.lives, m: '💖 Vidas: ', d: '❤️ Vidas: ' },
                { el: DOM.level, m: '🌟 Nível: ', d: '⭐ Nível: ' },
                { el: DOM.speed, m: '💨 Vel.: ', d: '⚡ Velocidade: ' },
                { el: DOM.wordProgress, m: '🔤 Pal.: ', d: '📝 Palavra: ' }
            ];
            labels.forEach(({el, m, d}) => { if (el && el.previousSibling) el.previousSibling.textContent = Env.isMobile ? m : d; });
        }

        Env.mobileScale = Env.isMobile ? 0.5 : 1.0;
        Player.width = 150 * Env.mobileScale;
        Player.height = 150 * Env.mobileScale;
        Entities.letters.forEach(l => { l.width = l.height = 40 * Env.mobileScale; });
    }

    // 7. LÓGICA DE SPAWN E ENTIDADES
    function spawnLetter() {
        if (!State.currentWord || State.lettersCollected >= State.currentWord.length) return;
        let l = Pools.letters.pop() || {};
        l.x = Env.cameraX + Env.width + 350 + Math.random() * 100;
        l.y = 70 + Math.random() * (Env.height - 140);
        l.letter = State.currentWord[State.lettersCollected];
        l.width = l.height = 40 * Env.mobileScale;
        l.pulse = Math.random() * Math.PI * 2;
        l.offscreen = false;
        Entities.letters.push(l);
    }

    function spawnEnemy() {
        if (State.totalDistance - State.lastEnemySpawnDistance < CONFIG.SPAWN_DISTANCE_MIN) return;
        if (Entities.enemies.length >= CONFIG.OBSTACLE_MAX) return;

        const def = ENEMY_TYPES.find(d => Math.random() < d.chance) || ENEMY_TYPES[ENEMY_TYPES.length - 1];
        const w = def.width * Env.mobileScale, h = def.height * Env.mobileScale;
        let y, attempts = 0;

        do {
            y = 60 + Math.random() * (Env.height - h - 120);
        } while (++attempts <= 10 && Entities.enemies.some(e => Utils.hitTest(0, e.y, 1, e.height, 0, y, 1, h)));

        let enemy = Pools.enemies.pop() || {};
        Object.assign(enemy, {
            x: State.totalDistance * 10 + Env.width + 400 + Math.random() * 400,
            y, width: w, height: h, hp: def.hp, type: def.type
        });
        Entities.enemies.push(enemy);
        State.lastEnemySpawnDistance = State.totalDistance;
    }

    function createExplosion(x, y, color = '#ffaa00') {
        for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
            let p = Pools.particles.pop() || {};
            Object.assign(p, {
                x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
                life: 40, maxLife: 40, color, size: Math.random() * 4 + 2
            });
            Entities.particles.push(p);
        }
    }

    // 8. ATUALIZAÇÃO DE LÓGICA (UPDATE)
    function update(dt) {
        if (State.gameOver || State.levelComplete) return;

        // Movimento do Player
        if (Player.invulnerable > 0) Player.invulnerable -= dt;
        const speed = Player.speed * dt * 0.4;

        if (Input.keys['ArrowUp'] || Input.keys['KeyW']) Player.y -= speed;
        if (Input.keys['ArrowDown'] || Input.keys['KeyS']) Player.y += speed;
        if (Input.keys['ArrowLeft'] || Input.keys['KeyA']) Player.x -= speed;
        if (Input.keys['ArrowRight'] || Input.keys['KeyD']) Player.x += speed;

        if (Input.touch.active) {
            const dx = Input.touch.x - (Player.x + Player.width / 2);
            const dy = Input.touch.y - (Player.y + Player.height / 2);
            const dist = Math.hypot(dx, dy);
            if (dist > 25) {
                Player.x += (dx / dist) * speed * 0.9;
                Player.y += (dy / dist) * speed * 0.9;
            }
        }
        
        // Clamp do Player na tela
        Player.x = Math.max(0, Math.min(Env.width - Player.width, Player.x));
        Player.y = Math.max(0, Math.min(Env.height - Player.height, Player.y));

        // Scroll e Progresso
        Env.frameCounter += dt;
        if (Env.frameCounter >= CONFIG.METERS_PER_FRAME) {
            State.totalDistance += 1;
            Env.frameCounter = 0;
        }
        Env.cameraX = State.totalDistance * 10;

        if (State.totalDistance >= State.currentTarget && State.lettersCollected >= State.currentWord.length) {
            State.levelComplete = true;
            DOM.completedLevel.textContent = State.level;
            DOM.nextTarget.textContent = State.currentTarget + 100;
            DOM.levelComplete.style.display = 'block';
        }

        // Atualização de Entidades (Usando loop reverso para pooling correto)
        State.enemySpawnTimer += dt * State.gameSpeed * 0.8;
        if (State.enemySpawnTimer >= Math.max(CONFIG.OBSTACLE_SPAWN_MIN, CONFIG.OBSTACLE_SPAWN_BASE - (State.level * 2))) {
            spawnEnemy();
            State.enemySpawnTimer = 0;
        }

        for (let i = Entities.enemies.length - 1; i >= 0; i--) {
            let e = Entities.enemies[i];
            e.x -= (1.5 * State.gameSpeed * dt * 0.16);
            if (e.type === 'kamikaze') e.y += Math.sin(e.x * 0.05) * 2;

            if (e.x < Env.cameraX - CONFIG.ENEMY_OFFSCREEN) {
                Pools.enemies.push(Entities.enemies.splice(i, 1)[0]);
            }
        }

        for (let i = Entities.letters.length - 1; i >= 0; i--) {
            let l = Entities.letters[i];
            l.x -= (1.5 * State.gameSpeed * dt * 0.16);
            
            if (Utils.toScreenX(l.x) < -l.width && !l.offscreen) {
                l.offscreen = true;
                State.missedLetter = true;
                Pools.letters.push(Entities.letters.splice(i, 1)[0]);
            }
        }

        for (let i = Entities.particles.length - 1; i >= 0; i--) {
            let p = Entities.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= dt;
            p.size *= 0.96;
            if (p.life <= 0) {
                Pools.particles.push(Entities.particles.splice(i, 1)[0]);
            }
        }

        Entities.stars.forEach(s => {
            s.x -= s.speed * State.gameSpeed * dt * 0.2;
            if (s.x < Env.cameraX - 100) s.x = Env.cameraX + Env.width + 1000;
        });

        checkCollisions();

        if (Entities.letters.length === 0 && !State.missedLetter && State.lettersCollected < State.currentWord.length) {
            spawnLetter();
        }

        updateUI();
    }

    function checkCollisions() {
        const pX = Player.x + Player.width * 0.2, pY = Player.y + Player.height * 0.2;
        const pW = Player.width * 0.6, pH = Player.height * 0.6;

        if (Player.invulnerable <= 0) {
            for (let i = Entities.enemies.length - 1; i >= 0; i--) {
                let e = Entities.enemies[i];
                let sx = Utils.toScreenX(e.x);
                if (Utils.hitTest(pX, pY, pW, pH, sx + e.width*0.1, e.y + e.height*0.1, e.width*0.8, e.height*0.8)) {
                    State.lives--;
                    Player.invulnerable = 150;
                    createExplosion(Player.x + Player.width/2, Player.y + Player.height/2, '#ff4444');
                    Pools.enemies.push(Entities.enemies.splice(i, 1)[0]);
                    
                    if (State.lives <= 0) {
                        State.gameOver = true;
                        DOM.finalScore.textContent = Math.floor(State.totalDistance);
                        DOM.gameOver.style.display = 'block';
                    }
                    break;
                }
            }
        }

        for (let i = Entities.letters.length - 1; i >= 0; i--) {
            let l = Entities.letters[i];
            let sx = Utils.toScreenX(l.x);
            if (Utils.hitTest(pX, pY, pW, pH, sx, l.y, l.width, l.height)) {
                if (l.letter === State.currentWord[State.lettersCollected]) {
                    State.lettersCollected++;
                    createExplosion(sx + l.width/2, l.y + l.height/2, '#00ff88');
                    Pools.letters.push(Entities.letters.splice(i, 1)[0]);
                }
            }
        }
    }

    function updateUI() {
        DOM.score.textContent = `${Math.floor(State.totalDistance)}/${State.currentTarget}m`;
        DOM.lives.textContent = State.lives;
        DOM.level.textContent = State.level;
        DOM.speed.textContent = `${State.gameSpeed.toFixed(1)}x`;
        const word = State.currentWord || '';
        DOM.wordProgress.textContent = word.split('').map((c, i) => i < State.lettersCollected ? c : '_').join(' ') || '---';
    }

    // 9. RENDERIZAÇÃO (DRAW)
    function draw() {
        DOM.ctx.clearRect(0, 0, Env.width, Env.height);

        if (SPRITES.fundo && SPRITES.fundo.complete) {
            const scale = Math.max(Env.width / SPRITES.fundo.naturalWidth, Env.height / SPRITES.fundo.naturalHeight);
            const w = SPRITES.fundo.naturalWidth * scale;
            const parallax = (Env.cameraX * 0.2) % w;
            DOM.ctx.drawImage(SPRITES.fundo, -parallax, 0, w, SPRITES.fundo.naturalHeight * scale);
            DOM.ctx.drawImage(SPRITES.fundo, w - parallax, 0, w, SPRITES.fundo.naturalHeight * scale);
        }

        DOM.ctx.fillStyle = '#fff';
        Entities.stars.forEach(s => {
            DOM.ctx.globalAlpha = 0.3 + (s.layer * 0.2);
            DOM.ctx.fillRect(Utils.toScreenX(s.x), s.y, s.size, s.size);
        });
        DOM.ctx.globalAlpha = 1;

        Entities.letters.forEach(l => {
            const sx = Utils.toScreenX(l.x);
            l.pulse += 0.1;
            DOM.ctx.fillStyle = `rgba(50, 205, 50, ${0.8 + Math.sin(l.pulse) * 0.2})`;
            DOM.ctx.fillRect(sx, l.y, l.width, l.height);
            DOM.ctx.fillStyle = '#fff';
            DOM.ctx.font = `bold ${Math.floor(20 * Env.mobileScale)}px Arial`;
            DOM.ctx.textAlign = 'center';
            DOM.ctx.textBaseline = 'middle';
            DOM.ctx.fillText(l.letter, sx + l.width / 2, l.y + l.height / 2);
        });

        if (Player.invulnerable % 10 < 5) {
            DOM.ctx.save();
            if (SPRITES.player && SPRITES.player.complete) {
                DOM.ctx.translate(Player.x + Player.width, Player.y);
                DOM.ctx.scale(-1, 1);
                DOM.ctx.drawImage(SPRITES.player, 0, 0, Player.width, Player.height);
            } else {
                DOM.ctx.fillStyle = '#1E90FF';
                DOM.ctx.fillRect(Player.x, Player.y, Player.width, Player.height);
            }
            DOM.ctx.restore();
        }

        Entities.enemies.forEach(e => {
            const sprite = SPRITES[TYPE_TO_SPRITE[e.type]];
            if (sprite && sprite.complete) {
                DOM.ctx.drawImage(sprite, Utils.toScreenX(e.x), e.y, e.width, e.height);
            } else {
                DOM.ctx.fillStyle = '#f00';
                DOM.ctx.fillRect(Utils.toScreenX(e.x), e.y, e.width, e.height);
            }
        });

        Entities.particles.forEach(p => {
            DOM.ctx.fillStyle = p.color;
            DOM.ctx.globalAlpha = p.life / p.maxLife;
            DOM.ctx.fillRect(Utils.toScreenX(p.x), p.y, p.size, p.size);
        });
        DOM.ctx.globalAlpha = 1;
    }

    // 10. GAME LOOP E INICIALIZAÇÃO
    function gameLoop(time) {
        if (Env.imagesLoaded < Env.totalImages) {
            requestAnimationFrame(gameLoop); return;
        }
        const dt = Math.min(20, time - Env.lastTime);
        Env.lastTime = time;

        update(dt);
        draw();
        requestAnimationFrame(gameLoop);
    }

    function initStars() {
        Entities.stars = Array.from({ length: CONFIG.STAR_COUNT }, () => ({
            x: Math.random() * 8000, y: Math.random() * Env.height,
            size: Math.random() * 2.5 + 0.5, speed: Math.random() * 0.3 + 0.05, layer: Math.floor(Math.random() * 3)
        }));
    }

    function setupGame(isRestart = false) {
        Object.assign(State, {
            totalDistance: 0, currentTarget: isRestart ? 100 : State.currentTarget, 
            lives: 3, level: isRestart ? 1 : State.level,
            gameOver: false, levelComplete: false,
            enemySpawnTimer: 0, lastEnemySpawnDistance: -500,
            currentWord: Utils.pickRandomWord(), lettersCollected: 0, missedLetter: false
        });
        
        Env.cameraX = 0;
        Player.x = 50; Player.y = Env.height / 2; Player.invulnerable = 120;
        
        // Devolve tudo pros pools
        Pools.enemies.push(...Entities.enemies.splice(0, Entities.enemies.length));
        Pools.particles.push(...Entities.particles.splice(0, Entities.particles.length));
        Pools.letters.push(...Entities.letters.splice(0, Entities.letters.length));
        
        spawnLetter();
        DOM.gameOver.style.display = 'none';
        DOM.levelComplete.style.display = 'none';
        updateUI();
    }

    // EXPORTAÇÃO PARA O HTML
    window.restartGame = () => setupGame(true);
    window.nextLevel = () => {
        State.level++;
        State.currentTarget += 100;
        State.gameSpeed = Math.min(2.8, 1.0 + (State.level - 1) * 0.15);
        setupGame(false);
    };

    async function init() {
        resizeCanvas();
        let timeout;
        window.addEventListener('resize', () => { clearTimeout(timeout); timeout = setTimeout(resizeCanvas, 100); });
        
        document.addEventListener('keydown', e => Input.keys[e.code] = true);
        document.addEventListener('keyup', e => Input.keys[e.code] = false);
        DOM.canvas.addEventListener('touchstart', e => { Input.touch.active = true; Input.touch.x = e.touches[0].clientX; Input.touch.y = e.touches[0].clientY; }, { passive: false });
        DOM.canvas.addEventListener('touchmove', e => { e.preventDefault(); Input.touch.x = e.touches[0].clientX; Input.touch.y = e.touches[0].clientY; }, { passive: false });
        DOM.canvas.addEventListener('touchend', () => Input.touch.active = false);

        Object.values(SPRITES).forEach(img => {
            if (!img) return; Env.totalImages++;
            if (img.complete && img.naturalWidth > 0) Env.imagesLoaded++;
            else { img.addEventListener('load', () => Env.imagesLoaded++, { once: true }); img.addEventListener('error', () => Env.imagesLoaded++, { once: true }); }
        });

        initStars();
        await loadDictionary();
        setupGame(true);
        requestAnimationFrame(gameLoop);
    }

    init();
})();