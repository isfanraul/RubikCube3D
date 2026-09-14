import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const stage = document.querySelector('#canvas');
const scoreLabel = document.querySelector('#score');
const statusLabel = document.querySelector('#game-status');
const gameOverPanel = document.querySelector('#game-over');
const restartButton = document.querySelector('#restart');
const board = { width: 7, depth: 7, minY: -10, maxY: 10 };
const shapeColors = [0xf47a55, 0xffd400, 0x78cdd1, 0xb69968, 0x9d6bce];
const shapes = [
  [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 2, 0]],
  [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
  [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 2, 0]],
  [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]],
  [[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 1, 0]],
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.append(renderer.domElement);

const world = new THREE.Group();
const settledGroup = new THREE.Group();
const activeGroup = new THREE.Group();
const projectionGroup = new THREE.Group();
world.add(settledGroup, projectionGroup, activeGroup);
scene.add(world);
scene.add(new THREE.HemisphereLight(0xbadfff, 0x102035, 2.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
keyLight.position.set(5, 14, 8);
scene.add(keyLight);

const floor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 7), new THREE.MeshStandardMaterial({ color: 0x17344e, roughness: .75 }));
floor.position.y = board.minY - .65;
world.add(floor);
const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 21, 7)), new THREE.LineBasicMaterial({ color: 0x5ea8d8, transparent: true, opacity: .35 }));
world.add(border);

