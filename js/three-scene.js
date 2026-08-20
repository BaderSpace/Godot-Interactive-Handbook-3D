/* Shared 3D viewport hook + small UI primitives used by every lesson demo.
   Loaded before all demos-*.js files. */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* Demo registry: key = topic id from topics.js, value = React component.
   A topic without an entry here renders its static code block instead. */
const DEMOS = {};

const GODOT_BLUE = 0x478cbf;

/* Recursively free GPU resources so switching lessons does not leak. */
function disposeObject(obj) {
    obj.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        const mat = node.material;
        if (!mat) return;
        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
            Object.values(m).forEach((v) => {
                if (v && v.isTexture) v.dispose();
            });
            m.dispose();
        });
    });
}

/* Remove a child from its parent and free it. */
function destroy(parent, child) {
    if (!child) return;
    parent.remove(child);
    disposeObject(child);
}

/**
 * Boots a Three.js scene into containerRef and drives a render loop.
 *
 * onUpdate(scene, camera, renderer, objects, delta, elapsed)
 *   `objects` is a persistent scratch object — build meshes on first call and
 *   stash them there. `delta` is seconds since the previous frame, so demos
 *   stay frame-rate independent the same way Godot's `delta` does.
 * onClick(raycaster, scene, camera)  — optional, fires on pointerdown.
 * opts { grid, axes, background, cameraPos, fov, shadows }
 */
const useThreeScene = (containerRef, onUpdate, onClick, opts = {}) => {
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const objectsRef = useRef({});
    const frameIdRef = useRef(null);
    const onUpdateRef = useRef(onUpdate);
    const onClickRef = useRef(onClick);
    const optsRef = useRef(opts);

    // Keep the callbacks fresh without restarting the scene every render.
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onClickRef.current = onClick;
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (typeof THREE === 'undefined') {
            container.innerHTML =
                '<div style="color:#ff8080;padding:1rem;font-family:monospace">' +
                'Three.js failed to load — check your internet connection.</div>';
            return;
        }

        const o = optsRef.current;
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(o.background !== undefined ? o.background : 0x202020);

        if (o.grid !== false) scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x333333));
        if (o.axes !== false) scene.add(new THREE.AxesHelper(2));

        const camera = new THREE.PerspectiveCamera(o.fov || 45, width / height, 0.1, 200);
        const cp = o.cameraPos || [3, 4, 6];
        const la = o.lookAt || [0, 0, 0];
        camera.position.set(cp[0], cp[1], cp[2]);
        camera.lookAt(la[0], la[1], la[2]);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        if (o.shadows) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        if (o.shadows) {
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.set(1024, 1024);
        }
        scene.add(dirLight);

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        objectsRef.current = {};

        // --- Orbit / zoom, plus click picking ---
        // Demos can steer the camera by writing to objects.orbit instead of
        // touching camera.position, so user input and demo motion never fight.
        const offset = camera.position.clone().sub(new THREE.Vector3(la[0], la[1], la[2]));
        const startRadius = Math.max(0.5, offset.length());
        const orbit = {
            enabled: o.orbit !== false,
            target: new THREE.Vector3(la[0], la[1], la[2]),
            theta: Math.atan2(offset.x, offset.z),
            phi: Math.acos(THREE.MathUtils.clamp(offset.y / startRadius, -1, 1)),
            radius: startRadius,
            min: (o.zoomRange && o.zoomRange[0]) || startRadius * 0.3,
            max: (o.zoomRange && o.zoomRange[1]) || startRadius * 2.6,
            userMoved: false,
        };
        objectsRef.current.orbit = orbit;

        const applyOrbit = () => {
            orbit.phi = THREE.MathUtils.clamp(orbit.phi, 0.08, Math.PI - 0.08);
            orbit.radius = THREE.MathUtils.clamp(orbit.radius, orbit.min, orbit.max);
            const s = Math.sin(orbit.phi);
            camera.position.set(
                orbit.target.x + orbit.radius * s * Math.sin(orbit.theta),
                orbit.target.y + orbit.radius * Math.cos(orbit.phi),
                orbit.target.z + orbit.radius * s * Math.cos(orbit.theta));
            camera.lookAt(orbit.target);
        };

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const el = renderer.domElement;
        let drag = null;

        const pick = (event) => {
            if (!onClickRef.current) return;
            const rect = el.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, objectsRef.current.cameraOverride || camera);
            onClickRef.current(raycaster, scene, camera);
        };

        const onPointerDown = (event) => {
            if (event.button !== 0 && event.pointerType === 'mouse') return;
            drag = { x: event.clientX, y: event.clientY, moved: 0, id: event.pointerId };
            el.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            drag.x = event.clientX;
            drag.y = event.clientY;
            drag.moved += Math.abs(dx) + Math.abs(dy);
            if (!orbit.enabled) return;
            orbit.theta -= dx * 0.007;
            orbit.phi -= dy * 0.007;
            orbit.userMoved = true;
        };
        const onPointerUp = (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            // A tap is a pick; anything that travelled was an orbit drag.
            if (drag.moved < 6) pick(event);
            if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
            drag = null;
        };
        const onWheel = (event) => {
            if (!orbit.enabled) return;
            event.preventDefault();
            orbit.radius *= 1 + THREE.MathUtils.clamp(event.deltaY, -120, 120) * 0.0016;
            orbit.userMoved = true;
        };
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('wheel', onWheel, { passive: false });
        // Viewport drags are always ours, never a page scroll.
        el.style.touchAction = 'none';

        // --- Keep the viewport correct when the layout changes ---
        const resize = () => {
            const w = Math.max(1, container.clientWidth);
            const h = Math.max(1, container.clientHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        if (observer) observer.observe(container);
        window.addEventListener('resize', resize);

        // --- Render loop ---
        const clock = new THREE.Clock();
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1); // clamp after tab-switch stalls
            // Orbit first, so a demo that owns its camera can still override.
            if (orbit.enabled) applyOrbit();
            if (onUpdateRef.current) {
                onUpdateRef.current(scene, camera, renderer, objectsRef.current, delta, clock.elapsedTime);
            }
            // A demo can swap the camera (e.g. to show an orthographic projection)
            // by stashing one in objects.cameraOverride.
            renderer.render(scene, objectsRef.current.cameraOverride || camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(frameIdRef.current);
            if (observer) observer.disconnect();
            window.removeEventListener('resize', resize);
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('wheel', onWheel);
            // Demos may stash render targets / listeners; let them clean up.
            if (typeof objectsRef.current.dispose === 'function') objectsRef.current.dispose();
            disposeObject(scene);
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer.dispose();
            sceneRef.current = null;
        };
    }, []);

    return { sceneRef, cameraRef, rendererRef, objectsRef };
};

