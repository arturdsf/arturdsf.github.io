/* Configuração para identificar o tipo de dispositivo */

const UIManager = {
  isTouchDevice: false,
  deviceType: 'desktop',

  init() {
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    
    const width = window.innerWidth
    if (this.isTouchDevice) {
      this.deviceType = width > 1024 ? 'tablet' : 'mobile'
    } else {
      this.deviceType = 'desktop'
    }

    this.applyInterface()
  },

  applyInterface() {
    const mobileUI = document.getElementById('mobile-controls');
    const desktopInstructions = document.querySelectorAll('.controls-list');

    if (!mobileUI) return;

    if (this.isTouchDevice) {
        mobileUI.style.display = 'flex';
        desktopInstructions.forEach(el => el.style.display = 'none'); 
        console.log("[UI] Modo Touch: Escondendo instruções de teclado.");
    } else {
        mobileUI.style.display = 'none';
        desktopInstructions.forEach(el => el.style.display = 'block');
        console.log("[UI] Modo Desktop: Mostrando instruções de teclado.");
    }
  }
}

const ROWS = 25
const COLS = 40
const TILE_SIZE = 80

let player = {
  x: 14,
  y: 15,
  friends: 0,
  followers: 0
}

let facing = "right"
let pauseGame = true
let activeInterval = null

const soundGame4Win = new Audio('../assets/sounds/game4_SoundOfConclusion.mp3');
const soundGame4Err = new Audio('../assets/sounds/game4_error.mp3');

// --- SISTEMA DE PRELOAD ---
function preloadGameAssets() {
  console.log("[Core] Inicializando buffer de assets...");
  
  const imageAssets = [
    "../assets/player.png",
    "../assets/game4-assets/ceu.png",
    "../assets/game4-assets/mold_forest.png",
    "../assets/game4-assets/grass3-1.png",
    "../assets/game4-assets/grass3-2.png",
    "../assets/game4-assets/dirt-1.png",
    "../assets/game4-assets/dirt-2.png",
    "../assets/game4-assets/catch_bg.png",
    "../assets/game4-assets/moita.png"
  ];

  Object.values(minigameConfig).forEach(conf => {
    if(conf.img) imageAssets.push(conf.img);
  });

  Object.values(GameDialogues).forEach(sequence => {
    sequence.forEach(line => {
      if(line.portrait) imageAssets.push(line.portrait);
    });
  });

  const uniqueImages = [...new Set(imageAssets)];

  uniqueImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  soundGame4Win.load();
  soundGame4Err.load();

  console.log(`[Core] ${uniqueImages.length} texturas e 2 áudios cacheados com sucesso.`);
}

const map = [
  "WWWWWWWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWaftfafafafafafafafaAA",
  "WWWWWWWWWWWWWWWWW,.,.Yc,.,.,.,.,.,.,.fAA",
  "WWWWWWWWWWWWWWW.,P,.,TYTYTYTYTY.,.,.,aAA",
  "WWWWWWWWWWWWWW.,.,.,.,.,.,.,.,T,.,o,.fAA",
  "WWWWYTY.,.p.,.,.,.,.,q,.,.,.,.Y.,.,.,aAA",
  "WW.,.Y.,.,.,.,.,.,.,.,.,.,.,.,T,.,.,.fAA",
  "WAf.,T,.,.,.,.,.,.,.,.,.,.,.,.Y.,.,.,aAA",
  "WAa,.YT,.,.,.M.,.,.,.,.,.,.,.,T,.,.,.fAA",
  "AAf.,.YTYTYTYTYTYTYTYTYTYTYTYTY.,.,.,aAA",
  "AAa,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.fAA",
  "AAf.,.,.,C,.,.,.,.,.,.,.,.,.,.,.,.,.,aAA",
  "AAa,.,.,.,.,.,.,.,.,.TYTY,.,.,.,.,.,.fAA",
  "AAf.,.,.,.,.,.,.,.,.,Y,.T.,.m.,.,.,.,aAA",
  "AAa,.,.,.,.,.,.,.,.,.T.,Y,.,.,.,.,.,.fAA",
  "AAf.,.,.,.,.,.,.,.,.,Y,.T.,.,.,.,.,.,aAA",
  "AAa,.,.,.,.,.,.,.O.,.T.,Y,.,.,.,.,.,afAA",
  "AAfaf.,.,.,.,.,.,.,.,Y,.T.,.,.,.,.fafAAA",
  "AAAfafafa,.,.,.,.,.,.T.,Q,.,afafafAAAAAA",
  "AAAAAafafafafafafafaftfafafafaAAAAAAAAAA",
  "AAAAAAAAAfafafafafafatafafaAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
]

const moldes = {
  'W': createMold('water'),
  'A': createMold('tree'),
  'a': createMold('grass-tree'),
  'f': createMold('grass-tree2'),
  '.': createMold('grass'),
  ',': createMold('grass2'),
  'T': createMold('dirt'),
  'Y': createMold('dirt2'),
  't': createMold('dirt-block'),

  'P': createMold('grass sprite-P'), 
  'p': createMold('grass sprite-p'),
  'M': createMold('grass sprite-M'),
  'm': createMold('grass sprite-m'),
  'O': createMold('grass sprite-O'),
  'o': createMold('grass sprite-o'),
  'C': createMold('grass sprite-C'),
  'c': createMold('grass sprite-c'),
  'Q': createMold('grass sprite-Q'),
  'q': createMold('grass sprite-q')
}

