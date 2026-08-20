/* Interactive demos: Physics. */

DEMOS.body_types = () => {
    const containerRef = useRef(null);
    const [nudge, setNudge] = useState(0);
    const [inArea, setInArea] = useState(false);
    const nudgeRef = useRef(0);
    nudgeRef.current = nudge;

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(16, 0x2b2b2b));

            objects.staticBody = mkMesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), 0x777777);
            objects.staticBody.position.set(-4.5, 0.7, 0);
            scene.add(objects.staticBody);

            objects.rigid = mkMesh(new THREE.BoxGeometry(1, 1, 1), 0xffaa33);
            objects.rigid.position.set(-1.5, 4, 0);
            scene.add(objects.rigid);
            objects.rigidVel = new THREE.Vector3();
            objects.rigidSpin = new THREE.Vector3(0.6, 0.3, 0.9);

            objects.character = mkMesh(capsuleGeometry(0.4, 0.9), GODOT_BLUE);
            objects.character.position.set(1.5, 0.85, 0);
            scene.add(objects.character);

            objects.area = new THREE.Mesh(
                new THREE.BoxGeometry(1.8, 1.8, 1.8),
                new THREE.MeshBasicMaterial({ color: 0x44dd66, transparent: true, opacity: 0.15 }));
            objects.area.position.set(4.5, 0.9, 0);
            scene.add(objects.area);
            objects.area.add(mkWireBox(1.8, 1.8, 1.8, 0x44dd66));

            [['StaticBody3D', -4.5, '#bbbbbb'], ['RigidBody3D', -1.5, '#ffbb55'],
             ['CharacterBody3D', 1.5, '#7ab6e0'], ['Area3D', 4.5, '#77ee99']]
                .forEach(([name, x, col]) => {
                    const s = mkTextSprite(name, col, 2.6);
                    s.position.set(x, 2.7, 0);
                    scene.add(s);
                });
            objects.built = true;
            objects.lastNudge = 0;
        }

        // RigidBody: the solver owns it — gravity plus a bounce.
        const r = objects.rigid;
        objects.rigidVel.y -= 12 * delta;
        r.position.addScaledVector(objects.rigidVel, delta);
        if (r.position.y < 0.5) {
            r.position.y = 0.5;
            objects.rigidVel.y *= -0.55;
            objects.rigidVel.x *= 0.8;
            objects.rigidSpin.multiplyScalar(0.7);
        }
        r.rotation.x += objects.rigidSpin.x * delta;
        r.rotation.z += objects.rigidSpin.z * delta;

        if (nudgeRef.current !== objects.lastNudge) {
            objects.lastNudge = nudgeRef.current;
            objects.rigidVel.set((Math.random() - 0.5) * 3, 7, 0);
            objects.rigidSpin.set(2, 1, 3);
        }

        // CharacterBody: driven directly, no forces involved.
        objects.character.position.x = 1.5 + Math.sin(t * 0.9) * 2.6;

        const overlapping = Math.abs(objects.character.position.x - 4.5) < 1.3;
        if (overlapping !== objects.wasIn) {
            objects.wasIn = overlapping;
            setInArea(overlapping);
        }
        objects.area.material.opacity = overlapping ? 0.4 : 0.15;
    }, null, { cameraPos: [0, 4.5, 15], lookAt: [0, 1.2, 0], grid: false });

    return (
        <Demo containerRef={containerRef} hint="the capsule walks into the Area3D on the right"
            code={`# StaticBody3D — never moves, but blocks everything\n\n# RigidBody3D — the solver moves it; you only push\nrigid.apply_central_impulse(Vector3.UP * 7.0)\n\n# CharacterBody3D — you own the velocity\nvelocity.x = SPEED\nmove_and_slide()\n\n# Area3D — detects, never blocks\nfunc _on_body_entered(body: Node3D) -> void:\n    print(body.name, " entered")   # currently overlapping: ${inArea}`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <button onClick={() => setNudge((n) => n + 1)}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded">
                    apply_central_impulse()
                </button>
                <Status label="Area3D overlap" value={inArea ? 'body_entered' : 'empty'} good={inArea} />
            </div>
            <Note>Only the orange box responds to an impulse. Pushing a CharacterBody3D or a StaticBody3D with forces does nothing — they are not simulated.</Note>
        </Demo>
    );
};

