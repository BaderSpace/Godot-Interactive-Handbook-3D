/* Interactive demos: Animation & Skeleton, Visuals & Rendering. */

/* A cheap procedural sky/ground environment so metallic materials and
   reflection probes have something to reflect. */
const makeEnvTexture = () => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, '#6ea8d8');
    sky.addColorStop(0.48, '#cfe4f2');
    sky.addColorStop(0.52, '#4a4438');
    sky.addColorStop(1, '#241f19');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(70, 34, 14, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
};

/* ------------------------------------------- Animation & Skeleton */

DEMOS.tweens = () => {
    const containerRef = useRef(null);
    const [ease, setEase] = useState('cubic_out');
    const [play, setPlay] = useState(0);
    const st = useRef({});
    st.current = { ease, play };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.box) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.box = mkMesh(new THREE.BoxGeometry(1, 1, 1), GODOT_BLUE);
            scene.add(objects.box);
            objects.linear = mkMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0x666666,
                { transparent: true, opacity: 0.5 });
            scene.add(objects.linear);
            scene.add(mkTextSprite('LINEAR', '#999999', 2).translateY(2.6).translateX(0));
            objects.t = 1;
            objects.lastPlay = 0;
        }
        const s = st.current;
        if (s.play !== objects.lastPlay) { objects.lastPlay = s.play; objects.t = 0; }
        objects.t = Math.min(1, objects.t + delta / 1.2);

        const t = objects.t;
        const curves = {
            linear: t,
            cubic_out: 1 - Math.pow(1 - t, 3),
            cubic_in: t * t * t,
            back_out: 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
            elastic_out: t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos(t * 12),
            bounce_out: (() => {
                const n = 7.5625, d = 2.75;
                if (t < 1 / d) return n * t * t;
                if (t < 2 / d) { const x = t - 1.5 / d; return n * x * x + 0.75; }
                if (t < 2.5 / d) { const x = t - 2.25 / d; return n * x * x + 0.9375; }
                const x = t - 2.625 / d; return n * x * x + 0.984375;
            })(),
        };
        const v = curves[s.ease];
        objects.box.position.set(-4 + 8 * v, 0.5 + v * 1.6, 0);
        objects.box.rotation.y = v * Math.PI * 2;
        objects.box.scale.setScalar(1 + v * 0.4);
        objects.linear.position.set(-4 + 8 * t, 0.35, 1.6);
    }, null, { cameraPos: [0, 4, 10], grid: false });

    const gd = {
        linear: 'TRANS_LINEAR).set_ease(Tween.EASE_IN_OUT',
        cubic_out: 'TRANS_CUBIC).set_ease(Tween.EASE_OUT',
        cubic_in: 'TRANS_CUBIC).set_ease(Tween.EASE_IN',
        back_out: 'TRANS_BACK).set_ease(Tween.EASE_OUT',
        elastic_out: 'TRANS_ELASTIC).set_ease(Tween.EASE_OUT',
        bounce_out: 'TRANS_BOUNCE).set_ease(Tween.EASE_OUT',
    }[ease];

    return (
        <Demo containerRef={containerRef} hint="grey ghost = linear, for comparison"
            code={`func slide() -> void:\n    var tween := create_tween()\n    tween.set_trans(Tween.${gd})\n    tween.tween_property(self, "position:x", 4.0, 1.2)\n    tween.parallel().tween_property(self, "scale", Vector3.ONE * 1.4, 1.2)\n    tween.tween_callback(func(): print("done"))\n    await tween.finished`}>
            <Choice value={ease} onChange={(v) => { setEase(v); setPlay((p) => p + 1); }} options={[
                { value: 'linear', label: 'LINEAR' }, { value: 'cubic_out', label: 'CUBIC / OUT' },
                { value: 'cubic_in', label: 'CUBIC / IN' }, { value: 'back_out', label: 'BACK / OUT' },
                { value: 'elastic_out', label: 'ELASTIC' }, { value: 'bounce_out', label: 'BOUNCE' },
            ]} />
            <div className="flex justify-center mt-4">
                <button onClick={() => setPlay((p) => p + 1)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded">Replay</button>
            </div>
        </Demo>
    );
};

DEMOS.anim_player = () => {
    const containerRef = useRef(null);
    const [anim, setAnim] = useState('Idle');
    const [blend, setBlend] = useState(0.2);
    const st = useRef({});
    st.current = { anim, blend };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.char) {
            scene.add(mkFloor(12, 0x2b2b2b));
            objects.char = new THREE.Group();
            scene.add(objects.char);
            objects.torso = mkMesh(new THREE.BoxGeometry(0.9, 1.2, 0.6), GODOT_BLUE);
            objects.torso.position.y = 1.4;
            objects.char.add(objects.torso);
            objects.head = mkMesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), 0x8ab6d8);
            objects.head.position.y = 2.3;
            objects.char.add(objects.head);
            const mkLimb = (x, y, w, h) => {
                const g = new THREE.Group();
                g.position.set(x, y, 0);
                const m = mkMesh(new THREE.BoxGeometry(w, h, w), 0x3a6d94);
                m.position.y = -h / 2;
                g.add(m);
                objects.char.add(g);
                return g;
            };
            objects.armL = mkLimb(-0.62, 1.9, 0.26, 1.0);
            objects.armR = mkLimb(0.62, 1.9, 0.26, 1.0);
            objects.legL = mkLimb(-0.25, 0.8, 0.3, 0.8);
            objects.legR = mkLimb(0.25, 0.8, 0.3, 0.8);
            objects.w = { Idle: 1, Walk: 0, Attack: 0 };
        }
        const s = st.current;
        // Cross-fade: weights move towards the target over `blend` seconds.
        const rate = s.blend <= 0.001 ? 1e9 : delta / s.blend;
        ['Idle', 'Walk', 'Attack'].forEach((k) => {
            const target = k === s.anim ? 1 : 0;
            objects.w[k] = THREE.MathUtils.clamp(
                objects.w[k] + Math.sign(target - objects.w[k]) * rate, 0, 1);
        });
        const n = objects.w.Idle + objects.w.Walk + objects.w.Attack || 1;
        const wi = objects.w.Idle / n, ww = objects.w.Walk / n, wa = objects.w.Attack / n;

        const swing = Math.sin(t * 7);
        objects.armL.rotation.x = wi * Math.sin(t * 2) * 0.06 + ww * swing * 0.9 + wa * (-2.2 + Math.sin(t * 9) * 0.4);
        objects.armR.rotation.x = wi * Math.sin(t * 2 + 1) * 0.06 - ww * swing * 0.9 + wa * (-1.4);
        objects.legL.rotation.x = -ww * swing * 0.8;
        objects.legR.rotation.x = ww * swing * 0.8;
        objects.char.position.y = wi * Math.sin(t * 2) * 0.04 + ww * Math.abs(swing) * 0.12;
        objects.torso.rotation.y = wa * Math.sin(t * 9) * 0.5;
    }, null, { cameraPos: [0, 2.6, 7.5], lookAt: [0, 1.4, 0], grid: false });

    return (
        <Demo containerRef={containerRef} hint={`playing "${anim}"`}
            code={`@onready var anim: AnimationPlayer = $AnimationPlayer\n\nfunc _ready() -> void:\n    anim.animation_finished.connect(_on_finished)\n    anim.play("Idle")\n\nfunc attack() -> void:\n    anim.play("${anim}", ${blend.toFixed(2)})   # blend time in seconds\n    anim.speed_scale = 1.0\n    await anim.animation_finished\n    anim.play("Idle", 0.2)`}>
            <Choice value={anim} onChange={setAnim} options={['Idle', 'Walk', 'Attack']} />
            <div className="mt-4">
                <Slider label="blend time (s)" value={blend} min={0} max={1} step={0.05} onChange={setBlend} />
            </div>
            <Note>Set the blend to 0 and the pose snaps. That hard cut is what makes programmer animation look broken; a fifth of a second fixes most of it.</Note>
        </Demo>
    );
};

