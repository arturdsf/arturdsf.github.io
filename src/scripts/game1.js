(function(){
    const mapContainer = document.getElementById('map-container');
    const questTextEl = document.getElementById('quest-text');
    const dialogueBox = document.getElementById('dialogue-box');
    const dialogueText = document.getElementById('dialogue-text');

    let worldWidth, worldHeight;
    let envX = 0, envY = 1; 
    let lastTime = 0;
    let keys = {};
    let trail = [];
    const spacing = 15; 
    const minDistance = 3;

    const sequence = ['pai', 'filhote', 'capivara', 'cavalo', 'jacana', 'urutau', 'graxaim', 'carcara', 'filhote_final'];
    let nextIndex = 0;

    const hints = [
        'Fale com o Pai Quero-Quero',
        'Agora fale com o Filhote Quero-Quero',
        'Procure a Capivara',
        'Encontre o Cavalo no bioma gelado',
        'No campo aberto acima está a Jaçanã',
        'Depois volte ao mato e fale com o Urutu',
        'Ache o Graxaim no matagal',
        'Fale com o Carcará',
        'Por fim, converse com o Filhote Quero-Quero.'
    ];

    const npcDefs = [
        {id:'pai',   envX:0,envY:1, localX:300, localY:150, dialog:['Eu sou o Pai Quero-Quero.']},
        {id:'filhote',envX:0,envY:1, localX:240, localY:200, dialog:['Eu sou o Filhote Quero-Quero.']},
        {id:'capivara',envX:0,envY:1, localX:400, localY:300, dialog:['Eu sou a Capivara.']},
        {id:'cavalo',envX:0,envY:0, localX:300, localY:400, dialog:['Relincho.']} ,
        {id:'jacana',envX:1,envY:0, localX:200, localY:200, dialog:['Eu sou a Jaçanã.']},
        {id:'urutau',envX:1,envY:0, localX:400, localY:200, dialog:['UH-UH.']},
        {id:'graxaim',envX:1,envY:1, localX:250, localY:250, dialog:['Grax!']},
        {id:'carcara',envX:1,envY:1, localX:500, localY:250, dialog:['Sou o carcará.']},
        {id:'filhote_final',envX:1,envY:1, localX:550, localY:350, dialog:['Encontrei o filhote!']}
    ];

    let facing = "right";
    const npcs = [];
    let currentDialogNpc = null;
    let dialogIdx = 0;
    const player = {worldX:0, worldY:0, speed:200, el: null};
    let obstacles = [];

    function init(){
        updateDimensions();
        createEnvironments();
        generateObstacles();
        createNPCs();
        createPlayer();
        updateQuest();
        window.addEventListener('keydown', e=>keys[e.code]=true);
        window.addEventListener('keyup', e=>keys[e.code]=false);
        dialogueBox.addEventListener('click', advanceDialogue);
        window.addEventListener('resize', onResize);
        requestAnimationFrame(loop);
    }

    function updateDimensions(){
        worldWidth = window.innerWidth * 2;
        worldHeight = window.innerHeight * 2;
    }

    function createEnvironments(){
        const biomes = [ [1,2], [0,3] ];
        for(let ry=0; ry<2; ry++){
            for(let rx=0; rx<2; rx++){
                const env = document.createElement('div');
                env.classList.add('env','biome-'+biomes[ry][rx]);
                env.style.left = `${rx*100}vw`;
                env.style.top  = `${ry*100}vh`;
                mapContainer.appendChild(env);
            }
        }
        applyContainerTransform();
    }

    function createPlayer(){
        player.worldX = window.innerWidth/2;
        player.worldY = window.innerHeight * 1.5;
        player.el = document.createElement('div');
        player.el.className='player';
        mapContainer.appendChild(player.el);
        for(let i=0; i<1000; i++) trail.push({x: player.worldX, y: player.worldY});
    }

    function createNPCs(){
        npcDefs.forEach(def=>{
            const npc = Object.assign({}, def);
            npc.worldX = def.envX * window.innerWidth + def.localX;
            npc.worldY = def.envY * window.innerHeight + def.localY;
            npc.following = false;
            npc.talked = false;
            npc.el = document.createElement('div');
            npc.el.className='npc';
            npc.el.id = def.id;
            mapContainer.appendChild(npc.el);
            npcs.push(npc);
        });
    }

    function updatePlayer(dt){
        let dx=0, dy=0;
        if(keys['ArrowUp']||keys['KeyW']) dy -= player.speed*dt;
        if(keys['ArrowDown']||keys['KeyS']) dy += player.speed*dt;
        if(keys['ArrowLeft']||keys['KeyA']) { dx -= player.speed*dt; facing = "left"; }
        if(keys['ArrowRight']||keys['KeyD']) { dx += player.speed*dt; facing = "right"; }
        
        if(dx!==0 || dy!==0) {
            attemptMove(dx,dy);
            const lastPos = trail[0];
            const distMoved = Math.hypot(player.worldX - lastPos.x, player.worldY - lastPos.y);
            if (distMoved >= minDistance) {
                trail.unshift({x: player.worldX, y: player.worldY});
                if(trail.length > 1000) trail.pop();
            }
        }
    }

    function attemptMove(dx,dy){
        let nx = player.worldX + dx;
        let ny = player.worldY + dy;
        nx = Math.max(0, Math.min(nx, worldWidth - 50));
        ny = Math.max(0, Math.min(ny, worldHeight - 50));
        
        for(const obs of obstacles){
            if(rectIntersect(nx+10, ny+10, 30, 30, obs.x, obs.y, obs.w, obs.h)) return;
        }
        player.worldX = nx;
        player.worldY = ny;
    }

    function rectIntersect(ax,ay,aw,ah, bx,by,bw,bh){
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function updateFollowers(){
        const followers = npcs.filter(n => n.following);
        followers.forEach((npc, i) => {
            const index = (i + 1) * spacing; 
            if(trail[index]){
                npc.worldX = trail[index].x;
                npc.worldY = trail[index].y;
            }
        });
    }

    function updateNPCElements(){
        npcs.forEach(n => {
        n.el.style.transform = `translate3d(${n.worldX}px, ${n.worldY}px, 0)`;
        
        if(n.following) n.el.classList.add('following');
    });
    }

    function generateObstacles(){
    const playerStartX = window.innerWidth/2;
    const playerStartY = window.innerHeight * 1.5;
    let created = 0;
    
    while(created < 30){
        const ex = Math.floor(Math.random()*2);
        const ey = Math.floor(Math.random()*2);
        const x = ex*window.innerWidth + Math.random()* (window.innerWidth-80);
        const y = ey*window.innerHeight + Math.random()* (window.innerHeight-80);
        const w = 40 + Math.random()*40, h = 40 + Math.random()*40;

        const margin = 100;
        if(Math.abs(x - window.innerWidth) < margin || Math.abs(y - window.innerHeight) < margin) continue;

        const distToPlayer = Math.hypot(x - playerStartX, y - playerStartY);
        let tooCloseNPC = npcDefs.some(n => Math.hypot(x - (n.envX*window.innerWidth+n.localX), y - (n.envY*window.innerHeight+n.localY)) < 120);

        if(distToPlayer > 150 && !tooCloseNPC){
            obstacles.push({x,y,w,h});
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

            el.style.left=x+'px'; el.style.top=y+'px';
            el.style.width=w+'px'; el.style.height=h+'px';
            mapContainer.appendChild(el);
            created++;
        }
    }
}

    function checkCollisions(){
        npcs.forEach(n=>{
            const dist = Math.hypot(player.worldX - n.worldX, player.worldY - n.worldY);
            if(dist < 50 && !n.talked && !dialogueActive){
                startDialogue(n);
            }
        });
    }

    let dialogueActive = false;
    function startDialogue(n){
        dialogueActive = true;
        currentDialogNpc = n;
        dialogIdx = 0;
        dialogueText.textContent = n.dialog[0];
        dialogueBox.style.display='block';
    }

    function advanceDialogue(){
        if(!dialogueActive) return;
        dialogIdx++;
        if(dialogIdx >= currentDialogNpc.dialog.length) endDialogue();
        else dialogueText.textContent = currentDialogNpc.dialog[dialogIdx];
    }

    function endDialogue(){
        dialogueBox.style.display='none';
        dialogueActive=false;
        handleNpcTalk(currentDialogNpc);
        currentDialogNpc.talked = true;
    }

    function handleNpcTalk(n){
        if(sequence[nextIndex] === n.id){
            n.following = true;
            nextIndex++;
            updateQuest();
        } else if(!n.following) {
            resetGame();
        }
    }

    function updateQuest(){
        questTextEl.textContent = hints[nextIndex] || 'Missão cumprida!';
        
        // Aplica o BRILHO no próximo NPC
        npcs.forEach(n => n.el.classList.remove('next-target'));
        const nextId = sequence[nextIndex];
        const nextNpc = npcs.find(n => n.id === nextId);
        if(nextNpc) nextNpc.el.classList.add('next-target');
    }

    function resetGame(){
        player.worldX = window.innerWidth/2;
        player.worldY = window.innerHeight * 1.5;
        envX=0; envY=1;
        applyContainerTransform();
        trail = [];
        for(let i=0; i<1000; i++) trail.push({x: player.worldX, y: player.worldY});
        nextIndex=0;
        npcs.forEach(n=>{
            n.following=false;
            n.talked=false;
            n.worldX = n.envX*window.innerWidth + n.localX;
            n.worldY = n.envY*window.innerHeight + n.localY;
        });
        updateQuest();
    }

    function applyContainerTransform(){
        mapContainer.style.transform = `translate(${-envX*window.innerWidth}px, ${-envY*window.innerHeight}px)`;
        updateArrows();
    }

    function updateArrows(){
        document.querySelectorAll('.arrow').forEach(a => a.style.display = 'none');
        
        if(envX === 0 && envY === 1){ // Campo (Baixo-Esq)
            showArrow('.arrow-up', 'Geada');
            showArrow('.arrow-right', 'Mato');
        } else if(envX === 0 && envY === 0){ // Geada (Cima-Esq)
            showArrow('.arrow-down', 'Campo');
            showArrow('.arrow-right', 'Campo Aberto');
        } else if(envX === 1 && envY === 0){ // Campo Aberto (Cima-Dir)
            showArrow('.arrow-left', 'Geada');
            showArrow('.arrow-down', 'Mato');
        } else if(envX === 1 && envY === 1){ // Mato (Baixo-Dir)
            showArrow('.arrow-left', 'Campo');
            showArrow('.arrow-up', 'Campo Aberto');
        }
    }

    function showArrow(selector, label){
        const el = document.querySelector(selector);
        if(el) {
            el.style.display = 'flex';
            el.querySelector('.label').textContent = label;
        }
    }

    function updateContainer(){
        const newEnvX = Math.floor((player.worldX + 25) / window.innerWidth);
        const newEnvY = Math.floor((player.worldY + 25) / window.innerHeight);
    
        if(newEnvX !== envX || newEnvY !== envY){
            envX = newEnvX;
            envY = newEnvY;
        
            applyContainerTransform();
        }
    }

    function onResize(){
            updateDimensions();
            applyContainerTransform();
    }

    function loop(ts){
        if(!lastTime) lastTime = ts;
        const dt = (ts - lastTime)/1000;
        lastTime = ts;

        if(!dialogueActive){
            updatePlayer(dt);
            updateFollowers();
            checkCollisions();
            updateContainer();
        }

        updateNPCElements();

        if(player.el){
            const scale = facing === "left" ? -1 : 1;
            player.el.style.transform = `translate3d(${player.worldX}px, ${player.worldY}px, 0) scaleX(${scale})`;
        }
    
        requestAnimationFrame(loop);
    }

    init();
})();