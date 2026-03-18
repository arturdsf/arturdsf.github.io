let gameState = {
    currentScene: 'start',
    characters: [],
    tips: 0,
    path: 'neutro',
    visitedScenes: new Set()
};

const scenes = {
    start: {
        // Exemplo de como adicionar a imagem diretamente no texto. Basta colocar o caminho real.
        inlineImage: "../../assets/game2-assets/cena1.png",
        text: `O campo está gelado e o desespero toma conta. O pequeno Quero-Quero sumiu! 
        A mãe, exausta de tanto gritar e voar, não tem mais forças. 
        O pai e os outros dois filhotes seguem a busca, mas o horizonte é vasto demais. 
        Ao longe, vocês avistam vultos conhecidos perto do banhado.`,
        choices: [
            { text: "PEÇA AJUDA À CAPIVARA", next: 'capivaraAjuda', effect: { characters: ['Capivara'] } },
            { text: "IGNORE E SIGA CAMINHO", next: 'start' },
            { text: "PROCURE SOZINHO PELO SEU FILHOTE", next: 'start' }
        ]
    },
    capivaraAjuda: {
        inlineImage: "../../assets/game2-assets/cena2.png",
        text: `A Capivara, sempre generosa, ouve o pranto da família. "Fique aqui, Mamãe Quero-Quero. Nós vamos encontrar seu pequeno!", diz ela. 
        O grupo começa a crescer, mas o rastro ainda é confuso. Um Cavalo pasta logo adiante, relinchando contra o vento frio da geada.`,
        choices: [
            { text: "PERGUNTE AO CAVALO PELO FILHOTE", next: 'cavaloPergunta', effect: { characters: ['Cavalo'] } },
            { text: "NÃO PERGUNTE, SÓ SIGA EM FRENTE", next: 'start' },
            { text: "ESQUEÇA E VOLTE A CASA", next: 'start' }
        ]
    },
    cavaloPergunta: {
        inlineImage: "../../assets/game2-assets/cena3.png",
        text: `O Cavalo bate os cascos, pronto para se abrigar do frio na cocheira. 
        "Não vi o filhote", diz ele, "mas a Jaçanã conhece cada centímetro dessas águas e juncos. Ela pode ter visto algo que eu perdi."`,
        choices: [
            { text: "VÁ ATRÁS DA JAÇANÃ", next: 'jacanaUne', effect: { characters: ['Jaçanã'] } },
            { text: "IGONRE A IDEIA DO CAVALO", next: 'start' },
            { text: "VOLTE PARA CASA COM O GRUPO", next: 'start' }
        ]
    },
    jacanaUne: {
        inlineImage: "../../assets/game2-assets/cena4.png",
        text: `A Jaçanã aceita o desafio na hora: "Comigo é agilidade e ação!". 
        Agora são seis amigos na trilha. De repente, um movimento sinuoso na grama faz todos pararem. 
        A Urutu surge em silêncio mortal, com seu olhar certeiro. O clima fica tenso.`,
        choices: [
            { text: "CONVIDE A URUTU A SE JUNTAR", next: 'urutuConvida', effect: { characters: ['Urutu'] } },
            { text: "NÃO DÊ OUVIDOS À URUTU", next: 'start' },
            { text: "PASSAR RETO", next: 'start' }
        ]
    },
    urutuConvida: {
        inlineImage: "../../assets/game2-assets/cena5.png",
        text: `A Urutu, surpreendentemente sagaz, decide ajudar em vez de atacar. 
        Logo à frente, vocês encontram o Graxaim farejando o solo. 
        Ele teme que culpem sua fama de caçador pelo sumiço do filhote e quer provar sua inocência ajudando na busca.`,
        choices: [
            { text: "CONVIDE O GRAXAIM A SE JUNTAR", next: 'graxaimAjuda', effect: { characters: ['Graxaim'] } }, /* Corrigido de Graxim para Graxaim */
            { text: "SUSPEITE DA COBRA E VÁ EMBORA", next: 'start' },
            { text: "TENTE CAMINHO ALTERNATIVO", next: 'start' }
        ]
    },
    graxaimAjuda: {
        inlineImage: "../../assets/game2-assets/cena6.png",
        text: `O grupo já é grande e a esperança se renova. 
        A Urutu recorda ter ouvido um Carcará rasgando o céu na madrugada. 
        No alto de um galho, o Bem-te-vi agita as asas: "Eu vi! Vi um ninho num pé de Umbu quando o sol nasceu!".`,
        choices: [
            { text: "SIGA A PISTA DO BEM-TE-VI", next: 'bemteviAjuda', effect: { characters: ['Bem-te-vi', 'Carcará'] } },
            { text: "DESISTIR DA BUSCA", next: 'start' },
            { text: "PROCURAR EM OUTRA DIREÇÃO", next: 'start' }
        ]
    },
    bemteviAjuda: {
        inlineImage: "../../assets/game2-assets/cena7.png",
        text: `Diante do imponente pé de Umbu, vocês encontram o Carcará. Ele observa o grupo de dez amigos com respeito. 
        No alto do ninho, um vulto pequeno e trêmulo aparece. O Carcará explica que o protegeu do frio, mas que o mundo exige cautela.`,
        choices: [
            { text: "PEÇA AJUDA AO CARCARÁ", next: 'carcaraFinal', effect: { characters: ['Carcará'] } },
            { text: "NÃO PEÇA AJUDA, SIGA PROCURANDO", next: 'start' },
            { text: "RETORNAR PARA CASA TRISTE", next: 'start' }
        ]
    },



    carcaraFinal: {
        inlineImage: "../../assets/game2-assets/cena8.png",
        text: `Vitória! O Carcará entrega o pequeno aventureiro. O filhote volta para os braços da Mamãe Quero-Quero, que finalmente para de gritar de dor para cantar de alegria. 
        Dez amigos aprenderam que, no campo ou na vida, ninguém caminha sozinho. 
        A união transformou o medo em final feliz sob o céu claro do pampa.`,
        choices: []
    }
};

