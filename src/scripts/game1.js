// new game1 implementation: 2x2 world with ordered NPC conversations
(function(){
    const mapContainer = document.getElementById('map-container');
    const questTextEl = document.getElementById('quest-text');
    const dialogueBox = document.getElementById('dialogue-box');
    const dialogueText = document.getElementById('dialogue-text');

    let worldWidth, worldHeight;
    let envX = 0, envY = 1; // start at lower-left
    let lastTime = 0;
    let keys = {};
    let trail = [];
    const spacing = 60; // px between followers

    const sequence = [
        'pai',
        'filhote',
        'capivara',
        'cavalo',
        'jacana',
        'urutau',
        'graxaim',
        'carcara',
        'filhote_final'
    ];
    let nextIndex = 0;

    const hints = [
        'Fale com o pai quero-quer',
        'Agora fale com o filhote quero-quer',
        'Procure a capivara',
        'Encontre o cavalo no bioma gelado',
        'No campo aberto acima está a jaçanã',
        'Depois volte ao mato e fale com o urutau',
        'Ache o graxaim no matagal',
        'Fale com o carcará',
        'Por fim, converse com o filhote quero-quer final'
    ];

    const npcDefs = [
        {id:'pai',   envX:0,envY:1, localX:300, localY:150, dialog:['Sou o pai quero-quer.']},
        {id:'filhote',envX:0,envY:1, localX:240, localY:200, dialog:['Sou o filhote quero-quer.']},
        {id:'capivara',envX:0,envY:1, localX:400, localY:300, dialog:['Eu sou a capivara.']},
        {id:'cavalo',envX:0,envY:0, localX:300, localY:400, dialog:['Relincho.']} ,
        {id:'jacana',envX:1,envY:0, localX:200, localY:200, dialog:['Sou a jaçanã.']},
        {id:'urutau',envX:1,envY:0, localX:400, localY:200, dialog:['UH-UH.']},
        {id:'graxaim',envX:1,envY:1, localX:250, localY:250, dialog:['Grax!']},
        {id:'carcara',envX:1,envY:1, localX:500, localY:250, dialog:['Sou o carcará.']},
        {id:'filhote_final',envX:1,envY:1, localX:550, localY:350, dialog:['Encontrei o filhote!']}
    ];
    let facing = "right"

    const npcs = [];
    let currentDialogNpc = null;
    let dialogIdx = 0;

    function init(){
        updateDimensions();
        createEnvironments();
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
        // biomes index layout: top-left=1, top-right=2, bottom-left=0, bottom-right=3
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
    }

    const player = {worldX:0, worldY:0, speed:200};

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
        if(keys['ArrowLeft']||keys['KeyA']) {
            dx -= player.speed*dt;
            facing = "left";
        }
        if(keys['ArrowRight']||keys['KeyD']) {
            dx += player.speed*dt;
            facing = "right";
        }
        if(dx===0 && dy===0) return;
        attemptMove(dx,dy);
        trail.unshift({x:player.worldX,y:player.worldY});
        if(trail.length>1000) trail.pop();
    }

    function attemptMove(dx,dy){
        let nx = player.worldX + dx;
        let ny = player.worldY + dy;
        // boundaries
        nx = Math.max(0, Math.min(nx, worldWidth - 1));
        ny = Math.max(0, Math.min(ny, worldHeight - 1));
        // obstacles collision
        for(const obs of obstacles){
            if(rectIntersect(nx-20,ny-20,40,40, obs.x, obs.y, obs.w, obs.h)){
                return; // cancel move if any collision
            }
        }
        player.worldX = nx;
        player.worldY = ny;
    }

    function rectIntersect(ax,ay,aw,ah, bx,by,bw,bh){
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function updateFollowers(){
        const followers = npcs.filter(n=>n.following);
        followers.forEach((npc,i)=>{
            const index = Math.floor((i+1)*spacing);
            if(trail[index]){
                npc.worldX = trail[index].x;
                npc.worldY = trail[index].y;
            }
        });
    }

    function updateNPCElements(){
        npcs.forEach(n=>{
            n.el.style.left = n.worldX + 'px';
            n.el.style.top  = n.worldY + 'px';
            if(n.following) n.el.classList.add('following'); else n.el.classList.remove('following');
        });
    }

    let obstacles = [];
    function generateObstacles(){
        obstacles = [];
        // simple decorative rectangles randomly placed per env
        for(let i=0;i<20;i++){
            const envX = Math.floor(Math.random()*2);
            const envY = Math.floor(Math.random()*2);
            const x = envX*window.innerWidth + Math.random()* (window.innerWidth-60);
            const y = envY*window.innerHeight + Math.random()* (window.innerHeight-60);
            const w = 40 + Math.random()*60;
            const h = 40 + Math.random()*60;
            obstacles.push({x,y,w,h});
            const el = document.createElement('div');
            el.className='obstacle';
            el.style.left=x+'px'; el.style.top=y+'px';
            el.style.width=w+'px'; el.style.height=h+'px';
            mapContainer.appendChild(el);
        }
    }

    function checkCollisions(){
        npcs.forEach(n=>{
            const dist = Math.hypot(player.worldX - n.worldX, player.worldY - n.worldY);
            if(dist < 30 && !n.talked && !dialogueActive){
                startDialogue(n);
            }
        });
    }

    let dialogueActive = false;
    function startDialogue(n){
        dialogueActive = true;
        currentDialogNpc = n;
        dialogIdx = 0;
        showDialogue();
        dialogueBox.style.display='block';
    }

    function showDialogue(){
        if(currentDialogNpc){
            dialogueText.textContent = currentDialogNpc.dialog[dialogIdx] || '';
        }
    }

    function advanceDialogue(){
        if(!dialogueActive) return;
        dialogIdx++;
        if(dialogIdx >= (currentDialogNpc.dialog.length||0)){
            endDialogue();
        } else {
            showDialogue();
        }
    }

    function endDialogue(){
        dialogueBox.style.display='none';
        dialogueActive=false;
        handleNpcTalk(currentDialogNpc);
        currentDialogNpc.talked = true;
        currentDialogNpc = null;
    }

    function handleNpcTalk(n){
        if(sequence[nextIndex] === n.id){
            n.following = true;
            nextIndex++;
            updateQuest();
        } else {
            resetGame();
        }
    }

    function updateQuest(){
        questTextEl.textContent = hints[nextIndex] || 'Missão cumprida!';
    }

    function resetGame(){
        // simple reload brings many initial states back
        // to avoid refresh we reposition everything
        player.worldX = window.innerWidth/2;
        player.worldY = window.innerHeight * 1.5;
        envX=0; envY=1;
        applyContainerTransform();
        trail=[];
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
    }

    function updateContainer(){
        const newEnvX = Math.floor(player.worldX / window.innerWidth);
        const newEnvY = Math.floor(player.worldY / window.innerHeight);
        if(newEnvX!==envX || newEnvY!==envY){
            envX=newEnvX;
            envY=newEnvY;
            applyContainerTransform();
        }
    }

    function onResize(){
        updateDimensions();
        // reposition player and npcs relative to new size
        player.worldX = Math.min(player.worldX, worldWidth-1);
        player.worldY = Math.min(player.worldY, worldHeight-1);
        npcs.forEach(n=>{
            n.worldX = n.envX*window.innerWidth + n.localX;
            n.worldY = n.envY*window.innerHeight + n.localY;
        });
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
            player.el.style.left = player.worldX + 'px';
            player.el.style.top  = player.worldY + 'px';
            player.el.dataset.facing = facing;
        }
        requestAnimationFrame(loop);
    }

    // start
    generateObstacles();
    init();
})();