const characterData = {
  'O': { name: "Mamãe Quero-Quero", action: "Fale com a " },
  'Q': { name: "Filhotes", action: "Fale com os " },
  'm': { name: "Capivara", action: "Fale com a " },
  'P': { name: "Cavalo", action: "Fale com o " },
  'M': { name: "Jaçanã", action: "Fale com a " },
  'o': { name: "Urutu", action: "Fale com o " },
  'C': { name: "Graxaim", action: "Fale com o " },
  'p': { name: "Bem-te-vi", action: "Fale com o" },
  'q': { name: "Carcará", action: "Fale com o " },
  'c': { name: "Filhote", action: "Resgate o " }
}

const storyOrder = ['O', 'Q', 'm', 'P', 'M', 'o', 'C', 'p', 'q', 'c']
let currentStep = 0

const minigameConfig = {
  // Jogo da Memória
  'P': { title: "Memória do Cavalo", desc: "Ache os pares.", assets: ['🐴','🐴','🍎','🍎','🥕','🥕'] },
  'p': { title: "Memória do Bem-te-vi", desc: "Ache os pares.", assets: ['🐦','🐦','🐛','🐛','🍒','🍒'] },
  'M': { title: "Memória da Jaçanã", desc: "Ache os pares.!", assets: ['🦆','🦆','🐟','🐟','🐸','🐸'] },
  'm': { title: "Memória da Capivara", desc: "Ache os pares.", assets: ['🦦','🦦','🍉','🍉','🌿','🌿'] },
  
  // Pega-pega
  'C': { title: "Cadê o Graxaim?", desc: "Clique no Graxaim antes do tempo acabar.", target: "🦊" },
  'c': { title: "Vem, Filhote!", desc: "Encontre o filhote perdido!", target: "🐶" },
  
  // Quebra-cabeça
  'O': {
    title: "A Mamãe Quero-Quero",
    desc: "Monte o Quebra-cabeça!",
    img: "../assets/game4-assets/mae_e_filhote.png",
    bookPage: "Página 29"
  },
  'o': {
    title: "O ataque do Urutu!",
    desc: "Monte o Quebra-cabeça!",
    img: "../assets/game4-assets/urutu_attack.png",
    bookPage: "Página 15"
  },
  'Q': {
    title: "O papai chegou",
    desc: "Monte o Quebra-cabeça!",
    img: "../assets/game4-assets/chegada_do_pai.png",
    bookPage: "Página 6"
  },
  'q': {
    title: "Deixe-o observar...",
    desc: "Monte o Quebra-cabeça!",
    img: "../assets/game4-assets/carcara_watching.png",
    bookPage: "Página 41 \"Fim\""
  }
}

