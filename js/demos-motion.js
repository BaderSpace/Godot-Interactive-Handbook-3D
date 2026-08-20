/* Interactive demos: Movement & Camera, Navigation. */

/* Height of the demo terrain at a given x — flat ground plus one ramp. */
const rampHeight = (x, slopeDeg) => {
    const rise = Math.tan(THREE.MathUtils.degToRad(slopeDeg)) * 3;
    if (x <= 1) return 0;
    if (x >= 4) return rise;
    return ((x - 1) / 3) * rise;
};

DEMOS.character_body = () => {
    const containerRef = useRef(null);
    const [input, setInput] = useState({ x: 0, y: 0 });
    const [jump, setJump] = useState(0);
    const [onFloor, setOnFloor] = useState(true);
    const [speedRead, setSpeedRead] = useState(0);
    const inputRef = useRef(input);
    const jumpRef = useRef(0);
    inputRef.current = input;
    jumpRef.current = jump;

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.body) {
            scene.add(mkFloor(16, 0x2b2b2b));

            // Ramp (26.5 deg) built from a rotated box.
            const rise = rampHeight(4, 26.5);
            const ramp = mkMesh(new THREE.BoxGeometry(3.4, 0.2, 4), 0x556070);
            ramp.position.set(2.5, rise / 2, 0);
            ramp.rotation.z = -Math.atan2(rise, 3);
            scene.add(ramp);
            const plateau = mkMesh(new THREE.BoxGeometry(3, 0.2, 4), 0x556070);
            plateau.position.set(5.5, rise, 0);
            scene.add(plateau);

            const wall = mkMesh(new THREE.BoxGeometry(1, 2, 4), 0x8a5a3a);
            wall.position.set(-3.5, 1, 0);
            scene.add(wall);
            objects.wall = wall;

            objects.body = mkMesh(capsuleGeometry(0.4, 1.0), GODOT_BLUE);
            objects.body.position.set(-1, 0.9, 0);
            scene.add(objects.body);
            objects.body.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1.3, 0xffdd44));

            objects.vel = new THREE.Vector3();
            objects.wasFloor = true;
            objects.readTimer = 0;
            objects.lastJump = jumpRef.current;   // or it jumps once on load
        }

        const HALF = 0.9;          // capsule half-height
        const SPEED = 5.0;
        const JUMP_V = 5.0;
        const GRAVITY = 14.0;
        const p = objects.body.position;
        const v = objects.vel;
        const inp = inputRef.current;

        const groundY = rampHeight(p.x, 26.5) + HALF;
        const grounded = p.y <= groundY + 0.01;

        if (!grounded) v.y -= GRAVITY * delta;
        else if (jumpRef.current !== objects.lastJump) {
            v.y = JUMP_V;
            objects.lastJump = jumpRef.current;
        }

        // Horizontal velocity: accelerate to SPEED, otherwise decay to zero.
        const target = new THREE.Vector3(inp.x, 0, inp.y);
        if (target.lengthSq() > 0) {
            target.normalize().multiplyScalar(SPEED);
            v.x = target.x; v.z = target.z;
        } else {
            v.x = THREE.MathUtils.damp ? THREE.MathUtils.damp(v.x, 0, 12, delta) : 0;
            v.z = THREE.MathUtils.damp ? THREE.MathUtils.damp(v.z, 0, 12, delta) : 0;
        }

        p.addScaledVector(v, delta);

        // Wall: block penetration on the x axis (what move_and_slide does for you).
        const wb = objects.wall.position;
        if (Math.abs(p.x - wb.x) < 0.9 && Math.abs(p.z - wb.z) < 2.4 && p.y - HALF < 2) {
            p.x = p.x > wb.x ? wb.x + 0.9 : wb.x - 0.9;
            v.x = 0;
        }

        const gy = rampHeight(p.x, 26.5) + HALF;
        if (p.y < gy) { p.y = gy; v.y = 0; }
        p.x = THREE.MathUtils.clamp(p.x, -7, 7);
        p.z = THREE.MathUtils.clamp(p.z, -7, 7);

        if (v.lengthSq() > 0.001) {
            const flat = new THREE.Vector3(v.x, 0, v.z);
            if (flat.lengthSq() > 0.01) {
                objects.body.rotation.y = Math.atan2(flat.x, flat.z) + Math.PI;
            }
        }

        const nowFloor = p.y <= gy + 0.01;
        if (nowFloor !== objects.wasFloor) { setOnFloor(nowFloor); objects.wasFloor = nowFloor; }

        // Throttle the readout so it does not re-render 60x a second.
        objects.readTimer += delta;
        if (objects.readTimer > 0.15) {
            objects.readTimer = 0;
            setSpeedRead(Math.hypot(v.x, v.z));
        }

        cam.position.lerp(new THREE.Vector3(p.x + 1, p.y + 5, p.z + 9), 3 * delta);
        cam.lookAt(p.x, p.y, p.z);
    }, null, { cameraPos: [0, 6, 10], grid: false, axes: false, orbit: false });

    return (
        <Demo containerRef={containerRef} orbit={false} hint="walk up the ramp, jump, bump the wall"
            code={`extends CharacterBody3D\n\nconst SPEED := 5.0\nconst JUMP_VELOCITY := 5.0\n\nfunc _physics_process(delta: float) -> void:\n    if not is_on_floor():\n        velocity += get_gravity() * delta\n\n    if Input.is_action_just_pressed("jump") and is_on_floor():\n        velocity.y = JUMP_VELOCITY\n\n    var input := Input.get_vector("left", "right", "forward", "back")\n    var dir := (transform.basis * Vector3(input.x, 0, input.y)).normalized()\n    if dir:\n        velocity.x = dir.x * SPEED\n        velocity.z = dir.z * SPEED\n    else:\n        velocity.x = move_toward(velocity.x, 0.0, SPEED)\n        velocity.z = move_toward(velocity.z, 0.0, SPEED)\n\n    move_and_slide()   # is_on_floor() = ${onFloor}`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <DPad input={input} setInput={setInput} caption="Hold to move" />
                <div className="flex flex-col items-center gap-3">
                    <button className="key-btn px-8" onPointerDown={() => setJump((j) => j + 1)}>SPACE — jump</button>
                    <div className="text-xs font-mono text-gray-400">
                        is_on_floor(): <span className={onFloor ? 'text-green-400' : 'text-red-400'}>{String(onFloor)}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-400">
                        speed: <span className="text-blue-300">{speedRead.toFixed(2)} m/s</span>
                    </div>
                </div>
            </div>
            <Note>move_and_slide() is what makes the capsule glide along the wall instead of sticking to it, and what keeps it planted while walking the ramp.</Note>
        </Demo>
    );
};