DEMOS.anim_tree = () => {
    const containerRef = useRef(null);
    const [speed, setSpeed] = useState(0);
    const [oneShot, setOneShot] = useState(0);
    const st = useRef({});
    st.current = { speed, oneShot };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.char) {
            scene.add(mkFloor(12, 0x2b2b2b));
            objects.char = new THREE.Group();
            scene.add(objects.char);
            const torso = mkMesh(new THREE.BoxGeometry(0.9, 1.2, 0.6), GODOT_BLUE);
            torso.position.y = 1.4;
            objects.char.add(torso);
            objects.torso = torso;
            const head = mkMesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), 0x8ab6d8);
            head.position.y = 2.3;
            objects.char.add(head);
            const mkLimb = (x, y, w, h, col) => {
                const g = new THREE.Group(); g.position.set(x, y, 0);
                const m = mkMesh(new THREE.BoxGeometry(w, h, w), col);
                m.position.y = -h / 2; g.add(m); objects.char.add(g); return g;
            };
            objects.armL = mkLimb(-0.62, 1.9, 0.26, 1.0, 0x3a6d94);
            objects.armR = mkLimb(0.62, 1.9, 0.26, 1.0, 0x3a6d94);
            objects.legL = mkLimb(-0.25, 0.8, 0.3, 0.8, 0x2f5a7a);
            objects.legR = mkLimb(0.25, 0.8, 0.3, 0.8, 0x2f5a7a);
            objects.shot = 0;
            objects.lastShot = 0;
        }
        const s = st.current;
        if (s.oneShot !== objects.lastShot) { objects.lastShot = s.oneShot; objects.shot = 1; }
        objects.shot = Math.max(0, objects.shot - delta * 1.6);

        // BlendSpace1D: 0 = idle, 0.5 = walk, 1 = run.
        const b = s.speed;
        const freq = 2 + b * 9;
        const amp = 0.08 + b * 0.95;
        const swing = Math.sin(t * freq);

        objects.legL.rotation.x = -swing * amp;
        objects.legR.rotation.x = swing * amp;
        objects.armL.rotation.x = swing * amp * 0.85;
        objects.armR.rotation.x = -swing * amp * 0.85;
        objects.char.position.y = Math.abs(swing) * b * 0.18;
        objects.char.rotation.x = b * 0.12;

        // One-shot layered on top of locomotion.
        const k = objects.shot;
        objects.armR.rotation.x += -k * 2.4;
        objects.torso.rotation.y = k * 0.6;
    }, null, { cameraPos: [0, 2.6, 7.5], lookAt: [0, 1.4, 0], grid: false });

    const label = speed < 0.25 ? 'Idle' : speed < 0.7 ? 'Walk' : 'Run';

    return (
        <Demo containerRef={containerRef} hint={`blend_position = ${speed.toFixed(2)} — ${label}`}
            code={`@onready var tree: AnimationTree = $AnimationTree\n@onready var state: AnimationNodeStateMachinePlayback = tree["parameters/playback"]\n\nfunc _ready() -> void:\n    tree.active = true\n\nfunc _physics_process(delta: float) -> void:\n    var ratio := velocity.length() / MAX_SPEED\n    tree.set("parameters/Locomotion/blend_position", ${speed.toFixed(2)})\n\nfunc hit() -> void:\n    tree.set("parameters/Hit/request",\n        AnimationNodeOneShot.ONE_SHOT_REQUEST_FIRE)`}>
            <Slider label="BlendSpace1D blend_position" value={speed} min={0} max={1} step={0.01} onChange={setSpeed} />
            <div className="flex justify-center mt-4">
                <button onClick={() => setOneShot((s) => s + 1)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded">
                    Fire OneShot
                </button>
            </div>
            <Note>One value drives the whole locomotion blend — no branching, no play() calls. The one-shot layers an arm swing over whatever is already running.</Note>
        </Demo>
    );
};

DEMOS.skeleton3d = () => {
    const containerRef = useRef(null);
    const [pose, setPose] = useState({ spine: 0, shoulder: -30, elbow: 45 });

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.root) {
            objects.root = new THREE.Group();
            objects.root.position.y = 0.2;
            scene.add(objects.root);
            const bone = (parent, len, offsetY, color, thick) => {
                const g = new THREE.Group();
                g.position.y = offsetY;
                const m = mkMesh(new THREE.BoxGeometry(thick, len, thick), color);
                m.position.y = len / 2;
                g.add(m);
                const joint = mkMesh(new THREE.SphereGeometry(thick * 0.8, 12, 10), 0xffdd44);
                g.add(joint);
                parent.add(g);
                return g;
            };
            objects.hips = bone(objects.root, 0.9, 0, 0x555555, 0.3);
            objects.spine = bone(objects.hips, 1.1, 0.9, 0x777777, 0.28);
            objects.shoulder = bone(objects.spine, 1.0, 1.1, 0x999999, 0.2);
            objects.elbow = bone(objects.shoulder, 0.9, 1.0, 0xbbbbbb, 0.16);
            objects.skin = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: GODOT_BLUE, wireframe: true, transparent: true, opacity: 0.25 }));
            objects.shoulder.add(objects.skin);
            objects.skin.position.y = 0.5;
            objects.skin.scale.set(0.6, 1.2, 0.6);
        }
        objects.spine.rotation.z = THREE.MathUtils.degToRad(pose.spine);
        objects.shoulder.rotation.z = THREE.MathUtils.degToRad(pose.shoulder);
        objects.elbow.rotation.z = THREE.MathUtils.degToRad(pose.elbow);
    }, null, { cameraPos: [4, 3, 6], lookAt: [0, 1.9, 0] });

    return (
        <Demo containerRef={containerRef} hint="yellow spheres = joints · each bone is local to its parent"
            code={`@onready var skel: Skeleton3D = $Armature/Skeleton3D\n\nfunc set_pose() -> void:\n    var spine := skel.find_bone("Spine")\n    skel.set_bone_pose_rotation(spine,\n        Quaternion(Vector3.FORWARD, deg_to_rad(${pose.spine})))\n\n    var arm := skel.find_bone("UpperArm.R")\n    skel.set_bone_pose_rotation(arm,\n        Quaternion(Vector3.FORWARD, deg_to_rad(${pose.shoulder})))\n\n# Bone position in world space:\nvar world := skel.global_transform * skel.get_bone_global_pose(arm)`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Slider label="Spine (deg)" value={pose.spine} min={-45} max={45} step={1} onChange={(v) => setPose({ ...pose, spine: v })} />
                <Slider label="Shoulder (deg)" value={pose.shoulder} min={-120} max={120} step={1} onChange={(v) => setPose({ ...pose, shoulder: v })} />
                <Slider label="Elbow (deg)" value={pose.elbow} min={-10} max={140} step={1} onChange={(v) => setPose({ ...pose, elbow: v })} />
            </div>
            <Note>Rotating the spine carries the shoulder, and the shoulder carries the elbow. That inheritance is the whole point of a skeleton — and why you write to the <em>pose</em>, never the rest.</Note>
        </Demo>
    );
};

DEMOS.bone_attach = () => {
    const containerRef = useRef(null);
    const [weapon, setWeapon] = useState('sword');
    const [attached, setAttached] = useState(true);
    const st = useRef({});
    st.current = { weapon, attached };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.shoulder) {
            objects.shoulder = new THREE.Group();
            objects.shoulder.position.set(0, 3.2, 0);
            scene.add(objects.shoulder);
            const upper = mkMesh(new THREE.BoxGeometry(0.28, 1.4, 0.28), 0x888888);
            upper.position.y = -0.7;
            objects.shoulder.add(upper);
            objects.elbow = new THREE.Group();
            objects.elbow.position.y = -1.4;
            objects.shoulder.add(objects.elbow);
            const lower = mkMesh(new THREE.BoxGeometry(0.24, 1.3, 0.24), 0x666666);
            lower.position.y = -0.65;
            objects.elbow.add(lower);
            objects.hand = new THREE.Group();
            objects.hand.position.y = -1.3;
            objects.elbow.add(objects.hand);
            objects.hand.add(mkMesh(new THREE.SphereGeometry(0.16, 12, 10), 0xffdd44));
            objects.detached = new THREE.Group();
            scene.add(objects.detached);
            objects.weaponMesh = null;
            objects.currentWeapon = null;
        }
        const s = st.current;
        if (objects.currentWeapon !== s.weapon) {
            objects.currentWeapon = s.weapon;
            if (objects.weaponMesh) {
                destroy(objects.weaponMesh.parent, objects.weaponMesh);
            }
            const w = s.weapon === 'sword'
                ? mkMesh(new THREE.BoxGeometry(0.09, 1.8, 0.28), 0xc0d8e8)
                : mkMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), 0x9a6b3a);
            w.position.y = -0.9;
            objects.weaponMesh = w;
            objects.attachedTo = null;
        }
        const parent = s.attached ? objects.hand : objects.detached;
        if (objects.attachedTo !== parent) {
            objects.attachedTo = parent;
            if (objects.weaponMesh.parent) objects.weaponMesh.parent.remove(objects.weaponMesh);
            parent.add(objects.weaponMesh);
            objects.weaponMesh.position.set(0, s.attached ? -0.9 : 0.9, 0);
            objects.detached.position.set(2.4, 0, 0);
        }
        objects.shoulder.rotation.z = Math.sin(t * 1.6) * 0.7 + 0.4;
        objects.elbow.rotation.z = Math.sin(t * 2.4) * 0.5 - 0.6;
    }, null, { cameraPos: [4.5, 3, 6.5], lookAt: [0, 1.7, 0], grid: false });

    return (
        <Demo containerRef={containerRef} hint={attached ? 'parented to the hand bone' : 'dropped — no longer following'}
            code={`@onready var hand: BoneAttachment3D = $Armature/Skeleton3D/HandAttachment\n\nfunc _ready() -> void:\n    hand.bone_name = "Hand.R"\n\nfunc equip(scene: PackedScene) -> void:\n    for child in hand.get_children():\n        child.queue_free()\n    hand.add_child(scene.instantiate())\n\nfunc drop() -> void:\n    var w := hand.get_child(0)\n    w.reparent(get_tree().current_scene, true)  # keep world transform`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <Choice value={weapon} onChange={setWeapon} options={[
                    { value: 'sword', label: 'Sword' }, { value: 'staff', label: 'Staff' }]} />
                <Toggle label="Attached to bone" value={attached} onChange={setAttached} />
            </div>
        </Demo>
    );
};