const GameDialogues = {
  // Diálogos de interação
  'O': [
    {
      name: "Mamãe Quero-Quero",
      text: "Quero-Quero meu filhinho, apareça ligeirinho!",
      portrait: "../assets/maequeroquero_scream.png"
    }
  ],
  
  'Q': [
    {
      name: "Filhotes",
      text: "Papai, cadê o nosso maninho?",
      portrait: "../assets/filhotes_static.png"
    }
  ],

  'm': [
    {
      name: "Pai Quero-Quero",
      text: "Olá Capivara, minha amiga.",
      portrait: "../assets/paiqueroquero_static.png"
    },
    {
      name: "Pai Quero-Quero",
      text: "O meu filhote desapareceu, não consigo encontrar ele.",
      portrait: "../assets/paiqueroquero_static.png"
    }
  ],

  'P': [
    {
      name: "Capivara",
      text: "Meu amigo Cavalo",
      portrait: "../assets/capivara_walking.png"
    },
    {
      name: "Capivara",
      text: "Um filhote de Quero-Quero sumiu esta manhã, você viu ele?",
      portrait: "../assets/capivara_static.png"
    }
  ],

  'M': [
    {
      name: "Jaçanã",
      text: "Eu irei junto e o encontraremos já!",
      portrait: "../assets/jacana_static.png"
    }
  ],

  'o': [
    {
      name: "Urutu",
      text: "shhhh",
      portrait: "../assets/urutu_walking.png"
    },
    {
      name: "Jaçanã",
      text: "Calma aí!\nNão queremos te machucar!",
      portrait: "../assets/jacana_static.png"
    },
    {
      name: "Urutu",
      text: "Claro que não era para vocês. Mas, o que causa os tanto alvoroço?",
      portrait: "../assets/urutu_static.png"
    }
  ],

  'C': [
    {
      name: "Pai Quero-Quero",
      text: "Graxaim, você viu um filhote de Quero-Quero passar por aqui?",
      portrait: "../assets/paiqueroquero_flying_inv.png"
    }
  ],

  'p': [
    {
      name: "Urutu",
      text: "Lembro de ter ouvido um Carcará passar por aqui esta noite.",
      portrait: "../assets/urutu_walking.png"
    },
    {
      name: "Urutu",
      text: "Acho que o Bem-te-vi pode ter visto alguma coisa.\nQuem sabe o Carcará não contribua?",
      portrait: "../assets/urutu_static.png"
    }
  ],

  'q': [
    {
      name: "Capivara",
      text: "Carcará!\nAqui venho lhe explicar.",
      portrait: "../assets/capivara_walking.png"
    },
    {
      name: "Capivara",
      text: "Estes pobres Quero-Queros estão procurando seu filhote perdido\nVocê pode nos ajudar a encontrar o coitadinho?",
      portrait: "../assets/capivara_static.png"
    }
  ],

  // Diálogos de vitória
  'O_win': [
    {
      name: "Mamãe Quero-Quero",
      text: "Eu não tenho forças para caminhar, o nosso filhote você precisa encontrar!",
      portrait: "../assets/maequeroquero_scream.png" }
  ],

  'Q_win': [
    {
      name: "Pai Quero-Quero",
      text: "Vamos procurar eles.",
      portrait: "../assets/paiqueroquero_static.png"
    }
  ],

  'm_win': [
    {
      name: "Capivara",
      text: "Eu vou ajudar.",
      portrait: "../assets/capivara_static.png"
    },
    {
      name: "Capivara",
      text: "Mamãe Quero-Quero, pode esperar, logo logo o seu filhote irá voltar.",
      portrait: "../assets/capivara_static.png"
    }
  ],

  'P_win': [
    {
      name: "Cavalo",
      text: "Eu não vi nada, não.\nMas, que tal perguntar para a Jaçanã?",
      portrait: "../assets/capivara_static.png"
    }
  ],

  'o_win': [
    {
      name: "Capivara",
      text: "Você viu um filhote de Quero-Quero passar por aí?",
      portrait: "../assets/capivara_static.png"
    },
    {
      name: "Urutu",
      text: "Não vi nada não...\nMas vou com vocês ajudar.",
      portrait: "../assets/urutu_static.png"
    }
  ],

  'C_win': [
    {
      name: "Graxaim",
      text: "(Eles vão achar que a fui eu...)",
      portrait: "../assets/graxaim_static.png"
    },
    {
      name: "Graxaim",
      text: "Claro que eu ajudo\nAntes da noite este filhote estará no seu ninho",
      portrait: "../assets/graxaim_walking.png"
    }
  ],

  'p_win': [
    {
      name: "Bem-te-vi",
      text: "Eu acho que posso indicar\nLembro que vi um ninho naquele pé de umbu antes do sol começar a despencar.",
      portrait: "../assets/bemtevi_flying.png"
    }
  ],

  'q_win': [
    {
      name: "Carcará",
      text: "Que coincidência, minha amiga!\nUm filhote de Quero-Quero chegou aqui e me viu\nEle estava perdido, com medo e com frio.",
      portrait: "../assets/carcara_static.png"
    },
    {
      name: "Carcará",
      text: "Venha, suba e pegue teu filhote, tudo que eu falei era verdade, então me mantenha longe dos holofotes!",
      portrait: "../assets/carcara_static.png"
    },
    {
      name: "Carcará",
      text: "Estou preocupado com os meus, então vocês aí embaixo, tomem conta dos seus!",
      portrait: "../assets/carcara_static.png"
    }
  ],

  // Eventos aleatórios
  'intro_game': [
    {
      name: "",
      text: "Estava uma família de Quero-Quero em um vai e vem em desespero.",
    },
    {
      name: "",
      text: "Pois o filhote Quero-Quero acabara de aprender a voar e agora está sem paradeiro."
    }
  ],
  
  'not_ts_time_honey': [
    {
      name: "",
      text: `Eu não estou vendo nada por aqui...`,
      portrait: "../assets/player.png"
    },
    {
      name: "",
      text: `Eu devo estar imaginando coisas.`,
      portrait: "../assets/player.png"
    }
  ],

  'win_game': [
    {
      name: "",
      text: "E então a família pode se reencontrar."
    },
    {
      name: "",
      text: "A Mamãe Quero-Quero enfim parou de gritar."
    },
    {
      name: "",
      text: "Mas, em outros campos por aí, quando o dia começa a clarear...\nUm Quero-Quero voa desesperado, sem saber onde está"
    },
    {
      name: "",
      text: "E a mamãe grita:\n\"Cadê meu Quero-Quero, que tanto espero?\""
    }
  ],
};

Object.entries(characterData).forEach(([key, info]) => {
  GameDialogues[`${key}_hint`] = [{ text: `${info.action} ${info.name}!` }];
});

function createMold(classe) {
  const div = document.createElement('div')
  div.className = `piece ${classe}`
  return div
}

function renderMap() {
  const board = document.getElementById('game-board')
  const playerDiv = document.getElementById('player')
  const foreground = document.getElementById('foreground-layer')
  if (!board) return

  const oldPieces = board.querySelectorAll('.piece')
  oldPieces.forEach(p => p.remove())
  
  board.style.gridTemplateColumns = `repeat(${COLS}, ${TILE_SIZE}px)`
  board.style.gridTemplateRows = `repeat(${ROWS}, ${TILE_SIZE}px)`

  const allCharacters = ['P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q']

  const frag = document.createDocumentFragment()
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const char = map[y][x]
      if(!moldes[char]) continue

      const clone = moldes[char].cloneNode(true)
      clone.style.opacity = "1" 
      clone.id = `tile-${x}-${y}`

      frag.appendChild(clone)
    }
  }
  
  board.appendChild(frag)

  if (playerDiv) board.appendChild(playerDiv)
  if (foreground) board.appendChild(foreground)

  updateCamera()
  
  const uiHearts = document.getElementById('ui-hearts')
  const heartsEl = document.getElementById('mg-hearts')
}