DEMOS.collision_shapes = () => {
    const containerRef = useRef(null);
    const [shape, setShape] = useState('capsule');

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.group) {
            objects.group = new THREE.Group();
            scene.add(objects.group);
            objects.current = null;
            // The "art" mesh the collider approximates.
            objects.art = mkMesh(new THREE.TorusKnotGeometry(0.55, 0.2, 90, 12), 0x555555,
                { transparent: true, opacity: 0.55 });
            objects.art.position.y = 1.2;
            scene.add(objects.art);
        }
        if (objects.current !== shape) {
            objects.current = shape;
            while (objects.group.children.length) destroy(objects.group, objects.group.children[0]);
            let geom;
            switch (shape) {
                case 'box': geom = new THREE.BoxGeometry(1.8, 1.8, 1.8); break;
                case 'sphere': geom = new THREE.SphereGeometry(1.05, 20, 14); break;
                case 'cylinder': geom = new THREE.CylinderGeometry(1.05, 1.05, 1.9, 20); break;
                case 'convex': geom = new THREE.IcosahedronGeometry(1.05, 1); break;
                case 'trimesh': geom = new THREE.TorusKnotGeometry(0.55, 0.2, 60, 8); break;
                default: geom = capsuleGeometry(0.7, 1.0);
            }
            const wire = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
                color: shape === 'trimesh' ? 0xff8844 : 0x44dd66, wireframe: true,
            }));
            wire.position.y = 1.2;
            objects.group.add(wire);
        }
        objects.art.rotation.y += 0.5 * delta;
        objects.group.rotation.y = objects.art.rotation.y;
    }, null, { cameraPos: [0, 2.6, 7], lookAt: [0, 1.2, 0] });

    const info = {
        box: ['BoxShape3D', 'size: Vector3', 'Cheapest. Crates, walls, platforms.'],
        sphere: ['SphereShape3D', 'radius: float', 'Cheapest of all. Projectiles, pickups.'],
        capsule: ['CapsuleShape3D', 'radius, height', 'The default for characters — it slides over small steps instead of catching on them.'],
        cylinder: ['CylinderShape3D', 'radius, height', 'Flat-topped. Barrels and platforms; less stable than a capsule for characters.'],
        convex: ['ConvexPolygonShape3D', 'points: PackedVector3Array', 'Custom, still fast, works on moving bodies. mesh.create_convex_shape()'],
        trimesh: ['ConcavePolygonShape3D', 'faces: PackedVector3Array', 'Exact but STATIC ONLY. Level geometry, never a RigidBody3D.'],
    }[shape];

    return (
        <Demo containerRef={containerRef} hint="grey = visual mesh · green = collider"
            code={`var col := CollisionShape3D.new()\ncol.shape = ${info[0]}.new()   # ${info[1]}\nadd_child(col)\n\n# Generated from the visual mesh:\n#   $MeshInstance3D.mesh.create_${shape === 'trimesh' ? 'trimesh' : 'convex'}_shape()`}>
            <Choice value={shape} onChange={setShape} options={[
                { value: 'box', label: 'Box' }, { value: 'sphere', label: 'Sphere' },
                { value: 'capsule', label: 'Capsule' }, { value: 'cylinder', label: 'Cylinder' },
                { value: 'convex', label: 'Convex' }, { value: 'trimesh', label: 'Trimesh' },
            ]} />
            <div className="mt-4 text-center">
                <div className="font-mono text-blue-300">{info[0]}</div>
                <Note>{info[2]}</Note>
            </div>
        </Demo>
    );
};

DEMOS.raycast = () => {
    const containerRef = useRef(null);
    const [angle, setAngle] = useState(0);
    const [maskWall, setMaskWall] = useState(true);
    const [hitName, setHitName] = useState('null');
    const st = useRef({});
    st.current = { angle, maskWall };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.built) {
            objects.wall = mkMesh(new THREE.BoxGeometry(2.5, 2.5, 0.3), 0x8a5a3a);
            objects.wall.position.set(-1.6, 1.25, -3);
            objects.wall.name = 'Wall';
            scene.add(objects.wall);
            objects.crate = mkMesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), 0x777777);
            objects.crate.position.set(2, 0.7, -3);
            objects.crate.name = 'Crate';
            scene.add(objects.crate);

            objects.line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
                new THREE.LineBasicMaterial({ color: 0xffdd44 }));
            scene.add(objects.line);
            objects.marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10),
                new THREE.MeshBasicMaterial({ color: 0xff3333 }));
            scene.add(objects.marker);
            objects.normal = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1.2, 0x44dd66);
            scene.add(objects.normal);
            objects.origin = mkMesh(new THREE.SphereGeometry(0.2, 12, 10), GODOT_BLUE);
            objects.origin.position.set(0, 1.2, 3);
            scene.add(objects.origin);
            objects.ray = new THREE.Raycaster();
            objects.built = true;
            objects.last = null;
        }
        const s = st.current;
        const from = objects.origin.position.clone();
        const rad = THREE.MathUtils.degToRad(s.angle);
        const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize();

        // collision_mask: only the objects on a matching layer are candidates.
        const targets = s.maskWall ? [objects.wall, objects.crate] : [objects.crate];
        objects.ray.set(from, dir);
        objects.ray.far = 12;
        const hits = objects.ray.intersectObjects(targets, false);

        const end = hits.length ? hits[0].point : from.clone().addScaledVector(dir, 12);
        objects.line.geometry.setFromPoints([from, end]);
        objects.marker.visible = hits.length > 0;
        objects.normal.visible = hits.length > 0;
        if (hits.length) {
            objects.marker.position.copy(hits[0].point);
            const n = hits[0].face.normal.clone()
                .transformDirection(hits[0].object.matrixWorld);
            objects.normal.position.copy(hits[0].point);
            objects.normal.setDirection(n);
        }
        objects.line.material.color.setHex(hits.length ? 0xff5555 : 0xffdd44);

        const name = hits.length ? hits[0].object.name : 'null';
        if (name !== objects.last) { objects.last = name; setHitName(name); }
    }, null, { cameraPos: [5.5, 4, 6.5], lookAt: [0, 1, -1] });

    return (
        <Demo containerRef={containerRef} hint="red dot = hit.position · green arrow = hit.normal"
            code={`func shoot() -> void:\n    var space := get_world_3d().direct_space_state\n    var from := muzzle.global_position\n    var to := from - muzzle.global_basis.z * 12.0\n\n    var query := PhysicsRayQueryParameters3D.create(from, to)\n    query.collision_mask = ${maskWall ? '1 | 2' : '2'}    # ${maskWall ? 'wall + crate' : 'crate only'}\n    query.exclude = [self.get_rid()]\n    query.collide_with_areas = false\n\n    var hit := space.intersect_ray(query)\n    # hit.collider -> ${hitName}`}>
            <Slider label="Ray angle (deg)" value={angle} min={-60} max={60} step={1} onChange={setAngle} />
            <div className="flex flex-col md:flex-row items-center justify-around gap-3 mt-4">
                <Toggle label="Wall in collision_mask" value={maskWall} onChange={setMaskWall} />
                <Status label="hit.collider" value={hitName} good={hitName !== 'null'} />
            </div>
            <Note>Take the wall out of the mask and the ray passes straight through it to the crate behind. Masks are how you make bullets ignore glass, or a ground check ignore the player.</Note>
        </Demo>
    );
};

