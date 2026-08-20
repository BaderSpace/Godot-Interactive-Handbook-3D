/* Interactive demos: Basics + 3D Core. */

/* ------------------------------------------------------------ Basics */

DEMOS.loops = () => {
    const containerRef = useRef(null);
    const [count, setCount] = useState(4);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        // Rebuild only when the count actually changes — rebuilding every frame
        // would leak a fresh geometry per frame.
        if (objects.count !== count) {
            (objects.orbs || []).forEach((o) => destroy(scene, o));
            objects.orbs = [];
            for (let i = 0; i < count; i++) {
                const orb = mkMesh(new THREE.SphereGeometry(0.4, 20, 16), GODOT_BLUE);
                orb.position.set(i * 1.5 - (count - 1) * 0.75, 0.5, 0);
                scene.add(orb);
                objects.orbs.push(orb);
            }
            objects.count = count;
        }
        objects.orbs.forEach((o, i) => {
            o.position.y = 0.5 + Math.sin(t * 3 + i * 0.6) * 0.15;
        });
    });

    return (
        <Demo containerRef={containerRef} hint="one iteration = one instanced node"
            code={`for i in ${count}:\n    var orb := ORB_SCENE.instantiate()\n    orb.position = Vector3(i * 1.5, 0.5, 0.0)\n    add_child(orb)`}>
            <Slider label="Loop count" value={count} min={1} max={10} step={1}
                onChange={(v) => setCount(Math.round(v))} />
        </Demo>
    );
};

DEMOS.lifecycle = () => {
    const [step, setStep] = useState(0);
    const steps = [
        { name: '_init()', desc: 'Object allocated. No children, no tree, no @onready yet.', color: 'text-gray-400' },
        { name: '_enter_tree()', desc: 'Node joined the SceneTree. Parents enter before children.', color: 'text-blue-400' },
        { name: '_ready()', desc: 'All children are ready. @onready vars are assigned. Children fire before parents.', color: 'text-green-400' },
        { name: '_process(delta)', desc: 'Once per rendered frame. Variable delta.', color: 'text-yellow-400' },
        { name: '_physics_process(delta)', desc: 'Fixed 60 Hz tick. All physics and movement lives here.', color: 'text-orange-400' },
        { name: '_exit_tree()', desc: 'Leaving the tree. Disconnect and release here.', color: 'text-red-400' },
    ];
    return (
        <div className="panel">
            <div className="flex justify-between mb-8 relative overflow-x-auto pb-2">
                <div className="absolute top-4 left-0 w-full h-1 bg-gray-700"></div>
                {steps.map((s, i) => (
                    <div key={i} className="flex flex-col items-center cursor-pointer relative px-1 min-w-[90px]"
                        onClick={() => setStep(i)}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 transition-all ${
                            i === step ? 'bg-white border-blue-500 text-black scale-125' : 'bg-gray-800 border-gray-600 text-gray-500'
                        }`}>{i + 1}</div>
                        <div className="mt-2 text-[10px] font-mono text-gray-400 text-center">{s.name}</div>
                    </div>
                ))}
            </div>
            <div className="bg-gray-900 p-6 rounded-lg text-center min-h-[110px] flex flex-col justify-center items-center">
                <h3 className={`text-xl font-bold mb-2 font-mono ${steps[step].color}`}>{steps[step].name}</h3>
                <p className="text-gray-300 text-sm max-w-lg">{steps[step].desc}</p>
            </div>
            <CodeBlock code={`func ${steps[step].name.replace('(delta)', '(delta: float)')} -> void:\n    # ${steps[step].desc}\n    pass`} />
        </div>
    );
};

DEMOS.delta_time = () => {
    const containerRef = useRef(null);
    const [fps, setFps] = useState(60);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.bad) {
            objects.bad = mkMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), 0xff5555);
            objects.bad.position.set(-4, 1.6, 0);
            scene.add(objects.bad);
            objects.good = mkMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), 0x55cc66);
            objects.good.position.set(-4, 0.5, 0);
            scene.add(objects.good);
            objects.labelBad = mkTextSprite('+= 0.1', '#ff8888', 2.4);
            objects.labelBad.position.set(-6.2, 2.6, 0);
            scene.add(objects.labelBad);
            objects.labelGood = mkTextSprite('*= delta', '#88ee99', 2.4);
            objects.labelGood.position.set(-6.2, 1.5, 0);
            scene.add(objects.labelGood);
            objects.acc = 0;
        }
        // Throttle to the "simulated" framerate so a slow tick is visible.
        objects.acc += delta;
        const stepTime = 1 / fps;
        while (objects.acc >= stepTime) {
            objects.acc -= stepTime;
            objects.bad.position.x += 0.06;                 // per-frame, no delta
            objects.good.position.x += 3.6 * stepTime;      // metres per second
            objects.bad.rotation.y += 0.05;
            objects.good.rotation.y += 3.0 * stepTime;
            if (objects.bad.position.x > 4) objects.bad.position.x = -4;
            if (objects.good.position.x > 4) objects.good.position.x = -4;
        }
    }, null, { cameraPos: [0, 4.5, 13], lookAt: [0, 1.4, 0] });

    return (
        <Demo containerRef={containerRef} hint="red ignores delta · green multiplies by it"
            code={`# Red — speed depends on framerate\nfunc _process(delta: float) -> void:\n    position.x += 0.06\n\n# Green — 3.6 m/s at ${fps} FPS or any other\nfunc _process(delta: float) -> void:\n    position.x += 3.6 * delta`}>
            <Slider label="Simulated framerate (FPS)" value={fps} min={10} max={144} step={1}
                onChange={(v) => setFps(Math.round(v))} />
            <Note>Drag the framerate down. The green cube keeps the same real-world speed; the red one slows to a crawl because it moves a fixed amount per <em>frame</em> instead of per <em>second</em>.</Note>
        </Demo>
    );
};