function updateCamera(isResizing = false) {
  const board = document.getElementById('game-board')
  const playerDiv = document.getElementById('player')
  
  if (!board || !playerDiv) return

  if (isResizing) board.classList.remove('smooth-move')
  else board.classList.add('smooth-move')

  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2

  const playerWorldX = (player.x * TILE_SIZE) + (TILE_SIZE / 2)
  const playerWorldY = (player.y * TILE_SIZE) + (TILE_SIZE / 2)

  let offX = centerX - playerWorldX
  let offY = centerY - playerWorldY

  const mapWidth = COLS * TILE_SIZE
  const mapHeight = ROWS * TILE_SIZE

  if (mapWidth > window.innerWidth) {
    const minX = window.innerWidth - mapWidth
    offX = Math.min(0, Math.max(offX, minX))
  } else {
    offX = (window.innerWidth - mapWidth) / 2
  }

  if (mapHeight > window.innerHeight) {
    const minY = window.innerHeight - mapHeight
    offY = Math.min(0, Math.max(offY, minY))
  } else {
    offY = (window.innerHeight - mapHeight) / 2
  }

  board.style.transform = `translate(${offX}px, ${offY}px)`

  const scale = (facing === "left") ? -1 : 1
  playerDiv.style.transform = `translate(${playerWorldX}px, ${playerWorldY}px) translate(-50%, -50%) scaleX(${scale})`
}

document.addEventListener("keydown", (e) => {
  if (pauseGame) return

  const key = e.key.toLowerCase()
  if (key === 'arrowup' || key === 'w') handleMove(0, -1)
  if (key === 'arrowdown' || key === 's') handleMove(0, 1)
  if (key === 'arrowleft' || key === 'a') handleMove(-1, 0, "left")
  if (key === 'arrowright' || key === 'd') handleMove(1, 0, "right")
  
  if (key === 'e') interact()
})

function handleMove(dx, dy, newFacing) {
  if (pauseGame) return

  const newX = player.x + dx
  const newY = player.y + dy

  if (newFacing) facing = newFacing;

  if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
    const tile = map[newY][newX]
    const blockers = ['W', 'A', 'a', 't', 'f', 'P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q']

    if (!blockers.includes(tile)) {
      player.x = newX
      player.y = newY
    } else {
      if (['P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q'].includes(tile)) {
        console.log("NPC na frente!")
      }
    }
  }

  updateCamera()
  updateProximity()
}

/* LÓGICA DOS MINIJOGOS */

function openMinigame(type, x, y, charArray) {
  const bubble = document.getElementById('interaction-bubble')
  console.log("Abrindo minijogo tipo:", type)
  pauseGame = true
  
  const container = document.getElementById('minigame-container')
  const content = document.getElementById('mg-content')
  
  if (!container || !content) {
    console.error("ERRO: Elementos do minijogo não encontrados no HTML!")
    return
  }

  container.style.display = 'flex'
  content.innerHTML = ""

  if (['P', 'p', 'M', 'm'].includes(type)) {
    playMemory(type, x, y, charArray)
  } else if (['O', 'o', 'Q', 'q'].includes(type)) {
    playPuzzle(type, x, y, charArray)
  } else if (['C', 'c'].includes(type)) {
    playCatch(type, x, y, charArray)
  }

  bubble.style.display = 'none'
}

function winMinigame(x, y, charArray) {
  const tile = map[y][x];
  player.friends++
  currentStep++

  const progEl = document.getElementById('prog');
  if (progEl) progEl.innerText = `${player.friends}/10`

  const correctGrass = ((x + y) % 2 === 0) ? ',' : '.'
  const grassClass = (correctGrass === '.') ? 'grass' : 'grass2'

  charArray[x] = correctGrass
  map[y] = charArray.join('')

  const tileElement = document.getElementById(`tile-${x}-${y}`)

  soundGame4Win.currentTime = 0;
  soundGame4Win.play().catch(e=>console.log(e));

  closeMinigame()

  const winKey = tile + '_win'
  dialogSystem.show(winKey, () => {
    if (tileElement) {
      tileElement.classList.remove(`sprite-${tile}`)
      tileElement.classList.add('collected')
    }

    pauseGame = false
    updateHintUI()
  })

  if (player.friends >= 10) winGame()
}

function winGame() {
  pauseGame = true
  
  dialogSystem.show('win_game', function() {
    document.getElementById('pause-menu').style.display = "none"
    const winMenu = document.getElementById('game-complete')
    if (winMenu) winMenu.style.display = 'flex'
  })
}

/* Celulares e Interação */

function setupMobileButtons() {
  const btns = {
    'btn-up': [0, -1, null],
    'btn-down': [0, 1, null],
    'btn-left': [-1, 0, "left"],
    'btn-right': [1, 0, "right"]
  }

  for (const [id, [dx, dy, dir]] of Object.entries(btns)) {
    const el = document.getElementById(id)
    if (el) {
      el.addEventListener('touchstart', (e) => {
        e.preventDefault()
        handleMove(dx, dy, dir)
      }, {passive: false})
    }
  }

  const interactBtn = document.getElementById('btn-interact')
  if (interactBtn) {
    interactBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      interact()
    }, {passive: false})
  }
}

function interact() {
  if (pauseGame) return

  const checkDirs = [
    {dx: 0, dy: -1},
    {dx: 0, dy: 1},
    {dx: -1, dy: 0},
    {dx: 1, dy: 0},
    {dx: -1, dy: -1},
    {dx: 1, dy: -1},
    {dx: -1, dy: 1},
    {dx: 1, dy: 1}
  ]

  for (let dir of checkDirs) {
    let nx = player.x + dir.dx
    let ny = player.y + dir.dy

    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
      const tile = map[ny][nx]
      if(['P', 'p', 'M', 'm', 'O', 'o', 'C','c', 'Q', 'q'].includes(tile)) {
        if (tile === storyOrder[currentStep]) {
          const charArray = map[ny].split('')
          dialogSystem.show(tile, () => {
            openMinigame(tile, nx, ny, charArray);
          });
        } else {
          dialogSystem.show('not_ts_time_honey')
        }
        return
      }
    }
  }
}

