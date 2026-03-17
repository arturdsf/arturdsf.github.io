(function () {
    const mapContainer = document.getElementById('map-container');
    const questTextEl = document.getElementById('quest-text');
    const dialogueBox = document.getElementById('dialogue-box');
    const dialogueText = document.getElementById('dialogue-text');

    // Menu logic
    const persistentMenuBtn = document.getElementById('persistent-menu-btn');
    const gameMenuOverlay = document.getElementById('game-menu-overlay');
    const menuTitle = document.getElementById('menu-title');
    const btnContinuar = document.getElementById('btn-continuar');
    const btnReiniciar = document.getElementById('btn-reiniciar');
    const btnVoltarIndex = document.getElementById('btn-voltar-index');

    let worldWidth, worldHeight;
    let envX = 0, envY = 1;
    let lastTime = 0;
    let keys = {};
    let trail = [];
    const spacing = 15;
    const minDistance = 3;
    let isPaused = false;
    let isGameOver = false;

    let playerSize = 50;
    let npcSize = 50;
    let playerSpeed = 200;

    const sequence = ['pai', 'filhote', 'capivara', 'cavalo', 'jacana', 'urutau', 'graxaim', 'carcara', 'filhote_final'];
    let nextIndex = 0;

    const hints = [
        'Fale com a mamãe Quero-Quero',
        'Agora fale com os Filhotes do Quero-Quero',
        'Procure a Capivara',
        'Encontre o Cavalo no bioma gelado',
        'No bioma florestal está a Jaçanã',
        'fale com a Urutu próxima a Jaçana',
        'Ache o Graxaim junto ao Carcará',
        'Fale com o Carcará',
        'Por fim, converse com o Filhote de Quero-Quero que estava perdido.'
    ];

    const npcDefs = [
        { id: 'pai', envX: 0, envY: 1, localX: 300, localY: 150, dialog: ['Eu sou a Mamãe Quero-Quero.'] },
        { id: 'filhote', envX: 0, envY: 1, localX: 240, localY: 200, dialog: ['Somos os filhtes Quero-Quero.'] },
        { id: 'capivara', envX: 0, envY: 1, localX: 400, localY: 300, dialog: ['Eu sou a Capivara.'] },
        { id: 'cavalo', envX: 0, envY: 0, localX: 300, localY: 400, dialog: ['~ Relincho ~ Sou o cavalo.'] },
        { id: 'jacana', envX: 1, envY: 0, localX: 200, localY: 200, dialog: ['Eu sou a Jaçanã.'] },
        { id: 'urutau', envX: 1, envY: 0, localX: 400, localY: 200, dialog: ['Sssz ~ Sou a Urutu.'] },
        { id: 'graxaim', envX: 1, envY: 1, localX: 250, localY: 250, dialog: ['argh ~ Sou o Graxaim.'] },
        { id: 'carcara', envX: 1, envY: 1, localX: 500, localY: 250, dialog: ['Sou o carcará.'] },
        { id: 'filhote_final', envX: 1, envY: 1, localX: 550, localY: 350, dialog: ['ME ENCONTROUU!'] }
    ];

    let facing = "right";
    const npcs = [];
    let currentDialogNpc = null;
    let dialogIdx = 0;
    const player = { worldX: 0, worldY: 0, speed: playerSpeed, el: null };
    let obstacles = [];

    // Audios
    const soundCorrect = new Audio('../assets/sounds/game1_soundOfcolectedNPC.mp3');
    const soundWrong = new Audio('../assets/sounds/game1_errorSound.mp3');

    function init() {
        updateDimensions();
        createEnvironments();
        generateObstacles();
        createNPCs();
        createPlayer();
        initJoystick();
        initMenu();
        updateQuest();
        window.addEventListener('keydown', e => keys[e.code] = true);
        window.addEventListener('keyup', e => keys[e.code] = false);
        dialogueBox.addEventListener('click', advanceDialogue);
        window.addEventListener('resize', onResize);
        requestAnimationFrame(loop);
    }

    function initMenu() {
        persistentMenuBtn.addEventListener('click', () => {
            if (!isGameOver) openMenu('Pausado');
        });

        btnContinuar.addEventListener('click', () => {
            closeMenu();
        });

        btnReiniciar.addEventListener('click', () => {
            closeMenu();
            resetGame();
        });

        btnVoltarIndex.addEventListener('click', () => {
            window.location.href = '../pages/index.html';
        });
    }

    function openMenu(title) {
        isPaused = true;
        menuTitle.textContent = title;
        if (isGameOver) {
            btnContinuar.style.display = 'none';
        } else {
            btnContinuar.style.display = 'block';
        }
        gameMenuOverlay.style.display = 'flex';
    }

    function closeMenu() {
        isPaused = false;
        gameMenuOverlay.style.display = 'none';
    }

    function updateDimensions() {
        worldWidth = window.innerWidth * 2;
        worldHeight = window.innerHeight * 2;
        if (window.innerWidth <= 480) {
            playerSize = 35;
            npcSize = 35;
            playerSpeed = 150;
        } else if (window.innerWidth <= 768) {
            playerSize = 40;
            npcSize = 40;
            playerSpeed = 180;
        } else {
            playerSize = 50;
            npcSize = 50;
            playerSpeed = 200;
        }
        player.speed = playerSpeed;
    }

    function createEnvironments() {
        const biomes = [[1, 2], [0, 3]];
        for (let ry = 0; ry < 2; ry++) {
            for (let rx = 0; rx < 2; rx++) {
                const env = document.createElement('div');
                env.classList.add('env', 'biome-' + biomes[ry][rx]);
                env.style.left = `${rx * 100}vw`;
                env.style.top = `${ry * 100}vh`;
                mapContainer.appendChild(env);
            }
        }
        applyContainerTransform();
    }

    function createPlayer() {
        player.worldX = window.innerWidth / 2;
        player.worldY = window.innerHeight * 1.5;
        player.el = document.createElement('div');
        player.el.className = 'player';
        mapContainer.appendChild(player.el);
        for (let i = 0; i < 1000; i++) trail.push({ x: player.worldX, y: player.worldY });
    }

    function createNPCs() {
        npcDefs.forEach(def => {
            const npc = Object.assign({}, def);
            const pctX = def.localX / 1000;
            const pctY = def.localY / 800;
            npc.worldX = def.envX * window.innerWidth + (pctX * window.innerWidth);
            npc.worldY = def.envY * window.innerHeight + (pctY * window.innerHeight);
            npc.following = false;
            npc.talked = false;
            npc.el = document.createElement('div');
            npc.el.className = 'npc';
            npc.el.id = def.id;
            mapContainer.appendChild(npc.el);
            npcs.push(npc);
        });
    }

    function updatePlayer(dt) {
        let dx = 0, dy = 0;

        if (keys['ArrowUp'] || keys['KeyW']) dy -= player.speed * dt;
        if (keys['ArrowDown'] || keys['KeyS']) dy += player.speed * dt;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= player.speed * dt;
        if (keys['ArrowRight'] || keys['KeyD']) dx += player.speed * dt;

        if (joystick.active) {
            dx += joystick.x * player.speed * dt;
            dy += joystick.y * player.speed * dt;
        }

        if (dx < -0.1) facing = "left";
        else if (dx > 0.1) facing = "right";

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            attemptMove(dx, dy);

            const lastPos = trail[0];
            const distMoved = Math.hypot(player.worldX - lastPos.x, player.worldY - lastPos.y);

            if (distMoved >= minDistance) {
                trail.unshift({ x: player.worldX, y: player.worldY });
                if (trail.length > 1000) trail.pop();
            }
        }
    }

    function attemptMove(dx, dy) {
        let nx = player.worldX + dx;
        let ny = player.worldY + dy;
        nx = Math.max(0, Math.min(nx, worldWidth - playerSize));
        ny = Math.max(0, Math.min(ny, worldHeight - playerSize));

        for (const obs of obstacles) {
            if (rectIntersect(nx + 10, ny + 10, playerSize - 20, playerSize - 20, obs.x, obs.y, obs.w, obs.h)) return;
        }
        player.worldX = nx;
        player.worldY = ny;
    }

    function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function updateFollowers() {
        const followers = npcs.filter(n => n.following);
        followers.forEach((npc, i) => {
            const index = (i + 1) * spacing;
            if (trail[index]) {
                npc.worldX = trail[index].x;
                npc.worldY = trail[index].y;
            }
        });
    }

    function updateNPCElements() {
        npcs.forEach(n => {
            n.el.style.transform = `translate3d(${n.worldX}px, ${n.worldY}px, 0)`;
            if (n.following) n.el.classList.add('following');
        });
    }

    function generateObstacles() {
        const playerStartX = window.innerWidth / 2;
        const playerStartY = window.innerHeight * 1.5;
        let created = 0;

        while (created < 30) {
            const ex = Math.floor(Math.random() * 2);
            const ey = Math.floor(Math.random() * 2);
            const x = ex * window.innerWidth + Math.random() * (window.innerWidth - 80);
            const y = ey * window.innerHeight + Math.random() * (window.innerHeight - 80);
            const w = 40 + Math.random() * 40, h = 40 + Math.random() * 40;

            const margin = 100;
            if (Math.abs(x - window.innerWidth) < margin || Math.abs(y - window.innerHeight) < margin) continue;

            const distToPlayer = Math.hypot(x - playerStartX, y - playerStartY);
            let tooCloseNPC = npcDefs.some(n => Math.hypot(x - (n.envX * window.innerWidth + n.localX), y - (n.envY * window.innerHeight + n.localY)) < 120);

            if (distToPlayer > 150 && !tooCloseNPC) {
                const el = document.createElement('div');
                el.className = 'obstacle';

                if (ex === 0 && ey === 0) {
                    el.classList.add('obs-pedra');
                } else if (ex === 1 && ey === 0) {
                    el.classList.add('obs-arbusto');
                } else if (ex === 1 && ey === 1) {
                    el.classList.add('obs-graveto');
                } else {
                    const tipos = ['obs-pedra', 'obs-arbusto', 'obs-graveto'];
                    const sorteio = tipos[Math.floor(Math.random() * tipos.length)];
                    el.classList.add(sorteio);
                }

                // CORREÇÃO: Salva o elemento HTML dentro do objeto do obstáculo
                obstacles.push({ x, y, w, h, el: el });

                el.style.width = w + 'px'; el.style.height = h + 'px';
                el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                mapContainer.appendChild(el);
                created++;
            }
        }
    }

    function checkCollisions() {
        npcs.forEach(n => {
            const dist = Math.hypot(player.worldX - n.worldX, player.worldY - n.worldY);
            if (dist < (playerSize + npcSize) / 2 && !n.talked && !dialogueActive) {
                startDialogue(n);
            }
        });
    }

    let dialogueActive = false;
    function startDialogue(n) {
        dialogueActive = true;
        currentDialogNpc = n;
        dialogIdx = 0;
        dialogueText.textContent = n.dialog[0];
        dialogueBox.style.display = 'block';
    }

    function advanceDialogue() {
        if (!dialogueActive) return;
        dialogIdx++;
        if (dialogIdx >= currentDialogNpc.dialog.length) endDialogue();
        else dialogueText.textContent = currentDialogNpc.dialog[dialogIdx];
    }

    function endDialogue() {
        dialogueBox.style.display = 'none';
        dialogueActive = false;
        handleNpcTalk(currentDialogNpc);
        currentDialogNpc.talked = true;
    }

    function handleNpcTalk(n) {
        if (sequence[nextIndex] === n.id) {
            // Correto
            soundCorrect.currentTime = 0;
            soundCorrect.play().catch(e => console.log(e));

            n.following = true;
            nextIndex++;
            updateQuest();
        } else if (!n.following) {
            // Errado
            soundWrong.currentTime = 0;
            soundWrong.play().catch(e => console.log(e));
            resetGame();
        }
    }

    function updateQuest() {
        questTextEl.textContent = hints[nextIndex] || 'Missão cumprida!';

        npcs.forEach(n => n.el.classList.remove('next-target'));
        const nextId = sequence[nextIndex];

        if (nextIndex >= sequence.length) {
            // Jogo concluído
            isGameOver = true;
            openMenu('Missão Cumprida!');
            return;
        }

        const nextNpc = npcs.find(n => n.id === nextId);
        if (nextNpc) nextNpc.el.classList.add('next-target');
    }

    function resetGame() {
        isGameOver = false;
        player.worldX = window.innerWidth / 2;
        player.worldY = window.innerHeight * 1.5;
        envX = 0; envY = 1;
        applyContainerTransform();
        trail = [];
        for (let i = 0; i < 1000; i++) trail.push({ x: player.worldX, y: player.worldY });
        nextIndex = 0;
        npcs.forEach(n => {
            n.following = false;
            n.talked = false;
            n.worldX = n.envX * window.innerWidth + n.localX;
            n.worldY = n.envY * window.innerHeight + n.localY;
        });
        updateQuest();
    }

    function applyContainerTransform() {
        mapContainer.style.transform = `translate3d(${-envX * window.innerWidth}px, ${-envY * window.innerHeight}px, 0)`;
        updateArrows();
    }

    function updateArrows() {
        document.querySelectorAll('.arrow').forEach(a => a.style.display = 'none');

        if (envX === 0 && envY === 1) {
            showArrow('.arrow-up', 'Geada');
            showArrow('.arrow-right', 'Campo');
        } else if (envX === 0 && envY === 0) {
            showArrow('.arrow-down', 'Campo Aberto');
            showArrow('.arrow-right', 'Mato');
        } else if (envX === 1 && envY === 0) {
            showArrow('.arrow-left', 'Geada');
            showArrow('.arrow-down', 'Campo');
        } else if (envX === 1 && envY === 1) {
            showArrow('.arrow-left', 'Campo Aberto');
            showArrow('.arrow-up', 'Mato');
        }
    }

    function showArrow(selector, label) {
        const el = document.querySelector(selector);
        if (el) {
            el.style.display = 'flex';
            el.querySelector('.label').textContent = label;
        }
    }

    function updateContainer() {
        const newEnvX = Math.floor((player.worldX + 25) / window.innerWidth);
        const newEnvY = Math.floor((player.worldY + 25) / window.innerHeight);

        if (newEnvX !== envX || newEnvY !== envY) {
            envX = newEnvX;
            envY = newEnvY;
            applyContainerTransform();
        }
    }

    function onResize() {
        const oldW = worldWidth / 2;
        const oldH = worldHeight / 2;

        updateDimensions();

        const newW = window.innerWidth;
        const newH = window.innerHeight;

        const scaleX = newW / oldW;
        const scaleY = newH / oldH;

        player.worldX *= scaleX;
        player.worldY *= scaleY;

        trail.forEach(pt => {
            pt.x *= scaleX;
            pt.y *= scaleY;
        });

        npcs.forEach(n => {
            const def = npcDefs.find(d => d.id === n.id);
            const pctX = def.localX / 1000;
            const pctY = def.localY / 800;

            n.worldX = n.envX * newW + (pctX * newW);
            n.worldY = n.envY * newH + (pctY * newH);
        });

        obstacles.forEach(obs => {
            obs.x *= scaleX;
            obs.y *= scaleY;
            obs.el.style.transform = `translate3d(${obs.x}px, ${obs.y}px, 0)`;
        });

        applyContainerTransform();
    }

    function loop(ts) {
        if (!lastTime) lastTime = ts;
        const dt = (ts - lastTime) / 1000;
        lastTime = ts;

        if (!dialogueActive && !isPaused && !isGameOver) {
            updatePlayer(dt);
            updateFollowers();
            checkCollisions();
            updateContainer();
        }

        updateNPCElements();

        if (player.el) {
            const scale = facing === "left" ? -1 : 1;
            player.el.style.transform = `translate3d(${player.worldX}px, ${player.worldY}px, 0) scaleX(${scale})`;
        }

        requestAnimationFrame(loop);
    }

    // --- LÓGICA DO JOYSTICK ---

    let joystick = { x: 0, y: 0, active: false };
    let stickEl, baseEl, zoneEl;

    function initJoystick() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!isTouch) return;

        document.body.classList.add('is-touch');
        zoneEl = document.getElementById('joystick-zone');
        baseEl = document.getElementById('joystick-base');
        stickEl = document.getElementById('joystick-stick');

        zoneEl.style.display = 'block';

        let centerX, centerY;
        const maxDist = 40;

        zoneEl.addEventListener('touchstart', e => {
            e.preventDefault();
            const rect = baseEl.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            joystick.active = true;
            updateStick(e.touches[0]);
        }, { passive: false });

        zoneEl.addEventListener('touchmove', e => {
            e.preventDefault();
            if (joystick.active) updateStick(e.touches[0]);
        }, { passive: false });

        zoneEl.addEventListener('touchend', e => {
            e.preventDefault();
            joystick.active = false;
            joystick.x = 0;
            joystick.y = 0;
            stickEl.style.transform = `translate(0px, 0px)`;
        });

        function updateStick(touch) {
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            let dist = Math.hypot(dx, dy);

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            stickEl.style.transform = `translate(${dx}px, ${dy}px)`;

            joystick.x = dx / maxDist;
            joystick.y = dy / maxDist;
        }

        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log("Não foi possível forçar a rotação automaticamente (requer tela cheia).");
            });
        }
    }

    init();
})();