/* ----------------------------------------------------------- 3D Core */

DEMOS.transform_basic = () => {
    const containerRef = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 1, z: 0 });
    const [rotY, setRotY] = useState(0);
    const [scale, setScale] = useState(1);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.cube) {
            objects.cube = mkMesh(new THREE.BoxGeometry(1, 1, 1), GODOT_BLUE);
            scene.add(objects.cube);
            const local = new THREE.AxesHelper(1.2);
            objects.cube.add(local);
        }
        objects.cube.position.set(pos.x, pos.y, pos.z);
        objects.cube.rotation.y = THREE.MathUtils.degToRad(rotY);
        objects.cube.scale.setScalar(scale);
    });

    return (
        <Demo containerRef={containerRef} hint="small axes = the node's own local basis"
            code={`extends Node3D\n\nfunc _ready() -> void:\n    position = Vector3(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})\n    rotation_degrees.y = ${rotY.toFixed(0)}\n    scale = Vector3.ONE * ${scale.toFixed(2)}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="position.x" value={pos.x} min={-4} max={4} step={0.1} onChange={(v) => setPos({ ...pos, x: v })} />
                <Slider label="position.y" value={pos.y} min={0} max={4} step={0.1} onChange={(v) => setPos({ ...pos, y: v })} />
                <Slider label="rotation_degrees.y" value={rotY} min={0} max={360} step={1} onChange={setRotY} />
                <Slider label="scale" value={scale} min={0.3} max={2.5} step={0.05} onChange={setScale} />
            </div>
        </Demo>
    );
};

DEMOS.vectors = () => {
    const containerRef = useRef(null);
    const [a, setA] = useState({ x: 0, y: 2, z: 0 });
    const [b, setB] = useState({ x: 2, y: 0, z: 0 });

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.arrowA) {
            objects.arrowA = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, 0x44dd66);
            objects.arrowB = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x4488ff);
            objects.arrowR = new THREE.ArrowHelper(new THREE.Vector3(1, 1, 0), new THREE.Vector3(), 1, 0xff5555);
            scene.add(objects.arrowA, objects.arrowB, objects.arrowR);
        }
        const vA = new THREE.Vector3(a.x, a.y, a.z);
        const vB = new THREE.Vector3(b.x, b.y, b.z);
        const vR = new THREE.Vector3().addVectors(vA, vB);
        const set = (arrow, v, origin) => {
            if (v.length() > 0.001) arrow.setDirection(v.clone().normalize());
            arrow.setLength(Math.max(0.001, v.length()), 0.25, 0.15);
            if (origin) arrow.position.copy(origin);
        };
        set(objects.arrowA, vA, new THREE.Vector3());
        set(objects.arrowB, vB, vA);          // tip-to-tail
        set(objects.arrowR, vR, new THREE.Vector3());
    });

    const len = Math.hypot(a.x + b.x, a.y + b.y, a.z + b.z);

    return (
        <Demo containerRef={containerRef} hint="green + blue (tip to tail) = red"
            code={`var a := Vector3(${a.x}, ${a.y}, ${a.z})\nvar b := Vector3(${b.x}, ${b.y}, ${b.z})\nvar sum := a + b            # ${len.toFixed(2)} m long\nvar dir := sum.normalized()`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-2 border-green-500 pl-3 space-y-2">
                    <h4 className="font-bold text-green-400 text-sm">Vector A</h4>
                    <Slider label="a.x" value={a.x} min={-3} max={3} step={0.5} onChange={(v) => setA({ ...a, x: v })} />
                    <Slider label="a.y" value={a.y} min={-3} max={3} step={0.5} onChange={(v) => setA({ ...a, y: v })} />
                </div>
                <div className="border-l-2 border-blue-500 pl-3 space-y-2">
                    <h4 className="font-bold text-blue-400 text-sm">Vector B</h4>
                    <Slider label="b.x" value={b.x} min={-3} max={3} step={0.5} onChange={(v) => setB({ ...b, x: v })} />
                    <Slider label="b.z" value={b.z} min={-3} max={3} step={0.5} onChange={(v) => setB({ ...b, z: v })} />
                </div>
            </div>
        </Demo>
    );
};

