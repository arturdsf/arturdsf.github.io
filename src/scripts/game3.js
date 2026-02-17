(function () {
    'use strict';

    // ========== CONFIG (fácil de ajustar) ==========
    const CONFIG = {
        METERS_PER_FRAME: 95,
        SPAWN_DISTANCE_MIN: 8,
        OBSTACLE_MAX: 10,
        BOMBER_TARGET_UPDATE_MS: 400,
        BOMBER_SPEED: 2.2,
        OBSTACLE_SPAWN_BASE: 90,
        OBSTACLE_SPAWN_MIN: 50,
        LETTER_OFFSCREEN: 150,
        ENEMY_OFFSCREEN: 200,
        PARTICLE_COUNT: 25,
        STAR_COUNT: 250,
        DT_60FPS: 1 / 60
    };

    const DICTIONARY = ['NAVE', 'FOGO', 'ESTAR', 'JOGO', 'VIDA', 'FASE', 'METRO', 'NIVEL', 'PONTO', 'MISSÃO', 'ESPACO', 'GUERRA', 'LASER', 'BOMBA', 'ALVO', 'FUGA', 'CORRER', 'VOAR', 'TIRO', 'PODER'];

    const ENEMY_TYPES = [
        { type: 'boss', chance: 0.04, width: 160, height: 120, hp: 4, yOffset: 100, yRange: -320 },
        { type: 'kamikaze', chance: 0.13, width: 70, height: 70, hp: 1 },
        { type: 'shooter', chance: 0.22, width: 120, height: 110, hp: 2 },
        { type: 'fast', chance: 0.42, width: 80, height: 100, hp: 1 },
        { type: 'normal', chance: 1, width: 100, height: 100, hp: 1 }
    ];

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const levelEl = document.getElementById('level');
    const speedEl = document.getElementById('speed');
    const gameOverEl = document.getElementById('gameOver');
    const levelCompleteEl = document.getElementById('levelComplete');
    const finalScoreEl = document.getElementById('finalScore');
    const completedLevelEl = document.getElementById('completedLevel');
    const levelScoreEl = document.getElementById('nextTarget');
    const wordProgressEl = document.getElementById('wordProgress');

    const sprites = {
        player: document.getElementById('player'),
        tronco: document.getElementById('tronco'),
        ventania: document.getElementById('ventania'),
        buraco: document.getElementById('buraco'),
        poca: document.getElementById('poca'),
        gaviao: document.getElementById('gaviao')
    };
    const typeToSpriteId = { normal: 'tronco', fast: 'ventania', boss: 'buraco', kamikaze: 'ventania', shooter: 'poca', bomber: 'gaviao' };
    const bgFundo = document.getElementById('fundo');

    let imagesLoaded = 0;
    let totalImages = 0; // computed dynamically

    let canvasWidth, canvasHeight;
    let cameraX = 0;
    let lastTime = 0;
    let frameCounter = 0;
    let resizeTimeout = null;
    let _cachedGradient = null;
    let _cachedGradientWidth = 0;

    function hitTestRect(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function worldToScreenX(worldX) {
        return canvasWidth - (worldX - cameraX);
    }

    function resizeCanvas() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.round(window.innerWidth * dpr);
        const h = Math.round(window.innerHeight * dpr);
        canvas.width = w;
        canvas.height = h;
        // keep CSS size as device-independent pixels
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        canvasWidth = Math.round(window.innerWidth);
        canvasHeight = Math.round(window.innerHeight);
        // scale drawing operations to account for DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let gameState = {
        totalDistance: 0,
        currentTarget: 100,
        lives: 3,
        level: 1,
        gameOver: false,
        levelComplete: false,
        keys: {},
        enemySpawnTimer: 0,
        spawnInterval: 220,
        survivalTime: 0,
        scrollSpeed: 1.0,
        gameSpeed: 1.0,
        lastEnemySpawnDistance: -500,
        currentWord: '',
        lettersCollected: 0
    };

    const PLAYER_SIZE = 150;
    const player = {
        x: 0,
        y: 0,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        speed: 2.4,
        invulnerable: 0
    };

    let enemies = [];
    let particles = [];
    const particlePool = [];
    let stars = [];
    let bomberTimer = 0;
    let nextBomberTime = 1200;
    let targetMarkers = [];
    let letters = [];
    const letterPool = [];
    const enemyPool = [];
    let nextBomberId = 0;

    function initStars() {
        stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * 8000,
                y: Math.random() * canvasHeight,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 0.3 + 0.05,
                layer: Math.floor(Math.random() * 3)
            });
        }
    }

    function pickRandomWord() {
        const idx = Math.floor(Math.random() * DICTIONARY.length);
        return DICTIONARY[idx];
    }

    function spawnNextLetter() {
        const word = gameState.currentWord;
        const idx = gameState.lettersCollected;
        if (!word || idx >= word.length) return;
        // reuse letter objects from pool when possible
        letters.length = 0; // ensure only one letter at a time
        let l = letterPool.pop();
        if (!l) l = {};
        l.x = cameraX + canvasWidth + 350 + Math.random() * 100;
        l.y = 70 + Math.random() * (canvasHeight - 140);
        l.letter = word[idx];
        l.width = 36;
        l.height = 36;
        l.pulse = Math.random() * Math.PI * 2;
        letters.push(l);
    }

    function initLevelWord() {
        gameState.currentWord = pickRandomWord();
        gameState.lettersCollected = 0;
        spawnNextLetter();
    }

    function imageLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            console.log('Game - sprites carregados');
        }
    }

    function setupSpriteLoad() {
        // collect sprite elements (only those present in the DOM)
        const imgs = [];
        for (const key in sprites) {
            if (Object.prototype.hasOwnProperty.call(sprites, key)) {
                const el = sprites[key];
                if (el) imgs.push({ key, el });
            }
        }
        if (bgFundo) imgs.push({ key: 'fundo', el: bgFundo });

        totalImages = imgs.length;
        imagesLoaded = 0;

        if (totalImages === 0) {
            console.info('setupSpriteLoad: nenhum sprite detectado para carregamento');
            return;
        }

        imgs.forEach(({ key, el }) => {
            try {
                if (el.complete && el.naturalWidth > 0) {
                    imagesLoaded++;
                } else {
                    el.addEventListener('load', () => imageLoaded(), { once: true });
                    el.addEventListener('error', () => {
                        console.warn(`Sprite não encontrado: ${key} -> ${el.src}`);
                        // Try a fallback without accented 'ç' (common filename issue)
                        try {
                            const src = el.src || '';
                            const alt = src.replace(/poça\.png/i, 'poca.png');
                            if (alt !== src) {
                                console.info(`Tentando fallback de sprite: ${alt}`);
                                el.src = alt;
                                return; // wait for next load/error
                            }
                        } catch (e) {
                            // ignore
                        }
                        imageLoaded();
                    }, { once: true });
                }
            } catch (err) {
                console.warn('Erro no setupSpriteLoad para', key, err);
                imageLoaded();
            }
        });
    }

    function spawnEnemyAtDistance(distance) {
        if (distance - gameState.lastEnemySpawnDistance < CONFIG.SPAWN_DISTANCE_MIN) return;
        // avoid creating temporary arrays to count non-bomber enemies
        let nonBomberCount = 0;
        for (let i = 0; i < enemies.length && nonBomberCount < CONFIG.OBSTACLE_MAX; i++) {
            if (enemies[i].type !== 'bomber') nonBomberCount++;
        }
        if (nonBomberCount >= CONFIG.OBSTACLE_MAX) return;

        const rand = Math.random();
        const def = ENEMY_TYPES.find(d => rand < d.chance) || ENEMY_TYPES[ENEMY_TYPES.length - 1];
        let y = 60 + Math.random() * Math.min(Math.max(60, canvasHeight - 320), canvasHeight - def.height - 80);
        if (def.yRange) y = def.yOffset + Math.random() * Math.max(40, canvasHeight + def.yRange);

        // allocate/reuse enemy object from pool
        let enemy = enemyPool.pop();
        if (!enemy) enemy = {};
        enemy.x = distance * 10 + canvasWidth + 400 + Math.random() * 400;
        enemy.y = y;
        enemy.width = def.width;
        enemy.height = def.height;
        enemy.hp = def.hp;
        enemy.maxHp = def.hp;
        enemy.type = def.type;
        enemy.spawnDistance = distance;
        enemy.vx = 0;
        enemy.vy = 0;
        // bombers get an id in spawnBomberAtDistance; non-bombers should not have marker id
        enemy.id = enemy.id || undefined;
        enemy.markerId = -1;
        enemies.push(enemy);
        gameState.lastEnemySpawnDistance = distance;
    }

    function spawnBomberAtDistance(distance) {
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;

        const bomberId = nextBomberId++;
        let bomber = enemyPool.pop();
        if (!bomber) bomber = {};
        bomber.id = bomberId;
        bomber.x = distance * 10 + canvasWidth + 500;
        bomber.y = 80 + Math.random() * (canvasHeight * 0.5);
        bomber.width = 110;
        bomber.height = 110;
        bomber.hp = 1;
        bomber.maxHp = 1;
        bomber.type = 'bomber';
        bomber.spawnDistance = distance;
        bomber.targetX = targetX;
        bomber.targetY = targetY;
        bomber.phase = 'warning';
        bomber.phaseTimer = 0;
        bomber.targetUpdateTimer = 0;
        bomber.markerId = -1;
        bomber.vx = 0;
        bomber.vy = 0;
        enemies.push(bomber);
        createTargetMarker(bomber.targetX - 15, bomber.targetY - 15, bomberId);
        bomber.markerId = targetMarkers.length - 1;
        return bomber;
    }

    function createExplosion(x, y, color = '#ffaa00') {
        const n = CONFIG.PARTICLE_COUNT;
        for (let i = 0; i < n; i++) {
            let p = particlePool.pop();
            if (!p) p = {};
            p.x = x;
            p.y = y;
            p.vx = (Math.random() - 0.5) * 12;
            p.vy = (Math.random() - 0.5) * 12;
            p.life = 40;
            p.maxLife = 40;
            p.color = color;
            p.size = Math.random() * 4 + 2;
            particles.push(p);
        }
    }

    function createTargetMarker(x, y, enemyId) {
        targetMarkers.push({
            x: x,
            y: y,
            enemyId: enemyId,
            pulse: 0,
            size: 30
        });
    }

    window.restartGame = function () {
        gameState = {
            totalDistance: 0,
            currentTarget: 100,
            lives: 3,
            level: 1,
            gameOver: false,
            levelComplete: false,
            keys: {},
            enemySpawnTimer: 0,
            spawnInterval: 220,
            survivalTime: 0,
            scrollSpeed: 1.0,
            gameSpeed: 1.0,
            lastEnemySpawnDistance: -500,
            currentWord: pickRandomWord(),
            lettersCollected: 0
        };
        cameraX = 0;
        frameCounter = 0;
        player.x = canvasWidth - 20 - player.width;
        player.y = canvasHeight / 2 - player.height / 2;
        player.invulnerable = 120;
        // return active particles/letters to pools for reuse
        while (particles.length) particlePool.push(particles.pop());
        while (letters.length) letterPool.push(letters.pop());
        enemies = [];
        targetMarkers = [];
        bomberTimer = 0;
        nextBomberTime = 1200;
        initLevelWord();
        initStars();
        gameOverEl.style.display = 'none';
        levelCompleteEl.style.display = 'none';
        updateUI();
    };

    window.nextLevel = function () {
        gameState.levelComplete = false;
        gameState.totalDistance = 0;
        gameState.level++;
        gameState.currentTarget += 100;
        gameState.gameSpeed = Math.min(2.8, 1.0 + (gameState.level - 1) * 0.18);
        gameState.scrollSpeed = gameState.gameSpeed;
        gameState.lettersCollected = 0;
        gameState.currentWord = pickRandomWord();
        gameState.lastEnemySpawnDistance = -500;
        gameState.enemySpawnTimer = 0;
    enemies = [];
    targetMarkers = [];
    while (particles.length) particlePool.push(particles.pop());
    while (letters.length) letterPool.push(letters.pop());
        bomberTimer = 0;
        nextBomberTime = 1200;
        spawnNextLetter();
        player.invulnerable = 60;
        levelCompleteEl.style.display = 'none';
        updateUI();
    };

    function updatePlayer(deltaTime) {
        if (player.invulnerable > 0) player.invulnerable -= deltaTime;
        const moveSpeed = player.speed * deltaTime * 0.4;
        if (gameState.keys['ArrowUp'] || gameState.keys['KeyW'])
            player.y = Math.max(0, player.y - moveSpeed);
        if (gameState.keys['ArrowDown'] || gameState.keys['KeyS'])
            player.y = Math.min(canvasHeight - player.height, player.y + moveSpeed);
        if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA'])
            player.x = Math.max(20, player.x - moveSpeed);
        if (gameState.keys['ArrowRight'] || gameState.keys['KeyD'])
            player.x = Math.min(canvasWidth - player.width - 20, player.x + moveSpeed);
    }

    function updateMapScroll(deltaTime) {
        frameCounter += deltaTime;
        if (frameCounter >= CONFIG.METERS_PER_FRAME) {
            gameState.totalDistance += 1;
            frameCounter = 0;
        }
        cameraX = gameState.totalDistance * 10;
        updateUI();

        const wordComplete = gameState.currentWord && gameState.lettersCollected >= gameState.currentWord.length;
        const distanceReached = gameState.totalDistance >= gameState.currentTarget;
        if (distanceReached && wordComplete && !gameState.gameOver) {
            gameState.levelComplete = true;
            completedLevelEl.textContent = gameState.level;
            levelScoreEl.textContent = gameState.currentTarget + 100;
            levelCompleteEl.style.display = 'block';
        }
    }

    function updateUI() {
        scoreEl.textContent = `${Math.floor(gameState.totalDistance)}/${gameState.currentTarget}m`;
        livesEl.textContent = gameState.lives;
        levelEl.textContent = gameState.level;
        speedEl.textContent = `${gameState.gameSpeed.toFixed(1)}x`;
        const word = gameState.currentWord || '';
        const collected = gameState.lettersCollected;
        const progress = word.split('').map((c, i) => i < collected ? c : '_').join(' ');
        wordProgressEl.textContent = progress || '---';
    }

    function updateEnemies(deltaTime) {
        gameState.enemySpawnTimer += deltaTime * gameState.gameSpeed * 0.8;
        const baseInterval = CONFIG.OBSTACLE_SPAWN_BASE + (gameState.level - 1) * 8;

        const currentInterval = Math.max(CONFIG.OBSTACLE_SPAWN_MIN, baseInterval - Math.random() * 25);
        if (gameState.enemySpawnTimer >= currentInterval) {
            spawnEnemyAtDistance(gameState.totalDistance);
            gameState.enemySpawnTimer = 0;
        }

        bomberTimer += deltaTime * gameState.gameSpeed * 0.7;
        if (bomberTimer >= nextBomberTime && enemies.length < 5) {
            spawnBomberAtDistance(gameState.totalDistance);
            bomberTimer = 0;
            nextBomberTime = 1100 + Math.random() * 300;
        }

        enemies.forEach(enemy => {
            if (enemy.type === 'bomber') {
                enemy.phaseTimer += deltaTime;
                enemy.targetUpdateTimer = (enemy.targetUpdateTimer || 0) + deltaTime;

                if (enemy.phase === 'warning') {
                    enemy.y += 0.6 * deltaTime * 0.016;
                    if (enemy.y >= enemy.targetY - enemy.height / 2) {
                        enemy.y = enemy.targetY - enemy.height / 2;
                        enemy.phase = 'missile';
                        enemy.phaseTimer = 0;
                    }
                } else if (enemy.phase === 'missile') {
                    if (enemy.targetUpdateTimer >= CONFIG.BOMBER_TARGET_UPDATE_MS) {
                        enemy.targetX = player.x + player.width / 2;
                        enemy.targetY = player.y + player.height / 2;
                        enemy.targetUpdateTimer = 0;
                    }
                    const screenX = worldToScreenX(enemy.x);
                    const dx = enemy.targetX - screenX;
                    const dy = enemy.targetY - (enemy.y + enemy.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 4) {
                        const speed = CONFIG.BOMBER_SPEED * (deltaTime / 16.67);
                        enemy.x -= (dx / dist) * speed;
                        enemy.y += (dy / dist) * speed;
                        enemy.y = Math.max(0, Math.min(canvasHeight - enemy.height, enemy.y));
                    }
                }
            } else {
                enemy.vx = -1.5 * gameState.gameSpeed * deltaTime * 0.016;
                enemy.x += enemy.vx;
                if (Math.random() < 0.03) {
                    enemy.vy = (Math.random() - 0.5) * 0.8 * deltaTime * 0.016;
                    enemy.y += enemy.vy;
                    enemy.y = Math.max(0, Math.min(canvasHeight - enemy.height, enemy.y));
                }
            }
        });

        // compact enemies in-place and return removed ones to pool
        {
            let j = 0;
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                if (enemy.x > cameraX - CONFIG.ENEMY_OFFSCREEN && enemy.hp > 0) {
                    enemies[j++] = enemy;
                } else {
                    enemyPool.push(enemy);
                }
            }
            enemies.length = j;
        }
        // clean target markers referencing missing or dead bombers
        targetMarkers = targetMarkers.filter(marker => {
            const enemy = enemies.find(e => e.id === marker.enemyId);
            return enemy && enemy.hp > 0 && enemy.type === 'bomber';
        });
    }

    function checkCollisions() {
        const px = player.x, py = player.y, pw = player.width, ph = player.height;
        if (player.invulnerable <= 0) {
            for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
                const enemy = enemies[eIdx];
                const screenX = worldToScreenX(enemy.x);
                if (screenX > -enemy.width && screenX < canvasWidth &&
                    hitTestRect(px, py, pw, ph, screenX, enemy.y, enemy.width, enemy.height)) {
                    gameState.lives--;
                    player.invulnerable = 150;
                    createExplosion(cameraX + px + pw / 2, py + ph / 2, '#ff4444');
                    createExplosion(enemy.x, enemy.y, '#ff6600');
                    const removedEnemy = enemies.splice(eIdx, 1)[0];
                    if (removedEnemy) enemyPool.push(removedEnemy);
                    break;
                }
            }
        }

        for (let i = letters.length - 1; i >= 0; i--) {
            const letter = letters[i];
            const screenX = worldToScreenX(letter.x);
            if (screenX > -letter.width && screenX < canvasWidth &&
                hitTestRect(px, py, pw, ph, screenX, letter.y, letter.width, letter.height)) {
                if (letter.letter === gameState.currentWord[gameState.lettersCollected]) {
                    gameState.lettersCollected++;
                    createExplosion(letter.x, letter.y, '#00ff88');
                    const removed = letters.splice(i, 1)[0];
                    if (removed) letterPool.push(removed);
                }
                break;
            }
        }
        // compact letters in-place to avoid extra allocations, and return removed ones to pool
        {
            let j = 0;
            const minX = cameraX - CONFIG.LETTER_OFFSCREEN;
            for (let i = 0; i < letters.length; i++) {
                const l = letters[i];
                if (l.x > minX) {
                    letters[j++] = l;
                } else {
                    letterPool.push(l);
                }
            }
            letters.length = j;
        }
    }

    function ensureNextLetter() {
        const word = gameState.currentWord || '';
        if (letters.length === 0 && gameState.lettersCollected < word.length) {
            spawnNextLetter();
        }
    }

    function updateParticles(deltaTime) {
        // compact particles in-place to avoid allocating a new array each frame
        let j = 0;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx * 0.8 * deltaTime * 0.016;
            p.y += p.vy * 0.8 * deltaTime * 0.016;
            p.life -= deltaTime;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.size *= 0.985;
            if (p.life > 0) {
                particles[j++] = p;
            } else {
                // return to pool for reuse
                particlePool.push(p);
            }
        }
        particles.length = j;
    }

    function updateStars(deltaTime) {
        const parallaxMultiplier = gameState.gameSpeed * 0.3;
        stars.forEach(star => {
            star.x -= star.speed * parallaxMultiplier * deltaTime * 0.016 * (1 + star.layer * 0.2);
            if (star.x < cameraX - 200) {
                star.x = cameraX + canvasWidth * 2 + Math.random() * 1000;
                star.y = Math.random() * canvasHeight;
            }
        });
    }

    function draw() {
        if (bgFundo && bgFundo.complete && bgFundo.naturalWidth > 0) {
            const bw = bgFundo.naturalWidth;
            const bh = bgFundo.naturalHeight;
            const scale = Math.max(canvasWidth / bw, canvasHeight / bh);
            const drawW = bw * scale;
            const drawH = bh * scale;
            const parallax = (cameraX * 0.2) % drawW;
            ctx.drawImage(bgFundo, 0, 0, bw, bh, -parallax, 0, drawW, drawH);
            ctx.drawImage(bgFundo, 0, 0, bw, bh, drawW - parallax, 0, drawW, drawH);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 17, 0.15)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        ctx.fillStyle = '#fff';
        stars.forEach(star => {
            const screenX = worldToScreenX(star.x);
            if (screenX > -15 && screenX < canvasWidth + 15) {
                const alpha = 0.5 + star.layer * 0.25;
                ctx.globalAlpha = alpha;
                ctx.fillRect(screenX, star.y, star.size, star.size);
            }
        });
        ctx.globalAlpha = 1;

        targetMarkers.forEach(marker => {
            marker.pulse += 0.18;
            const scale = 1 + Math.sin(marker.pulse * 2) * 0.15;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.round(42 * scale)}px Arial`;
            ctx.fillStyle = '#f00';
            ctx.shadowColor = '#f00';
            ctx.shadowBlur = 20;
            ctx.fillText('!', marker.x + 15, marker.y + 15);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
            ctx.restore();
        });

        letters.forEach(letter => {
            const screenX = worldToScreenX(letter.x);
            if (screenX > -50 && screenX < canvasWidth + 50) {
                letter.pulse += 0.08;
                const glow = 0.7 + Math.sin(letter.pulse) * 0.2;
                ctx.save();
                ctx.shadowColor = '#0f0';
                ctx.shadowBlur = 15;
                ctx.fillStyle = `rgba(0, 255, 136, ${glow})`;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.fillRect(screenX, letter.y, letter.width, letter.height);
                ctx.strokeRect(screenX, letter.y, letter.width, letter.height);
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 22px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(letter.letter, screenX + letter.width / 2, letter.y + letter.height / 2);
                ctx.textAlign = 'left';
                ctx.restore();
            }
        });

        if (player.invulnerable % 4 < 2 || player.invulnerable === 0) {
            ctx.save();
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 18;
            if (sprites.player && sprites.player.complete && sprites.player.naturalWidth > 0) {
                ctx.translate(player.x + player.width, player.y);
                ctx.scale(-1, 1);
                ctx.translate(-player.width, 0);
                ctx.drawImage(sprites.player, 0, 0, sprites.player.naturalWidth, sprites.player.naturalHeight, 0, 0, player.width, player.height);
            } else {
                ctx.fillStyle = '#0ff';
                ctx.fillRect(player.x, player.y, player.width, player.height);
                ctx.fillStyle = '#fff';
                ctx.fillRect(player.x + 20, player.y + 28, 28, 28);
                ctx.fillRect(player.x + 72, player.y + 44, 20, 20);
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        const enemyColors = {
            boss: '#f0f',
            fast: '#ff4400',
            normal: '#f00',
            kamikaze: '#ffff00',
            shooter: '#00ff88',
            bomber: '#888'
        };

        enemies.forEach(enemy => {
            const screenX = worldToScreenX(enemy.x);
            if (screenX > -120 && screenX < canvasWidth + 50) {
                ctx.save();
                ctx.shadowColor = enemyColors[enemy.type] || '#f00';
                ctx.shadowBlur = 12;
                const spriteKey = typeToSpriteId[enemy.type];
                const sprite = spriteKey ? sprites[spriteKey] : null;
                if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                    ctx.drawImage(sprite, screenX, enemy.y, enemy.width, enemy.height);
                } else {
                    ctx.fillStyle = enemyColors[enemy.type] || '#f00';
                    ctx.fillRect(screenX, enemy.y, enemy.width, enemy.height);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(screenX + 6, enemy.y + 6, 10, 10);
                    ctx.fillRect(screenX + enemy.width - 16, enemy.y + 6, 10, 10);
                }
                ctx.shadowBlur = 0;
                ctx.restore();
                if (enemy.type === 'boss' && enemy.hp < enemy.maxHp) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(screenX, enemy.y - 12, enemy.width, 8);
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(screenX, enemy.y - 12, (enemy.hp / enemy.maxHp) * enemy.width, 8);
                }
            }
        });

        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = p.color;
            ctx.fillRect(worldToScreenX(p.x), p.y, p.size, p.size);
            ctx.restore();
        });

        if (!_cachedGradient || _cachedGradientWidth !== canvasWidth) {
            _cachedGradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
            _cachedGradient.addColorStop(0, 'rgba(0,255,255,0.08)');
            _cachedGradient.addColorStop(1, 'rgba(255,0,255,0.08)');
            _cachedGradientWidth = canvasWidth;
        }
        ctx.fillStyle = _cachedGradient;
        ctx.fillRect(0, 0, canvasWidth, 4);
    }

    function gameLoop(currentTime) {
        if (imagesLoaded < totalImages) {
            requestAnimationFrame(gameLoop);
            return;
        }
        const deltaTime = Math.min(16.67, currentTime - lastTime);
        lastTime = currentTime;

        if (!gameState.gameOver && !gameState.levelComplete) {
            gameState.survivalTime += deltaTime;
            updateMapScroll(deltaTime);
            updatePlayer(deltaTime);
            updateEnemies(deltaTime);
            updateParticles(deltaTime);
            updateStars(deltaTime);
            checkCollisions();
            ensureNextLetter();
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
                finalScoreEl.textContent = Math.floor(gameState.totalDistance);
                gameOverEl.style.display = 'block';
            }
        }
        draw();
        requestAnimationFrame(gameLoop);
    }

    function init() {
        resizeCanvas();
        player.x = canvasWidth - 20 - player.width;
        player.y = canvasHeight / 2 - player.height / 2;
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                resizeCanvas();
                if (gameOverEl.style.display !== 'block' && levelCompleteEl.style.display !== 'block') {
                    player.x = Math.min(player.x, canvasWidth - 20 - player.width);
                    player.y = Math.min(player.y, canvasHeight - player.height);
                }
            }, 120);
        });

        setupSpriteLoad();

        document.addEventListener('keydown', (e) => {
            gameState.keys[e.code] = true;
            if (e.code === 'F11' && !document.fullscreenElement) {
                canvas.requestFullscreen();
            }
        });
        document.addEventListener('keyup', (e) => {
            gameState.keys[e.code] = false;
        });

        initStars();
        initLevelWord();
        requestAnimationFrame(gameLoop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
