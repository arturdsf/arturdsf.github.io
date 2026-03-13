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
    const controls = document.getElementById('mobile-controls')
    if (!controls) return

    if (this.isTouchDevice) {
        controls.style.display = 'grid'
        console.log(`[UI] Modo ${this.deviceType} ativado.`)
    } else {
        controls.style.display = 'none'
        console.log("[UI] Modo Desktop ativado. Controles ocultos.")
    }
  }
}

window.addEventListener('DOMContentLoaded', () => UIManager.init())

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

const map = [
  "WWWWWWWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAAAAA",
  "WWWWWWWWWWWWWWWWWWWaataaaaaaaaaaaaaaaaAA",
  "WWWWWWWWWWWWWWWWW,.,.T.,.,.,.,.,.,.,.aAA",
  "WWWWWWWWWWWWWWW.,P,.,TTTTTTTTTT.,.,.,aAA",
  "WWWWWWWWWWWWWW.,.,.,.,.,.,.,.,T,.,o,.aAA",
  "WWWWTTT.,.p.,.,.,.,.,.,.,.,.,.T.,.,.,aAA",
  "WW.,.T.,.,.,.,.,.,q,.,.,.,.,.,T,.,.,.aAA",
  "WAa.,T,.,.,.,.,.,.,.,.,.,.,.,.T.,.,.,aAA",
  "WAa,.TT,.,.,.,.,.,.,.,.,.,.,.,T,.,.,.aAA",
  "AAa.,.TTTTTTTTTTTTTTTTTTTTTTTTT.,.,.,aAA",
  "AAa,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.aAA",
  "AAa.,.,.,C,.,.,.,.,.,.,.,.,.,.,.,.,.,aAA",
  "AAa,.M.,.,.,.,.,.,.,.TTTT,.,.,.,.,.,.aAA",
  "AAa.,.,.,.,.,.,.,.,.,T,.T.,.m.,.,.,.,aAA",
  "AAa,.,.,.,.,.,.,.,.,.T.,T,.,.,.,.,.,.aAA",
  "AAa.,.,.,.,.,.,.,.,.,T,.T.,.,.,.,.,.,aAA",
  "AAa,.,.,.O.,.,.,.,.,.T.,T,.,.,.,c,.,aaAA",
  "AAaaa.,.,.,.,.,.,.,.,T,.T.,.,.,.,.aaaAAA",
  "AAAaaaaaa,.,.,.,.,.,.T.,Q,.,aaaaaaAAAAAA",
  "AAAAAaaaaaaaaaaaaaaaataaaaaaaaAAAAAAAAAA",
  "AAAAAAAAAaaaaaaaaaaaataaaaaAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
]

const moldes = {
  'W': createMold('water'),
  'A': createMold('tree'),
  'a': createMold('grass-tree'),
  '.': createMold('grass'),
  ',': createMold('grass2'),
  'T': createMold('dirt'),
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
    const blockers = ['W', 'A', 'a', 't', 'P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q']

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
  pauseGame = true
  const container = document.getElementById('minigame-container')
  const content = document.getElementById('mg-content')
  
  if (container) container.style.display = 'flex'
  if (content) content.innerHTML = ""

  if (type === 'P' || type === 'p' || type === 'M' || type === 'm') {
    playMemory(type, x, y, charArray)
  } else if (type === 'O' || type === 'o' || type === 'Q' || type === 'q') {
    playPuzzle(type, x, y, charArray)
  } else if (type === 'C' || type === 'c') {
    playCatch(type, x, y, charArray)
  }
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
  const winMenu = document.getElementById('game-complete')

  dialogSystem.show('win_game')
  pauseGame = true
  winMenu.style.display = 'flex'
}

/* Celulares e Interação */