DEMOS.cross_product = () => {
    const containerRef = useRef(null);
    const [angle, setAngle] = useState(90);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.arrA) {
            objects.arrA = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, GODOT_BLUE);
            objects.arrB = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 2, 0xff5555);
            objects.arrC = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 2, 0x44dd66);
            scene.add(objects.arrA, objects.arrB, objects.arrC);
        }
        const rad = THREE.MathUtils.degToRad(angle);
        const vA = new THREE.Vector3(1, 0, 0);
        const vB = new THREE.Vector3(Math.cos(rad), 0, -Math.sin(rad));
        objects.arrB.setDirection(vB);
        const vC = new THREE.Vector3().crossVectors(vA, vB);
        const l = vC.length();
        if (l > 0.001) {
            objects.arrC.setDirection(vC.clone().normalize());
            objects.arrC.setLength(2 * l, 0.3, 0.18);
            objects.arrC.visible = true;
        } else {
            objects.arrC.visible = false;
        }
    });

    const rad = THREE.MathUtils ? (angle * Math.PI) / 180 : 0;
    const dot = Math.cos(rad);

    return (
        <Demo containerRef={containerRef} hint="blue x red = green (perpendicular to both)"
            code={`var a := Vector3.RIGHT\nvar b := Vector3(${Math.cos(rad).toFixed(2)}, 0, ${(-Math.sin(rad)).toFixed(2)})\n\nvar d := a.dot(b)      # ${dot.toFixed(2)}  (1 = aligned, 0 = perpendicular)\nvar c := a.cross(b)    # length ${Math.abs(Math.sin(rad)).toFixed(2)}`}>
            <Slider label="Angle between A and B (deg)" value={angle} min={0} max={180} step={1} onChange={setAngle} />
            <div className="grid grid-cols-2 gap-3 mt-3 text-center">
                <div className="bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-500">a.dot(b)</div>
                    <div className="font-mono text-lg text-blue-300">{dot.toFixed(2)}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-500">a.cross(b).length()</div>
                    <div className="font-mono text-lg text-green-300">{Math.abs(Math.sin(rad)).toFixed(2)}</div>
                </div>
            </div>
            <Note>The cross product vanishes when the vectors are parallel — that is why <code>look_at()</code> fails if you aim straight along the up axis.</Note>
        </Demo>
    );
};