DEMOS.shapecast = () => {
    const containerRef = useRef(null);
    const [radius, setRadius] = useState(0.5);
    const [gap, setGap] = useState(1.4);
    const [fits, setFits] = useState(true);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.top = mkMesh(new THREE.BoxGeometry(0.6, 2, 2.4), 0x8a5a3a);
            objects.bot = mkMesh(new THREE.BoxGeometry(0.6, 2, 2.4), 0x8a5a3a);
            scene.add(objects.top, objects.bot);

            objects.shape = new THREE.Mesh(
                new THREE.SphereGeometry(1, 18, 14),
                new THREE.MeshBasicMaterial({ color: 0x44dd66, wireframe: true }));
            scene.add(objects.shape);
            objects.rayLine = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
                new THREE.LineBasicMaterial({ color: 0xffdd44 }));
            scene.add(objects.rayLine);
            objects.built = true;
        }
        objects.top.position.set(1.5, 1.2, gap / 2 + 1.2);
        objects.bot.position.set(1.5, 1.2, -gap / 2 - 1.2);

        const clear = gap > radius * 2;
        const travel = 6;
        // Stop the sweep at the gap when the shape does not fit.
        const stopAt = clear ? 1 : Math.min(1, (5.2 - radius) / travel);
        const x = -3.5 + travel * ((Math.sin(t * 0.8) * 0.5 + 0.5) * stopAt);
        objects.shape.position.set(x, 1.2, 0);
        objects.shape.scale.setScalar(radius);
        objects.shape.material.color.setHex(clear ? 0x44dd66 : 0xff5555);
        objects.rayLine.geometry.setFromPoints([
            new THREE.Vector3(-3.5, 1.2, 0), new THREE.Vector3(2.5, 1.2, 0)]);

        if (clear !== objects.lastClear) { objects.lastClear = clear; setFits(clear); }
    }, null, { cameraPos: [-1.5, 4.5, 7], lookAt: [0, 1.2, 0], grid: false });

    return (
        <Demo containerRef={containerRef} hint="a ray would slip through this gap — the shape does not"
            code={`extends ShapeCast3D\n\nfunc _ready() -> void:\n    var s := SphereShape3D.new()\n    s.radius = ${radius.toFixed(2)}\n    shape = s\n    target_position = Vector3(6, 0, 0)   # LOCAL space\n    max_results = 4\n\nfunc _physics_process(delta: float) -> void:\n    if is_colliding():\n        for i in get_collision_count():\n            print(get_collider(i).name)\n    # get_closest_collision_safe_fraction() = how far it can move\n    # fits through the gap: ${fits}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="shape radius" value={radius} min={0.2} max={1.2} step={0.05} onChange={setRadius} />
                <Slider label="gap width" value={gap} min={0.4} max={3} step={0.1} onChange={setGap} />
            </div>
            <div className="mt-3">
                <Status label="Sweep clears the gap" value={fits ? 'YES' : 'BLOCKED'} good={fits} />
            </div>
        </Demo>
    );
};

DEMOS.area_detection = () => {
    const containerRef = useRef(null);
    const [input, setInput] = useState({ x: 0, y: 0 });
    const [log, setLog] = useState([]);
    const inputRef = useRef(input);
    inputRef.current = input;

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.player) {
            scene.add(mkFloor(12));
            objects.player = mkMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), GODOT_BLUE);
            objects.player.position.set(-3, 0.4, 0);
            scene.add(objects.player);

            objects.zone = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 2.4, 2.4),
                new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.15 }));
            objects.zone.position.set(1.5, 1.2, 0);
            scene.add(objects.zone);
            objects.zone.add(mkWireBox(2.4, 2.4, 2.4, 0xff5555));
            objects.wasIn = false;
        }
        const inp = inputRef.current;
        objects.player.position.x = THREE.MathUtils.clamp(
            objects.player.position.x + inp.x * 4 * delta, -5, 5);
        objects.player.position.z = THREE.MathUtils.clamp(
            objects.player.position.z + inp.y * 4 * delta, -5, 5);

        const z = objects.zone.position;
        const p = objects.player.position;
        const inside = Math.abs(p.x - z.x) < 1.6 && Math.abs(p.z - z.z) < 1.6;
        if (inside !== objects.wasIn) {
            objects.wasIn = inside;
            objects.zone.material.opacity = inside ? 0.4 : 0.15;
            setLog((l) => [(inside ? '_on_body_entered(Player)' : '_on_body_exited(Player)'), ...l].slice(0, 5));
        }
    }, null, { cameraPos: [0, 6, 9] });

    return (
        <Demo containerRef={containerRef} hint="drive the blue cube into the red volume"
            code={`extends Area3D\n\nfunc _ready() -> void:\n    body_entered.connect(_on_body_entered)\n    body_exited.connect(_on_body_exited)\n    monitoring = true      # do I detect others?\n    monitorable = true     # can others detect me?\n\nfunc _on_body_entered(body: Node3D) -> void:\n    if body.is_in_group("player"):\n        body.heal(25)`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <DPad input={input} setInput={setInput} />
                <div className="font-mono text-xs bg-black rounded p-3 w-full md:w-72 h-28 overflow-hidden">
                    {log.length === 0 && <div className="text-gray-600">signal log…</div>}
                    {log.map((l, i) => (
                        <div key={i} className={i === 0 ? 'text-green-400' : 'text-gray-600'}>{l}</div>
                    ))}
                </div>
            </div>
        </Demo>
    );
};