/* ------------------------------------------------------------------ */
/* UI primitives                                                       */
/* ------------------------------------------------------------------ */

const CodeBlock = ({ code, lang = 'gdscript' }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (window.Prism && ref.current) window.Prism.highlightElement(ref.current);
    }, [code, lang]);
    return (
        <div className="mt-4 code-block p-4 rounded text-sm text-gray-300">
            <pre><code ref={ref} className={`language-${lang}`}>{code}</code></pre>
        </div>
    );
};

/* App provides a callback that remounts the current demo — that resets the
   scene, the camera and every control in one go. */
const ResetContext = React.createContext(null);

/* Standard demo frame: viewport on top, controls, then generated GDScript.
   `orbit={false}` hides the drag/zoom caption for demos that own the camera. */
const Demo = ({ containerRef, hint, children, code, lang, cursor, orbit = true }) => {
    const reset = React.useContext(ResetContext);
    return (
        <div>
            <div className={`canvas-container mb-4 ${cursor || ''}`} ref={containerRef}>
                {hint && <div className="viewport-hint">{hint}</div>}
                {orbit && <div className="viewport-hint viewport-hint-right">drag to orbit · scroll to zoom</div>}
                {reset && (
                    <button className="viewport-reset" onClick={reset} title="Reset this scene">
                        ⟲ Reset
                    </button>
                )}
            </div>
            {children && <div className="panel">{children}</div>}
            {code && <CodeBlock code={code} lang={lang} />}
        </div>
    );
};

const Slider = ({ label, value, onChange, min = 0, max = 1, step = 0.01, color = 'accent-blue-500' }) => (
    <div className="space-y-1">
        <label className="block text-xs font-bold text-gray-400">
            {label} <span className="text-blue-300 font-mono">{typeof value === 'number' ? value.toFixed(2).replace(/\.00$/, '') : value}</span>
        </label>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={`w-full ${color}`}
        />
    </div>
);