DEMOS.basis_orientation = () => {
    const containerRef = useRef(null);
    const [rot, setRot] = useState({ x: 0, y: 30 });

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.pivot) {
            objects.pivot = new THREE.Group();
            scene.add(objects.pivot);
            const cube = mkMesh(new THREE.BoxGeometry(1, 1, 1), 0x333333, { transparent: true, opacity: 0.5 });
            objects.pivot.add(cube);
            objects.pivot.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, 0xff4444));
            objects.pivot.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 2, 0x44dd44));
            objects.pivot.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 2, 0x4488ff));
            // -Z is Godot's "forward"
            objects.fwd = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 2.6, 0xffdd44);
            objects.pivot.add(objects.fwd);
        }
        objects.pivot.rotation.set(
            THREE.MathUtils.degToRad(rot.x), THREE.MathUtils.degToRad(rot.y), 0, 'YXZ');
    });

    const e = new THREE.Euler(THREE.MathUtils.degToRad(rot.x), THREE.MathUtils.degToRad(rot.y), 0, 'YXZ');
    const axis = (v) => v.applyEuler(e);
    const bx = axis(new THREE.Vector3(1, 0, 0));
    const by = axis(new THREE.Vector3(0, 1, 0));
    const bz = axis(new THREE.Vector3(0, 0, 1));
    const f = (v) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

    return (
        <Demo containerRef={containerRef} hint="yellow = -basis.z, the forward direction"
            code={`# basis columns are the node's own axes in world space\nvar right   := global_basis.x   # ${f(bx)}\nvar up      := global_basis.y   # ${f(by)}\nvar forward := -global_basis.z  # ${f(bz.clone().negate())}\n\nposition += forward * speed * delta`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono mb-4">
                <div className="text-red-400">basis.x {f(bx)}</div>
                <div className="text-green-400">basis.y {f(by)}</div>
                <div className="text-blue-400">basis.z {f(bz)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="yaw (deg)" value={rot.y} min={0} max={360} step={1} onChange={(v) => setRot({ ...rot, y: v })} />
                <Slider label="pitch (deg)" value={rot.x} min={-80} max={80} step={1} onChange={(v) => setRot({ ...rot, x: v })} />
            </div>
        </Demo>
    );
};

DEMOS.local_global = () => {
    const containerRef = useRef(null);
    const [parentX, setParentX] = useState(-2);
    const [parentRot, setParentRot] = useState(0);
    const [childX, setChildX] = useState(2);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.parent) {
            objects.parent = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true }));
            scene.add(objects.parent);
            objects.child = mkMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), GODOT_BLUE);
            objects.parent.add(objects.child);
            objects.world = new THREE.Vector3();
        }
        objects.parent.position.x = parentX;
        objects.parent.rotation.y = THREE.MathUtils.degToRad(parentRot);
        objects.child.position.x = childX;
        objects.parent.updateMatrixWorld(true);
        objects.child.getWorldPosition(objects.world);
    });

    const rad = (parentRot * Math.PI) / 180;
    const gx = parentX + childX * Math.cos(rad);
    const gz = -childX * Math.sin(rad);

    return (
        <Demo containerRef={containerRef} hint="wireframe = parent · blue = child"
            code={`# child.position is LOCAL to the parent\nchild.position = Vector3(${childX.toFixed(1)}, 0, 0)\n\n# world space\nchild.global_position  # (${gx.toFixed(2)}, 0.00, ${gz.toFixed(2)})\nvar world := parent.to_global(Vector3(${childX.toFixed(1)}, 0, 0))`}>
            <div className="space-y-3">
                <Slider label="parent.position.x" value={parentX} min={-4} max={4} step={0.5} onChange={setParentX} />
                <Slider label="parent.rotation_degrees.y" value={parentRot} min={0} max={360} step={1} onChange={setParentRot} />
                <Slider label="child.position.x (local)" value={childX} min={-3} max={3} step={0.5} onChange={setChildX} />
                <div className="p-2 bg-black rounded text-green-400 font-mono text-center text-sm">
                    child.global_position = ({gx.toFixed(2)}, 0.00, {gz.toFixed(2)})
                </div>
            </div>
            <Note>Rotate the parent and the child's local x never changes — but its global position sweeps an arc. That is the whole difference.</Note>
        </Demo>
    );
};