DEMOS.ik = () => {
    const containerRef = useRef(null);
    const [target, setTarget] = useState({ x: 2.4, y: 1.4 });
    const [enabled, setEnabled] = useState(true);
    const [reachable, setReachable] = useState(true);
    const st = useRef({});
    st.current = { target, enabled };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.bone1) {
            objects.bone1 = new THREE.Group();
            scene.add(objects.bone1);
            const b1 = mkMesh(new THREE.BoxGeometry(2, 0.22, 0.22), 0x888888);
            b1.position.x = 1;
            objects.bone1.add(b1);
            objects.bone2 = new THREE.Group();
            objects.bone2.position.x = 2;
            objects.bone1.add(objects.bone2);
            const b2 = mkMesh(new THREE.BoxGeometry(2, 0.18, 0.18), 0x666666);
            b2.position.x = 1;
            objects.bone2.add(b2);
            objects.bone1.add(mkMesh(new THREE.SphereGeometry(0.16, 12, 10), 0xffdd44));
            objects.bone2.add(mkMesh(new THREE.SphereGeometry(0.13, 12, 10), 0xffdd44));

            objects.target = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12),
                new THREE.MeshBasicMaterial({ color: 0xff4444 }));
            scene.add(objects.target);
            objects.reach = new THREE.Mesh(
                new THREE.RingGeometry(3.98, 4.02, 64),
                new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide }));
            scene.add(objects.reach);
        }
        const s = st.current;
        objects.target.position.set(s.target.x, s.target.y, 0);

        const L1 = 2, L2 = 2;
        const x = s.target.x, y = s.target.y;
        const dist = Math.hypot(x, y);
        const ok = dist <= L1 + L2;
        if (ok !== objects.lastOk) { objects.lastOk = ok; setReachable(ok); }
        objects.target.material.color.setHex(ok ? 0xff4444 : 0x884444);

        if (!s.enabled) {
            // FK: whatever the animation posed, ignoring the target.
            objects.bone1.rotation.z = THREE.MathUtils.lerp(objects.bone1.rotation.z, 0.35, 6 * delta);
            objects.bone2.rotation.z = THREE.MathUtils.lerp(objects.bone2.rotation.z, 0.6, 6 * delta);
            return;
        }
        // Two-bone analytic IK (law of cosines) — what TwoBoneIK3D solves.
        const reach = Math.min(dist, L1 + L2 - 0.001);
        const alpha = Math.acos(
            THREE.MathUtils.clamp((L1 * L1 + reach * reach - L2 * L2) / (2 * L1 * reach), -1, 1));
        const beta = Math.atan2(y, x);
        const gamma = Math.acos(
            THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - reach * reach) / (2 * L1 * L2), -1, 1));
        objects.bone1.rotation.z = beta - alpha;
        objects.bone2.rotation.z = Math.PI - gamma;
    }, null, { cameraPos: [0, 0, 9], grid: false });

    return (
        <Demo containerRef={containerRef} hint={reachable ? 'target within reach' : 'out of reach — the chain straightens'}
            code={`# Godot 4.7: IK lives in the SkeletonModifier3D family.\n@onready var leg_ik: TwoBoneIK3D = $Armature/Skeleton3D/LegIK\n@onready var head: LookAtModifier3D = $Armature/Skeleton3D/HeadLook\n\nfunc _ready() -> void:\n    leg_ik.active = ${enabled}\n    head.active = true\n    head.influence = 1.0\n\nfunc plant_foot(ground: Vector3) -> void:\n    $IKTarget.global_position = ground\n\n# ChainIK3D handles longer chains (tails, tentacles).\n# SkeletonIK3D is DEPRECATED — do not use it in new work.`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="target.x" value={target.x} min={-4.5} max={4.5} step={0.1} onChange={(v) => setTarget({ ...target, x: v })} />
                <Slider label="target.y" value={target.y} min={-4.5} max={4.5} step={0.1} onChange={(v) => setTarget({ ...target, y: v })} />
            </div>
            <div className="flex justify-center mt-4"><Toggle label="IK active" value={enabled} onChange={setEnabled} /></div>
            <Note>Turn IK off and the arm falls back to the animated (forward kinematic) pose. IK modifiers run <em>after</em> the animation every frame, correcting it.</Note>
        </Demo>
    );
};

/* --------------------------------------------- Visuals & Rendering */

DEMOS.material_std = () => {
    const containerRef = useRef(null);
    const [albedo, setAlbedo] = useState('#478cbf');
    const [metallic, setMetallic] = useState(0);
    const [roughness, setRoughness] = useState(0.35);
    const [emission, setEmission] = useState(0);
    const st = useRef({});
    st.current = { albedo, metallic, roughness, emission };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.sphere) {
            objects.env = makeEnvTexture();
            scene.environment = objects.env;
            objects.sphere = new THREE.Mesh(
                new THREE.SphereGeometry(1.3, 48, 36),
                new THREE.MeshStandardMaterial({ color: 0x478cbf }));
            objects.sphere.position.y = 1.4;
            scene.add(objects.sphere);
            scene.add(mkFloor(14, 0x333333));
            const key = new THREE.PointLight(0xffffff, 0.8, 20);
            key.position.set(3, 4, 3);
            scene.add(key);
            objects.dispose = () => { objects.env.dispose(); };
        }
        const s = st.current;
        const m = objects.sphere.material;
        m.color.set(s.albedo);
        m.metalness = s.metallic;
        m.roughness = Math.max(0.02, s.roughness);
        m.emissive.set(s.albedo);
        m.emissiveIntensity = s.emission;
        objects.sphere.rotation.y += 0.25 * delta;
    }, null, { cameraPos: [0, 2.2, 6.2], lookAt: [0, 1.4, 0], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="a sky/ground environment gives metal something to reflect"
            code={`var mat := StandardMaterial3D.new()\nmat.albedo_color = Color("${albedo}")\nmat.metallic = ${metallic.toFixed(2)}\nmat.roughness = ${roughness.toFixed(2)}\nmat.emission_enabled = ${emission > 0}\nmat.emission = Color("${albedo}")\nmat.emission_energy_multiplier = ${emission.toFixed(2)}\n\n$MeshInstance3D.material_override = mat`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="metallic" value={metallic} min={0} max={1} step={0.01} onChange={setMetallic} />
                <Slider label="roughness" value={roughness} min={0} max={1} step={0.01} onChange={setRoughness} />
                <Slider label="emission_energy" value={emission} min={0} max={3} step={0.05} onChange={setEmission} />
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400">albedo_color</label>
                    <input type="color" value={albedo} onChange={(e) => setAlbedo(e.target.value)} className="w-full h-8 bg-transparent" />
                </div>
            </div>
            <Note>Real materials are metal or they are not — metallic values between 0 and 1 exist mostly for blending between two surfaces in a texture.</Note>
        </Demo>
    );
};

DEMOS.shaders = () => {
    const containerRef = useRef(null);
    const [dissolve, setDissolve] = useState(0);
    const [wave, setWave] = useState(0.15);
    const [color, setColor] = useState('#478cbf');
    const st = useRef({});
    st.current = { dissolve, wave, color };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.mesh) {
            const uniforms = {
                uTime: { value: 0 },
                uTint: { value: new THREE.Color(0x478cbf) },
                uDissolve: { value: 0 },
                uWave: { value: 0.15 },
            };
            objects.uniforms = uniforms;
            const mat = new THREE.ShaderMaterial({
                uniforms,
                side: THREE.DoubleSide,
                vertexShader: `
                    uniform float uTime;
                    uniform float uWave;
                    varying vec2 vUv;
                    varying vec3 vNormalW;
                    void main() {
                        vUv = uv;
                        vNormalW = normalize(normalMatrix * normal);
                        vec3 p = position;
                        p.y += sin(uTime * 2.0 + position.x * 3.0) * uWave;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                    }`,
                fragmentShader: `
                    uniform vec3 uTint;
                    uniform float uDissolve;
                    varying vec2 vUv;
                    varying vec3 vNormalW;
                    // cheap value noise stand-in for a noise texture
                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                    }
                    float noise(vec2 p) {
                        vec2 i = floor(p), f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
                    }
                    void main() {
                        float n = noise(vUv * 8.0);
                        if (n < uDissolve) discard;
                        float lambert = max(dot(vNormalW, normalize(vec3(0.4, 0.8, 0.6))), 0.15);
                        vec3 edge = vec3(1.0, 0.55, 0.15)
                            * (1.0 - smoothstep(uDissolve, uDissolve + 0.06, n));
                        gl_FragColor = vec4(uTint * lambert + edge * 2.0, 1.0);
                    }`,
            });
            objects.mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.34, 160, 24), mat);
            objects.mesh.position.y = 1.2;
            scene.add(objects.mesh);
        }
        const s = st.current;
        objects.uniforms.uTime.value = t;
        objects.uniforms.uDissolve.value = s.dissolve;
        objects.uniforms.uWave.value = s.wave;
        objects.uniforms.uTint.value.set(s.color);
        objects.mesh.rotation.y += 0.4 * delta;
    }, null, { cameraPos: [0, 2.1, 6], lookAt: [0, 1.2, 0], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="running as a real GLSL shader in this viewport"
            code={`shader_type spatial;\nrender_mode blend_mix, cull_back;\n\nuniform vec4 tint : source_color = vec4(1.0);\nuniform float dissolve : hint_range(0.0, 1.0) = ${dissolve.toFixed(2)};\nuniform float wave_strength = ${wave.toFixed(2)};\nuniform sampler2D noise_tex;\n\nvoid vertex() {\n    VERTEX.y += sin(TIME * 2.0 + VERTEX.x * 3.0) * wave_strength;\n}\n\nvoid fragment() {\n    float n = texture(noise_tex, UV).r;\n    if (n < dissolve) discard;\n    ALBEDO = tint.rgb;\n    EMISSION = vec3(1.0, 0.55, 0.15) * 2.0\n        * (1.0 - smoothstep(dissolve, dissolve + 0.06, n));\n    ROUGHNESS = 0.4;\n}`} lang="glsl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Slider label="dissolve" value={dissolve} min={0} max={1} step={0.01} onChange={setDissolve} />
                <Slider label="wave_strength" value={wave} min={0} max={0.6} step={0.01} onChange={setWave} />
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400">tint</label>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 bg-transparent" />
                </div>
            </div>
            <Note><code>vertex()</code> moves geometry, <code>fragment()</code> colours pixels, and <code>discard</code> throws a pixel away entirely — that is the whole dissolve effect.</Note>
        </Demo>
    );
};

