const tiles = document.querySelectorAll(".piece")

const ROWS = 9 // Linhas
const COLS = 20 // Colunas

const map = []

for (let y = 0; y < ROWS; y++) {
  map[y] = []
  for (let x = 0; x < COLS; x++) {
    map[y][x] = tiles[y * COLS + x]
  }
}

// se quiser alterar o mapa (recomendo, esse foi só pra fazer funcionar as mecânicas por enquanto), modifica apenas esse function abaixo, a colisão vai obedecer sozinha.

function mapPaint() {
  for (let x = 4; x <= 14; x++) {
    map[1][x].classList.add("grass")
  }

  for (let x = 2; x <= 15; x++) {
    map[2][x].classList.add("light-grass")
  }

  for (let x = 16; x <= 16; x++) {
    map[2][x].classList.add("wood")
  }

  for (let x = 17; x <= 17; x++) {
    map[2][x].classList.add("light-wood")
  }

  for (let x = 18; x <= 18; x++) {
    map[2][x].classList.add("wood")
  }

  for (let x = 2; x <= 16; x++) {
    map[3][x].classList.add("grass")
  }

  for (let x = 3; x <= 17; x++) {
    map[4][x].classList.add("light-grass")
  }

  for (let x = 3; x <= 17; x++) {
    map[5][x].classList.add("grass")
  }

  for (let x = 4; x <= 15; x++) {
    map[6][x].classList.add("light-grass")
  }

  for (let x = 6; x <= 12; x++) {
    map[7][x].classList.add("grass")
  }
}

mapPaint()

let player = {
  x: 11,
  y: 3,
  hp: 3
}

const playerSpr = document.getElementById("player")

function renderPlayer() {
  const tileWidth = 100 / COLS
  const tileHeight = 100 / ROWS

  playerSpr.style.left = `${player.x * tileWidth}%`
  playerSpr.style.top = `${player.y * tileHeight}%`

  playerSpr.classList.remove("face-left", "face-right")
  playerSpr.classList.add(
    facing === "left" ? "face-left" : "face-right"
  )
}

let facing = "right"

document.addEventListener("keydown", e => {
  let newX = player.x
  let newY = player.y

  if (e.key === "ArrowUp" || e.key === "w") newY--
  if (e.key === "ArrowDown" || e.key === "s") newY++
  if (e.key === "ArrowLeft" || e.key ===  "a") {
    newX--
    facing = "right"
  }
  if (e.key === "ArrowRight" || e.key ===  "d") {
    newX++
    facing = "left"
  }

  if (canMove(newX, newY)) {
    player.x = newX
    player.y = newY
    renderPlayer()
  }
})

function isWalkable(tile) {
  return tile.classList.contains("grass") || 
    tile.classList.contains("light-grass") || 
    tile.classList.contains("wood") || 
    tile.classList.contains("light-wood")
}

function canMove(x, y) {
  if (x < 0 || x >= COLS) return false
  if (y < 0 || y >= ROWS) return false

  return isWalkable(map[y][x])
}

/* Canvas */

/* Configuração de alguns menus */

// O primeiro menu do jogo
function startGame() {
  const menu = document.querySelector('#main-menu')
  menu.style.display = 'none'
  playerSpr.style.display = 'block'
  renderPlayer() // Adicionar quando concluir
}

function backToIndex() {
  window.location.href = 'index.html'
}

// O Menu de Pausa

/* 

Quebra-cabeça Drag and Drop Logic Below

const pieces = document.querySelectorAll('.piece');

let pecaAtual = null;
let offsetX = 0;
let offsetY = 0;

pieces.forEach(piece => {
  piece.addEventListener("pointerdown", e => {
    pecaAtual = piece;
    offsetX = e.clientX - piece.offsetLeft;
    offsetY = e.clientY - piece.offsetTop;

    piece.setPointerCapture(e.pointerId);
  });
});

document.addEventListener("pointermove", e => {
  if (!pecaAtual) return;

  pecaAtual.style.left = `${e.clientX - offsetX}px`;
  pecaAtual.style.top = `${e.clientY - offsetY}px`;
});

document.addEventListener("pointerup", e => {
  pecaAtual = null;
});


Memory Game Logic Below

let memoryCards = [];

function createMemoryCard(imageSrc, id) {
  return {
    id: id,
    imageSrc: imageSrc,
    isFlipped: false,
    isMatched: false
  };
}

function initializeMemoryCards() {
  const images = [
    'img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg',
    'img5.jpg', 'img6.jpg'
  ];

  memoryCards = [];
  let id = 0;

  images.forEach(image => {
    memoryCards.push(createMemoryCard(image, id++));
    memoryCards.push(createMemoryCard(image, id++));
  });

  shuffleArray(memoryCards);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

initializeMemoryCards();
console.log(memoryCards);

// Game Logic
let firstCard = null;
let secondCard = null;
let lockBoard = false;

function handleCardFlip(card, cardElement) {
  if (lockBoard) return;

  // Prevent clicking the same card twice
  if (firstCard && card.id === firstCard.id) return;

  card.isFlipped = true;
  cardElement.classList.add('flipped');

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;

  checkForMatch();
}

function checkForMatch() {
  if (firstCard.imageSrc === secondCard.imageSrc) {

    const firstEl = document.querySelector(`[data-id="${firstCard.id}"]`);
    const secondEl = document.querySelector(`[data-id="${secondCard.id}"]`);

    if (firstEl) firstEl.classList.add('matched');
    if (secondEl) secondEl.classList.add('matched');

    firstCard.isMatched = true;
    secondCard.isMatched = true;

    resetTurn();
  } else {
    setTimeout(unflipCards, 1000);
  }
}

function unflipCards() {
  const firstEl = document.querySelector(`[data-id="${firstCard.id}"]`);
  const secondEl = document.querySelector(`[data-id="${secondCard.id}"]`);

  if (firstEl) firstEl.classList.remove('flipped');
  if (secondEl) secondEl.classList.remove('flipped');

  firstCard.isFlipped = false;
  secondCard.isFlipped = false;

  resetTurn();
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

// Render Cards
document.addEventListener('DOMContentLoaded', () => {
  const gameBoard = document.querySelector('#game-board');

  memoryCards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.dataset.id = card.id;

    const frontFace = document.createElement('div');
    frontFace.classList.add('front-face');
    frontFace.style.backgroundImage = `url(../assets/${card.imageSrc})`;
    frontFace.style.backgroundSize = 'cover';

    const backFace = document.createElement('div');
    backFace.style.backgroundColor = '#CA672EFF';
    backFace.classList.add('back-face');

    cardElement.appendChild(frontFace);
    cardElement.appendChild(backFace);
    gameBoard.appendChild(cardElement);

    cardElement.addEventListener('click', () => {
      if (!card.isFlipped && !card.isMatched) {
        handleCardFlip(card, cardElement);
      }
    });
  });
});

*/