DEMOS.top_level = () => {
    const containerRef = useRef(null);
    const [topLevel, setTopLevel] = useState(false);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.platform) {
            objects.platform = mkMesh(new THREE.CylinderGeometry(2, 2, 0.3, 24), 0x555555);
            objects.platform.position.y = 0.15;
            scene.add(objects.platform);
            objects.platform.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 2.2, 0xffdd44));

            objects.child = mkMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), GODOT_BLUE);
            objects.platform.add(objects.child);
            objects.child.position.set(0, 1.2, -1.4);
            objects.snapshot = new THREE.Vector3(0, 1.2, -1.4);
        }
        objects.platform.rotation.y += 0.6 * delta;

        if (topLevel) {
            // top_level: keep the world transform the child had when it detached
            objects.child.matrixAutoUpdate = false;
            objects.child.matrix.identity();
            objects.child.matrix.setPosition(objects.snapshot);
            const inv = new THREE.Matrix4().copy(objects.platform.matrixWorld).invert();
            objects.child.matrix.premultiply(inv);
            objects.child.matrix.decompose(objects.child.position, objects.child.quaternion, objects.child.scale);
            objects.child.matrixAutoUpdate = true;
        } else {
            objects.child.position.set(0, 1.2, -1.4);
            objects.child.rotation.set(0, 0, 0);
            objects.child.getWorldPosition(objects.snapshot);
        }
    }, null, { cameraPos: [4, 4, 6] });

    return (
        <Demo containerRef={containerRef} hint={topLevel ? 'top_level = true — parked in world space' : 'top_level = false — riding the parent'}
            code={`# Still a child in the tree, but ignores the parent transform\nfunc _ready() -> void:\n    top_level = ${topLevel}\n\n# Typical use: a bullet spawned under the muzzle\n# that must not inherit the weapon's spin.`}>
            <div className="flex justify-center">
                <Toggle label="top_level" value={topLevel} onChange={setTopLevel} />
            </div>
            <Note>The platform keeps spinning either way. With <code>top_level</code> on, the cube stops being carried around by it.</Note>
        </Demo>
    );
};

DEMOS.look_at = () => {
    const containerRef = useRef(null);
    const [target, setTarget] = useState({ x: 2, z: 2 });
    const [yawOnly, setYawOnly] = useState(false);
    const [height, setHeight] = useState(2);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.player) {
            const geom = new THREE.ConeGeometry(0.45, 1.4, 16);
            geom.rotateX(-Math.PI / 2);   // point the cone down -Z, Godot's forward
            objects.player = mkMesh(geom, GODOT_BLUE);
            objects.player.position.set(0, 0.5, 0);
            scene.add(objects.player);
            objects.target = mkMesh(new THREE.SphereGeometry(0.22, 16, 12), 0xff4444);
            scene.add(objects.target);
            objects.line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
                new THREE.LineDashedMaterial({ color: 0x666666, dashSize: 0.2, gapSize: 0.15 }));
            scene.add(objects.line);
        }
        objects.target.position.set(target.x, height, target.z);
        const aim = objects.target.position.clone();
        if (yawOnly) aim.y = objects.player.position.y;
        if (!aim.equals(objects.player.position)) objects.player.lookAt(aim);

        const pts = [objects.player.position.clone(), objects.target.position.clone()];
        objects.line.geometry.setFromPoints(pts);
        objects.line.computeLineDistances();
    });

    return (
        <Demo containerRef={containerRef} hint="the cone tip is the node's -Z axis"
            code={yawOnly
                ? `var flat := target.global_position\nflat.y = global_position.y      # ignore height\nlook_at(flat, Vector3.UP)`
                : `look_at(target.global_position, Vector3.UP)\n# target = Vector3(${target.x.toFixed(1)}, ${height.toFixed(1)}, ${target.z.toFixed(1)})`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Slider label="target.x" value={target.x} min={-4} max={4} step={0.1} onChange={(v) => setTarget({ ...target, x: v })} />
                <Slider label="target.z" value={target.z} min={-4} max={4} step={0.1} onChange={(v) => setTarget({ ...target, z: v })} />
                <Slider label="target.y" value={height} min={0} max={4} step={0.1} onChange={setHeight} />
            </div>
            <div className="flex justify-center mt-4">
                <Toggle label="Yaw only (turret)" value={yawOnly} onChange={setYawOnly} />
            </div>
        </Demo>
    );
};