const cubeGeometry = new THREE.BoxGeometry(.96, .96, .96);
const ghostGeometry = new THREE.BoxGeometry(.98, .98, .98);
const materialCache = new Map();
function materialFor(color, ghost = false) {
  const key = `${color}:${ghost}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, transparent: ghost, opacity: ghost ? .22 : 1, roughness: .55, metalness: .05, wireframe: ghost }));
  return materialCache.get(key);
}

let settled = new Map();
let activePiece;
let score = 0;
let paused = false;
let gameOver = false;
let projectionEnabled = false;
let fallAccumulator = 0;
let lastTime = performance.now();
let cameraAzimuth = .72;
let cameraElevation = .5;
let cameraDistance = 30;
let pointerState = null;

function keyOf(x, y, z) { return `${x},${y},${z}`; }
function normalizeCells(cells) {
  const minX = Math.min(...cells.map(cell => cell[0]));
  const minY = Math.min(...cells.map(cell => cell[1]));
  const minZ = Math.min(...cells.map(cell => cell[2]));
  return cells.map(([x, y, z]) => [x - minX, y - minY, z - minZ]);
}
function rotateCells(cells, axis) {
  const rotated = cells.map(([x, y, z]) => {
    if (axis === 'x') return [x, -z, y];
    if (axis === 'y') return [z, y, -x];
    return [y, x, z];
  });
  return normalizeCells(rotated);
}
function createPiece() {
  const shapeIndex = Math.floor(Math.random() * shapes.length);
  return { cells: shapes[shapeIndex].map(cell => [...cell]), color: shapeColors[shapeIndex], x: 0, y: board.maxY - 2, z: 0, fallingFast: false };
}
function worldCells(piece, cells = piece.cells) {
  return cells.map(([x, y, z]) => [piece.x + x - 3, piece.y + y, piece.z + z - 3]);
}
function isBlocked(piece, cells = piece.cells, dx = 0, dy = 0, dz = 0) {
  return worldCells({ ...piece, x: piece.x + dx, y: piece.y + dy, z: piece.z + dz }, cells).some(([x, y, z]) => x < -3 || x > 3 || z < -3 || z > 3 || y < board.minY || settled.has(keyOf(x, y, z)));
}
function createPieceMeshes(piece, target, ghost = false) {
  target.clear();
  for (const [x, y, z] of worldCells(piece)) {
    const mesh = new THREE.Mesh(ghost ? ghostGeometry : cubeGeometry, materialFor(piece.color, ghost));
    mesh.position.set(x, y, z);
    target.add(mesh);
  }
}
function updateProjection() {
  projectionGroup.clear();
  if (!projectionEnabled || !activePiece || gameOver) return;
  const ghost = { ...activePiece, cells: activePiece.cells.map(cell => [...cell]) };
  while (!isBlocked(ghost, ghost.cells, 0, -1, 0)) ghost.y -= 1;
  createPieceMeshes(ghost, projectionGroup, true);
}
function updateActiveMeshes() { if (activePiece) createPieceMeshes(activePiece, activeGroup); updateProjection(); }
function updateSettledMeshes() {
  settledGroup.clear();
  for (const [position, color] of settled) {
    const [x, y, z] = position.split(',').map(Number);
    const mesh = new THREE.Mesh(cubeGeometry, materialFor(color));
    mesh.position.set(x, y, z);
    settledGroup.add(mesh);
  }
}
function setStatus(text) { statusLabel.textContent = text; }
function setScore(value) { score = value; scoreLabel.textContent = `Score: ${score}`; }
function spawnPiece() {
  activePiece = createPiece();
  if (isBlocked(activePiece)) endGame();
  updateActiveMeshes();
}
function move(dx, dz) {
  if (paused || gameOver || !activePiece || isBlocked(activePiece, activePiece.cells, dx, 0, dz)) return;
  activePiece.x += dx;
  activePiece.z += dz;
  updateActiveMeshes();
}
function rotate(axis) {
  if (paused || gameOver || !activePiece) return;
  const rotated = rotateCells(activePiece.cells, axis);
  if (!isBlocked(activePiece, rotated)) { activePiece.cells = rotated; updateActiveMeshes(); }
}
function tickDown() {
  if (paused || gameOver || !activePiece) return;
  if (!isBlocked(activePiece, activePiece.cells, 0, -1, 0)) { activePiece.y -= 1; updateActiveMeshes(); return; }
  for (const [x, y, z] of worldCells(activePiece)) settled.set(keyOf(x, y, z), activePiece.color);
  clearLayers();
  activeGroup.clear();
  spawnPiece();
}
function clearLayers() {
  const layers = new Map();
  for (const position of settled.keys()) {
    const y = Number(position.split(',')[1]);
    layers.set(y, (layers.get(y) || 0) + 1);
  }
  const complete = [...layers.entries()].filter(([, count]) => count >= board.width * board.depth).map(([y]) => y);
  if (!complete.length) { updateSettledMeshes(); return; }
  const next = new Map();
  for (const [position, color] of settled) {
    const [x, y, z] = position.split(',').map(Number);
    if (complete.includes(y)) continue;
    const shift = complete.filter(layer => layer > y).length;
    next.set(keyOf(x, y - shift, z), color);
  }
  settled = next;
  setScore(score + complete.length * 100);
  updateSettledMeshes();
}
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  setStatus(paused ? 'Paused' : projectionEnabled ? 'Projection on' : 'Playing');
}
function toggleProjection() {
  projectionEnabled = !projectionEnabled;
  setStatus(projectionEnabled ? 'Projection on' : paused ? 'Paused' : 'Playing');
  updateProjection();
}
function endGame() {
  gameOver = true;
  activeGroup.clear();
  projectionGroup.clear();
  setStatus('Game over');
  gameOverPanel.hidden = false;
}
function restart() {
  settled = new Map();
  setScore(0);
  paused = false;
  gameOver = false;
  projectionEnabled = false;
  gameOverPanel.hidden = true;
  setStatus('Playing');
  updateSettledMeshes();
  spawnPiece();
}
function handleKey(key) {
  const normalized = key.toLowerCase();
  if (normalized === 'a') move(-1, 0);
  else if (normalized === 'd') move(1, 0);
  else if (normalized === 'w') move(0, -1);
  else if (normalized === 's') move(0, 1);
  else if (normalized === '1') rotate('x');
  else if (normalized === '2') rotate('y');
  else if (normalized === '3') rotate('z');
  else if (normalized === '7') toggleProjection();
  else if (normalized === '8') togglePause();
  else if (normalized === ' ') { if (!paused && !gameOver && activePiece) activePiece.fallingFast = true; }
}

const buttonKeys = { left: 'a', right: 'd', top: 'w', bottom: 's', across: '1', row: '2', vertical: '3' };
for (const [id, key] of Object.entries(buttonKeys)) document.querySelector(`#${id}`).addEventListener('click', () => handleKey(key));
document.querySelector('#pause').addEventListener('click', togglePause);
document.querySelector('#cast').addEventListener('click', toggleProjection);
document.querySelector('#acce').addEventListener('click', () => { if (activePiece) activePiece.fallingFast = true; });
restartButton.addEventListener('click', restart);
window.addEventListener('keydown', event => { if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault(); handleKey(event.key); });

stage.addEventListener('pointerdown', event => { pointerState = { id: event.pointerId, x: event.clientX, y: event.clientY }; stage.setPointerCapture(event.pointerId); });
stage.addEventListener('pointermove', event => {
  if (!pointerState || pointerState.id !== event.pointerId) return;
  cameraAzimuth -= (event.clientX - pointerState.x) * .008;
  cameraElevation = THREE.MathUtils.clamp(cameraElevation + (event.clientY - pointerState.y) * .008, -.2, 1.2);
  pointerState.x = event.clientX; pointerState.y = event.clientY; updateCamera();
});
stage.addEventListener('pointerup', () => { pointerState = null; });
stage.addEventListener('pointercancel', () => { pointerState = null; });

function updateCamera() {
  const horizontal = Math.cos(cameraElevation) * cameraDistance;
  camera.position.set(Math.sin(cameraAzimuth) * horizontal, Math.sin(cameraElevation) * cameraDistance, Math.cos(cameraAzimuth) * horizontal);
  camera.lookAt(0, 0, 0);
}
function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function frame(now) {
  const delta = Math.min((now - lastTime) / 1000, .1);
  lastTime = now;
  if (!paused && !gameOver && activePiece) {
    fallAccumulator += delta * (activePiece.fallingFast ? 25 : 1);
    const interval = activePiece.fallingFast ? .035 : .75;
    while (fallAccumulator >= interval) { fallAccumulator -= interval; tickDown(); if (!activePiece || gameOver) break; }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize, { passive: true });
updateCamera();
resize();
restart();
requestAnimationFrame(frame);