DEMOS.lights = () => {
    const containerRef = useRef(null);
    const [omni, setOmni] = useState(true);
    const [spot, setSpot] = useState(true);
    const [sun, setSun] = useState(false);
    const [shadows, setShadows] = useState(true);
    const st = useRef({});
    st.current = { omni, spot, sun, shadows };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            // The hook's default lights would wash out the demo.
            scene.children.filter((c) => c.isLight).forEach((l) => scene.remove(l));
            scene.add(new THREE.AmbientLight(0xffffff, 0.12));

            const floor = mkStd(new THREE.PlaneGeometry(20, 20), { color: 0x555555, roughness: 0.9 });
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);
            [[-1.6, 0], [1.6, 0], [0, -1.8]].forEach(([x, z], i) => {
                const b = mkStd(new THREE.BoxGeometry(1, 1.6 + i * 0.4, 1),
                    { color: 0xdddddd, roughness: 0.7 });
                b.position.set(x, (1.6 + i * 0.4) / 2, z);
                b.castShadow = true;
                b.receiveShadow = true;
                scene.add(b);
            });

            objects.omni = new THREE.PointLight(0xffaa44, 3.2, 14, 1.4);
            objects.omni.castShadow = true;
            scene.add(objects.omni);
            objects.omniGizmo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8),
                new THREE.MeshBasicMaterial({ color: 0xffaa44 }));
            scene.add(objects.omniGizmo);

            objects.spot = new THREE.SpotLight(0x66bbff, 6.5, 22, 0.42, 0.5, 1.2);
            objects.spot.position.set(3.5, 5, 3.5);
            objects.spot.target.position.set(0, 0, 0);
            objects.spot.castShadow = true;
            scene.add(objects.spot, objects.spot.target);

            objects.sun = new THREE.DirectionalLight(0xffffff, 0.9);
            objects.sun.position.set(-6, 8, 4);
            objects.sun.castShadow = true;
            objects.sun.shadow.camera.left = -10;
            objects.sun.shadow.camera.right = 10;
            objects.sun.shadow.camera.top = 10;
            objects.sun.shadow.camera.bottom = -10;
            scene.add(objects.sun);
            objects.built = true;
        }
        const s = st.current;
        objects.omni.position.set(Math.sin(t * 0.7) * 3, 2.4 + Math.sin(t) * 0.4, 2.2);
        objects.omniGizmo.position.copy(objects.omni.position);
        objects.omni.visible = s.omni;
        objects.omniGizmo.visible = s.omni;
        objects.spot.visible = s.spot;
        objects.sun.visible = s.sun;
        objects.omni.castShadow = s.shadows;
        objects.spot.castShadow = s.shadows;
        objects.sun.castShadow = s.shadows;
    }, null, { cameraPos: [6, 5, 7], grid: false, axes: false, shadows: true, background: 0x0d0d0f });

    return (
        <Demo containerRef={containerRef} hint="shadows are the expensive part, not the light"
            code={`$DirectionalLight3D.visible = ${sun}          # the sun: direction matters, position does not\n$DirectionalLight3D.light_energy = 1.4\n$DirectionalLight3D.directional_shadow_max_distance = 80.0\n\n$OmniLight3D.visible = ${omni}\n$OmniLight3D.light_color = Color.ORANGE\n$OmniLight3D.omni_range = 14.0\n\n$SpotLight3D.visible = ${spot}\n$SpotLight3D.spot_angle = 48.0\n$SpotLight3D.spot_angle_attenuation = 1.0\n\n# shadow_enabled = ${shadows}\n# shadow_bias = 0.03    # raise this to kill shadow acne`}>
            <div className="flex flex-wrap justify-center gap-3">
                <Toggle label="DirectionalLight3D" value={sun} onChange={setSun} />
                <Toggle label="OmniLight3D" value={omni} onChange={setOmni} />
                <Toggle label="SpotLight3D" value={spot} onChange={setSpot} />
                <Toggle label="Shadows" value={shadows} onChange={setShadows} />
            </div>
        </Demo>
    );
};

DEMOS.area_light = () => {
    const containerRef = useRef(null);
    const [w, setW] = useState(3);
    const [h, setH] = useState(0.6);
    const [energy, setEnergy] = useState(1);
    const [asPoint, setAsPoint] = useState(false);
    const st = useRef({});
    st.current = { w, h, energy, asPoint };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.built) {
            scene.children.filter((c) => c.isLight).forEach((l) => scene.remove(l));
            scene.add(new THREE.AmbientLight(0xffffff, 0.1));

            const floor = mkStd(new THREE.PlaneGeometry(20, 20), { color: 0x666666, roughness: 0.85 });
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);
            const back = mkStd(new THREE.PlaneGeometry(20, 12), { color: 0x5a5a60, roughness: 0.9 });
            back.position.set(0, 6, -5);
            back.receiveShadow = true;
            scene.add(back);
            [[-1.4, 0.9], [1.5, 0.4]].forEach(([x, z], i) => {
                const b = mkStd(new THREE.BoxGeometry(0.9, 2.2, 0.9), { color: 0xdddddd, roughness: 0.6 });
                b.position.set(x, 1.1, z);
                b.castShadow = true;
                scene.add(b);
            });

            // AreaLight3D approximated by a strip of point lights across the
            // rectangle — that spread is exactly what softens the shadow.
            objects.lights = [];
            for (let i = 0; i < 7; i++) {
                const l = new THREE.PointLight(0xbfe0ff, 1, 26, 1.5);
                l.castShadow = i === 3;
                scene.add(l);
                objects.lights.push(l);
            }
            objects.panel = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({ color: 0xdff0ff, side: THREE.DoubleSide }));
            scene.add(objects.panel);
            objects.built = true;
        }
        const s = st.current;
        const n = objects.lights.length;
        const spanW = s.asPoint ? 0 : s.w;
        const spanH = s.asPoint ? 0 : s.h;
        objects.lights.forEach((l, i) => {
            const f = n === 1 ? 0 : i / (n - 1) - 0.5;
            l.position.set(f * spanW, 4.4 + f * spanH * 0.5, -1.2);
            // Keep the total output constant as the rectangle grows,
            // like area_normalize_energy does.
            l.intensity = (s.energy * 3.6) / n;
        });
        objects.panel.position.set(0, 4.4, -1.2);
        objects.panel.scale.set(Math.max(0.15, spanW), Math.max(0.15, spanH), 1);
        objects.panel.visible = !s.asPoint;
    }, null, { cameraPos: [0, 4.2, 11.5], lookAt: [0, 2.2, -1], zoomRange: [5, 22], grid: false, axes: false, shadows: true, background: 0x0a0a0c });

    return (
        <Demo containerRef={containerRef} hint={asPoint ? 'single OmniLight3D — hard shadow' : 'AreaLight3D — soft, wide shadow'}
            code={`# New in Godot 4.7\nvar light := AreaLight3D.new()\nlight.area_size = Vector2(${w.toFixed(1)}, ${h.toFixed(1)})   # metres, emits along -Z\nlight.area_range = 22.0\nlight.area_attenuation = 1.0\nlight.area_normalize_energy = true   # output independent of size\nlight.light_color = Color(0.75, 0.88, 1.0)\nlight.light_energy = ${(energy * 4).toFixed(1)}\nlight.shadow_enabled = true\nadd_child(light)\n\n# Screen or TV glow: give it a texture\nlight.area_texture = preload("res://screen.png")`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Slider label="area_size.x" value={w} min={0.2} max={8} step={0.1} onChange={setW} />
                <Slider label="area_size.y" value={h} min={0.1} max={4} step={0.1} onChange={setH} />
                <Slider label="light_energy" value={energy} min={0.2} max={2.5} step={0.05} onChange={setEnergy} />
            </div>
            <div className="flex justify-center mt-4">
                <Toggle label="Collapse to a point light" value={asPoint} onChange={setAsPoint} />
            </div>
            <Note>Widen the rectangle and the shadow edges spread out. Collapse it to a point and they snap hard — that difference is the whole reason AreaLight3D exists. (This viewport fakes the area light with a strip of point lights; Godot 4.7 does it properly in one node.)</Note>
        </Demo>
    );
};