DEMOS.layers_masks = () => {
    const containerRef = useRef(null);
    const [aLayer, setALayer] = useState(2);
    const [aMask, setAMask] = useState(1);
    const [bLayer, setBLayer] = useState(1);
    const [bMask, setBMask] = useState(2);

    const aSeesB = (aMask & bLayer) !== 0;
    const bSeesA = (bMask & aLayer) !== 0;
    const anyContact = aSeesB || bSeesA;

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.a) {
            objects.a = mkMesh(new THREE.BoxGeometry(1, 1, 1), GODOT_BLUE);
            objects.a.position.set(-1.8, 0.5, 0);
            objects.b = mkMesh(new THREE.BoxGeometry(1, 1, 1), 0xff5555);
            objects.b.position.set(1.8, 0.5, 0);
            scene.add(objects.a, objects.b);
            objects.arrowAB = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(-1.2, 0.8, 0), 2.4, 0x44dd66);
            objects.arrowBA = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(1.2, 0.2, 0), 2.4, 0x44dd66);
            scene.add(objects.arrowAB, objects.arrowBA);
        }
        objects.arrowAB.visible = aSeesB;
        objects.arrowBA.visible = bSeesA;
    }, null, { cameraPos: [0, 3, 6] });

    const toggleBit = (val, bit) => val ^ (1 << (bit - 1));
    const hasBit = (val, bit) => (val & (1 << (bit - 1))) !== 0;
    const Bits = ({ label, val, setVal }) => (
        <div className="flex gap-2 items-center text-xs mt-1">
            <span className="w-12 text-gray-500">{label}</span>
            {[1, 2, 3, 4].map((b) => (
                <button key={b} onClick={() => setVal(toggleBit(val, b))}
                    className={`w-7 h-7 rounded font-mono ${
                        hasBit(val, b) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500'}`}>{b}</button>
            ))}
            <span className="text-gray-600 font-mono ml-1">= {val}</span>
        </div>
    );

    return (
        <Demo containerRef={containerRef} hint="a green arrow = that body can detect the other"
            code={`# A\nA.collision_layer = ${aLayer}\nA.collision_mask  = ${aMask}\n\n# B\nB.collision_layer = ${bLayer}\nB.collision_mask  = ${bMask}\n\n# A detects B when  A.mask & B.layer != 0   -> ${aSeesB}\n# B detects A when  B.mask & A.layer != 0   -> ${bSeesA}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:border-r border-gray-700 md:pr-4">
                    <h4 className="text-blue-400 font-bold mb-2 text-sm">Body A (blue)</h4>
                    <Bits label="layer" val={aLayer} setVal={setALayer} />
                    <Bits label="mask" val={aMask} setVal={setAMask} />
                </div>
                <div>
                    <h4 className="text-red-400 font-bold mb-2 text-sm">Body B (red)</h4>
                    <Bits label="layer" val={bLayer} setVal={setBLayer} />
                    <Bits label="mask" val={bMask} setVal={setBMask} />
                </div>
            </div>
            <div className={`mt-4 p-3 rounded text-center font-bold ${
                anyContact ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                {anyContact ? 'CONTACT' : 'NO CONTACT'}
            </div>
            <Note>Detection is one-way per body. A can see B while B is blind to A — that asymmetry is how a bullet hits an enemy without the enemy's own mask mattering.</Note>
        </Demo>
    );
};

DEMOS.physics_bounce = () => {
    const containerRef = useRef(null);
    const [damping, setDamping] = useState(1);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.ball) {
            objects.ball = mkMesh(new THREE.SphereGeometry(0.35, 20, 16), GODOT_BLUE);
            objects.ball.position.set(0, 0.5, 0);
            scene.add(objects.ball);
            objects.vel = new THREE.Vector3(3.6, 0, 2.4);
            const wallMat = 0x777777;
            [[-3.2, 0, 0.5, 6.6], [3.2, 0, 0.5, 6.6], [0, -3.2, 6.6, 0.5], [0, 3.2, 6.6, 0.5]]
                .forEach(([x, z, w, d]) => {
                    const wall = mkMesh(new THREE.BoxGeometry(w, 1, d), wallMat);
                    wall.position.set(x, 0.5, z);
                    scene.add(wall);
                });
            objects.trail = [];
        }
        const b = objects.ball;
        const v = objects.vel;
        b.position.addScaledVector(v, delta);
        const LIMIT = 2.75;
        let bounced = null;
        if (Math.abs(b.position.x) > LIMIT) {
            b.position.x = Math.sign(b.position.x) * LIMIT;
            bounced = new THREE.Vector3(-Math.sign(b.position.x), 0, 0);
        }
        if (Math.abs(b.position.z) > LIMIT) {
            b.position.z = Math.sign(b.position.z) * LIMIT;
            bounced = new THREE.Vector3(0, 0, -Math.sign(b.position.z));
        }
        if (bounced) {
            // Vector3.bounce(n) == v.reflect(n) mirrored about the surface
            v.reflect(bounced).multiplyScalar(damping);
            if (v.length() < 1) v.normalize().multiplyScalar(1);
        }
        b.rotation.x += v.z * delta * 2;
        b.rotation.z -= v.x * delta * 2;
    }, null, { cameraPos: [0, 7, 7] });

    return (
        <Demo containerRef={containerRef} hint="the wall normal decides the outgoing direction"
            code={`extends CharacterBody3D\n\nfunc _physics_process(delta: float) -> void:\n    var collision := move_and_collide(velocity * delta)\n    if collision:\n        velocity = velocity.bounce(collision.get_normal())\n        velocity *= ${damping.toFixed(2)}   # energy kept per bounce\n        var hit := collision.get_collider()`}>
            <Slider label="Energy retained per bounce" value={damping} min={0.5} max={1} step={0.01} onChange={setDamping} />
            <Note>move_and_collide() stops at the first contact and hands you the collision. move_and_slide() would keep going along the wall instead.</Note>
        </Demo>
    );
};