DEMOS.quaternion = () => {
    const containerRef = useRef(null);
    const [t, setT] = useState(0.5);
    const [yaw, setYaw] = useState(170);
    const [pitch, setPitch] = useState(60);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.euler) {
            const mk = (color, x) => {
                const g = new THREE.Group();
                g.position.x = x;
                const body = mkMesh(new THREE.BoxGeometry(1, 0.5, 1.6), color);
                g.add(body);
                g.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1.8, 0xffdd44));
                g.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1.2, 0x44dd44));
                scene.add(g);
                return g;
            };
            objects.euler = mk(0xff5555, -1.8);
            objects.slerp = mk(0x44cc66, 1.8);
            objects.labelE = mkTextSprite('Euler lerp', '#ff8888', 2.2);
            objects.labelE.position.set(-1.8, 1.8, 0);
            objects.labelS = mkTextSprite('slerp', '#88ee99', 2.2);
            objects.labelS.position.set(1.8, 1.8, 0);
            scene.add(objects.labelE, objects.labelS);
        }
        const ty = THREE.MathUtils.degToRad(yaw);
        const tp = THREE.MathUtils.degToRad(pitch);

        // Naive: interpolate the Euler angles component by component.
        objects.euler.rotation.set(tp * t, ty * t, 0, 'YXZ');

        // Correct: shortest-arc rotation between the two orientations.
        const qStart = new THREE.Quaternion();
        const qEnd = new THREE.Quaternion().setFromEuler(new THREE.Euler(tp, ty, 0, 'YXZ'));
        objects.slerp.quaternion.copy(qStart.clone().slerp(qEnd, t));
    }, null, { cameraPos: [0, 4, 8] });

    return (
        <Demo containerRef={containerRef} hint="same start, same end, different path"
            code={`var goal := Basis.from_euler(Vector3(${(pitch * Math.PI / 180).toFixed(2)}, ${(yaw * Math.PI / 180).toFixed(2)}, 0.0))\n\n# Shortest arc — no wobble, no gimbal surprises\nvar q := Quaternion(global_basis).slerp(Quaternion(goal), ${t.toFixed(2)})\nglobal_basis = Basis(q)\n\n# Frame-rate independent turning:\n#   slerp(goal, 1.0 - exp(-turn_speed * delta))`}>
            <div className="space-y-3">
                <Slider label="interpolation t" value={t} min={0} max={1} step={0.01} onChange={setT} />
                <div className="grid grid-cols-2 gap-4">
                    <Slider label="target yaw (deg)" value={yaw} min={0} max={359} step={1} onChange={setYaw} />
                    <Slider label="target pitch (deg)" value={pitch} min={-89} max={89} step={1} onChange={setPitch} />
                </div>
            </div>
            <Note>Sweep <code>t</code> from 0 to 1. Both land on the same orientation, but the red one lurches and rolls on the way — that is gimbal wobble from interpolating angles instead of rotations.</Note>
        </Demo>
    );
};

DEMOS.normals = () => {
    const containerRef = useRef(null);
    const [angle, setAngle] = useState(35);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.wall) {
            objects.wall = mkMesh(new THREE.BoxGeometry(5, 3, 0.3), 0x777777);
            objects.wall.position.set(0, 1.5, -1.5);
            scene.add(objects.wall);
            objects.normal = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1.6, 0x44dd66);
            scene.add(objects.normal);
            objects.inRay = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 1, 0xffdd44);
            objects.outRay = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 1, 0xff5555);
            scene.add(objects.inRay, objects.outRay);
            objects.decal = mkMesh(new THREE.CircleGeometry(0.28, 20), 0x222222, { side: THREE.DoubleSide });
            scene.add(objects.decal);
        }
        const rad = THREE.MathUtils.degToRad(angle);
        const hit = new THREE.Vector3(0, 1.5, -1.35);
        const n = new THREE.Vector3(0, 0, 1);

        const dir = new THREE.Vector3(-Math.sin(rad), 0, -Math.cos(rad)).normalize();
        const from = hit.clone().sub(dir.clone().multiplyScalar(4));
        objects.inRay.position.copy(from);
        objects.inRay.setDirection(dir);
        objects.inRay.setLength(4, 0.3, 0.18);

        // reflect() mirrors the direction around the surface normal
        const refl = dir.clone().reflect(n);
        objects.outRay.position.copy(hit);
        objects.outRay.setDirection(refl);
        objects.outRay.setLength(3, 0.3, 0.18);

        objects.normal.position.copy(hit);
        objects.normal.setDirection(n);

        objects.decal.position.copy(hit).addScaledVector(n, 0.02);
        objects.decal.lookAt(hit.clone().add(n));
    }, null, { cameraPos: [6, 4.5, 7.5], lookAt: [0, 1.5, -0.6] });

    return (
        <Demo containerRef={containerRef} hint="yellow in · green normal · red reflected"
            code={`var hit := space.intersect_ray(query)\nif hit:\n    var n: Vector3 = hit.normal\n\n    # bounce / ricochet\n    velocity = velocity.bounce(n)\n\n    # stick a decal flat on the surface\n    decal.global_position = hit.position + n * 0.01\n    decal.look_at(hit.position - n, Vector3.UP)\n\n    # slope steepness\n    var slope := rad_to_deg(n.angle_to(Vector3.UP))`}>
            <Slider label="Incoming angle (deg)" value={angle} min={-75} max={75} step={1} onChange={setAngle} />
            <Note>The reflected ray mirrors the incoming one about the normal — exactly what <code>Vector3.bounce()</code> computes for you.</Note>
        </Demo>
    );
};

