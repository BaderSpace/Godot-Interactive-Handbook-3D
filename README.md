# Godot 4.7 — Interactive 3D Handbook

79 lessons on Godot 4.x, 72 of them with a live 3D viewport you can drive.
Content verified against the **Godot 4.7 stable** docs (August 2026).

## Running it

The lessons live in separate `js/*.js` files, and browsers refuse to fetch those
over `file://`. So it needs a local server:

- **Windows:** double-click `serve.bat` — it starts Python's server and opens the page.
- **Manually:** `python -m http.server 8000`, then open <http://localhost:8000/>

Opening `index.html` directly shows a notice explaining this rather than a blank page.

## Layout

| File | What's in it |
|---|---|
| `index.html` | Page shell and the CDN script tags |
| `css/styles.css` | All styling |
| `js/three-scene.js` | The `useThreeScene` hook, the `DEMOS` registry, shared UI parts |
| `js/topics.js` | Every lesson's title, prose and reference snippet |
| `js/demos-core.js` | Basics + 3D Core viewports |
| `js/demos-motion.js` | Movement, camera and navigation viewports |
| `js/demos-physics.js` | Physics viewports |
| `js/demos-visuals.js` | Animation, skeleton, rendering viewports |
| `js/demos-misc.js` | Game logic, performance, workflow viewports |
| `js/app.js` | Sidebar, search, routing |

`godot_4_x_mastery.html` is the original single-file version, kept for reference.
Nothing loads it any more.

## Adding a lesson

1. Add an entry to `TOPICS` in `js/topics.js` with a unique `id` and a `category`
   from the `CATEGORIES` list. Add `since: '4.7'` for a version badge.
2. If it needs a 3D viewport, add `DEMOS.<that same id> = () => {...}` in whichever
   `js/demos-*.js` fits. No switch statement to update — the registry is keyed by id.

A demo looks like this:

```jsx
DEMOS.my_lesson = () => {
    const containerRef = useRef(null);
    const [value, setValue] = useState(1);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, elapsed) => {
        if (!objects.cube) {                       // build once
            objects.cube = mkMesh(new THREE.BoxGeometry(1, 1, 1), GODOT_BLUE);
            scene.add(objects.cube);
        }
        objects.cube.rotation.y += value * delta;  // multiply by delta, like Godot
    }, null, { cameraPos: [3, 4, 6], lookAt: [0, 1, 0] });

    return (
        <Demo containerRef={containerRef} hint="caption in the viewport corner"
            code={`rotate_y(${value} * delta)`}>
            <Slider label="speed" value={value} min={0} max={5} onChange={setValue} />
        </Demo>
    );
};
```

## Viewport controls

Every viewport supports **drag to orbit** and **scroll to zoom** (clamped to a
sensible range), plus a **Reset** button that rebuilds the scene, the camera and
every control from scratch. A click that does not travel more than a few pixels
still counts as a click, so pick-based demos work alongside dragging.

Three demos own their camera and opt out with `orbit: false` —
CharacterBody3D (chase cam), First-Person Mouse Look (its own drag), and
VehicleBody3D (chase cam). Pass `orbit={false}` to `<Demo>` there too so the
caption matches.

To animate the camera in a demo, write to `objects.orbit` (`target`, `theta`,
`phi`, `radius`) rather than `camera.position` — the hook applies orbit before
`onUpdate`, so anything you write to the camera directly fights the user.

Movement demos read the real **WASD / arrow keys** through `<DPad>` as well as
the on-screen buttons. `DPad` calls `preventDefault()` on those keys, and the
lesson-switching arrow shortcut skips events that are already handled.

Rules that keep the viewports healthy:

- Build meshes once inside `if (!objects.x)`, never per frame — a fresh geometry
  every frame leaks GPU memory.
- Multiply motion by `delta`, not by a fixed per-frame amount.
- Read fast-changing React state through a ref (`st.current`), and throttle any
  `setState` you call from the render loop.
- Free anything you create later with `destroy(parent, child)`; stash custom
  teardown on `objects.dispose`.
- Make sure the `if (!objects.X)` guard actually assigns `objects.X` inside the
  block. If it does not, the demo rebuilds its whole scene every frame — it
  looks like a smeared render, and it is what the self-test's leak check exists
  to catch.

Options for `useThreeScene`: `cameraPos`, `lookAt`, `fov`, `grid`, `axes`,
`background`, `shadows`, `orbit`, `zoomRange`. Helpers: `mkMesh`, `mkStd`, `mkFloor`, `mkWireBox`,
`capsuleGeometry`, `mkTextSprite`, `destroy`. UI parts: `Demo`, `Slider`,
`Toggle`, `Choice`, `Status`, `Note`, `DPad`, `CodeBlock`.

## Notes

- Three.js is pinned to r128, which predates `CapsuleGeometry` — use the
  `capsuleGeometry()` helper instead.
- The `AreaLight3D` and Global Illumination viewports approximate their effects
  (three.js has no direct equivalent); the captions say so where it matters.
- Arrow keys move between lessons. The URL hash deep-links to one.