// Audios
const soundChoiceWrong = new Audio('../../assets/sounds/game2_errorSound.mp3');
const soundGameWin = new Audio('../../assets/sounds/game2_finalConclusion.mp3');

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function initGame() {
    updateDisplay();
}

function updateDisplay() {
    const currentScene = scenes[gameState.currentScene];
    const btnTopLeft = document.getElementById('btn-return-topleft');

    // Arte superior
    document.getElementById('artContainer').style.cssText = currentScene.art || '';
    document.getElementById('artContainer').innerHTML = ``;

    // Texto + Imagem Inline (AQUI OCORRE A MÁGICA DE JUNTAR IMAGEM E TEXTO)
    let storyContent = "";
    if (currentScene.inlineImage) {
        storyContent += `<img src="${currentScene.inlineImage}" class="scene-inline-img" alt="Ilustração da cena">`;
    }
    storyContent += currentScene.text;

    // Substituído textContent por innerHTML para permitir renderizar a tag <img>
    document.getElementById('storyText').innerHTML = storyContent;

    // Escolhas
    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';

    if (currentScene.choices && currentScene.choices.length > 0) {
        if (btnTopLeft) btnTopLeft.style.display = 'block';
        const options = [...currentScene.choices];
        shuffleArray(options);
        options.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.onclick = () => makeChoice(choice);
            choicesContainer.appendChild(btn);
        });
    } else {
        if (btnTopLeft) btnTopLeft.style.display = 'none';

        soundGameWin.currentTime = 0;
        soundGameWin.play().catch(e => console.log(e));

        const congrats = document.createElement('div');
        congrats.className = 'ending';
        congrats.innerHTML = `<img src="../../assets/game4-assets/mae_e_filhote.png" class="scene-inline-img" alt="Mãe e filhote" style="display: block; margin: 0 auto 20px auto;">PARABÉNS, VOCÊ CONCLUIU A HISTÓRIA!`;
        choicesContainer.appendChild(congrats);

        const siteBtn = document.createElement('button');
        siteBtn.className = 'choice-btn';
        siteBtn.textContent = 'Voltar ao site principal';
        siteBtn.onclick = () => {
            window.location.href = '/';
        };
        choicesContainer.appendChild(siteBtn);

        const restartBtnInner = document.createElement('button');
        restartBtnInner.className = 'choice-btn';
        restartBtnInner.textContent = 'Reiniciar jogo';
        restartBtnInner.onclick = restartGame;
        choicesContainer.appendChild(restartBtnInner);
    }
}

function makeChoice(choice) {
    const eff = choice.effect || {};
    if (eff.characters) {
        gameState.characters.push(...eff.characters);
    }
    if (eff.tips) {
        gameState.tips += eff.tips;
    }
    if (eff.path) {
        gameState.path = eff.path;
    }

    if (choice.next === 'start') {
        soundChoiceWrong.currentTime = 0;
        soundChoiceWrong.play().catch(e => console.log(e));

        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.textContent = 'Ops! Essa decisão não levou ao final feliz. Voltando ao início para tentar novamente!';
        document.body.appendChild(messageEl);
        messageEl.style.display = 'block';
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    gameState.currentScene = choice.next;
    gameState.visitedScenes.add(gameState.currentScene);

    document.body.style.opacity = '0.5';
    setTimeout(() => {
        updateDisplay();
        document.body.style.opacity = '1';
    }, 300);
}

function restartGame() {
    gameState = {
        currentScene: 'start',
        characters: [],
        tips: 0,
        path: 'neutro',
        visitedScenes: new Set()
    };
    updateDisplay();
}

window.onload = initGame;