DEMOS.screen_ray = () => {
    const containerRef = useRef(null);
    const [last, setLast] = useState(null);
    const groupRef = useRef(null);
    const timeoutsRef = useRef([]);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.group) {
            const group = new THREE.Group();
            scene.add(group);
            objects.group = group;
            groupRef.current = group;
            const palette = [0x478cbf, 0xff6b6b, 0x51cf66, 0xffd43b, 0xcc5de8];
            for (let i = 0; i < 5; i++) {
                const mesh = mkMesh(new THREE.SphereGeometry(0.5, 20, 16), palette[i]);
                mesh.position.set((i - 2) * 1.6, 0.6 + (i % 2) * 1.2, -1 + (i % 3) * 0.8);
                mesh.name = 'Sphere_' + (i + 1);
                group.add(mesh);
            }
            objects.dispose = () => {
                timeoutsRef.current.forEach(clearTimeout);
                timeoutsRef.current = [];
            };
        }
    }, (raycaster, scene) => {
        const group = groupRef.current;
        if (!group) return;
        const hits = raycaster.intersectObjects(group.children, false);
        if (hits.length === 0) { setLast('— miss —'); return; }
        const hit = hits[0];
        setLast(hit.object.name);
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xffffff }));
        marker.position.copy(hit.point);
        scene.add(marker);
        const id = setTimeout(() => destroy(scene, marker), 600);
        timeoutsRef.current.push(id);
    }, { cameraPos: [0, 3, 8] });

    return (
        <Demo containerRef={containerRef} cursor="cursor-crosshair" hint="click a sphere"
            code={`func _unhandled_input(event: InputEvent) -> void:\n    if event is InputEventMouseButton and event.pressed:\n        var cam := get_viewport().get_camera_3d()\n        var from := cam.project_ray_origin(event.position)\n        var to := from + cam.project_ray_normal(event.position) * 1000.0\n\n        var q := PhysicsRayQueryParameters3D.create(from, to)\n        var hit := get_world_3d().direct_space_state.intersect_ray(q)\n        if hit:\n            print(hit.collider.name)   # ${last || '...'}`}>
            <Status label="Last pick" value={last || 'waiting for a click'} good={!!last && last !== '— miss —'} />
        </Demo>
    );
};