DEMOS.floor_settings = () => {
    const containerRef = useRef(null);
    const [slope, setSlope] = useState(30);
    const [maxAngle, setMaxAngle] = useState(46);
    const [snap, setSnap] = useState(true);

    const walkable = slope <= maxAngle;

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.ramp) {
            scene.add(mkFloor(20, 0x2b2b2b));
            objects.ramp = mkMesh(new THREE.BoxGeometry(6.2, 0.25, 4), 0x556070);
            scene.add(objects.ramp);
            objects.body = mkMesh(capsuleGeometry(0.35, 0.9), GODOT_BLUE);
            scene.add(objects.body);
            objects.progress = 0;
        }
        const rad = THREE.MathUtils.degToRad(slope);
        const len = 6;
        const RAMP_HALF = 0.125;     // half the ramp slab's thickness
        const BODY_HALF = 0.8;       // capsule radius + half its cylinder

        // +rotation.z tilts the slab's local +X up-right, matching (cos, sin).
        objects.ramp.rotation.z = rad;
        objects.ramp.position.set(len / 2 * Math.cos(rad) - 1, len / 2 * Math.sin(rad), 0);

        // Climb while the slope is walkable, slide back down the ramp when not.
        if (walkable) {
            objects.progress = Math.min(1, objects.progress + 0.35 * delta);
        } else {
            objects.progress = Math.max(0, objects.progress - 1.1 * delta);
        }
        const d = objects.progress * len;
        // Sit on the surface: offset along the ramp normal, not straight up,
        // or the capsule floats as soon as the ramp tilts.
        const nx = -Math.sin(rad);
        const ny = Math.cos(rad);
        const lift = BODY_HALF + RAMP_HALF;
        objects.body.position.set(
            -1 + d * Math.cos(rad) + nx * lift,
            d * Math.sin(rad) + ny * lift,
            0);
        objects.body.rotation.z = snap ? rad : 0;
        objects.body.material.color.setHex(walkable ? GODOT_BLUE : 0xff5555);
    }, null, { cameraPos: [2, 4.5, 13], lookAt: [2, 1.8, 0], grid: false });

    return (
        <Demo containerRef={containerRef} hint={walkable ? 'is_on_floor() = true' : 'too steep — counts as a wall'}
            code={`func _ready() -> void:\n    floor_max_angle = deg_to_rad(${maxAngle})\n    floor_snap_length = ${snap ? '0.3' : '0.0'}\n    floor_stop_on_slope = true\n    up_direction = Vector3.UP\n\n# slope = ${slope} deg  ->  is_on_floor() = ${walkable}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="Ramp angle (deg)" value={slope} min={0} max={80} step={1} onChange={setSlope} />
                <Slider label="floor_max_angle (deg)" value={maxAngle} min={0} max={80} step={1} onChange={setMaxAngle} />
            </div>
            <div className="flex justify-center mt-4">
                <Toggle label="floor_snap_length" value={snap} onChange={setSnap} />
            </div>
            <Note>Push the ramp past <code>floor_max_angle</code> and the surface stops counting as floor — the body slides back down and <code>is_on_floor()</code> returns false.</Note>
        </Demo>
    );
};

DEMOS.input_handling = () => {
    const containerRef = useRef(null);
    const [input, setInput] = useState({ x: 0, y: 0 });
    const [localSpace, setLocalSpace] = useState(false);
    const inputRef = useRef(input);
    inputRef.current = input;

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.player) {
            scene.add(mkFloor(12));
            objects.player = mkMesh(new THREE.BoxGeometry(0.9, 0.9, 1.2), GODOT_BLUE);
            objects.player.position.y = 0.45;
            scene.add(objects.player);
            objects.player.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1.4, 0xffdd44));
        }
        const inp = inputRef.current;
        const SPEED = 4.0;
        const p = objects.player;

        if (localSpace) {
            // transform.basis * Vector3(x, 0, y) — movement relative to facing
            p.rotation.y -= inp.x * 2.2 * delta;
            const fwd = new THREE.Vector3(0, 0, 1).applyEuler(p.rotation);
            p.position.addScaledVector(fwd, inp.y * SPEED * delta);
        } else {
            p.position.x += inp.x * SPEED * delta;
            p.position.z += inp.y * SPEED * delta;
            if (inp.x || inp.y) p.rotation.y = Math.atan2(inp.x, inp.y) + Math.PI;
        }
        p.position.x = THREE.MathUtils.clamp(p.position.x, -5, 5);
        p.position.z = THREE.MathUtils.clamp(p.position.z, -5, 5);
    });

    return (
        <Demo containerRef={containerRef} hint={localSpace ? 'A/D steer, W/S drive' : 'world-space movement'}
            code={localSpace
                ? `func _physics_process(delta: float) -> void:\n    rotate_y(-Input.get_axis("left", "right") * 2.2 * delta)\n    var f := Input.get_axis("back", "forward")\n    velocity = -transform.basis.z * f * SPEED\n    move_and_slide()`
                : `func _physics_process(delta: float) -> void:\n    var input := Input.get_vector("left", "right", "forward", "back")\n    # input = Vector2(${input.x}, ${input.y})\n    var dir := Vector3(input.x, 0.0, input.y).normalized()\n    velocity.x = dir.x * SPEED\n    velocity.z = dir.z * SPEED\n    move_and_slide()`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <DPad input={input} setInput={setInput} />
                <Toggle label="Relative to facing" value={localSpace} onChange={setLocalSpace} />
            </div>
            <Note>Input.get_vector() normalises for you, so holding W+D is not faster than W alone.</Note>
        </Demo>
    );
};