DEMOS.gi = () => {
    const containerRef = useRef(null);
    const [mode, setMode] = useState('sdfgi');
    const st = useRef({});
    st.current = { mode };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.built) {
            scene.children.filter((c) => c.isLight).forEach((l) => scene.remove(l));
            scene.add(new THREE.AmbientLight(0xffffff, 0.09));

            // A red wall and a blue wall — bounce light tints the room.
            const room = new THREE.Group();
            scene.add(room);
            const floor = mkStd(new THREE.PlaneGeometry(10, 10), { color: 0x999999, roughness: 0.95 });
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            room.add(floor);
            objects.redWall = mkStd(new THREE.BoxGeometry(0.3, 6, 10), { color: 0xcc3333, roughness: 0.9 });
            objects.redWall.position.set(-5, 3, 0);
            room.add(objects.redWall);
            objects.blueWall = mkStd(new THREE.BoxGeometry(0.3, 6, 10), { color: 0x3355cc, roughness: 0.9 });
            objects.blueWall.position.set(5, 3, 0);
            room.add(objects.blueWall);
            objects.ball = mkStd(new THREE.SphereGeometry(1.2, 36, 24), { color: 0xdddddd, roughness: 0.55 });
            objects.ball.position.set(0, 1.4, 0);
            objects.ball.castShadow = true;
            room.add(objects.ball);

            objects.sun = new THREE.DirectionalLight(0xfff0dd, 1.15);
            objects.sun.position.set(2, 9, 4);
            objects.sun.castShadow = true;
            scene.add(objects.sun);

            // Bounce: coloured fill lights standing in for indirect light.
            objects.redBounce = new THREE.PointLight(0xff5544, 0, 18, 1.3);
            objects.redBounce.position.set(-3.5, 2.5, 0);
            objects.blueBounce = new THREE.PointLight(0x5577ff, 0, 18, 1.3);
            objects.blueBounce.position.set(3.5, 2.5, 0);
            objects.skyFill = new THREE.HemisphereLight(0x88aacc, 0x554433, 0);
            scene.add(objects.redBounce, objects.blueBounce, objects.skyFill);
            objects.built = true;
        }
        const strength = { none: 0, lightmap: 1, voxel: 0.85, sdfgi: 1.1 }[st.current.mode];
        objects.redBounce.intensity = 1.8 * strength;
        objects.blueBounce.intensity = 1.8 * strength;
        objects.skyFill.intensity = 0.35 * strength;
        objects.ball.rotation.y += 0.2 * delta;
    }, null, { cameraPos: [0, 5.2, 15], lookAt: [0, 2, 0], zoomRange: [6, 28], grid: false, axes: false, shadows: true, background: 0x101014 });

    const desc = {
        none: 'Direct light only. Every shadowed surface is flat black — the giveaway of an unlit scene.',
        lightmap: 'LightmapGI: baked into textures in the editor. Cheapest at runtime, but static geometry and static lights only.',
        voxel: 'VoxelGI: real-time bounce inside a box you place. Good for rooms and interiors; needs a bake step when geometry changes.',
        sdfgi: 'SDFGI: fully dynamic, follows the camera, no bake and no bounds. Best for open worlds and the most expensive of the three.',
    }[mode];

    const code = {
        none: '# No GI. Everything not directly lit is black.\nenv.ambient_light_source = Environment.AMBIENT_SOURCE_DISABLED',
        lightmap: '# 1. Set meshes to GI Mode = Static\n# 2. Add a LightmapGI node\n# 3. Toolbar -> Bake Lightmaps\n$LightmapGI.quality = LightmapGI.BAKE_QUALITY_HIGH',
        voxel: 'var gi := VoxelGI.new()\ngi.size = Vector3(20, 10, 20)\ngi.subdiv = VoxelGI.SUBDIV_128\nadd_child(gi)\ngi.bake()',
        sdfgi: 'var env: Environment = $WorldEnvironment.environment\nenv.sdfgi_enabled = true\nenv.sdfgi_cascades = 4\nenv.sdfgi_use_occlusion = true\nenv.ssao_enabled = true    # contact shadows in the corners',
    }[mode];

    return (
        <Demo containerRef={containerRef} hint="watch the sphere pick up red and blue from the walls"
            code={code}>
            <Choice value={mode} onChange={setMode} options={[
                { value: 'none', label: 'No GI' }, { value: 'lightmap', label: 'LightmapGI' },
                { value: 'voxel', label: 'VoxelGI' }, { value: 'sdfgi', label: 'SDFGI' },
            ]} />
            <div className="mt-4"><Note>{desc}</Note></div>
        </Demo>
    );
};

DEMOS.reflection_probe = () => {
    const containerRef = useRef(null);
    const [probe, setProbe] = useState(true);
    const [roughness, setRoughness] = useState(0.08);
    const [interior, setInterior] = useState(true);
    const st = useRef({});
    st.current = { probe, roughness, interior };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            objects.env = makeEnvTexture();
            scene.add(mkFloor(20, 0x3a3a3a));
            const cols = [0xcc3333, 0x33cc55, 0x3355cc, 0xdddd33];
            cols.forEach((c, i) => {
                const a = (i / cols.length) * Math.PI * 2;
                const b = mkStd(new THREE.BoxGeometry(1.2, 3, 1.2), { color: c, roughness: 0.7 });
                b.position.set(Math.cos(a) * 4, 1.5, Math.sin(a) * 4);
                scene.add(b);
            });

            // A CubeCamera IS a reflection probe: render the surroundings to a cubemap.
            objects.rt = new THREE.WebGLCubeRenderTarget(256);
            objects.cube = new THREE.CubeCamera(0.1, 100, objects.rt);
            objects.cube.position.set(0, 1.6, 0);
            scene.add(objects.cube);

            objects.ball = new THREE.Mesh(
                new THREE.SphereGeometry(1.5, 48, 36),
                new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 }));
            objects.ball.position.set(0, 1.6, 0);
            scene.add(objects.ball);
            objects.dispose = () => { objects.rt.dispose(); objects.env.dispose(); };
            objects.built = true;
        }
        const s = st.current;
        objects.ball.material.roughness = Math.max(0.02, s.roughness);

        if (s.probe) {
            objects.ball.visible = false;
            objects.cube.update(renderer, scene);
            objects.ball.visible = true;
            objects.ball.material.envMap = objects.rt.texture;
        } else {
            objects.ball.material.envMap = null;
        }
        // interior = ignore the sky and use only what the probe captured
        scene.environment = s.interior ? null : objects.env;
        objects.ball.material.needsUpdate = true;
    }, null, { cameraPos: [0, 4.5, 12], lookAt: [0, 1.6, 0], zoomRange: [5, 24], grid: false, axes: false, background: 0x1a1a1e });

    return (
        <Demo containerRef={containerRef} hint={probe ? 'probe capturing the room every frame (UPDATE_ALWAYS)' : 'no probe — nothing to reflect'}
            code={`var probe := ReflectionProbe.new()\nprobe.size = Vector3(12, 6, 12)\nprobe.update_mode = ReflectionProbe.UPDATE_${probe ? 'ALWAYS' : 'ONCE'}\nprobe.box_projection = true    # match reflections to the room shape\nprobe.interior = ${interior}          # ignore the sky indoors\nprobe.intensity = 1.0\nadd_child(probe)\n\n# Only low-roughness metal shows it clearly\nmat.metallic = 1.0\nmat.roughness = ${roughness.toFixed(2)}`}>
            <Slider label="material roughness" value={roughness} min={0} max={1} step={0.01} onChange={setRoughness} />
            <div className="flex justify-center gap-3 mt-4">
                <Toggle label="ReflectionProbe" value={probe} onChange={setProbe} />
                <Toggle label="interior" value={interior} onChange={setInterior} />
            </div>
            <Note>Roughness blurs the reflection away. Past about 0.5 the probe stops earning its cost — that is when a cheap ambient colour looks the same.</Note>
        </Demo>
    );
};

DEMOS.decals = () => {
    const containerRef = useRef(null);
    const [size, setSize] = useState(1);
    const [mix, setMix] = useState(1);
    const [count, setCount] = useState(0);
    const decalTexRef = useRef(null);

    const makeDecalTexture = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
        g.addColorStop(0, 'rgba(10,8,6,1)');
        g.addColorStop(0.45, 'rgba(45,30,20,0.85)');
        g.addColorStop(1, 'rgba(60,40,25,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 38;
            ctx.fillStyle = 'rgba(20,15,10,0.7)';
            ctx.beginPath();
            ctx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1 + Math.random() * 4, 0, Math.PI * 2);
            ctx.fill();
        }
        return new THREE.CanvasTexture(c);
    };

    const { objectsRef } = useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.built) {
            objects.tex = makeDecalTexture();
            decalTexRef.current = objects.tex;
            objects.wall = mkMesh(new THREE.BoxGeometry(7, 3.4, 0.4), 0x8a7a68);
            objects.wall.position.set(0, 1.7, -2);
            scene.add(objects.wall);
            objects.ground = mkMesh(new THREE.BoxGeometry(7, 0.4, 5), 0x6a6055);
            objects.ground.position.set(0, 0, 0.2);
            scene.add(objects.ground);
            objects.decals = new THREE.Group();
            scene.add(objects.decals);
            objects.built = true;
            objects.dispose = () => objects.tex.dispose();
        }
        objects.decals.children.forEach((d) => {
            d.scale.setScalar(size);
            d.material.opacity = mix;
        });
    }, (raycaster) => {
        const objects = objectsRef.current;
        if (!objects || !objects.wall) return;
        const hits = raycaster.intersectObjects([objects.wall, objects.ground], false);
        if (!hits.length) return;
        const hit = hits[0];
        const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        const d = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                map: objects.tex, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -4,
            }));
        d.position.copy(hit.point).addScaledVector(n, 0.01);
        d.lookAt(hit.point.clone().add(n));
        d.rotateZ(Math.random() * Math.PI * 2);
        objects.decals.add(d);
        if (objects.decals.children.length > 24) {
            destroy(objects.decals, objects.decals.children[0]);
        }
        setCount(objects.decals.children.length);
    }, { cameraPos: [0, 3.6, 7.5], lookAt: [0, 1.2, -1], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} cursor="cursor-crosshair"
            hint="click the wall or the floor to stamp a decal"
            code={`func spawn_decal(hit: Dictionary) -> void:\n    var d := Decal.new()\n    d.size = Vector3(${size.toFixed(2)}, 0.4, ${size.toFixed(2)})   # projects down -Y\n    d.texture_albedo = BULLET_HOLE\n    d.albedo_mix = ${mix.toFixed(2)}\n    d.normal_fade = 0.5        # skip near-perpendicular surfaces\n    d.upper_fade = 0.3\n    d.distance_fade_enabled = true\n    add_child(d)\n\n    d.global_position = hit.position\n    d.look_at(hit.position - hit.normal, Vector3.UP)\n    d.rotate_object_local(Vector3.RIGHT, PI / 2)\n\n# ${count} decals placed`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="decal size" value={size} min={0.3} max={2.5} step={0.05} onChange={setSize} />
                <Slider label="albedo_mix" value={mix} min={0} max={1} step={0.01} onChange={setMix} />
            </div>
            <Note>A Decal is a box that projects its texture down -Y onto whatever geometry falls inside. Keep the box shallow, or the hole wraps around the corner of the wall.</Note>
        </Demo>
    );
};