function updateProximity() {
  const bubble = document.getElementById('interaction-bubble')
  if (!bubble || pauseGame) return

  const checkDirs = [
    {dx: 0, dy: -1}, {dx: 0, dy: 1},
    {dx: -1, dy: 0}, {dx: 1, dy: 0},
    {dx: -1, dy: -1}, {dx: 1, dy: -1},
    {dx: -1, dy: 1}, {dx: 1, dy: 1}
  ]

  let targetFound = false

  for (let dir of checkDirs) {
    let nx = player.x + dir.dx
    let ny = player.y + dir.dy

    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
      const tile = map[ny][nx] 

      if(tile === storyOrder[currentStep]) {
        showBubble(nx, ny)
        targetFound = true
        break
      }
    }
  }

  if (!targetFound) {
    bubble.style.display = 'none'
  }
}

function showBubble(tx, ty) {
  const bubble = document.getElementById('interaction-bubble')
  const worldX = (tx * TILE_SIZE) + (TILE_SIZE / 2)
  const worldY = (ty * TILE_SIZE)

  bubble.style.display = 'block'
  bubble.style.left = `${worldX}px`
  bubble.style.top = `${worldY}px`
}

/* Dialogos e Dicas */

const dialogSystem = {
  currentSequence: [],
  currentIndex: 0,
  callback: null,

  show(key, onComplete = null) {
    if (!GameDialogues[key]) {
      if (onComplete) onComplete()
      return
    }

    this.currentSequence = GameDialogues[key]
    this.currentIndex = 0
    this.callback = onComplete
    pauseGame = true

    document.getElementById('dialog-system').style.display = 'block'
    this.render()
  },

  render() {
    const line = this.currentSequence[this.currentIndex]
    document.getElementById('dialog-name').innerText = line.name || "";
    document.getElementById('dialog-text').innerText = line.text;
    const portraitImg = document.getElementById('dialog-ft')

    if (line.portrait) {
      portraitImg.src = line.portrait;
      portraitImg.style.display = 'block';
    } else {
      portraitImg.src = "";
      portraitImg.style.display = 'none';
    }
  },

  next() {
    this.currentIndex++
    if (this.currentIndex < this.currentSequence.length) {
      this.render()
    } else {
      this.close()
    }
  },

  close() {
    document.getElementById('dialog-system').style.display = 'none'
    const tempCallback = this.callback;
    this.callback = null;

    if (tempCallback) {
      tempCallback();
    } else {
      pauseGame = false;
    }
  }
}

function updateHintUI() {
  const nextChar = storyOrder[currentStep];
  const hint = document.getElementById('ui-hint-text');
  
  if (nextChar && GameDialogues[`${nextChar}_hint`]) {
    hint.innerText = GameDialogues[`${nextChar}_hint`][0].text;
  }
}

/* MINIJOGOS */

function playCatch(type, x, y, charArray) {
  const config = minigameConfig[type]
  document.getElementById('mg-title').innerText = config.title
  document.getElementById('mg-desc').innerText = config.desc
  
  const box = document.getElementById('minigame-box')
  if (box) box.style.maxWidth = "850px"
  
  const content = document.getElementById('mg-content')
  const counterEl = document.getElementById('counter')
  const scoreCounterEl = document.getElementById('score-counter')
  
  Object.assign(content.style, {
    position: "relative",
    width: "800px",
    height: "500px",
    backgroundImage: "url('../assets/game4-assets/catch_bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius: "10px",
    border: "3px solid #5b704c",
    overflow: "hidden",
    margin: "0 auto",
    marginBottom: "20px",
    display: "block"
  })
  
  content.innerHTML = ""

  const goal = 3
  let score = 0

  counterEl.style.display = 'block'
  let timeLeft = 15
  counterEl.innerText = timeLeft

  if (scoreCounterEl) {
    scoreCounterEl.style.display = 'block'
    scoreCounterEl.innerText = `${score}/${goal}`
  }

  if (activeInterval) clearInterval(activeInterval)
  activeInterval = setInterval(() => {
    timeLeft--
    counterEl.innerText = timeLeft < 10 ? '0' + timeLeft : timeLeft
    if (timeLeft <= 0) {
      clearInterval(activeInterval)
      closeMinigame()
    }
  }, 1000)

  // Seus spots atuais
  const spots = [
    { left: '10%', top: '10%' },
    { left: '60%', top: '10%' },
    { left: '50%', top: '50%' },
    { left: '15%', top: '65%' },
    { left: '80%', top: '70%' }
  ]

  spots.forEach((spot) => {
    const obs = document.createElement('div')
    obs.className = 'mg-obstacle'
    obs.style.backgroundImage = "url('../assets/game4-assets/moita.png')"
    obs.style.left = spot.left
    obs.style.top = spot.top
    obs.style.transform = 'translate(-40px, -20px)' 
    content.appendChild(obs)
  })

  let currentSpotIndex = -1
  let isPeeking = false
  let cycleTimeout = null

  const animal = document.createElement('div')
  animal.className = `mg-target-sprite sprite-${type}`
  
  Object.assign(animal.style, {
    position: 'absolute',
    width: '100px',
    height: '100px',
    cursor: 'pointer',
    transition: 'all 0.4s ease',
    zIndex: '10', 
    pointerEvents: 'none'
  })

  const runCycle = () => {
    if (!animal.parentElement) return

    let nextIndex
    do {
      nextIndex = Math.floor(Math.random() * spots.length)
    } while (nextIndex === currentSpotIndex)

    currentSpotIndex = nextIndex
    const spot = spots[currentSpotIndex]

    isPeeking = false
    animal.style.pointerEvents = 'none'
    animal.classList.add('running-tremble')
    
    animal.style.left = spot.left
    animal.style.top = spot.top
    animal.style.transform = 'translateY(0px)'

    cycleTimeout = setTimeout(() => {
      if (!animal.parentElement) return
      animal.classList.remove('running-tremble')

      cycleTimeout = setTimeout(() => {
        if (!animal.parentElement) return
        isPeeking = true
        animal.style.pointerEvents = 'auto'
        animal.style.transform = 'translateY(-60px)' 

        cycleTimeout = setTimeout(() => {
          if (!animal.parentElement) return
          isPeeking = false
          animal.style.pointerEvents = 'none'
          animal.style.transform = 'translateY(0px)'
          
          cycleTimeout = setTimeout(() => {
            runCycle()
          }, 400)
        }, 1100)
      }, 300)
    }, 450)
  }

  animal.onclick = (e) => {
    if (!isPeeking) return
    e.stopPropagation()
    
    score++
    if (scoreCounterEl) scoreCounterEl.innerText = `${score}/${goal}`
    
    animal.style.filter = "brightness(1.5) drop-shadow(0 0 15px white)"
    
    if (score >= goal) {
      clearInterval(activeInterval)
      animal.style.pointerEvents = 'none'
      animal.innerHTML = "<span style='font-size: 40px; position: absolute; top: -40px; left: 30px;'>❤️</span>"
      animal.style.transform = 'translateY(-60px)' 
      setTimeout(() => winMinigame(x, y, charArray), 800)
    } else {
      clearTimeout(cycleTimeout)
      animal.style.transform = 'translateY(0px)'
      setTimeout(() => runCycle(), 200)
    }
  }

  content.appendChild(animal)
  runCycle()
}