DEMOS.physics_material = () => {
    const containerRef = useRef(null);
    const [bounce, setBounce] = useState(0.7);
    const [friction, setFriction] = useState(0.4);
    const [drop, setDrop] = useState(0);
    const st = useRef({});
    st.current = { bounce, friction, drop };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.ball) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.ball = mkMesh(new THREE.SphereGeometry(0.45, 22, 18), 0xffaa33);
            objects.ball.position.set(-3, 5, 0);
            scene.add(objects.ball);
            objects.vel = new THREE.Vector3(2.2, 0, 0);
            objects.lastDrop = 0;
        }
        const s = st.current;
        if (s.drop !== objects.lastDrop) {
            objects.lastDrop = s.drop;
            objects.ball.position.set(-3, 5, 0);
            objects.vel.set(2.2, 0, 0);
        }
        const b = objects.ball;
        objects.vel.y -= 14 * delta;
        b.position.addScaledVector(objects.vel, delta);
        if (b.position.y < 0.45) {
            b.position.y = 0.45;
            objects.vel.y = -objects.vel.y * s.bounce;
            // friction bleeds the horizontal component on every contact
            objects.vel.x *= 1 - s.friction * 0.5;
            objects.vel.z *= 1 - s.friction * 0.5;
            if (Math.abs(objects.vel.y) < 0.4) objects.vel.y = 0;
        }
        if (b.position.x > 6) { b.position.set(-3, 5, 0); objects.vel.set(2.2, 0, 0); }
        b.rotation.z -= objects.vel.x * delta * 2;
    }, null, { cameraPos: [1, 4, 10], grid: false });

    return (
        <Demo containerRef={containerRef} hint="drop the ball and watch the material change the result"
            code={`var mat := PhysicsMaterial.new()\nmat.bounce = ${bounce.toFixed(2)}      # 0 = dead drop, 1 = perfect return\nmat.friction = ${friction.toFixed(2)}    # 0 = ice, 1 = rubber\nmat.rough = false        # true -> use MAX friction, not the average\nmat.absorbent = false    # true -> use MAX bounce, not the average\n\n$RigidBody3D.physics_material_override = mat`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="bounce" value={bounce} min={0} max={1} step={0.01} onChange={setBounce} />
                <Slider label="friction" value={friction} min={0} max={1} step={0.01} onChange={setFriction} />
            </div>
            <div className="flex justify-center mt-4">
                <button onClick={() => setDrop((d) => d + 1)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded">Drop again</button>
            </div>
            <Note>Contact between two bodies averages their materials by default. Tick <code>absorbent</code> or <code>rough</code> and this material wins instead.</Note>
        </Demo>
    );
};

DEMOS.rigidbody = () => {
    const containerRef = useRef(null);
    const [mode, setMode] = useState('impulse');
    const [fire, setFire] = useState(0);
    const st = useRef({});
    st.current = { mode, fire };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.box) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.box = mkMesh(new THREE.BoxGeometry(1, 1, 1), 0xffaa33);
            objects.box.position.set(0, 0.5, 0);
            scene.add(objects.box);
            objects.vel = new THREE.Vector3();
            objects.spin = new THREE.Vector3();
            objects.lastFire = 0;
        }
        const s = st.current;
        const b = objects.box;

        if (s.fire !== objects.lastFire) {
            objects.lastFire = s.fire;
            if (s.mode === 'impulse') {
                objects.vel.y = 6.5;                        // apply_central_impulse
                objects.vel.x = (Math.random() - 0.5) * 2;
            } else if (s.mode === 'torque') {
                objects.spin.set(3, 5, 2);                  // apply_torque_impulse
            }
        }
        if (s.mode === 'force') {
            objects.vel.x += 4 * delta;                     // apply_central_force
        }

        objects.vel.y -= 14 * delta;
        b.position.addScaledVector(objects.vel, delta);
        if (b.position.y < 0.5) {
            b.position.y = 0.5;
            objects.vel.y = Math.abs(objects.vel.y) * 0.4;
            if (objects.vel.y < 0.5) objects.vel.y = 0;
            objects.vel.x *= 0.92;
            objects.spin.multiplyScalar(0.9);
        }
        if (Math.abs(b.position.x) > 6) { b.position.x = 0; objects.vel.x = 0; }
        b.rotation.x += objects.spin.x * delta;
        b.rotation.y += objects.spin.y * delta;
        b.rotation.z += objects.spin.z * delta;
    }, null, { cameraPos: [0, 4, 10], grid: false });

    const snippet = {
        impulse: 'apply_central_impulse(Vector3.UP * 6.5)\n# one instant kick, ignores mass * time',
        force: 'func _physics_process(delta: float) -> void:\n    apply_central_force(Vector3.RIGHT * 20.0)\n# accumulates every tick — a thruster, not a kick',
        torque: 'apply_torque_impulse(Vector3(3, 5, 2))\n# instant spin around the centre of mass',
    }[mode];

    return (
        <Demo containerRef={containerRef} hint={`mode: ${mode}`}
            code={`extends RigidBody3D\n\nfunc _ready() -> void:\n    mass = 2.0\n    gravity_scale = 1.0\n    continuous_cd = true    # stop fast bodies tunnelling\n\n${snippet}`}>
            <Choice value={mode} onChange={setMode} options={[
                { value: 'impulse', label: 'central_impulse' },
                { value: 'force', label: 'central_force' },
                { value: 'torque', label: 'torque_impulse' },
            ]} />
            <div className="flex justify-center mt-4">
                <button onClick={() => setFire((f) => f + 1)}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-8 rounded">
                    Apply
                </button>
            </div>
            <Note>Never set <code>position</code> on a RigidBody3D each frame — you are fighting the solver. Push it, or switch to <code>_integrate_forces()</code>.</Note>
        </Demo>
    );
};