DEMOS.world_env = () => {
    const containerRef = useRef(null);
    const [density, setDensity] = useState(0.05);
    const [bg, setBg] = useState('#20242c');
    const [volumetric, setVolumetric] = useState(false);
    const st = useRef({});
    st.current = { density, bg, volumetric };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.built) {
            scene.add(mkFloor(80, 0x33383f));
            for (let i = 0; i < 26; i++) {
                const b = mkMesh(new THREE.BoxGeometry(1.2, 2 + Math.random() * 3, 1.2), 0x767c86);
                b.position.set((Math.random() - 0.5) * 14, 1.5, -i * 2 - 2);
                scene.add(b);
            }
            objects.fogColor = new THREE.Color(bg);
            objects.fog = new THREE.FogExp2(objects.fogColor.getHex(), density);
            scene.fog = objects.fog;
            objects.shafts = new THREE.Group();
            for (let i = 0; i < 5; i++) {
                const shaft = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 2.2, 9, 16, 1, true),
                    new THREE.MeshBasicMaterial({
                        color: 0xbfd8ff, transparent: true, opacity: 0.07,
                        side: THREE.DoubleSide, depthWrite: false,
                    }));
                shaft.position.set((i - 2) * 4, 4.5, -i * 5 - 4);
                objects.shafts.add(shaft);
            }
            scene.add(objects.shafts);
            objects.built = true;
        }
        const s = st.current;
        // Reuse the same Color/Fog objects instead of allocating every frame.
        objects.fogColor.set(s.bg);
        objects.fog.color.copy(objects.fogColor);
        objects.fog.density = s.density;
        scene.background = objects.fogColor;
        objects.shafts.visible = s.volumetric;
    }, null, { cameraPos: [0, 3.6, 9], lookAt: [0, 1.6, -9], zoomRange: [4, 20], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="one node owns the sky, fog, glow and tonemap for the whole scene"
            code={`var env: Environment = $WorldEnvironment.environment\n\nenv.background_mode = Environment.BG_SKY\nenv.fog_enabled = true\nenv.fog_light_color = Color("${bg}")\nenv.fog_density = ${density.toFixed(3)}\nenv.fog_sky_affect = 0.5\nenv.fog_aerial_perspective = 0.3\n\nenv.volumetric_fog_enabled = ${volumetric}\nenv.volumetric_fog_density = 0.02\nenv.volumetric_fog_gi_inject = 1.0\n\nenv.glow_enabled = true\nenv.glow_bloom = 0.2`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="fog_density" value={density} min={0} max={0.25} step={0.005} onChange={setDensity} />
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400">fog_light_color</label>
                    <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-full h-8 bg-transparent" />
                </div>
            </div>
            <div className="flex justify-center mt-4">
                <Toggle label="volumetric_fog_enabled" value={volumetric} onChange={setVolumetric} />
            </div>
            <Note>Depth fog just tints by distance. Volumetric fog is real media that light scatters through — that is why only it produces god rays.</Note>
        </Demo>
    );
};

DEMOS.fog_volume = () => {
    const containerRef = useRef(null);
    const [density, setDensity] = useState(0.6);
    const [shape, setShape] = useState('box');
    const st = useRef({});
    st.current = { density, shape };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(30, 0x2f3630));
            for (let i = 0; i < 10; i++) {
                const tree = mkMesh(new THREE.ConeGeometry(0.7, 3, 8), 0x3f5a3f);
                tree.position.set((Math.random() - 0.5) * 14, 1.5, (Math.random() - 0.5) * 12);
                scene.add(tree);
            }
            objects.volumes = {};
            const mkVol = (geom) => {
                const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
                    color: 0xbfc8d8, transparent: true, opacity: 0.2,
                    depthWrite: false, side: THREE.DoubleSide,
                }));
                m.position.y = 1;
                scene.add(m);
                m.visible = false;
                return m;
            };
            objects.volumes.box = mkVol(new THREE.BoxGeometry(8, 2, 6));
            objects.volumes.ellipsoid = mkVol(new THREE.SphereGeometry(3.2, 24, 18));
            objects.volumes.cone = mkVol(new THREE.ConeGeometry(3, 5, 20, 1, true));
            objects.built = true;
        }
        const s = st.current;
        Object.entries(objects.volumes).forEach(([k, v]) => {
            v.visible = k === s.shape;
            v.material.opacity = Math.max(0, s.density) * 0.4;
            v.material.color.setHex(s.density < 0 ? 0x000000 : 0xbfc8d8);
            v.position.y = 1 + Math.sin(t * 0.5) * 0.15;
        });
    }, null, { cameraPos: [0, 5, 12], grid: false, axes: false, background: 0x2a3038 });

    const enumName = { box: 'BOX', ellipsoid: 'ELLIPSOID', cone: 'CONE' }[shape];

    return (
        <Demo containerRef={containerRef} hint={density < 0 ? 'negative density — carving a clearing' : 'local fog patch'}
            code={`# Requires env.volumetric_fog_enabled = true\nvar vol := FogVolume.new()\nvol.shape = RenderingServer.FOG_VOLUME_SHAPE_${enumName}\nvol.size = Vector3(8, 2, 6)\n\nvar mat := FogMaterial.new()\nmat.density = ${density.toFixed(2)}${density < 0 ? '     # negative = punch a hole in the world fog' : ''}\nmat.albedo = Color(0.75, 0.78, 0.85)\nmat.height_falloff = 2.0\nvol.material = mat\nadd_child(vol)`}>
            <Choice value={shape} onChange={setShape} options={[
                { value: 'box', label: 'BOX' }, { value: 'ellipsoid', label: 'ELLIPSOID' },
                { value: 'cone', label: 'CONE' }]} />
            <div className="mt-4">
                <Slider label="FogMaterial.density" value={density} min={-1} max={2} step={0.05} onChange={setDensity} />
            </div>
            <Note>Environment fog fills the whole world. A FogVolume adds density in one shape — and a negative density subtracts it, which is how you keep a courtyard clear inside a foggy level.</Note>
        </Demo>
    );
};

DEMOS.tonemap_hdr = () => {
    const containerRef = useRef(null);
    const [mode, setMode] = useState('aces');
    const [exposure, setExposure] = useState(1);
    const st = useRef({});
    st.current = { mode, exposure };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.children.filter((c) => c.isLight).forEach((l) => scene.remove(l));
            scene.add(new THREE.AmbientLight(0xffffff, 0.12));
            scene.add(mkFloor(24, 0x555555));

            // A bright emissive strip is what makes tonemapping visible.
            objects.emitters = [];
            for (let i = 0; i < 5; i++) {
                const e = mkStd(new THREE.SphereGeometry(0.55, 24, 18), {
                    color: 0x000000,
                    emissive: new THREE.Color().setHSL(i / 5, 0.7, 0.55),
                    emissiveIntensity: 1 + i * 3,
                    roughness: 0.4,
                });
                e.position.set((i - 2) * 2.2, 1.6, 0);
                scene.add(e);
                objects.emitters.push(e);
            }
            for (let i = 0; i < 5; i++) {
                const b = mkStd(new THREE.BoxGeometry(1.4, 1.4, 1.4),
                    { color: 0xcccccc, roughness: 0.6 });
                b.position.set((i - 2) * 2.2, 0.7, -2.4);
                scene.add(b);
            }
            const sun = new THREE.DirectionalLight(0xffffff, 1.6);
            sun.position.set(3, 6, 5);
            scene.add(sun);
            objects.built = true;
            objects.lastMode = null;
        }
        const s = st.current;
        const map = {
            none: THREE.NoToneMapping,
            linear: THREE.LinearToneMapping,
            reinhard: THREE.ReinhardToneMapping,
            filmic: THREE.CineonToneMapping,
            aces: THREE.ACESFilmicToneMapping,
        };
        if (objects.lastMode !== s.mode) {
            objects.lastMode = s.mode;
            renderer.toneMapping = map[s.mode];
            scene.traverse((n) => { if (n.material) n.material.needsUpdate = true; });
        }
        renderer.toneMappingExposure = s.exposure;
        objects.dispose = () => { renderer.toneMapping = THREE.NoToneMapping; };
    }, null, { cameraPos: [0, 2.6, 9], lookAt: [0, 1.4, 0], grid: false, axes: false, background: 0x0c0c10 });

    const gd = { none: 'LINEAR', linear: 'LINEAR', reinhard: 'REINHARD', filmic: 'FILMIC', aces: 'ACES' }[mode];

    return (
        <Demo containerRef={containerRef} hint="the spheres get brighter left to right — watch where they blow out"
            code={`var env: Environment = $WorldEnvironment.environment\nenv.tonemap_mode = Environment.TONE_MAPPER_${gd}\nenv.tonemap_exposure = ${exposure.toFixed(2)}\nenv.tonemap_white = 6.0\n\n# Auto-exposure adapts like an eye entering a dark room\nenv.auto_exposure_enabled = false\nenv.auto_exposure_scale = 0.4\nenv.auto_exposure_speed = 0.5\n\n# Godot 4.7: drive a real HDR display instead of tonemapping to SDR\n# Project Settings > Display > Window > HDR > Enabled`}>
            <Choice value={mode} onChange={setMode} options={[
                { value: 'linear', label: 'LINEAR' }, { value: 'reinhard', label: 'REINHARD' },
                { value: 'filmic', label: 'FILMIC' }, { value: 'aces', label: 'ACES' },
            ]} />
            <div className="mt-4">
                <Slider label="tonemap_exposure" value={exposure} min={0.1} max={3} step={0.05} onChange={setExposure} />
            </div>
            <Note>LINEAR clips the moment a value passes 1.0 and everything bright turns to flat white. ACES rolls the highlights off instead, which is why it is the usual choice.</Note>
        </Demo>
    );
};

