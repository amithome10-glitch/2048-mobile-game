(function () {
  const SIZE = 4;
  let board, score, best, prevBoard, prevScore, gameOver, won, keepPlaying;

  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const overlayBtn = document.getElementById('overlayBtn');
  document.getElementById('newGameBtn').addEventListener('click', startGame);
  document.getElementById('undoBtn').addEventListener('click', undo);
  overlayBtn.addEventListener('click', () => { overlay.classList.remove('show'); startGame(); });

  function startGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    gameOver = false;
    won = false;
    keepPlaying = false;
    prevBoard = null;
    prevScore = 0;
    best = parseInt(localStorage.getItem('2048best') || '0');
    addTile();
    addTile();
    render();
  }

  function addTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (board[r][c] === 0) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    scoreEl.textContent = score;
    if (score > best) { best = score; localStorage.setItem('2048best', best); }
    bestEl.textContent = best;
    boardEl.innerHTML = '';
    // draw empty cells
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      boardEl.appendChild(cell);
    }
    // draw tiles as absolute overlay
    boardEl.style.position = 'relative';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = board[r][c];
        if (val) {
          const tile = document.createElement('div');
          const cls = val <= 2048 ? `tile tile-${val}` : 'tile tile-super';
          tile.className = cls;
          tile.textContent = val;
          // position using grid trick
          tile.style.gridRow = r + 1;
          tile.style.gridColumn = c + 1;
          boardEl.appendChild(tile);
        }
      }
    }
    // Use grid positioning for tiles too
    boardEl.style.display = 'grid';
  }

  function saveState() {
    prevBoard = board.map(r => [...r]);
    prevScore = score;
  }

  function undo() {
    if (!prevBoard) return;
    board = prevBoard.map(r => [...r]);
    score = prevScore;
    prevBoard = null;
    gameOver = false;
    render();
  }

  function move(dir) {
    if (gameOver && !keepPlaying) return;
    saveState();
    let moved = false;
    const rotated = rotate(board, dir);
    const result = rotated.map(row => mergeRow(row));
    result.forEach(r => { score += r.gained; if (r.merged) moved = true; });
    const newBoard = result.map(r => r.row);
    const unrotated = unrotate(newBoard, dir);
    // check if anything moved
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (board[r][c] !== unrotated[r][c]) moved = true;
    if (!moved) { prevBoard = null; return; }
    board = unrotated;
    addTile();
    render();
    checkState();
  }

  function mergeRow(row) {
    let filtered = row.filter(x => x !== 0);
    let gained = 0;
    let merged = false;
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        gained += filtered[i];
        filtered.splice(i + 1, 1);
        merged = true;
        if (filtered[i] === 2048) won = true;
      }
    }
    while (filtered.length < SIZE) filtered.push(0);
    return { row: filtered, gained, merged };
  }

  function rotate(b, dir) {
    // left: as-is, right: reverse rows, up: transpose+left, down: transpose+right
    if (dir === 'left') return b.map(r => [...r]);
    if (dir === 'right') return b.map(r => [...r].reverse());
    if (dir === 'up') {
      return Array.from({ length: SIZE }, (_, c) => b.map(r => r[c]));
    }
    if (dir === 'down') {
      return Array.from({ length: SIZE }, (_, c) => b.map(r => r[c]).reverse());
    }
  }

  function unrotate(b, dir) {
    if (dir === 'left') return b.map(r => [...r]);
    if (dir === 'right') return b.map(r => [...r].reverse());
    if (dir === 'up') {
      return Array.from({ length: SIZE }, (_, r) => b.map(row => row[r]));
    }
    if (dir === 'down') {
      const t = Array.from({ length: SIZE }, (_, r) => b.map(row => row[r]));
      return t.map(r => [...r].reverse());
    }
  }

  function checkState() {
    if (won && !keepPlaying) {
      overlayTitle.textContent = '🎉 You Win!';
      overlayScore.textContent = `Score: ${score}`;
      overlayBtn.textContent = 'Keep Playing';
      overlayBtn.onclick = () => { keepPlaying = true; overlay.classList.remove('show'); };
      overlay.classList.add('show');
      return;
    }
    if (!canMove()) {
      gameOver = true;
      overlayTitle.textContent = 'Game Over';
      overlayScore.textContent = `Score: ${score}`;
      overlayBtn.textContent = 'Play Again';
      overlayBtn.onclick = () => { overlay.classList.remove('show'); startGame(); };
      overlay.classList.add('show');
    }
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return true;
        if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
        if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
      }
    return false;
  }

  // Touch handling
  let touchStartX, touchStartY;
  boardEl.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  boardEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    if (absDx > absDy) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
    e.preventDefault();
  }, { passive: false });

  // Keyboard support for desktop
  document.addEventListener('keydown', e => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  });

  startGame();
})();