DEMOS.mouse_look = () => {
    const containerRef = useRef(null);
    const [captured, setCaptured] = useState(false);
    const [look, setLook] = useState({ yaw: 0, pitch: 0 });
    const lookRef = useRef(look);
    lookRef.current = look;

    // Drag inside the viewport stands in for a captured mouse.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let dragging = false;
        let last = null;
        const SENS = 0.005;
        const down = (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; setCaptured(true); };
        const move = (e) => {
            if (!dragging || !last) return;
            const dx = e.clientX - last.x;
            const dy = e.clientY - last.y;
            last = { x: e.clientX, y: e.clientY };
            setLook((p) => ({
                yaw: p.yaw - dx * SENS,
                // clamp so the view never flips over
                pitch: THREE.MathUtils.clamp(p.pitch - dy * SENS, -1.55, 1.55),
            }));
        };
        const up = () => { dragging = false; last = null; setCaptured(false); };
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
            el.removeEventListener('pointerdown', down);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, []);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.built) {
            scene.add(mkFloor(40, 0x262626));
            const palette = [0x478cbf, 0xff6b6b, 0x51cf66, 0xffd43b, 0xcc5de8, 0x22b8cf];
            for (let i = 0; i < 24; i++) {
                const h = 1 + Math.random() * 4;
                const b = mkMesh(new THREE.BoxGeometry(1.2, h, 1.2), palette[i % palette.length]);
                const a = (i / 24) * Math.PI * 2;
                const r = 5 + Math.random() * 10;
                b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
                scene.add(b);
            }
            objects.built = true;
        }
        const l = lookRef.current;
        cam.position.set(0, 1.7, 0);
        cam.rotation.set(0, 0, 0, 'YXZ');
        cam.rotation.order = 'YXZ';
        cam.rotation.y = l.yaw;     // yaw on the body
        cam.rotation.x = l.pitch;   // pitch on the camera
    }, null, { grid: false, axes: false, cameraPos: [0, 1.7, 0], fov: 75, orbit: false });

    return (
        <Demo containerRef={containerRef} orbit={false} cursor={captured ? 'cursor-grabbing' : 'cursor-grab'}
            hint="drag inside the viewport to look around"
            code={`extends CharacterBody3D\n\n@export var sensitivity := 0.005\n@onready var cam: Camera3D = $Camera3D\n\nfunc _ready() -> void:\n    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED\n\nfunc _unhandled_input(event: InputEvent) -> void:\n    if event is InputEventMouseMotion:\n        rotate_y(-event.relative.x * sensitivity)\n        cam.rotate_x(-event.relative.y * sensitivity)\n        cam.rotation.x = clampf(cam.rotation.x, -1.55, 1.55)\n\n    if event.is_action_pressed("ui_cancel"):\n        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE\n\n# yaw   = ${look.yaw.toFixed(2)} rad\n# pitch = ${look.pitch.toFixed(2)} rad  (clamped to +/-1.55)`}>
            <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-500">body rotation.y (yaw)</div>
                    <div className="font-mono text-blue-300">{look.yaw.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-500">camera rotation.x (pitch)</div>
                    <div className={`font-mono ${Math.abs(look.pitch) >= 1.54 ? 'text-red-400' : 'text-green-300'}`}>
                        {look.pitch.toFixed(2)}
                    </div>
                </div>
            </div>
            <Note>Drag up and down until the pitch readout turns red — that is the clamp doing its job. Without it the camera flips upside down.</Note>
        </Demo>
    );
};

