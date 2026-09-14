# Rubik Cube 3D

Rubik Cube 3D is a browser-based WebGL falling-block game. Pieces are built from small cubes, fall inside a 3D playfield, and can be moved, accelerated, rotated, and projected before landing.

## Features

- 3D falling pieces rendered with Three.js
- WASD movement with keyboard and on-screen controls
- Spacebar or **Accelerate** for fast falling
- Pause and resume with `8` or **Pause**
- Landing projection with `7` or **Projection**
- Three deformation/rotation actions with `1`, `2`, and `3`
- Pointer-based mouse and touch camera interaction
- Responsive layout for desktop and mobile screens
- Keyboard-accessible on-screen controls
- Colored pieces, line clearing, score tracking, and game-over state
- No backend or API key required
- No npm installation required for the current version

## Run locally

The current version is a static site. It imports a pinned Three.js ES module from jsDelivr, so you do not need npm, Node.js, or a build step to run it. You do need internet access when the page loads.

The most reliable option is to serve the project directory with any local HTTP server:

```powershell
python -m http.server 8080
```

Open [http://localhost:8080/RubikCube3D.html](http://localhost:8080/RubikCube3D.html) in a modern browser.

If Python is installed, the command above is enough. Opening `RubikCube3D.html` directly may also work in Chromium-based browsers, but a local server is more reliable for module loading and browser security rules.

### Do I need npm?

No. npm is not required for the current project. The game is intentionally build-free and loads the pinned renderer directly in [game.js](game.js).

Node.js and npm would only be needed if you later want to:

- Bundle Three.js locally instead of loading it from jsDelivr
- Add a Vite or another frontend build pipeline
- Add automated JavaScript tests and linting
- Pin and manage the renderer through `package.json`

The game can be modernized further with a local npm bundle, but installing npm is not necessary to use or maintain the current browser version.

## Controls

| Action | Keyboard | Touch / mouse |
| --- | --- | --- |
| Move | `W`, `A`, `S`, `D` | Direction pad |
| Accelerate | Space | **Accelerate** |
| Pause / resume | `8` | **Pause** |
| Toggle landing projection | `7` | **Projection** |
| Rotate piece | `1`, `2`, `3` | **Rotate A**, **Rotate B**, **Rotate C** |
| Orbit the camera | Drag | Drag on the game area |

The current view direction determines how movement keys map to the playfield, so rotating the camera changes the visual orientation without changing the piece rules.

## Project structure

```text
RubikCube3D/
├── RubikCube3D.html  # Responsive game shell and controls
├── game.js           # Modern module-based game engine and render loop
└── styles.css        # Responsive game presentation
```

## Browser requirements

Use a current Chrome, Edge, Firefox, or Safari release with WebGL enabled and network access to load the pinned Three.js module. The game does not send data to a server and does not require API keys, accounts, or environment variables.