DEMOS.joints_3d = () => {
    const containerRef = useRef(null);
    const [limit, setLimit] = useState(60);
    const [useLimit, setUseLimit] = useState(true);
    const [motor, setMotor] = useState(false);
    const st = useRef({});
    st.current = { limit, useLimit, motor };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.pivot) {
            const anchor = mkMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), 0x777777);
            anchor.position.set(0, 3, 0);
            scene.add(anchor);
            objects.pivot = new THREE.Group();
            objects.pivot.position.set(0, 3, 0);
            scene.add(objects.pivot);
            const door = mkMesh(new THREE.BoxGeometry(0.25, 2.4, 1.4), GODOT_BLUE);
            door.position.set(0, -1.2, 0.7);
            objects.pivot.add(door);
            objects.arc = new THREE.Mesh(
                new THREE.RingGeometry(1.3, 1.46, 40, 1, 0, Math.PI),
                new THREE.MeshBasicMaterial({ color: 0x44dd66, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
            // Sit it at the door's mid-height so it reads as the swept range.
            objects.arc.position.set(0, 1.9, 0);
            objects.arc.rotation.x = Math.PI / 2;
            scene.add(objects.arc);
            objects.angle = 0;
        }
        const s = st.current;
        const lim = THREE.MathUtils.degToRad(s.limit);

        if (s.motor) {
            objects.angle += 1.6 * delta;               // PARAM_MOTOR_TARGET_VELOCITY
        } else {
            objects.angle = Math.sin(t * 1.1) * Math.PI; // free swing
        }
        let a = objects.angle;
        if (s.useLimit) a = THREE.MathUtils.clamp(
            ((a + Math.PI) % (2 * Math.PI)) - Math.PI, -lim, lim);
        objects.pivot.rotation.y = a;

        objects.arc.visible = s.useLimit;
        // Rebuild the arc only when the limit changes, not every frame.
        if (s.useLimit && objects.arcLimit !== s.limit) {
            objects.arcLimit = s.limit;
            objects.arc.geometry.dispose();
            // rotation.x = PI/2 maps ring angle t to world (cos t, 0, sin t), and
            // the door rests along +Z, so hinge angle a sits at t = PI/2 - a.
            objects.arc.geometry = new THREE.RingGeometry(
                1.3, 1.46, 40, 1, Math.PI / 2 - lim, lim * 2);
        }
    }, null, { cameraPos: [5, 4.5, 6], lookAt: [0, 2, 0] });

    return (
        <Demo containerRef={containerRef} hint="green arc = the allowed swing"
            code={`extends HingeJoint3D\n\nfunc _ready() -> void:\n    node_a = $"../Anchor".get_path()\n    node_b = $"../Door".get_path()\n\n    set_flag(HingeJoint3D.FLAG_USE_LIMIT, ${useLimit})\n    set_param(HingeJoint3D.PARAM_LIMIT_UPPER, deg_to_rad(${limit}))\n    set_param(HingeJoint3D.PARAM_LIMIT_LOWER, deg_to_rad(-${limit}))\n    set_param(HingeJoint3D.PARAM_LIMIT_SOFTNESS, 0.9)\n\n    set_flag(HingeJoint3D.FLAG_ENABLE_MOTOR, ${motor})\n    set_param(HingeJoint3D.PARAM_MOTOR_TARGET_VELOCITY, 1.6)`}>
            <Slider label="limit (deg, +/-)" value={limit} min={5} max={180} step={1} onChange={setLimit} />
            <div className="flex justify-center gap-3 mt-4">
                <Toggle label="FLAG_USE_LIMIT" value={useLimit} onChange={setUseLimit} />
                <Toggle label="FLAG_ENABLE_MOTOR" value={motor} onChange={setMotor} />
            </div>
            <Note>PinJoint3D is a single point (a rope link), SliderJoint3D runs along one axis, and Generic6DOFJoint3D lets you lock or free each of the six degrees individually.</Note>
        </Demo>
    );
};