DEMOS.camera3d = () => {
    const containerRef = useRef(null);
    const [fov, setFov] = useState(75);
    const [ortho, setOrtho] = useState(false);
    const [size, setSize] = useState(10);
    const [far, setFar] = useState(60);
    const state = useRef({ fov, ortho, size, far });
    state.current = { fov, ortho, size, far };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(80, 0x262626));
            const palette = [0x478cbf, 0xff6b6b, 0x51cf66, 0xffd43b];
            for (let i = 0; i < 14; i++) {
                const b = mkMesh(new THREE.BoxGeometry(1.5, 2 + i * 0.3, 1.5), palette[i % 4]);
                b.position.set(((i % 2) * 2 - 1) * 2.4, 1 + i * 0.15, -i * 2.6);
                scene.add(b);
            }
            objects.ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, -50, 200);
            objects.built = true;
        }
        const s = state.current;
        const aspect = renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight);

        cam.fov = s.fov;
        cam.far = s.far;
        cam.updateProjectionMatrix();

        const o = objects.ortho;
        const half = s.size / 2;
        o.left = -half * aspect; o.right = half * aspect;
        o.top = half; o.bottom = -half;
        o.far = s.far;
        o.position.copy(cam.position);
        o.quaternion.copy(cam.quaternion);
        o.updateProjectionMatrix();

        objects.cameraOverride = s.ortho ? o : null;
    }, null, { grid: false, axes: false, cameraPos: [0, 2.8, 6], lookAt: [0, 1.6, -6], zoomRange: [3, 26] });

    return (
        <Demo containerRef={containerRef} hint={ortho ? 'PROJECTION_ORTHOGONAL — no perspective' : `PROJECTION_PERSPECTIVE — fov ${fov}`}
            code={ortho
                ? `cam.projection = Camera3D.PROJECTION_ORTHOGONAL\ncam.size = ${size.toFixed(1)}      # world units across the viewport\ncam.far = ${far.toFixed(0)}`
                : `cam.projection = Camera3D.PROJECTION_PERSPECTIVE\ncam.fov = ${fov.toFixed(0)}        # vertical field of view, degrees\ncam.near = 0.05\ncam.far = ${far.toFixed(0)}         # anything beyond is clipped away`}>
            <div className="space-y-3">
                <div className="flex justify-center"><Toggle label="Orthographic" value={ortho} onChange={setOrtho} /></div>
                {ortho
                    ? <Slider label="size (world units)" value={size} min={2} max={40} step={0.5} onChange={setSize} />
                    : <Slider label="fov (degrees)" value={fov} min={20} max={140} step={1} onChange={setFov} />}
                <Slider label="far clip (metres)" value={far} min={5} max={120} step={1} onChange={setFar} />
            </div>
            <Note>Drag the far plane down and the back of the corridor is culled away. Switch to orthographic and the boxes stop converging — that is the isometric look.</Note>
        </Demo>
    );
};