function playMemory(type, x, y, charArray) {
  const config = minigameConfig[type]
  document.getElementById('mg-title').innerText = config.title
  document.getElementById('mg-desc').innerText = config.desc
  const content = document.getElementById('mg-content')

  let cards = [...config.assets]
  cards.sort(() => Math.random() - 0.5)

  let firstCard = null
  let canClick = true
  let pairs = 0

  cards.forEach(emoji => {
    const card = document.createElement('div')
    card.className = 'mg-card'
    card.innerText = '❓'
    card.style.background = '#afafaf'
    card.style.borderRadius = '5px'
    card.style.userSelect = 'none'
    card.onclick = () => {
      if (!canClick || card.innerText !== '❓' || firstCard === card) return
      card.innerText = emoji
      if (!firstCard) {
        firstCard = card
      } else {
        if (firstCard.innerText === emoji) {
          pairs++
          firstCard = null
          if (pairs === 3) setTimeout(() => winMinigame(x, y, charArray), 500)
        } else {
          soundGame4Err.currentTime = 0;
          soundGame4Err.play().catch(e=>console.log(e));

          canClick = false
          let prev = firstCard
          firstCard = null
          setTimeout(() => {
            card.innerText = '❓'
            prev.innerText = '❓'
            canClick = true
          }, 700)
        }
      }
    }
    content.appendChild(card)
  })
}