DEMOS.soft_body = () => {
    const containerRef = useRef(null);
    const [stiffness, setStiffness] = useState(0.6);
    const [wind, setWind] = useState(1.2);
    const [pinned, setPinned] = useState(true);
    const gustRef = useRef(0);
    const st = useRef({});
    st.current = { stiffness, wind, pinned };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        const N = 14;              // grid resolution
        const SPACING = 0.28;
        if (!objects.cloth) {
            objects.geom = new THREE.PlaneGeometry(SPACING * (N - 1), SPACING * (N - 1), N - 1, N - 1);
            objects.cloth = new THREE.Mesh(objects.geom, new THREE.MeshLambertMaterial({
                color: GODOT_BLUE, side: THREE.DoubleSide, wireframe: false,
            }));
            scene.add(objects.cloth);
            objects.wire = new THREE.Mesh(objects.geom, new THREE.MeshBasicMaterial({
                color: 0x88bbdd, wireframe: true, transparent: true, opacity: 0.35,
            }));
            scene.add(objects.wire);

            const pole = mkMesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 8), 0x999999);
            pole.rotation.z = Math.PI / 2;
            pole.position.set(0, 3, 0);
            scene.add(pole);

            // Verlet points: current + previous position.
            objects.pts = [];
            for (let y = 0; y < N; y++) {
                for (let x = 0; x < N; x++) {
                    const p = new THREE.Vector3(
                        (x - (N - 1) / 2) * SPACING, 3 - y * SPACING, 0);
                    objects.pts.push({ p, prev: p.clone(), pin: y === 0 });
                }
            }
        }
        const s = st.current;
        const pts = objects.pts;
        const idx = (x, y) => y * N + x;

        // A gust: shove every free point once, then let the solver settle it.
        if (gustRef.current > 0) {
            gustRef.current--;
            pts.forEach((pt) => {
                if (pt.pin && s.pinned) return;
                pt.prev.z += 0.55 + Math.random() * 0.25;   // verlet impulse
                pt.prev.y += 0.12;
            });
        }

        // Integrate
        const g = new THREE.Vector3(0, -9.0, 0);
        const w = new THREE.Vector3(Math.sin(t * 1.7) * s.wind, 0, Math.cos(t * 1.1) * s.wind * 1.4);
        const dt = Math.min(delta, 1 / 60);
        pts.forEach((pt) => {
            if (pt.pin && s.pinned) { pt.p.set(pt.p.x, 3, 0); pt.prev.copy(pt.p); return; }
            const vel = pt.p.clone().sub(pt.prev).multiplyScalar(0.985);
            pt.prev.copy(pt.p);
            pt.p.add(vel).addScaledVector(g, dt * dt * 60 * 0.016)
                .addScaledVector(w, dt * dt * 60 * 0.016);
        });

        // Constraint relaxation — more iterations = stiffer cloth.
        const iterations = 1 + Math.round(s.stiffness * 6);
        for (let it = 0; it < iterations; it++) {
            for (let y = 0; y < N; y++) {
                for (let x = 0; x < N; x++) {
                    const a = pts[idx(x, y)];
                    [[1, 0], [0, 1]].forEach(([dx, dy]) => {
                        if (x + dx >= N || y + dy >= N) return;
                        const b = pts[idx(x + dx, y + dy)];
                        const d = b.p.clone().sub(a.p);
                        const len = d.length() || 0.0001;
                        const corr = d.multiplyScalar((len - SPACING) / len * 0.5);
                        if (!(a.pin && s.pinned)) a.p.add(corr);
                        if (!(b.pin && s.pinned)) b.p.sub(corr);
                    });
                }
            }
        }

        const pos = objects.geom.attributes.position;
        for (let i = 0; i < pts.length; i++) {
            pos.setXYZ(i, pts[i].p.x, pts[i].p.y, pts[i].p.z);
        }
        pos.needsUpdate = true;
        objects.geom.computeVertexNormals();
    }, null, { cameraPos: [0, 2, 7], lookAt: [0, 1.5, 0], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={pinned ? 'top row pinned to the pole' : 'unpinned — it falls'}
            code={`extends SoftBody3D\n\nfunc _ready() -> void:\n    mesh = preload("res://flag_mesh.tres")\n    simulation_precision = ${1 + Math.round(stiffness * 6)}      # solver iterations\n    linear_stiffness = ${stiffness.toFixed(2)}    # 0 = floppy, 1 = rigid\n    total_mass = 1.0\n    damping_coefficient = 0.01\n    pressure_coefficient = 0.0   # > 0 inflates it\n\n    # Pin the top edge to the pole\n    set_point_pinned(0, ${pinned}, $"../Pole".get_path())`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="linear_stiffness" value={stiffness} min={0} max={1} step={0.05} onChange={setStiffness} />
                <Slider label="wind strength" value={wind} min={0} max={4} step={0.1} onChange={setWind} />
            </div>
            <div className="flex justify-center gap-3 mt-4">
                <Toggle label="Pinned" value={pinned} onChange={setPinned} />
                <button onClick={() => { gustRef.current = 1; }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded text-sm">
                    Apply force (gust)
                </button>
            </div>
            <Note>Soft bodies are the most expensive thing in the 3D physics budget — keep the vertex count low and <code>simulation_precision</code> as small as looks acceptable.</Note>
        </Demo>
    );
};

DEMOS.vehicle_body = () => {
    const containerRef = useRef(null);
    const [steer, setSteer] = useState(0.25);
    const [power, setPower] = useState(0.6);
    const st = useRef({});
    st.current = { steer, power };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.car) {
            scene.add(mkFloor(60, 0x2b2b2b));
            for (let i = 0; i < 30; i++) {
                const c = mkMesh(new THREE.ConeGeometry(0.25, 0.7, 10), 0xff8833);
                const a = (i / 30) * Math.PI * 2;
                c.position.set(Math.cos(a) * 9, 0.35, Math.sin(a) * 9);
                scene.add(c);
            }
            objects.car = new THREE.Group();
            scene.add(objects.car);
            const body = mkMesh(new THREE.BoxGeometry(1.6, 0.5, 3.2), GODOT_BLUE);
            body.position.y = 0.6;
            objects.car.add(body);
            const cabin = mkMesh(new THREE.BoxGeometry(1.3, 0.5, 1.4), 0x2b4c66);
            cabin.position.set(0, 1.05, -0.2);
            objects.car.add(cabin);

            objects.wheels = [];
            [[-0.85, 1.15, true], [0.85, 1.15, true], [-0.85, -1.15, false], [0.85, -1.15, false]]
                .forEach(([x, z, steers]) => {
                    const holder = new THREE.Group();
                    holder.position.set(x, 0.4, z);
                    const w = mkMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 16), 0x222222);
                    w.rotation.z = Math.PI / 2;
                    holder.add(w);
                    holder.userData = { steers, spin: w };
                    objects.car.add(holder);
                    objects.wheels.push(holder);
                });
            objects.heading = 0;
            objects.speed = 0;
        }
        const s = st.current;
        // Bicycle model: heading turns proportionally to speed * steering.
        objects.speed = THREE.MathUtils.lerp(objects.speed, s.power * 11, 1.5 * delta);
        objects.heading += s.steer * objects.speed * 0.11 * delta;

        objects.car.rotation.y = objects.heading;
        const fwd = new THREE.Vector3(Math.sin(objects.heading), 0, Math.cos(objects.heading));
        objects.car.position.addScaledVector(fwd, objects.speed * delta);
        const r = Math.hypot(objects.car.position.x, objects.car.position.z);
        if (r > 22) objects.car.position.multiplyScalar(22 / r);

        objects.wheels.forEach((h) => {
            h.rotation.y = h.userData.steers ? s.steer : 0;
            h.userData.spin.rotation.x += objects.speed * delta * 2.4;
        });
        // Body roll under lateral load, like real suspension travel.
        objects.car.rotation.z = -s.steer * Math.min(objects.speed / 11, 1) * 0.12;

        const p = objects.car.position;
        cam.position.lerp(new THREE.Vector3(
            p.x - fwd.x * 9, 5, p.z - fwd.z * 9), 2.2 * delta);
        cam.lookAt(p.x, p.y + 1, p.z);
    }, null, { cameraPos: [0, 6, 12], grid: false, axes: false, orbit: false });

    return (
        <Demo containerRef={containerRef} orbit={false} hint="camera follows the car"
            code={`extends VehicleBody3D\n\nconst MAX_STEER := 0.6\nconst ENGINE_POWER := 300.0\n\nfunc _physics_process(delta: float) -> void:\n    steering = move_toward(steering,\n        ${steer.toFixed(2)} * MAX_STEER, delta * 3.0)\n    engine_force = ${power.toFixed(2)} * ENGINE_POWER\n    brake = 10.0 if Input.is_action_pressed("handbrake") else 0.0\n\n# On each VehicleWheel3D child:\n#   use_as_traction / use_as_steering\n#   suspension_stiffness, suspension_travel\n#   wheel_friction_slip`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="steering" value={steer} min={-1} max={1} step={0.05} onChange={setSteer} />
                <Slider label="engine_force" value={power} min={0} max={1} step={0.05} onChange={setPower} />
            </div>
            <Note>VehicleBody3D is a RigidBody3D whose wheels are raycasts with springs. It is arcade-grade — good enough for most games, not a driving simulator.</Note>
        </Demo>
    );
};