DEMOS.spring_arm = () => {
    const containerRef = useRef(null);
    const [length, setLength] = useState(5);
    const [yaw, setYaw] = useState(30);
    const [pitch, setPitch] = useState(20);
    const [enabled, setEnabled] = useState(true);
    const [actual, setActual] = useState(5);
    const st = useRef({});
    st.current = { length, yaw, pitch, enabled };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.player) {
            scene.add(mkFloor(20, 0x2b2b2b));
            objects.player = mkMesh(capsuleGeometry(0.35, 1), GODOT_BLUE);
            objects.player.position.y = 0.85;
            scene.add(objects.player);

            objects.wall = mkMesh(new THREE.BoxGeometry(0.4, 4, 8), 0x8a5a3a);
            objects.wall.position.set(-3, 2, 0);
            scene.add(objects.wall);

            objects.arm = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
                new THREE.LineBasicMaterial({ color: 0xffdd44 }));
            scene.add(objects.arm);
            objects.cam = mkMesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), 0xffffff);
            scene.add(objects.cam);
            objects.cam.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1, 0x44dd66));
            objects.raycaster = new THREE.Raycaster();
            objects.timer = 0;
        }
        const s = st.current;
        const pivot = objects.player.position.clone().add(new THREE.Vector3(0, 0.7, 0));
        const ry = THREE.MathUtils.degToRad(s.yaw);
        const rp = THREE.MathUtils.degToRad(s.pitch);
        // Arm points backwards along +Z of the pivot, tilted by pitch.
        const dir = new THREE.Vector3(
            Math.sin(ry) * Math.cos(rp), Math.sin(rp), Math.cos(ry) * Math.cos(rp)).normalize();

        let len = s.length;
        if (s.enabled) {
            objects.raycaster.set(pivot, dir);
            objects.raycaster.far = s.length;
            const hits = objects.raycaster.intersectObject(objects.wall, false);
            if (hits.length) len = Math.max(0.4, hits[0].distance - 0.3);  // margin
        }
        const camPos = pivot.clone().addScaledVector(dir, len);
        objects.cam.position.copy(camPos);
        objects.cam.lookAt(pivot);
        objects.arm.geometry.setFromPoints([pivot, camPos]);
        objects.arm.material.color.setHex(len < s.length - 0.01 ? 0xff5555 : 0xffdd44);

        objects.timer += delta;
        if (objects.timer > 0.15) { objects.timer = 0; setActual(len); }
    }, null, { cameraPos: [6, 4.5, 8], lookAt: [-0.6, 1.2, 0], grid: false });

    return (
        <Demo containerRef={containerRef} hint="yellow = free arm · red = pulled in by the wall"
            code={`extends SpringArm3D\n\nfunc _ready() -> void:\n    spring_length = ${length.toFixed(1)}\n    margin = 0.3\n    collision_mask = 1\n    shape = SphereShape3D.new()\n    add_excluded_object(get_parent().get_rid())\n\n# get_hit_length() -> ${actual.toFixed(2)}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Slider label="spring_length" value={length} min={1} max={8} step={0.1} onChange={setLength} />
                <Slider label="pivot yaw (deg)" value={yaw} min={-180} max={180} step={1} onChange={setYaw} />
                <Slider label="pivot pitch (deg)" value={pitch} min={-20} max={70} step={1} onChange={setPitch} />
            </div>
            <div className="flex justify-center mt-4"><Toggle label="Collision" value={enabled} onChange={setEnabled} /></div>
            <Note>Swing the yaw until the arm crosses the wall. With collision on it shortens automatically; switch it off and the camera walks straight through.</Note>
        </Demo>
    );
};

DEMOS.grid_map = () => {
    const containerRef = useRef(null);
    const [cellSize, setCellSize] = useState(1);
    const [count, setCount] = useState(0);
    const cellRef = useRef(1);
    cellRef.current = cellSize;

    const { objectsRef } = useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.tiles) {
            objects.tiles = new Map();
            objects.group = new THREE.Group();
            scene.add(objects.group);
            objects.plane = new THREE.Mesh(
                new THREE.PlaneGeometry(24, 24),
                new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
            objects.plane.rotation.x = -Math.PI / 2;
            scene.add(objects.plane);
            objects.cursor = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0xffdd44, wireframe: true }));
            scene.add(objects.cursor);
            objects.gridSize = -1;
        }
        if (objects.gridSize !== cellSize) {
            destroy(scene, objects.grid);
            objects.grid = new THREE.GridHelper(12, Math.round(12 / cellSize), 0x777777, 0x3a3a3a);
            scene.add(objects.grid);
            objects.gridSize = cellSize;
            // Cells change meaning when the size changes — clear the map.
            objects.tiles.forEach((m) => destroy(objects.group, m));
            objects.tiles.clear();
        }
        const raw = new THREE.Vector3(Math.sin(t * 0.7) * 4, 0, Math.cos(t * 0.45) * 4);
        const cx = Math.floor(raw.x / cellSize);
        const cz = Math.floor(raw.z / cellSize);
        objects.cursor.position.set((cx + 0.5) * cellSize, cellSize / 2, (cz + 0.5) * cellSize);
        objects.cursor.scale.setScalar(cellSize);
    }, (raycaster, scene) => {
        const objects = objectsRef.current;
        if (!objects || !objects.plane) return;
        const hits = raycaster.intersectObject(objects.plane, false);
        if (!hits.length) return;
        const size = cellRef.current;
        const p = hits[0].point;
        const cx = Math.floor(p.x / size);
        const cz = Math.floor(p.z / size);
        const key = cx + ',' + cz;
        if (objects.tiles.has(key)) {
            destroy(objects.group, objects.tiles.get(key));   // set_cell_item(INVALID)
            objects.tiles.delete(key);
        } else {
            const tile = mkMesh(new THREE.BoxGeometry(size * 0.94, size * 0.6, size * 0.94), GODOT_BLUE);
            tile.position.set((cx + 0.5) * size, size * 0.3, (cz + 0.5) * size);
            objects.group.add(tile);
            objects.tiles.set(key, tile);
        }
        setCount(objects.tiles.size);
    }, { cameraPos: [0, 6, 7], lookAt: [0, 0, 0], grid: false });

    return (
        <Demo containerRef={containerRef} cursor="cursor-crosshair"
            hint="click the grid to place or clear a tile"
            code={`@onready var grid: GridMap = $GridMap\n\nfunc place(world_pos: Vector3, tile_id: int) -> void:\n    var cell := grid.local_to_map(grid.to_local(world_pos))\n    grid.set_cell_item(cell, tile_id)\n\nfunc clear_cell(cell: Vector3i) -> void:\n    grid.set_cell_item(cell, GridMap.INVALID_CELL_ITEM)\n\n# grid.cell_size = Vector3.ONE * ${cellSize}\n# ${count} cells filled`}>
            <Slider label="cell_size" value={cellSize} min={0.5} max={2} step={0.5} onChange={setCellSize} />
            <Note>local_to_map() floors the position into integer cell coordinates; map_to_local() gives you back the cell centre. Changing cell_size re-maps every coordinate, so the tiles clear.</Note>
        </Demo>
    );
};