DEMOS.particles = () => {
    const containerRef = useRef(null);
    const [gravity, setGravity] = useState(-9.8);
    const [spread, setSpread] = useState(25);
    const [collide, setCollide] = useState(true);
    const [amount, setAmount] = useState(600);
    const st = useRef({});
    st.current = { gravity, spread, collide, amount };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        const MAX = 1500;
        if (!objects.points) {
            scene.add(mkFloor(16, 0x2b2b2b));
            const geom = new THREE.BufferGeometry();
            const pos = new Float32Array(MAX * 3);
            const col = new Float32Array(MAX * 3);
            geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
            objects.points = new THREE.Points(geom, new THREE.PointsMaterial({
                size: 0.12, vertexColors: true, transparent: true, opacity: 0.9,
            }));
            scene.add(objects.points);
            objects.parts = [];
            for (let i = 0; i < MAX; i++) {
                objects.parts.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: -1 });
            }
        }
        const s = st.current;
        const pos = objects.points.geometry.attributes.position.array;
        const col = objects.points.geometry.attributes.color.array;
        const spreadRad = THREE.MathUtils.degToRad(s.spread);

        for (let i = 0; i < MAX; i++) {
            const q = objects.parts[i];
            if (i >= s.amount) { pos[i * 3 + 1] = -999; continue; }
            q.life -= delta;
            if (q.life <= 0) {
                // Respawn — emission_shape = SPHERE, direction = UP
                q.p.set((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4);
                const a = Math.random() * Math.PI * 2;
                const t = Math.random() * spreadRad;
                const speed = 3 + Math.random() * 3;
                q.v.set(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a))
                    .multiplyScalar(speed);
                q.life = 1.2 + Math.random() * 1.2;
                q.maxLife = q.life;
            }
            q.v.y += s.gravity * delta;
            q.p.addScaledVector(q.v, delta);
            if (s.collide && q.p.y < 0.05) {          // GPUParticlesCollisionBox3D
                q.p.y = 0.05;
                q.v.y = -q.v.y * 0.45;
                q.v.x *= 0.8; q.v.z *= 0.8;
            }
            pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.p.y; pos[i * 3 + 2] = q.p.z;
            const f = Math.max(0, q.life / q.maxLife);
            col[i * 3] = 1; col[i * 3 + 1] = 0.4 + f * 0.5; col[i * 3 + 2] = f * 0.4;
        }
        objects.points.geometry.attributes.position.needsUpdate = true;
        objects.points.geometry.attributes.color.needsUpdate = true;
    }, null, { cameraPos: [0, 4, 8], grid: false });

    return (
        <Demo containerRef={containerRef} hint={collide ? 'particles bouncing off a collision box' : 'no collider — they fall through'}
            code={`@onready var fx: GPUParticles3D = $GPUParticles3D\n\nfunc _ready() -> void:\n    var pm := ParticleProcessMaterial.new()\n    pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE\n    pm.emission_sphere_radius = 0.2\n    pm.direction = Vector3.UP\n    pm.spread = ${spread.toFixed(0)}\n    pm.initial_velocity_min = 3.0\n    pm.initial_velocity_max = 6.0\n    pm.gravity = Vector3(0, ${gravity.toFixed(1)}, 0)\n    pm.collision_mode = ParticleProcessMaterial.COLLISION_${collide ? 'RIGID' : 'DISABLED'}\n    fx.process_material = pm\n    fx.amount = ${amount}\n    fx.lifetime = 2.0\n    fx.draw_pass_1 = QuadMesh.new()\n\n# Add a GPUParticlesCollisionBox3D for the floor bounce.`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Slider label="gravity.y" value={gravity} min={-25} max={5} step={0.5} onChange={setGravity} />
                <Slider label="spread (deg)" value={spread} min={0} max={90} step={1} onChange={setSpread} />
                <Slider label="amount" value={amount} min={50} max={1500} step={50} onChange={(v) => setAmount(Math.round(v))} />
            </div>
            <div className="flex justify-center mt-4">
                <Toggle label="Particle collision" value={collide} onChange={setCollide} />
            </div>
            <Note>Everything about the motion lives on the ParticleProcessMaterial, not the node. The node only owns amount, lifetime and the draw passes.</Note>
        </Demo>
    );
};

DEMOS.label_3d = () => {
    const containerRef = useRef(null);
    const [billboard, setBillboard] = useState(true);
    const [noDepth, setNoDepth] = useState(true);
    const [pop, setPop] = useState(0);
    const st = useRef({});
    st.current = { billboard, noDepth, pop };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.enemy = mkMesh(capsuleGeometry(0.5, 1.2), 0xaa4444);
            objects.enemy.position.set(0, 1.1, 0);
            scene.add(objects.enemy);
            objects.wall = mkMesh(new THREE.BoxGeometry(2.2, 3.2, 0.3), 0x666666);
            objects.wall.position.set(-1.9, 1.6, 1.7);
            scene.add(objects.wall);

            objects.nameSprite = mkTextSprite('Goblin', '#ffffff', 2);
            objects.nameSprite.position.set(0, 2.4, 0);
            scene.add(objects.nameSprite);
            objects.flat = mkTextSprite('Goblin', '#ffffff', 2);
            objects.flat.position.set(0, 2.4, 0);
            objects.flatPlane = null;
            objects.numbers = new THREE.Group();
            scene.add(objects.numbers);
            objects.lastPop = 0;
            objects.built = true;
        }
        const s = st.current;
        objects.nameSprite.material.depthTest = !s.noDepth;
        objects.nameSprite.material.needsUpdate = true;
        objects.enemy.rotation.y += 0.5 * delta;

        if (s.pop !== objects.lastPop) {
            objects.lastPop = s.pop;
            const dmg = mkTextSprite('-' + (10 + Math.floor(Math.random() * 90)), '#ff5555', 1.6);
            dmg.position.set((Math.random() - 0.5) * 0.8, 2, (Math.random() - 0.5) * 0.5);
            dmg.userData.age = 0;
            objects.numbers.add(dmg);
        }
        objects.numbers.children.slice().forEach((n) => {
            n.userData.age += delta;
            n.position.y += 1.4 * delta;
            n.material.opacity = Math.max(0, 1 - n.userData.age / 1.2);
            n.material.transparent = true;
            if (n.userData.age > 1.2) destroy(objects.numbers, n);   // queue_free()
        });
        objects.nameSprite.visible = s.billboard;
        if (!s.billboard) {
            if (!objects.flatPlane) {
                const c = document.createElement('canvas');
                c.width = 256; c.height = 128;
                const ctx = c.getContext('2d');
                ctx.font = 'bold 44px Arial'; ctx.fillStyle = '#fff';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('Goblin', 128, 64);
                objects.flatPlane = new THREE.Mesh(
                    new THREE.PlaneGeometry(2, 1),
                    new THREE.MeshBasicMaterial({
                        map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide,
                    }));
                objects.flatPlane.position.set(0, 2.4, 0);
                scene.add(objects.flatPlane);
            }
            objects.flatPlane.visible = true;
            objects.flatPlane.material.depthTest = !s.noDepth;
        } else if (objects.flatPlane) {
            objects.flatPlane.visible = false;
        }
    }, null, { cameraPos: [0, 3, 8.5], lookAt: [0, 1.6, -0.6], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="orbit the camera to see what the billboard flag does"
            code={`func popup_damage(amount: int) -> void:\n    var label := Label3D.new()\n    label.text = "-%d" % amount\n    label.font_size = 64\n    label.pixel_size = 0.005\n    label.billboard = BaseMaterial3D.BILLBOARD_${billboard ? 'ENABLED' : 'DISABLED'}\n    label.no_depth_test = ${noDepth}\n    label.outline_size = 12\n    label.modulate = Color.RED\n    add_child(label)\n\n    var tween := create_tween()\n    tween.tween_property(label, "position:y", 2.0, 1.2)\n    tween.parallel().tween_property(label, "modulate:a", 0.0, 1.2)\n    tween.tween_callback(label.queue_free)`}>
            <div className="flex flex-wrap justify-center gap-3">
                <Toggle label="billboard" value={billboard} onChange={setBillboard} />
                <Toggle label="no_depth_test" value={noDepth} onChange={setNoDepth} />
                <button onClick={() => setPop((p) => p + 1)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded">Deal damage</button>
            </div>
            <Note>Turn off billboard and the label is a flat quad — it disappears edge-on. Turn off no_depth_test and the wall hides it, which is right for signage and wrong for a health bar.</Note>
        </Demo>
    );
};