DEMOS.physics_interp = () => {
    const containerRef = useRef(null);
    const [tick, setTick] = useState(12);
    const [interp, setInterp] = useState(true);
    const st = useRef({});
    st.current = { tick, interp };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.raw) {
            objects.raw = mkMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), 0xff5555);
            objects.raw.position.set(-4, 2.2, 0);
            scene.add(objects.raw);
            objects.smooth = mkMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), 0x44cc66);
            objects.smooth.position.set(-4, 0.8, 0);
            scene.add(objects.smooth);
            const l1 = mkTextSprite('OFF', '#ff8888', 1.8); l1.position.set(-6, 2.2, 0);
            const l2 = mkTextSprite('ON', '#88ee99', 1.8); l2.position.set(-6, 0.8, 0);
            scene.add(l1, l2);

            objects.acc = 0;
            objects.prevX = -4;
            objects.curX = -4;
        }
        const s = st.current;
        const step = 1 / s.tick;
        objects.acc += delta;
        while (objects.acc >= step) {
            objects.acc -= step;
            objects.prevX = objects.curX;
            objects.curX += 4.5 * step;
            if (objects.curX > 4) { objects.curX = -4; objects.prevX = -4; }
        }
        // No interpolation: the mesh snaps to the last physics state.
        objects.raw.position.x = objects.curX;
        // Interpolated: blend prev -> cur by how far we are into the tick.
        const f = objects.acc / step;
        objects.smooth.position.x = s.interp
            ? THREE.MathUtils.lerp(objects.prevX, objects.curX, f)
            : objects.curX;
    }, null, { cameraPos: [0, 3, 9], grid: false });

    return (
        <Demo containerRef={containerRef} hint={`physics tick = ${tick} Hz — drag it low to see the stutter`}
            code={`# Project Settings > Physics > Common > Physics Interpolation -> ${interp ? 'On' : 'Off'}\n# Project Settings > Physics > Common > Physics Ticks Per Second = ${tick}\n\n# Per node:\nphysics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_${interp ? 'ON' : 'OFF'}\n\n# Move things in _physics_process, never _process:\nfunc _physics_process(delta: float) -> void:\n    position.x += 4.5 * delta\n\n# Teleporting? Tell the interpolator or it smears:\nglobal_position = spawn_point\nreset_physics_interpolation()`}>
            <Slider label="Physics ticks per second" value={tick} min={4} max={60} step={1} onChange={setTick} />
            <div className="flex justify-center mt-4">
                <Toggle label="Interpolation on the green cube" value={interp} onChange={setInterp} />
            </div>
            <Note>Both cubes run the same 12 Hz simulation. The red one only ever shows the last physics state, so it visibly steps; the green one blends between the last two, so it glides at your monitor's refresh rate.</Note>
        </Demo>
    );
};