const Toggle = ({ label, value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        className={`px-4 py-2 rounded font-bold text-sm transition-colors ${
            value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
        }`}
    >
        {label}: {value ? 'ON' : 'OFF'}
    </button>
);

const Choice = ({ options, value, onChange, className = '' }) => (
    <div className={`flex flex-wrap justify-center gap-2 ${className}`}>
        {options.map((opt) => {
            const key = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            return (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={`px-4 py-2 rounded font-bold text-sm transition-colors ${
                        value === key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    {label}
                </button>
            );
        })}
    </div>
);

const Status = ({ label, value, good }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className={`px-3 py-1 rounded font-bold text-sm ${
            good ? 'bg-green-700 text-green-100' : 'bg-red-800 text-red-100'
        }`}>{value}</span>
    </div>
);

const Note = ({ children }) => (
    <p className="text-sm text-gray-400 leading-relaxed">{children}</p>
);

/* Directional pad reused by movement demos. Returns {x, y} in [-1, 1].
   Driven by the real WASD / arrow keys as well as the on-screen buttons. */
const KEY_AXIS = {
    KeyW: ['y', -1], ArrowUp: ['y', -1],
    KeyS: ['y', 1], ArrowDown: ['y', 1],
    KeyA: ['x', -1], ArrowLeft: ['x', -1],
    KeyD: ['x', 1], ArrowRight: ['x', 1],
};

const DPad = ({ input, setInput, caption = 'Press WASD / arrow keys, or hold the buttons' }) => {
    const press = (axis, val) => setInput((prev) => ({ ...prev, [axis]: val }));
    const release = (axis) => setInput((prev) => ({ ...prev, [axis]: 0 }));

    useEffect(() => {
        const held = new Set();
        const down = (e) => {
            const hit = KEY_AXIS[e.code];
            if (!hit || e.target.matches('input, textarea, select')) return;
            e.preventDefault();           // arrows must not scroll or change lesson
            held.add(e.code);
            press(hit[0], hit[1]);
        };
        const up = (e) => {
            const hit = KEY_AXIS[e.code];
            if (!hit || !held.has(e.code)) return;
            held.delete(e.code);
            // Keep moving if the opposite key on the same axis is still down.
            const other = [...held].map((c) => KEY_AXIS[c]).find((k) => k[0] === hit[0]);
            if (other) press(other[0], other[1]);
            else release(hit[0]);
        };
        const blur = () => { held.clear(); setInput({ x: 0, y: 0 }); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
        };
    }, []);

    const btn = (axis, val, text) => (
        <button
            className={`key-btn ${input[axis] === val ? 'active' : ''}`}
            // Pointer capture keeps the hold alive even if the cursor slides off.
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); press(axis, val); }}
            onPointerUp={() => release(axis)}
            onPointerCancel={() => release(axis)}
        >{text}</button>
    );
    return (
        <div className="flex flex-col items-center gap-2">
            <p className="text-gray-500 text-xs">{caption}</p>
            <div className="flex gap-2">{btn('y', -1, 'W')}</div>
            <div className="flex gap-2">
                {btn('x', -1, 'A')}
                {btn('y', 1, 'S')}
                {btn('x', 1, 'D')}
            </div>
        </div>
    );
};

/* Helpers shared by many demos. */
const mkMesh = (geom, color, extra = {}) =>
    new THREE.Mesh(geom, new THREE.MeshLambertMaterial({ color, ...extra }));

const mkStd = (geom, params) =>
    new THREE.Mesh(geom, new THREE.MeshStandardMaterial(params));

const mkFloor = (size = 12, color = 0x2a2a2a) => {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    return floor;
};

/* Capsule — the standard character collider shape. three.js r128 predates
   CapsuleGeometry, so build the profile and lathe it. */
const capsuleGeometry = (radius = 0.4, height = 1, segments = 20) => {
    if (THREE.CapsuleGeometry) return new THREE.CapsuleGeometry(radius, height, 8, segments);
    const half = height / 2;
    const cap = 8;
    const pts = [];
    for (let i = 0; i <= cap; i++) {                       // bottom hemisphere
        const a = -Math.PI / 2 + (i / cap) * (Math.PI / 2);
        pts.push(new THREE.Vector2(Math.cos(a) * radius, -half + Math.sin(a) * radius));
    }
    for (let i = 0; i <= cap; i++) {                       // top hemisphere
        const a = (i / cap) * (Math.PI / 2);
        pts.push(new THREE.Vector2(Math.cos(a) * radius, half + Math.sin(a) * radius));
    }
    return new THREE.LatheGeometry(pts, segments);
};

/* Wireframe box outline — used a lot to show Area3D / AABB volumes. */
const mkWireBox = (w, h, d, color) =>
    new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
        new THREE.LineBasicMaterial({ color })
    );

/* Text drawn to a canvas and shown as a camera-facing sprite (Label3D-ish). */
const mkTextSprite = (text, color = '#ffffff', scale = 2) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    // Shrink the font until the label fits — long node names overflowed before.
    let size = 44;
    do {
        ctx.font = `bold ${size}px Arial`;
        size -= 2;
    } while (ctx.measureText(text).width > 244 && size > 12);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        depthTest: false,
    }));
    sprite.scale.set(scale, scale / 2, 1);
    return sprite;
};
