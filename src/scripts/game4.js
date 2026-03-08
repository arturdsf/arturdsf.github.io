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
  hp: 1,
  friends: 0,
  followers: 0
}

let facing = "right"
let pauseGame = true
let activeInterval = null

const map = [
  "AAAAAAAAWWWWWWWWWWWWWWWWAAAAAAAAAAAAAAAA",
  "AAAAAAAAAWWWWWWWWWWWWWAAAAAAAAAAAAAAAAAA",
  "AAAAAAAAAAWWWWWWWWWWAAAAAAAAAAAAAAAAAAAA",
  "WA.,.,.,.,.WWWWWWWWAAAAAAAAAAAAAAAAAAAAA",
  "WW,.,T,.,.WWWWWWWW,.,T,.,.,.o.,.,.,.,.AA",
  "WWW,.TWWWWWWWWWWW,.,.T.,.,.,.,.,.,.,.,AA",
  "WWWWWTWWWWWWWWW.,P,.,TTTTTTTTTT.,.,.,.AA",
  "WWWWWTWWWWWWWW.,.,.,.,.,.,.,.,T,.,.,.,AA",
  "WWWW,T,.,.p.,.,.,.,.,.,.,.,.,.T.,.,.,.AA",
  "WW.,.T.,.,.,.,.,.,q,.,.,.,.,.,T,.,.,.,AA",
  "WA,.,T,.,.,.,.,.,.,.,.,.,.,.,.T.,.,.,.AA",
  "WA.,.TT,.,.,.,.,.,.,.,.,.,.,.,T,.,.,.,AA",
  "AA,.,.TTTTTTTTTTTTTTTTTTTTTTTTT.,.,.,.AA",
  "AA.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,AA",
  "AA,.,.,.,C,.,.,.,.,.,.,.,.,.,.,.,.,.,.AA",
  "AA.,.M.,.,.,.,.,.,.,.TTTT,.,.,.,.,.,.,AA",
  "AA,.,.,.,.,.,.,.,.,.,T,.T.,.m.,.,.,.,.AA",
  "AA.,.,.,.,.,.,.,.,.,.T.,T,.,.,.,.,.,.,AA",
  "AA,.,.,.,.,.,.,.,.,.,T,.T.,.,.,.,.,.,.AA",
  "AA.,.,.,.O.,.,.,.,.,.T.,T,.,.,.,c,.,AAAA",
  "AA,.,.,.,.,.,.,.,.,.,T,.T.,.,.,.,.,AAAAA",
  "AA.,.,.,.,.,.,.,.,.,.T.,Q,.,.,.AAAAAAAAA",
  "AAAAAAAAAA,.,.,.,.,.,.,.,.,AAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
]

const moldes = {
  'W': createMold('water'),
  'A': createMold('tree'),
  '.': createMold('grass'),
  ',': createMold('grass2'),
  'T': createMold('dirt'),
  'P': createMold('sprite-P'),
  'p': createMold('sprite-p'),
  'M': createMold('sprite-M'),
  'm': createMold('sprite-m'),
  'O': createMold('sprite-O'),
  'o': createMold('sprite-o'),
  'C': createMold('sprite-C'),
  'c': createMold('sprite-c'),
  'Q': createMold('sprite-Q'),
  'q': createMold('sprite-q')
}

/*
  Sprites:
  P = Pesca (Cavalo)
  p = Pesca (Bem-te-vi)
  M = Jogo da Memória (Jaçanã)
  m = Jogo da Memória (Capivara)
  C = Caça (Graxaim)
  c = Caça (Filhote)
  O = Colheita (Mamãe Quero-quero)
  o = Colheita (Urutu)
  Q = Quebra-cabeça (Os três primeiros)
  q = Quebra-cabeça (Carcará)
*/

function createMold(classe) {
  const div = document.createElement('div')
  div.className = `piece ${classe}`
  return div
}