DEMOS.path_follow = () => {
    const containerRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [auto, setAuto] = useState(true);
    const [oriented, setOriented] = useState(true);
    const st = useRef({});
    st.current = { auto, oriented };
    const progRef = useRef(0);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.curve) {
            objects.curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-4, 0.3, -2), new THREE.Vector3(-1, 2.5, 2),
                new THREE.Vector3(2, 1, -2), new THREE.Vector3(4, 0.3, 3),
                new THREE.Vector3(0, 0.5, 4),
            ], true);
            const pts = objects.curve.getPoints(120);
            objects.line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: 0xff5555 }));
            scene.add(objects.line);
            pts.filter((_, i) => i % 24 === 0).forEach((p) => {
                const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
                d.position.copy(p);
                scene.add(d);
            });
            objects.follower = mkMesh(new THREE.ConeGeometry(0.3, 0.9, 12), 0x478cbf);
            objects.follower.geometry.rotateX(-Math.PI / 2);
            scene.add(objects.follower);
            objects.t = 0;
        }
        const s = st.current;
        if (s.auto) {
            objects.t = (objects.t + delta * 0.12) % 1;
            if (Math.abs(objects.t - progRef.current) > 0.02) {
                progRef.current = objects.t;
                setProgress(objects.t);
            }
        } else {
            objects.t = progRef.current;
        }
        const p = objects.curve.getPointAt(objects.t);
        objects.follower.position.copy(p);
        if (s.oriented) {
            const ahead = objects.curve.getPointAt((objects.t + 0.01) % 1);
            objects.follower.lookAt(ahead);
        } else {
            objects.follower.rotation.set(0, 0, 0);
        }
    }, null, { cameraPos: [0, 7, 9] });

    return (
        <Demo containerRef={containerRef} hint="Curve3D points shown in yellow"
            code={`extends PathFollow3D\n\nfunc _ready() -> void:\n    rotation_mode = PathFollow3D.${oriented ? 'ROTATION_ORIENTED' : 'ROTATION_NONE'}\n    loop = true\n    cubic_interp = true\n\nfunc _process(delta: float) -> void:\n    progress_ratio = ${progress.toFixed(2)}\n    # or: progress += speed * delta   (metres)`}>
            <Slider label="progress_ratio" value={progress} min={0} max={1} step={0.01}
                onChange={(v) => { progRef.current = v; setProgress(v); setAuto(false); }} />
            <div className="flex justify-center gap-3 mt-4">
                <Toggle label="Auto" value={auto} onChange={setAuto} />
                <Toggle label="ROTATION_ORIENTED" value={oriented} onChange={setOriented} />
            </div>
            <Note>With rotation_mode set to NONE the follower slides along the curve without turning — fine for a lift, wrong for a car.</Note>
        </Demo>
    );
};