function setupMobileButtons() {
    const btns = {
        'btn-up': [0, -1, null],
        'btn-down': [0, 1, null],
        'btn-left': [-1, 0, "right"],
        'btn-right': [1, 0, "left"]
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
    
    const content = document.getElementById('mg-content')
    const timePanel = document.getElementById('counter')
    const header = document.getElementById('mg-header')
    const heartsBox = document.querySelector('.hearts-box')

    header.insertBefore(timePanel, heartsBox)

    timePanel.style.display = 'block'
    let time = 5
    timePanel.innerText = `Tempo: 0${time}s`

    const animal = document.createElement('div')
    animal.className = 'mg-target'
    animal.innerText = config.target
    animal.style.fontSize = "50px"
    animal.style.display = "flex"
    animal.style.alignItems = "center"
    animal.style.justifyContent = "center"
    animal.style.userSelect = "none"

    // Limpa qualquer intervalo antigo antes de começar
    if (activeInterval) clearInterval(activeInterval)

    activeInterval = setInterval(() => {
        time--
        timePanel.innerText = `Tempo: 0${time}s`

        const posX = Math.random() * 200 - 100
        const posY = Math.random() * 80 - 40
        animal.style.transform = `translate(${posX}px, ${posY}px)`

        if (time <= 0) {
            clearInterval(activeInterval)
            activeInterval = null
            timePanel.style.display = 'none'
            closeMinigame()
        }
    }, 1000)

    animal.onclick = () => {
        clearInterval(activeInterval)
        activeInterval = null
        animal.innerText = "😵"
        timePanel.style.display = 'none'
        setTimeout(() => winMinigame(x, y, charArray), 300)
    }

    content.appendChild(animal)
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
  content.style.backgroundColor = "rgba(0,0,0,0.09)"
  content.style.borderRadius = "10px"
  content.style.overflow = "hidden"
  content.innerHTML = ""

  const pageRef = document.createElement('div')
  pageRef.id = "puzzle-page-ref"
  pageRef.innerText = config.bookPage
  pageRef.style.marginTop = "10px"
  pageRef.style.fontWeight = "bold"
  pageRef.style.color = "#5b704c"
  pageRef.style.userSelect = "none"
  pageRef.onmousedown = (e) => e.preventDefault() 

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
  board.style.width = `${BOARD_W}px`
  board.style.height = `${BOARD_H}px`
  board.style.backgroundImage = `url(${IMG_URL})`
  board.style.backgroundSize = `${BOARD_W}px ${BOARD_H}px`
  content.appendChild(board)

  const handleDrop = (e) => {
    e.preventDefault()
    const pieceId = e.dataTransfer.getData("text/plain")
    const pieceEl = document.getElementById(pieceId)
    if (!pieceEl || pieceEl.classList.contains('placed')) return

    const offsetX = parseInt(e.dataTransfer.getData("offsetX"))
    const offsetY = parseInt(e.dataTransfer.getData("offsetY"))

    const rect = content.getBoundingClientRect()
    let newLeft = e.clientX - rect.left - offsetX
    let newTop = e.clientY - rect.top - offsetY

    newLeft = Math.max(0, Math.min(newLeft, content.offsetWidth - PIECE_W))
    newTop = Math.max(0, Math.min(newTop, content.offsetHeight - PIECE_H))

    pieceEl.style.left = `${newLeft}px`
    pieceEl.style.top = `${newTop}px`
    pieceEl.style.transform = "rotate(0deg)"
  }

  content.ondragover = (e) => e.preventDefault()
  content.ondrop = handleDrop

  box.ondragover = (e) => e.preventDefault()
  box.ondrop = handleDrop

  for(let r = 0; r < GRID; r++) {
    for(let c = 0; c < GRID; c++) {
      const id = `p-${r}-${c}`
      const slot = document.createElement('div')
      slot.className = 'puzzle-slot'
      slot.style.width = `${PIECE_W}px`
      slot.style.height = `${PIECE_H}px`
      slot.style.left = `${c * PIECE_W}px`
      slot.style.top = `${r * PIECE_H}px`
      slot.dataset.id = id

      slot.ondragover = (e) => e.preventDefault()
      slot.ondrop = (e) => {
        const pieceId = e.dataTransfer.getData("text/plain")
        if (pieceId === slot.dataset.id) {
          e.preventDefault()
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
          if (placedCount === GRID * GRID) {
            board.style.borderColor = "#2ecc71"
            setTimeout(() => winMinigame(x, y, charArray), 1000)
          }
        }
      }
      board.appendChild(slot)

      const piece = document.createElement('div')
      piece.id = id
      piece.className = 'puzzle-piece-drag'
      piece.draggable = true
      piece.style.width = `${PIECE_W}px`
      piece.style.height = `${PIECE_H}px`
      piece.style.backgroundImage = `url(${IMG_URL})`
      piece.style.backgroundSize = `${BOARD_W}px ${BOARD_H}px`
      piece.style.backgroundPosition = `-${c * PIECE_W}px -${r * PIECE_H}px`
      piece.style.clipPath = MOLD
      piece.style.webkitClipPath = MOLD

      const spawnSide = Math.random() > 0.5
      let randX = spawnSide ? Math.random() * 150 : 600 + Math.random() * 50
      const randY = Math.random() * (content.offsetHeight - PIECE_H)
      const randomRot = (Math.random() - 0.5) * 40

      piece.style.left = `${randX}px`
      piece.style.top = `${randY}px`
      piece.style.transform = `rotate(${randomRot}deg)`

      piece.ondragstart = (e) => {
        // EXTERMINADOR DE SELEÇÃO: Limpa qualquer texto fantasma antes de arrastar
        window.getSelection().removeAllRanges()
        
        e.dataTransfer.setData("text/plain", piece.id)
        const rect = piece.getBoundingClientRect()
        e.dataTransfer.setData("offsetX", e.clientX - rect.left)
        e.dataTransfer.setData("offsetY", e.clientY - rect.top)
        setTimeout(() => piece.classList.add('dragging'), 0)
      }
      piece.ondragend = () => piece.classList.remove('dragging')
      content.appendChild(piece)
    }
  }
}

function closeMinigame() {
  const container = document.getElementById('minigame-container')
  const box = document.getElementById('minigame-box')
  const content = document.getElementById('mg-content')
  const timePanel = document.getElementById('counter')
  const pageRef = document.getElementById('puzzle-page-ref')
  const interactBubble = document.getElementById('interaction-bubble')

  if (pageRef) pageRef.remove()
  
  if (activeInterval) {
    clearInterval(activeInterval)
    activeInterval = null
  }

  if (box) box.style.maxWidth = "600px"
  if (content) {
    content.style.width = "auto"
    content.style.height = "auto"
    content.style.backgroundColor = "transparent"
  }

  if (timePanel) timePanel.style.display = 'none'
  if (container) container.style.display = 'none'
  if (interactBubble) interactBubble.style.display = 'none'
  
  pauseGame = false
}

/* FUNÇÕES DOS MENUS */

document.addEventListener("keydown", (e) => {
  const key = e.key
  const mainMenu = document.getElementById('main-menu')
  const pauseMenu = document.getElementById('pause-menu')
  const gameOverMenu = document.getElementById('game-over')

  // Verifica se a tecla pressionada foi Espaço
  if (key === " " || key === "Spacebar") {
    e.preventDefault()

    if (window.getComputedStyle(mainMenu).display !== 'none') {
      startGame()
      return
    }

    const mgContainer = document.getElementById('minigame-container')
    if (mgContainer && mgContainer.style.display === 'flex') return

    if (!pauseGame) {
      pause()
    } else if (window.getComputedStyle(pauseMenu).display !== 'none') {
      play()
    }

    const dialogBox = document.getElementById('dialog-system')
    if (dialogBox && dialogBox.style.display === 'block') {
      dialogSystem.next()
      return
    }
  }
  
  if (key === "Escape") {
    if (!pauseGame) pause()
    else if (pauseMenu.style.display === 'flex') play()
  }
})

function startGame() {
  const ui = document.getElementById('ui')
  document.getElementById('main-menu').style.display = 'none'
  document.getElementById('player').style.display = 'block'
  ui.style.display = 'flex'

  renderMap()
  updateHintUI()

  dialogSystem.show('intro_game')
}

function pause() {
  const pauseMenu = document.getElementById('pause-menu')
  const ui = document.getElementById('ui')

  pauseMenu.style.display = 'flex'
  ui.style.display = 'none'
  pauseGame = true
}

function play() {
  const pauseMenu = document.getElementById('pause-menu')
  const ui = document.getElementById('ui')

  pauseMenu.style.display = 'none'
  ui.style.display = 'flex'
  pauseGame = false
}

function togglePause() {
  const pauseMenu = document.getElementById('pause-menu')
  const isPaused = window.getComputedStyle(pauseMenu).display === 'flex'

  if (isPaused) {
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
  console.log(`Dispositivo: ${UIManager.deviceType}`)
  UIManager.init()
  setupMobileButtons()
  renderMap()
}