function renderMap() {
  const board = document.getElementById('game-board')
  if (!board) return
  
  board.innerHTML = ""
  board.style.gridTemplateColumns = `repeat(${COLS}, ${TILE_SIZE}px)`
  board.style.gridTemplateRows = `repeat(${ROWS}, ${TILE_SIZE}px)`

  const allCharacters = ['P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q']

  const frag = document.createDocumentFragment()
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const char = map[y][x]
      if(!moldes[char]) continue

      const clone = moldes[char].cloneNode(true)

      if (!allCharacters.includes(char)) {
        clone.style.opacity = "0"
      } else {
        clone.style.opacity = "1"
      }

      frag.appendChild(clone)
    }
  }
  board.appendChild(frag)
  updateCamera()
  
  const uiHearts = document.getElementById('ui-hearts')
  const heartsEl = document.getElementById('mg-hearts')
  if (uiHearts) uiHearts.innerText = player.hp
  if (heartsEl) heartsEl.innerText = player.hp
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

  const screenX = playerWorldX + offX
  const screenY = playerWorldY + offY
  const scale = (facing === "left") ? -1 : 1

  playerDiv.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%) scaleX(${scale})`
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

  // Atualiza a direção do olhar primeiro
  if (newFacing) facing = newFacing;

  if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
    const tile = map[newY][newX]
    const blockers = ['W', 'A', 'P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q']

    if (!blockers.includes(tile)) {
      player.x = newX
      player.y = newY
    } else {
      if (['P', 'p', 'M', 'm', 'O', 'o', 'C', 'c', 'Q', 'q'].includes(tile)) {
        console.log("NPC na frente!")
      }
    }
  }
  // Chama a câmera apenas UMA vez ao final de todo o cálculo
  updateCamera()
}

/* LÓGICA DOS MINIJOGOS */

function openMinigame(type, x, y, charArray) {
  pauseGame = true
  const container = document.getElementById('minigame-container')
  const content = document.getElementById('mg-content')
  
  if (container) container.style.display = 'flex'
  if (content) content.innerHTML = ""

  if (type === 'P' || type === 'p') {
    playFishing(x, y, charArray)
  } else if (type === 'M' || type === 'm') {
    playMemory(x, y, charArray)
  } else if (type === 'O' || type === 'o') {
    playDnD(x, y, charArray)
  } else if (type === 'C' || type === 'c') {
    playCatch(x, y, charArray)
  } else if (type === 'Q' || type === 'q') {
    playPuzzle(x, y, charArray)
  }
}

function closeMinigame() {
  const container = document.getElementById('minigame-container')
  if (container) container.style.display = 'none'
  pauseGame = false
}

function restart() {
  player.hp--
  const uihp = document.getElementById('hp')
  const uiHearts = document.getElementById('ui-hearts')
  const heartsEl = document.getElementById('mg-hearts')
  if (uiHearts) {
    setTimeout(() => {
      uiHearts.innerText = player.hp
    }, 3000)
    uiHearts.innerText = 'Você perdeu 1 ponto'
  }
  
  if (heartsEl) {
    setTimeout(() => {
      heartsEl.innerText = player.hp
    }, 2000)
    heartsEl.innerText = 'Você perdeu 1 ponto'
  }

  if (player.hp <= 0) {
    closeMinigame()
    pauseGame = true
    //document.getElementById('game-over').style.display = 'flex'
    uiHearts.innerText = ''
    uihp.innerText = 'Você perdeu! 😭'
    uihp.style.background = 'rgba(238, 238, 238, 0.9)'
    uihp.style.color = 'rgba(100, 100, 100, 0.9)'

    setTimeout(() => {
      restartGame()
    }, 3000)
  }
}

function winMinigame(x, y, charArray) {
  console.log(`Você resgatou um amigo! Amigos resgatados: ${player.friends}`)
  player.friends++
  const progEl = document.getElementById('prog')
  if (progEl) progEl.innerText = `${player.friends}/10`

  const correctGrass = ((x + y) % 2 === 0) ? ',' : '.'
  const grassClass = (correctGrass === '.') ? 'grass' : 'grass2'

  charArray[x] = correctGrass
  map[y] = charArray.join('')

  const index = y * COLS + x
  const board = document.getElementById('game-board')
  if (board && board.children[index]) {
    board.children[index].className = `piece ${grassClass}`
    board.children[index].innerText = ""
  }
  
  closeMinigame()

  if (player.friends >= 10) {
    winGame()
  }
}

function winGame() {
  window.alert('Parabéns, você encontrou todos os 10 amigos! O jogo agora será reiniciado.')
  restartGame()
}

/* Celulares */

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
        const charArray = map[ny].split('')
        openMinigame(tile, nx, ny, charArray)
        return
      }
    }
  }
}

/* DIALOGOS */

const DialogSystem = {
  show(name, text, portraitPath) {
    pauseGame = true
    const system = document.getElementById('dialog-system')
    const interactName = document.getElementById('dialog-name')
    const textCont = document.getElementById('dialog-text')
    const imgCont = document.getElementById('dialog-ft')

    interactName.innerText = name
    textCont.innerText = text
    imgCont.src = portraitPath

    system.style.display = 'block'
  },

  hide() {
    document.getElementById('dialog-system').style.display = 'none'
    pauseGame = false
  }
}

/* MINIJOGOS */

function playFishing(x, y, charArray) {
  document.getElementById('mg-title').innerText = "Pesca do Cavalo"
  document.getElementById('mg-desc').innerHTML = "Para pescar, clique quando ficar <strong>VERDE</strong>!"
  const content = document.getElementById('mg-content')
  const btn = document.createElement('button')
  
  btn.innerText = "Procurando peixe..."
  btn.style.padding = "20px"
  btn.style.background = "#e74c3c"
  btn.style.color = "#fff"
  btn.style.borderRadius = "10px"
  btn.style.cursor = "pointer"
  btn.style.userSelect = "none"

  let catched = false
  let timeout = setTimeout(() => {
    btn.innerText = "PESCAR AGORA!!"
    btn.style.background = "#2ecc71"
    catched = true
  }, Math.random() * 2000 + 1000)

  btn.onclick = () => {
    if (catched) winMinigame(x, y, charArray)
    else {
      clearTimeout(timeout)
      closeMinigame()
    }
  }
  content.appendChild(btn)
}

function playMemory(x, y, charArray) {
  document.getElementById('mg-title').innerText = "Jogo da Memória"
  document.getElementById('mg-desc').innerText = "Ache os pares!"
  const content = document.getElementById('mg-content')

  let cards = ['🐿️', '🐿️', '🦝', '🦝', '🦌', '🦌']
  cards.sort(() => Math.random() - 0.5)

  let firstCard = null
  let canClick = true // Trava para evitar bugs de cliques rápidos
  let pairs = 0
  let errors = 0

  cards.forEach(emoji => {
    const card = document.createElement('div')
    card.className = 'mg-card'
    card.innerText = '❓'
    card.style.background = '#8b8b8b'
    card.style.borderRadius = '5px'
    card.style.userSelect = 'none'
    card.onclick = () => {
      if (!canClick || card.innerText !== '❓' || firstCard === card) return
      card.innerText = emoji
      card.style.background = '#b9b9b9'

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

function playDnD(x, y, charArray) {
  document.getElementById('mg-title').innerText = "Colheita de Pinhão"
  document.getElementById('mg-desc').innerText = "Clique no pinhão e depois no cesto!"
  const content = document.getElementById('mg-content')
  const p = document.createElement('div')
  const c = document.createElement('div')
  p.innerText = "🌰"
  p.style.fontSize = "50px"
  p.style.cursor = "pointer"
  p.style.userSelect = "none"
  c.innerText = "🧺"
  c.style.fontSize = "50px"
  c.style.cursor = "pointer"
  c.style.userSelect = "none"

  let selected = false
  p.onclick = () => { 
    selected = true
    p.style.transform = "scale(1.2)"
    p.style.opacity = "0.5"
  }
  c.onclick = () => {
    if (selected) winMinigame(x, y, charArray)
    else {
      closeMinigame()
    }
  }
  content.append(p, c)
}

function playCatch(x, y, charArray) {
    document.getElementById('mg-title').innerText = "Pega o Graxaim!"
    document.getElementById('mg-desc').innerText = "Clique nele antes do tempo acabar!"
    
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
    animal.innerText = "🦝"
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

function playPuzzle(x, y, charArray) {
  document.getElementById('mg-title').innerText = "O Grande Encontro"
  document.getElementById('mg-desc').innerText = "Encaixe as peças redondinhas nos lugares certos!"

  const box = document.getElementById('minigame-box')
  box.style.maxWidth = "850px"
  
  const content = document.getElementById('mg-content')
  content.style.position = "relative"
  content.style.width = "800px" 
  content.style.height = "500px"
  content.style.backgroundColor = "rgba(0,0,0,0.05)"
  content.style.borderRadius = "10px"
  content.style.overflow = "hidden"
  content.innerHTML = ""

  const GRID = 3
  const PIECE_W = 120
  const PIECE_H = 125
  const BOARD_W = PIECE_W * GRID
  const BOARD_H = PIECE_H * GRID
  const IMG_URL = "../assets/game4-assets/chegada_do_pai.png"

  // NOVO MOLD: Curvas redondas como quebra-cabeça real
  // O segredo das "saídas" é desenhar curvas que saem e entram no limite da div
  const MOLD = "path('M30,0 C45,20 75,20 90,0 L120,0 L120,35 C100,50 100,75 120,90 L120,125 L85,125 C70,105 45,105 30,125 L0,125 L0,90 C20,75 20,50 0,35 L0,0 Z')"

  let placedCount = 0

  const board = document.createElement('div')
  board.id = 'puzzle-board-target'
  board.style.width = `${BOARD_W}px`
  board.style.height = `${BOARD_H}px`
  board.style.backgroundImage = `url(${IMG_URL})`
  board.style.backgroundSize = `${BOARD_W}px ${BOARD_H}px`
  content.appendChild(board)

  content.ondragover = (e) => e.preventDefault()
  content.ondrop = (e) => {
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
      let randX
      if (spawnSide) {
          randX = Math.random() * ( (content.offsetWidth / 2) - BOARD_W / 2 - PIECE_W )
      } else {
          randX = (content.offsetWidth / 2) + (BOARD_W / 2) + Math.random() * ( (content.offsetWidth / 2) - BOARD_W / 2 - PIECE_W )
      }
      
      const randY = Math.random() * (content.offsetHeight - PIECE_H)
      const randomRot = (Math.random() - 0.5) * 40

      piece.style.left = `${randX}px`
      piece.style.top = `${randY}px`
      piece.style.transform = `rotate(${randomRot}deg)`

      piece.ondragstart = (e) => {
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

        if (gameOverMenu && window.getComputedStyle(gameOverMenu).display === 'flex') {
            restartGame()
            return
        }

        const mgContainer = document.getElementById('minigame-container')
        if (mgContainer && mgContainer.style.display === 'flex') return

        if (!pauseGame) {
            pause()
        } else if (window.getComputedStyle(pauseMenu).display !== 'none') {
            play()
        }
    }
    
    if (key === "Escape") {
        if (!pauseGame) pause()
        else if (pauseMenu.style.display === 'flex') play()
    }
})

function startGame() {
  document.getElementById('main-menu').style.display = 'none'
  document.getElementById('player').style.display = 'block'
  pauseGame = false
  renderMap()
}

function pause() {
  const pauseMenu = document.getElementById('pause-menu')
  pauseMenu.style.display = 'flex'
  pauseGame = true
}

function play() {
  const pauseMenu = document.getElementById('pause-menu')
  pauseMenu.style.display = 'none'
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