function playPuzzle(type, x, y, charArray) {
  const config = minigameConfig[type]
  document.getElementById('mg-title').innerText = config.title
  document.getElementById('mg-desc').innerText = config.desc

  const box = document.getElementById('minigame-box')
  box.style.maxWidth = "850px"
  
  const content = document.getElementById('mg-content')
  content.style.position = "relative"
  content.style.width = "800px" 
  content.style.height = "500px"
  content.style.backgroundColor = "rgba(0,0,0,0.1)"
  content.style.borderRadius = "10px"
  content.style.overflow = "hidden"
  content.style.display = "block"
  content.innerHTML = ""

  content.ondragover = function(e) { e.preventDefault() }
  content.ondrop = function(e) {
    e.preventDefault()
    const pieceId = e.dataTransfer.getData("text/plain")
    const pieceEl = document.getElementById(pieceId)
    
    if (!pieceEl || pieceEl.classList.contains('placed')) return

    const offX = parseInt(e.dataTransfer.getData("offsetX"))
    const offY = parseInt(e.dataTransfer.getData("offsetY"))
    const rect = content.getBoundingClientRect()
    
    let nL = e.clientX - rect.left - offX
    let nT = e.clientY - rect.top - offY

    nL = Math.max(0, Math.min(nL, content.offsetWidth - 120))
    nT = Math.max(0, Math.min(nT, content.offsetHeight - 125))

    pieceEl.style.left = nL + "px"
    pieceEl.style.top = nT + "px"
  }

  const pageRef = document.createElement('div')
  pageRef.id = "puzzle-page-ref"
  pageRef.innerText = config.bookPage
  pageRef.style.marginTop = "10px"
  pageRef.style.fontWeight = "bold"
  pageRef.style.color = "#5b704c"
  content.after(pageRef) 

  const GRID = 3
  const PIECE_W = 120
  const PIECE_H = 125
  const BOARD_W = PIECE_W * GRID
  const BOARD_H = PIECE_H * GRID
  const IMG_URL = config.img
  const MOLD = "path('M30,0 C45,20 75,20 90,0 L120,0 L120,35 C100,50 100,75 120,90 L120,125 L85,125 C70,105 45,105 30,125 L0,125 L0,90 C20,75 20,50 0,35 L0,0 Z')"

  let placedCount = 0

  const board = document.createElement('div')
  board.id = 'puzzle-board-target'
  board.style.width = BOARD_W + "px"
  board.style.height = BOARD_H + "px"
  board.style.backgroundImage = "url(" + IMG_URL + ")"
  board.style.backgroundSize = BOARD_W + "px " + BOARD_H + "px"
  board.style.zIndex = "1"
  content.appendChild(board)

  for(let r = 0; r < GRID; r++) {
    for(let c = 0; c < GRID; c++) {
      const id = "p-" + r + "-" + c
      const slot = document.createElement('div')
      slot.className = 'puzzle-slot'
      slot.style.width = PIECE_W + "px"
      slot.style.height = PIECE_H + "px"
      slot.style.left = (c * PIECE_W) + "px"
      slot.style.top = (r * PIECE_H) + "px"
      slot.dataset.id = id

      slot.ondragover = function(e) { e.preventDefault() }
      slot.ondrop = function(e) {
        const pieceId = e.dataTransfer.getData("text/plain")
        if (pieceId === slot.dataset.id) {
          e.stopPropagation() 
          const pieceEl = document.getElementById(pieceId)
          pieceEl.style.position = "absolute"
          pieceEl.style.left = "0"
          pieceEl.style.top = "0"
          pieceEl.style.transform = "rotate(0deg)"
          pieceEl.draggable = false
          pieceEl.classList.add('placed')
          slot.appendChild(pieceEl)
          placedCount++
          if (placedCount === GRID * GRID) setTimeout(() => winMinigame(x, y, charArray), 600)
        }
      }
      board.appendChild(slot)

      const piece = document.createElement('div')
      piece.id = id
      piece.className = 'puzzle-piece-drag'
      piece.draggable = true
      piece.style.width = PIECE_W + "px"
      piece.style.height = PIECE_H + "px"
      piece.style.backgroundImage = "url(" + IMG_URL + ")"
      piece.style.backgroundSize = BOARD_W + "px " + BOARD_H + "px"
      piece.style.backgroundPosition = "-" + (c * PIECE_W) + "px -" + (r * PIECE_H) + "px"
      piece.style.clipPath = MOLD
      piece.style.webkitClipPath = MOLD
      piece.style.zIndex = "10"

      const randX = Math.random() > 0.5 ? Math.random() * 100 : 600 + Math.random() * 50
      const randY = Math.random() * (content.offsetHeight - PIECE_H)
      piece.style.left = randX + "px"
      piece.style.top = randY + "px"
      piece.style.transform = "rotate(" + ((Math.random() - 0.5) * 30) + "deg)"

      piece.ondragstart = function(e) {
        e.dataTransfer.setData("text/plain", piece.id)
        const rect = piece.getBoundingClientRect()
        e.dataTransfer.setData("offsetX", e.clientX - rect.left)
        e.dataTransfer.setData("offsetY", e.clientY - rect.top)
        setTimeout(() => piece.classList.add('dragging'), 0)
      }
      piece.ondragend = function() { piece.classList.remove('dragging') }

      let touchOffX = 0; let touchOffY = 0; let currentScale = 1;

      piece.addEventListener('touchstart', function(e) {
        if (piece.classList.contains('placed')) return
        if (e.cancelable) e.preventDefault()
        
        const t = e.touches[0]
        const cRect = content.getBoundingClientRect()
        
        currentScale = cRect.width / content.offsetWidth
        
        const pRect = piece.getBoundingClientRect()
        
        touchOffX = (t.clientX - pRect.left) / currentScale
        touchOffY = (t.clientY - pRect.top) / currentScale
        
        piece.classList.add('dragging')
        piece.style.zIndex = "100"
        piece.style.transform = "rotate(0deg)"
      }, {passive: false})

      piece.addEventListener('touchmove', function(e) {
        if (piece.classList.contains('placed')) return
        if (e.cancelable) e.preventDefault()
        
        const t = e.touches[0]
        const cRect = content.getBoundingClientRect()
        
        let nL = (t.clientX - cRect.left) / currentScale - touchOffX
        let nT = (t.clientY - cRect.top) / currentScale - touchOffY
        
        nL = Math.max(0, Math.min(nL, content.offsetWidth - 120))
        nT = Math.max(0, Math.min(nT, content.offsetHeight - 125))
        
        piece.style.left = nL + "px"
        piece.style.top = nT + "px"
      }, {passive: false})

      piece.addEventListener('touchend', function() {
        if (piece.classList.contains('placed')) return
        piece.classList.remove('dragging')
        piece.style.zIndex = "10"
        
        const sR = slot.getBoundingClientRect()
        const pR = piece.getBoundingClientRect()
        const pCX = pR.left + (pR.width / 2)
        const pCY = pR.top + (pR.height / 2)

        if (pCX >= sR.left && pCX <= sR.right && pCY >= sR.top && pCY <= sR.bottom) {
          piece.style.left = "0"; piece.style.top = "0"; piece.draggable = false
          piece.classList.add('placed'); slot.appendChild(piece)
          placedCount++
          if (placedCount === GRID * GRID) setTimeout(() => winMinigame(x, y, charArray), 600)
        }
      })

      content.appendChild(piece)
    }
  }
}