DEMOS.aabb = () => {
    const containerRef = useRef(null);
    const [p, setP] = useState({ x: 0, y: 1, z: 0 });

    const inside = Math.abs(p.x) < 1 && p.y > 0 && p.y < 2 && Math.abs(p.z) < 1;

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.box) {
            objects.box = mkWireBox(2, 2, 2, 0x44dd66);
            objects.box.position.y = 1;
            scene.add(objects.box);
            objects.point = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 14, 12),
                new THREE.MeshBasicMaterial({ color: 0xffffff }));
            scene.add(objects.point);
        }
        objects.point.position.set(p.x, p.y, p.z);
        const hit = Math.abs(p.x) < 1 && p.y > 0 && p.y < 2 && Math.abs(p.z) < 1;
        objects.box.material.color.setHex(hit ? 0xff5555 : 0x44dd66);
    });

    return (
        <Demo containerRef={containerRef} hint="AABB(position, size) = a box that never rotates"
            code={`var box := AABB(Vector3(-1, 0, -1), Vector3(2, 2, 2))\nvar p := Vector3(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})\n\nbox.has_point(p)   # ${inside}\n\n# From a mesh, in world space:\nvar world := global_transform * $MeshInstance3D.get_aabb()`}>
            <div className="grid grid-cols-3 gap-4">
                <Slider label="p.x" value={p.x} min={-3} max={3} step={0.1} onChange={(v) => setP({ ...p, x: v })} />
                <Slider label="p.y" value={p.y} min={-1} max={4} step={0.1} onChange={(v) => setP({ ...p, y: v })} />
                <Slider label="p.z" value={p.z} min={-3} max={3} step={0.1} onChange={(v) => setP({ ...p, z: v })} />
            </div>
            <div className="mt-3">
                <Status label="box.has_point(p)" value={inside ? 'INSIDE' : 'OUTSIDE'} good={!inside} />
            </div>
        </Demo>
    );
};

DEMOS.proc_mesh = () => {
    const containerRef = useRef(null);
    const [step, setStep] = useState(4);

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.group) {
            objects.group = new THREE.Group();
            scene.add(objects.group);
            objects.step = -1;
        }
        if (objects.step === step) return;   // rebuild only on change
        while (objects.group.children.length) {
            destroy(objects.group, objects.group.children[0]);
        }
        objects.step = step;

        const verts = [
            new THREE.Vector3(-1.2, 0, 0),
            new THREE.Vector3(0, 1.8, 0),
            new THREE.Vector3(1.2, 0, 0),
        ];
        const colors = [0xff5555, 0x44dd66, 0x4488ff];
        for (let i = 0; i < Math.min(step, 3); i++) {
            const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.11, 12, 10),
                new THREE.MeshBasicMaterial({ color: colors[i] }));
            dot.position.copy(verts[i]);
            objects.group.add(dot);
        }
        if (step >= 4) {
            const geom = new THREE.BufferGeometry().setFromPoints(verts);
            geom.setIndex([0, 1, 2]);
            geom.computeVertexNormals();
            objects.group.add(new THREE.Mesh(geom.clone(), new THREE.MeshLambertMaterial({
                color: GODOT_BLUE, side: THREE.DoubleSide, transparent: true, opacity: 0.75,
            })));
            objects.group.add(new THREE.LineLoop(geom, new THREE.LineBasicMaterial({ color: 0xffffff })));
        }
        if (step >= 5) {
            const n = new THREE.Vector3(0, 0, 1);
            const centre = verts[0].clone().add(verts[1]).add(verts[2]).divideScalar(3);
            objects.group.add(new THREE.ArrowHelper(n, centre, 1.2, 0xffdd44));
        }
    }, null, { cameraPos: [0, 2.2, 6], lookAt: [0, 0.9, 0] });

    const lines = [
        'var st := SurfaceTool.new()',
        'st.begin(Mesh.PRIMITIVE_TRIANGLES)',
        'st.add_vertex(Vector3(-1.2, 0, 0))   # red',
        'st.add_vertex(Vector3(0, 1.8, 0))    # green',
        'st.add_vertex(Vector3(1.2, 0, 0))    # blue',
        '$MeshInstance3D.mesh = st.commit()',
        'st.generate_normals()   # winding decides the facing',
    ];

    return (
        <Demo containerRef={containerRef} hint={`step ${step} / 5`}
            code={lines.slice(0, Math.max(2, step + 2)).join('\n')}>
            <div className="flex justify-center items-center gap-4">
                <button onClick={() => setStep(Math.max(0, step - 1))}
                    className="px-4 py-2 bg-gray-700 rounded text-white font-bold text-sm">Prev</button>
                <span className="font-mono text-white">{step} / 5</span>
                <button onClick={() => setStep(Math.min(5, step + 1))}
                    className="px-4 py-2 bg-blue-600 rounded text-white font-bold text-sm">Next</button>
            </div>
            <Note>Vertices are added in order. Counter-clockwise winding faces the camera; reverse it and the triangle disappears unless the material disables culling.</Note>
        </Demo>
    );
};