/* ------------------------------------------------------- Navigation */

/* Breadth-first search on a small grid — stands in for the baked navmesh. */
const gridPath = (blocked, start, goal, size) => {
    const key = (c) => c[0] + ',' + c[1];
    const q = [start];
    const from = new Map([[key(start), null]]);
    while (q.length) {
        const cur = q.shift();
        if (cur[0] === goal[0] && cur[1] === goal[1]) break;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of nb) {
            const n = [cur[0] + dx, cur[1] + dz];
            if (n[0] < 0 || n[1] < 0 || n[0] >= size || n[1] >= size) continue;
            if (blocked.has(key(n)) || from.has(key(n))) continue;
            from.set(key(n), cur);
            q.push(n);
        }
    }
    if (!from.has(key(goal))) return null;
    const path = [];
    let c = goal;
    while (c) { path.unshift(c); c = from.get(key(c)); }
    return path;
};

DEMOS.navigation = () => {
    const containerRef = useRef(null);
    const [status, setStatus] = useState('click a floor tile to set target_position');
    const SIZE = 9;
    const blockedRef = useRef(new Set(['3,2', '3,3', '3,4', '3,5', '6,5', '6,6', '6,7', '5,5']));
    const goalRef = useRef([7, 1]);
    const { objectsRef } = useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.built) {
            objects.floor = new THREE.Mesh(
                new THREE.PlaneGeometry(SIZE, SIZE),
                new THREE.MeshLambertMaterial({ color: 0x2f3a33, side: THREE.DoubleSide }));
            objects.floor.rotation.x = -Math.PI / 2;
            objects.floor.position.set(SIZE / 2 - 0.5, 0, SIZE / 2 - 0.5);
            scene.add(objects.floor);
            scene.add(new THREE.GridHelper(SIZE, SIZE, 0x5a6a5f, 0x3a463f)
                .translateX(SIZE / 2 - 0.5).translateZ(SIZE / 2 - 0.5));

            blockedRef.current.forEach((k) => {
                const [x, z] = k.split(',').map(Number);
                const w = mkMesh(new THREE.BoxGeometry(1, 1.2, 1), 0x8a5a3a);
                w.position.set(x, 0.6, z);
                scene.add(w);
            });

            objects.agent = mkMesh(capsuleGeometry(0.25, 0.5), GODOT_BLUE);
            objects.agent.position.set(1, 0.5, 1);
            scene.add(objects.agent);
            objects.flag = mkMesh(new THREE.ConeGeometry(0.25, 0.7, 10), 0x44dd66);
            scene.add(objects.flag);
            objects.pathLine = new THREE.Line(new THREE.BufferGeometry(),
                new THREE.LineBasicMaterial({ color: 0xffdd44 }));
            scene.add(objects.pathLine);
            objects.path = [];
            objects.index = 0;
            objects.built = true;
            objects.needPath = true;
        }
        if (objects.needPath) {
            objects.needPath = false;
            const start = [Math.round(objects.agent.position.x), Math.round(objects.agent.position.z)];
            const p = gridPath(blockedRef.current, start, goalRef.current, SIZE);
            objects.path = p || [];
            objects.index = 0;
            objects.pathLine.geometry.setFromPoints(
                (p || []).map((c) => new THREE.Vector3(c[0], 0.08, c[1])));
            setStatus(p ? `path found — ${p.length} points` : 'no path — the goal is walled off');
        }
        objects.flag.position.set(goalRef.current[0], 0.35, goalRef.current[1]);

        // Steer towards get_next_path_position(), exactly like the GDScript does.
        if (objects.index < objects.path.length) {
            const next = new THREE.Vector3(
                objects.path[objects.index][0], 0.5, objects.path[objects.index][1]);
            const to = next.clone().sub(objects.agent.position);
            if (to.length() < 0.12) objects.index++;
            else objects.agent.position.addScaledVector(to.normalize(), 2.5 * delta);
        }
    }, (raycaster) => {
        const objects = objectsRef.current;
        if (!objects || !objects.floor) return;
        const hits = raycaster.intersectObject(objects.floor, false);
        if (!hits.length) return;
        const cell = [Math.round(hits[0].point.x), Math.round(hits[0].point.z)];
        if (blockedRef.current.has(cell[0] + ',' + cell[1])) { setStatus('that cell is blocked'); return; }
        goalRef.current = cell;
        objects.needPath = true;
    }, { cameraPos: [4, 12, 13], lookAt: [4, 0, 4], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} cursor="cursor-crosshair" hint="click the floor to set a target"
            code={`extends CharacterBody3D\n\n@onready var agent: NavigationAgent3D = $NavigationAgent3D\n\nfunc _ready() -> void:\n    await get_tree().physics_frame   # wait for the navmesh to sync\n\nfunc set_goal(point: Vector3) -> void:\n    agent.target_position = point    # recalculates the path\n\nfunc _physics_process(delta: float) -> void:\n    if agent.is_navigation_finished():\n        return\n    var next := agent.get_next_path_position()\n    velocity = (next - global_position).normalized() * SPEED\n    move_and_slide()`}>
            <Status label="Navigation" value={status} good={!status.startsWith('no path') && !status.startsWith('that cell')} />
            <Note>You never move a NavigationAgent3D. It only answers "where next?" — steering the body is still your job.</Note>
        </Demo>
    );
};