function closeMinigame() {
  const container = document.getElementById('minigame-container')
  const box = document.getElementById('minigame-box')
  const content = document.getElementById('mg-content')
  const timePanel = document.getElementById('counter')
  const scorePanel = document.getElementById('score-counter')

  if (activeInterval) {
    clearInterval(activeInterval)
    activeInterval = null
  }

  if (container) container.style.display = 'none'

  if (box) box.style.maxWidth = "600px"
  if (content) {
    content.innerHTML = ""
    Object.assign(content.style, {
      width: "auto",
      height: "auto",
      backgroundImage: "none",
      backgroundColor: "transparent",
      border: "none",
      display: "flex",
      position: "static"
    })
  }

  if (timePanel) timePanel.style.display = 'none'
  if (scorePanel) scorePanel.style.display = 'none'
  
  const pageRef = document.getElementById('puzzle-page-ref')
  if (pageRef) pageRef.remove()

  pauseGame = false
}

/* FUNÇÕES DOS MENUS */

document.addEventListener("keydown", (e) => {
  const key = e.key

  if (key === " " || key === "Spacebar") {
    e.preventDefault()

    const mainMenu = document.getElementById('main-menu')
    const dialogBox = document.getElementById('dialog-system')
    const mgContainer = document.getElementById('minigame-container')

    if (mainMenu && window.getComputedStyle(mainMenu).display !== 'none') {
      startGame()
      return
    }

    if (mgContainer && mgContainer.style.display === 'flex') {
      return
    }

    const pauseMenu = document.getElementById('pause-menu')
    const isPausedInMenu = pauseMenu && window.getComputedStyle(pauseMenu).display !== 'none'

    if (dialogBox && dialogBox.style.display === 'block' && !isPausedInMenu) {
      dialogSystem.next()
      return
    }
    
  }
  
  if (key === "Escape") {
    const pauseMenu = document.getElementById('pause-menu')
    const dialogBox = document.getElementById('dialog-system')

    if (dialogBox && dialogBox.style.display === 'block') {
      return
    }

    if (!pauseGame) {
      pause()
    } else if (pauseMenu && pauseMenu.style.display === 'flex') {
      play()
    }
  }
})

function startGame() {
  const ui = document.getElementById('ui')
  const mainMenu = document.getElementById('main-menu')
  const playerDiv = document.getElementById('player')
  
  if (mainMenu) mainMenu.style.display = 'none'
  if (playerDiv) playerDiv.style.display = 'block'
  if (ui) ui.style.display = 'flex'

  if (UIManager.isTouchDevice) {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {})
        }
      }).catch(() => {})
    }
  }

  updateHintUI()
  dialogSystem.show('intro_game')
}

function pause() {
  const pauseMenu = document.getElementById('pause-menu')
  const ui = document.getElementById('ui')
  const dialogBox = document.getElementById('dialog-system')

  if (pauseMenu) pauseMenu.style.display = 'flex'
  if (ui) ui.style.display = 'none'
  
  if (dialogBox && window.getComputedStyle(dialogBox).display === 'block') {
    dialogBox.style.display = 'none'
    dialogBox.dataset.wasOpen = 'true'
  }

  pauseGame = true
}

function play() {
  const pauseMenu = document.getElementById('pause-menu')
  const ui = document.getElementById('ui')
  const dialogBox = document.getElementById('dialog-system')

  if (pauseMenu) pauseMenu.style.display = 'none'
  if (ui) ui.style.display = 'flex'
  
  if (dialogBox && dialogBox.dataset.wasOpen === 'true') {
    dialogBox.style.display = 'block'
    dialogBox.dataset.wasOpen = 'false'
  }

  pauseGame = false
}

function togglePause() {
  const pauseMenu = document.getElementById('pause-menu')
  
  const isVisible = pauseMenu && window.getComputedStyle(pauseMenu).display === 'flex'

  if (isVisible) {
    play()
  } else {
    pause()
  }
}

function restartGame() {
  location.reload()
}

function backToIndex() {
  window.location.href = 'index.html'
}

window.addEventListener('resize', () => {
  updateCamera(true)
})

window.onload = () => {
  console.log(`[Engine] Dispositivo detectado: ${UIManager.deviceType}`);
  UIManager.init();
  setupMobileButtons();
  renderMap();
  preloadGameAssets();
}

/* Easter Egg, deixei pra galera de plantão aí, isso aí eu usei pra testar minigames mais distantes, ele tem a função de pular o minigame, usem ai, só não saiam espalhando a notícia! */

/*
(function createDebugButton() {
  const btn = document.createElement('button')
  btn.innerText = "Moggar o beta"
  btn.id = "debug-win-btn"
  btn.style.userSelect = "none"
  
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '99999', 
    padding: '20px',
    background: '#ffcc00',
    color: '#000',
    border: '5px solid red', // Borda vermelha pra você achar ele no susto
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'block' // FORÇADO SEMPRE VISÍVEL
  })

  btn.onclick = () => {
    // Tenta pegar o animal atual da história
    const targetChar = storyOrder[currentStep]
    if (!targetChar) {
        alert("Fim da história ou erro no currentStep")
        return
    }
    
    // Procura o cara no mapa
    for (let y = 0; y < map.length; y++) {
      const x = map[y].indexOf(targetChar)
      if (x !== -1) {
        const charArray = map[y].split('')
        console.log("Debug: Pulando minijogo de " + targetChar)
        
        // Se o minijogo estiver aberto, a gente fecha ele antes
        closeMinigame() 
        
        // Dá a vitória
        winMinigame(x, y, charArray)
        break
      }
    }
  }
  
  document.body.appendChild(btn)
  console.log("Botão de Debug injetado no Body!")
})()
*/