DEMOS.viewports = () => {
    const containerRef = useRef(null);
    const [live, setLive] = useState(true);
    const [emissive, setEmissive] = useState(true);
    const st = useRef({});
    st.current = { live, emissive };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(16, 0x2b2b2b));
            objects.subject = mkMesh(new THREE.TorusKnotGeometry(0.6, 0.22, 100, 16), 0xcc44cc);
            objects.subject.position.set(-2.5, 1.4, 0);
            scene.add(objects.subject);

            const frame = mkMesh(new THREE.BoxGeometry(3.2, 2.4, 0.18), 0x2a2a2a);
            frame.position.set(2.4, 1.8, -1);
            scene.add(frame);
            objects.rt = new THREE.WebGLRenderTarget(512, 384);
            objects.screen = new THREE.Mesh(
                new THREE.PlaneGeometry(2.9, 2.1),
                new THREE.MeshBasicMaterial({ map: objects.rt.texture }));
            objects.screen.position.set(2.4, 1.8, -0.9);
            scene.add(objects.screen);

            objects.cam2 = new THREE.PerspectiveCamera(50, 512 / 384, 0.1, 50);
            objects.built = true;
            objects.dispose = () => objects.rt.dispose();
        }
        const s = st.current;
        objects.subject.rotation.y += 0.9 * delta;
        objects.subject.rotation.x += 0.4 * delta;

        if (s.live) {
            objects.cam2.position.set(
                -2.5 + Math.sin(t * 0.6) * 2.4, 2, Math.cos(t * 0.6) * 2.4);
            objects.cam2.lookAt(objects.subject.position);
            const prev = renderer.getRenderTarget();
            objects.screen.visible = false;         // do not film the screen
            renderer.setRenderTarget(objects.rt);
            renderer.render(scene, objects.cam2);
            renderer.setRenderTarget(prev);
            objects.screen.visible = true;
        }
        objects.screen.material.color.setScalar(s.emissive ? 1.6 : 1);
    }, null, { cameraPos: [0, 3, 7], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={live ? 'UPDATE_ALWAYS — live feed' : 'UPDATE_DISABLED — frozen frame'}
            code={`@onready var view: SubViewport = $SubViewport\n\nfunc _ready() -> void:\n    view.size = Vector2i(512, 384)\n    view.render_target_update_mode = SubViewport.UPDATE_${live ? 'ALWAYS' : 'DISABLED'}\n    view.transparent_bg = false\n\n    var mat := StandardMaterial3D.new()\n    mat.albedo_texture = view.get_texture()\n    mat.emission_enabled = ${emissive}\n    mat.emission_texture = view.get_texture()\n    mat.emission_energy_multiplier = 1.6\n    $Screen.material_override = mat`}>
            <div className="flex justify-center gap-3">
                <Toggle label="UPDATE_ALWAYS" value={live} onChange={setLive} />
                <Toggle label="emission_texture" value={emissive} onChange={setEmissive} />
            </div>
            <Note>Every live SubViewport is a second full render. Freeze it (UPDATE_ONCE) or shrink it the moment it is not the focus of the shot.</Note>
        </Demo>
    );
};

DEMOS.audio_3d = () => {
    const containerRef = useRef(null);
    const [unitSize, setUnitSize] = useState(4);
    const [maxDist, setMaxDist] = useState(20);
    const [model, setModel] = useState('inverse');
    const [distance, setDistance] = useState(6);
    const st = useRef({});
    st.current = { unitSize, maxDist, model, distance };

    const db = (() => {
        const d = Math.max(0.01, distance);
        if (d > maxDist) return -80;
        switch (model) {
            case 'inverse': return 20 * Math.log10(Math.min(1, unitSize / d));
            case 'inverse_square': return 20 * Math.log10(Math.min(1, (unitSize / d) ** 2));
            case 'log': return Math.max(-60, -20 * Math.log10(Math.max(1, d / unitSize)) * 1.5);
            default: return 0;   // DISABLED — no attenuation at all
        }
    })();
    const linear = Math.pow(10, db / 20);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(40, 0x2b2b2b));
            objects.emitter = mkMesh(new THREE.SphereGeometry(0.4, 20, 16), 0xffaa33);
            objects.emitter.position.set(0, 0.6, 0);
            scene.add(objects.emitter);
            objects.listener = mkMesh(new THREE.ConeGeometry(0.4, 1, 12), GODOT_BLUE);
            scene.add(objects.listener);
            objects.rings = [];
            for (let i = 0; i < 5; i++) {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(1, 1.04, 64),
                    new THREE.MeshBasicMaterial({ color: 0xffaa33, side: THREE.DoubleSide, transparent: true }));
                ring.rotation.x = -Math.PI / 2;
                ring.position.y = 0.02;
                scene.add(ring);
                objects.rings.push(ring);
            }
            objects.maxRing = new THREE.Mesh(
                new THREE.RingGeometry(1, 1.06, 96),
                new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
            objects.maxRing.rotation.x = -Math.PI / 2;
            objects.maxRing.position.y = 0.03;
            scene.add(objects.maxRing);
            objects.built = true;
        }
        const s = st.current;
        objects.listener.position.set(s.distance, 0.6, 0);
        objects.listener.lookAt(0, 0.6, 0);
        objects.listener.rotateX(Math.PI / 2);

        objects.rings.forEach((r, i) => {
            const rad = s.unitSize * (i + 1) * 0.6;
            r.scale.setScalar(rad);
            r.material.opacity = 0.5 / (i + 1);
        });
        objects.maxRing.scale.setScalar(s.maxDist);
        objects.emitter.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
    }, null, { cameraPos: [8, 22, 26], lookAt: [4, 0, 0], zoomRange: [10, 70], grid: false, axes: false });

    const enumName = {
        inverse: 'ATTENUATION_INVERSE_DISTANCE',
        inverse_square: 'ATTENUATION_INVERSE_SQUARE_DISTANCE',
        log: 'ATTENUATION_LOGARITHMIC',
        disabled: 'ATTENUATION_DISABLED',
    }[model];

    return (
        <Demo containerRef={containerRef} hint="orange rings = unit_size falloff · red ring = max_distance"
            code={`var sfx := AudioStreamPlayer3D.new()\nsfx.stream = preload("res://sfx/engine.ogg")\nsfx.unit_size = ${unitSize.toFixed(1)}        # radius of full volume\nsfx.max_distance = ${maxDist.toFixed(0)}      # silence beyond this\nsfx.attenuation_model = AudioStreamPlayer3D.${enumName}\nsfx.volume_db = 0.0\nsfx.bus = "SFX"\nsfx.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_PHYSICS_STEP\nadd_child(sfx)\nsfx.play()\n\n# At ${distance.toFixed(1)} m the listener hears ${db <= -80 ? 'nothing' : db.toFixed(1) + ' dB'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Slider label="unit_size" value={unitSize} min={0.5} max={15} step={0.5} onChange={setUnitSize} />
                <Slider label="max_distance" value={maxDist} min={2} max={40} step={1} onChange={setMaxDist} />
                <Slider label="listener distance (m)" value={distance} min={0.5} max={40} step={0.5} onChange={setDistance} />
            </div>
            <div className="mt-4">
                <Choice value={model} onChange={setModel} options={[
                    { value: 'inverse', label: 'INVERSE' },
                    { value: 'inverse_square', label: 'INVERSE_SQUARE' },
                    { value: 'log', label: 'LOGARITHMIC' },
                    { value: 'disabled', label: 'DISABLED' },
                ]} />
            </div>
            <div className="mt-4 bg-gray-900 rounded p-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>perceived volume</span>
                    <span className="font-mono text-blue-300">
                        {db <= -80 ? 'silent' : db.toFixed(1) + ' dB'}
                    </span>
                </div>
                <div className="h-3 bg-black rounded overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-green-400 transition-all"
                        style={{ width: `${Math.max(0, Math.min(1, linear)) * 100}%` }}></div>
                </div>
            </div>
            <Note>INVERSE_SQUARE is physically correct but drops off fast — most games use INVERSE and a generous unit_size so sounds stay audible.</Note>
        </Demo>
    );
};

DEMOS.csg = () => {
    const containerRef = useRef(null);
    const [op, setOp] = useState('subtraction');
    const [radius, setRadius] = useState(1.2);
    const st = useRef({});
    st.current = { op, radius };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            objects.box = mkMesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), GODOT_BLUE);
            objects.box.position.y = 1.4;
            scene.add(objects.box);
            objects.tool = mkMesh(new THREE.SphereGeometry(1, 32, 24), 0xff5555,
                { transparent: true, opacity: 0.45 });
            objects.tool.position.y = 1.4;
            scene.add(objects.tool);
            objects.toolWire = new THREE.Mesh(
                new THREE.SphereGeometry(1, 20, 14),
                new THREE.MeshBasicMaterial({ color: 0xff8888, wireframe: true }));
            objects.tool.add(objects.toolWire);
            objects.built = true;
        }
        const s = st.current;
        objects.tool.position.x = Math.sin(t * 0.7) * 1.6;
        objects.tool.scale.setScalar(s.radius);

        // Godot really evaluates the boolean; here we signal the intent visually.
        if (s.op === 'subtraction') {
            objects.box.material.wireframe = false;
            objects.tool.material.opacity = 0.25;
            objects.tool.material.color.setHex(0xff3333);
        } else if (s.op === 'union') {
            objects.box.material.wireframe = false;
            objects.tool.material.opacity = 0.9;
            objects.tool.material.color.setHex(GODOT_BLUE);
        } else {
            objects.box.material.wireframe = true;
            objects.tool.material.opacity = 0.85;
            objects.tool.material.color.setHex(0x44dd66);
        }
    }, null, { cameraPos: [5, 3.8, 8], lookAt: [0, 1.4, 0] });

    return (
        <Demo containerRef={containerRef} hint="blue = CSGBox3D · red/green = the second shape"
            code={`# CSGCombiner3D\n#   +-- CSGBox3D      (OPERATION_UNION)\n#   +-- CSGSphere3D   (OPERATION_${op.toUpperCase()})\n\n$CSGSphere3D.operation = CSGShape3D.OPERATION_${op.toUpperCase()}\n$CSGSphere3D.radius = ${radius.toFixed(2)}\n$CSGCombiner3D.use_collision = true   # free collider while prototyping\n\n# CSGPolygon3D can sweep a profile along a Path3D\n$CSGPolygon3D.mode = CSGPolygon3D.MODE_PATH\n$CSGPolygon3D.path_node = $"../Path3D".get_path()\n\n# Shipping: select the CSG root -> Scene menu -> "Bake Mesh Instance"`}>
            <Choice value={op} onChange={setOp} options={[
                { value: 'union', label: 'UNION' },
                { value: 'subtraction', label: 'SUBTRACTION' },
                { value: 'intersection', label: 'INTERSECTION' },
            ]} />
            <div className="mt-4">
                <Slider label="CSGSphere3D.radius" value={radius} min={0.4} max={2} step={0.05} onChange={setRadius} />
            </div>
            <Note>CSG re-evaluates the whole boolean whenever anything moves, so it is a blockout tool. Bake it to a MeshInstance3D before you ship.</Note>
        </Demo>
    );
};