DEMOS.nav_avoidance = () => {
    const containerRef = useRef(null);
    const [avoid, setAvoid] = useState(true);
    const [radius, setRadius] = useState(0.6);
    const st = useRef({});
    st.current = { avoid, radius };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.agents) {
            scene.add(mkFloor(14, 0x2f3a33));
            objects.agents = [];
            const N = 8;
            for (let i = 0; i < N; i++) {
                const a = (i / N) * Math.PI * 2;
                const m = mkMesh(capsuleGeometry(0.28, 0.5),
                    new THREE.Color().setHSL(i / N, 0.6, 0.55).getHex());
                m.position.set(Math.cos(a) * 5, 0.55, Math.sin(a) * 5);
                // Aim just past the opposite side, not at the exact antipode —
                // otherwise all eight agents arrive at dead centre together and
                // pile up instead of flowing around each other.
                const g = a + Math.PI + 0.5;
                m.userData.goal = new THREE.Vector3(Math.cos(g) * 5, 0.55, Math.sin(g) * 5);
                m.userData.home = m.position.clone();
                scene.add(m);
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(0.55, 0.62, 24),
                    new THREE.MeshBasicMaterial({ color: 0xffdd44, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
                ring.rotation.x = -Math.PI / 2;
                ring.position.y = -0.5;
                m.add(ring);
                m.userData.ring = ring;
                objects.agents.push(m);
            }
        }
        const s = st.current;
        objects.agents.forEach((m) => {
            m.userData.ring.visible = s.avoid;
            m.userData.ring.scale.setScalar(s.radius / 0.6);

            const desired = m.userData.goal.clone().sub(m.position);
            const dist = desired.length();
            if (dist < 0.35) {
                // Arrived: retarget to the opposite side. Never move the agent
                // itself — teleporting it is what made the crowd snap and jitter.
                const swap = m.userData.home.clone();
                m.userData.home.copy(m.userData.goal);
                m.userData.goal.copy(swap);
                return;
            }
            // Ease off near the goal so it settles instead of buzzing around it.
            desired.normalize().multiplyScalar(2.4 * Math.min(1, dist / 1.2));

            if (s.avoid) {
                // Cheap local avoidance: push away from anyone inside 2 * radius.
                const push = new THREE.Vector3();
                objects.agents.forEach((o) => {
                    if (o === m) return;
                    const d = m.position.distanceTo(o.position);
                    if (d < s.radius * 2 && d > 0.001) {
                        push.add(m.position.clone().sub(o.position).normalize()
                            .multiplyScalar((s.radius * 2 - d) * 3.0));
                    }
                });
                desired.add(push);
            }
            m.position.addScaledVector(desired, delta);
            m.position.y = 0.55;
        });
    }, null, { cameraPos: [0, 8, 8.5], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={avoid ? 'avoidance_enabled = true' : 'agents walk straight through each other'}
            code={`func _ready() -> void:\n    agent.avoidance_enabled = ${avoid}\n    agent.radius = ${radius.toFixed(2)}\n    agent.max_speed = 2.4\n    agent.velocity_computed.connect(_on_velocity_computed)\n\nfunc _physics_process(delta: float) -> void:\n    var next := agent.get_next_path_position()\n    agent.velocity = (next - global_position).normalized() * SPEED\n\nfunc _on_velocity_computed(safe_velocity: Vector3) -> void:\n    velocity = safe_velocity     # the corrected vector\n    move_and_slide()`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <Toggle label="avoidance_enabled" value={avoid} onChange={setAvoid} />
                <div className="w-full md:w-64">
                    <Slider label="agent.radius" value={radius} min={0.3} max={1.2} step={0.05} onChange={setRadius} />
                </div>
            </div>
            <Note>With avoidance on, the agent stops moving itself — it emits <code>velocity_computed</code> with a corrected vector and you apply that instead.</Note>
        </Demo>
    );
};
