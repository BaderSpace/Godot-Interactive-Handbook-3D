/* Interactive demos: Game Logic, Performance, Workflow. */

/* ------------------------------------------------------- Game Logic */

DEMOS.signals_custom = () => {
    const containerRef = useRef(null);
    const [health, setHealth] = useState(100);
    const [log, setLog] = useState([]);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.emitter) {
            objects.emitter = mkMesh(new THREE.IcosahedronGeometry(0.9, 0), 0xff6644);
            objects.emitter.position.set(-2.4, 1.2, 0);
            scene.add(objects.emitter);
            objects.bar = mkMesh(new THREE.BoxGeometry(3, 0.4, 0.4), 0x44dd66);
            objects.bar.position.set(2.4, 1.2, 0);
            scene.add(objects.bar);
            objects.barBg = mkWireBox(3, 0.4, 0.4, 0x555555);
            objects.barBg.position.set(2.4, 1.2, 0);
            scene.add(objects.barBg);
            objects.wave = new THREE.Mesh(
                new THREE.TorusGeometry(0.5, 0.04, 8, 32),
                new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true }));
            objects.wave.rotation.y = Math.PI / 2;
            scene.add(objects.wave);
            objects.waveT = 1;
            objects.lastHealth = 100;
            scene.add(mkTextSprite('emitter', '#ff9977', 2).translateX(-2.4).translateY(2.4));
            scene.add(mkTextSprite('listener', '#99ee99', 2).translateX(2.4).translateY(2.4));
        }
        if (objects.lastHealth !== health) { objects.lastHealth = health; objects.waveT = 0; }
        objects.waveT = Math.min(1, objects.waveT + delta * 1.6);

        // The travelling ring is the signal reaching its listener.
        objects.wave.visible = objects.waveT < 1;
        objects.wave.position.set(-2.4 + 4.8 * objects.waveT, 1.2, 0);
        objects.wave.material.opacity = 1 - objects.waveT;
        objects.wave.scale.setScalar(1 + objects.waveT);

        objects.emitter.rotation.y += 0.8 * delta;
        const f = health / 100;
        objects.bar.scale.x = Math.max(0.001, f);
        objects.bar.position.x = 2.4 - (3 * (1 - f)) / 2;
        objects.bar.material.color.setHex(f > 0.5 ? 0x44dd66 : f > 0.2 ? 0xddaa33 : 0xdd3333);
    }, null, { cameraPos: [0, 2.8, 8.5], lookAt: [0, 1.4, 0], grid: false, axes: false });

    const hit = () => {
        const dmg = 10 + Math.floor(Math.random() * 20);
        const next = Math.max(0, health - dmg);
        setHealth(next);
        setLog((l) => [`health_changed.emit(${next}, 100)`, ...(next === 0 ? ['died.emit()'] : []), ...l].slice(0, 5));
    };

    return (
        <Demo containerRef={containerRef} hint="the ring is the signal travelling to its listener"
            code={`extends Node3D\n\nsignal health_changed(current: int, maximum: int)\nsignal died\n\nvar health := 100\n\nfunc take_damage(amount: int) -> void:\n    health = maxi(health - amount, 0)\n    health_changed.emit(health, 100)   # currently ${health}\n    if health == 0:\n        died.emit()\n\nfunc _ready() -> void:\n    health_changed.connect($HealthBar.set_value)\n    died.connect(queue_free, CONNECT_ONE_SHOT)\n    await died     # signals are awaitable`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <div className="flex gap-3">
                    <button onClick={hit} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded">
                        take_damage()
                    </button>
                    <button onClick={() => { setHealth(100); setLog([]); }}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded">Reset</button>
                </div>
                <div className="font-mono text-xs bg-black rounded p-3 w-full md:w-80 h-28 overflow-hidden">
                    {log.length === 0 && <div className="text-gray-600">signal log…</div>}
                    {log.map((l, i) => (
                        <div key={i} className={i === 0 ? 'text-green-400' : 'text-gray-600'}>{l}</div>
                    ))}
                </div>
            </div>
            <Note>The emitter never learns who is listening. Swap the health bar for a sound effect and nothing in this script changes — that is the whole payoff.</Note>
        </Demo>
    );
};

DEMOS.groups = () => {
    const containerRef = useRef(null);
    const [group, setGroup] = useState('enemies');
    const [pulse, setPulse] = useState(0);
    const st = useRef({});
    st.current = { group, pulse };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.nodes) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.nodes = [];
            const defs = [
                ['enemies', 0xff5555, -3], ['enemies', 0xff5555, -1.5], ['enemies', 0xff5555, 0],
                ['pickups', 0xffdd44, 1.5], ['pickups', 0xffdd44, 3],
                ['doors', 0x44aaff, -3, 2.5], ['doors', 0x44aaff, 0, 2.5], ['doors', 0x44aaff, 3, 2.5],
            ];
            defs.forEach(([g, col, x, z = 0]) => {
                const m = mkMesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), col);
                m.position.set(x, 0.5, z);
                m.userData.group = g;
                scene.add(m);
                objects.nodes.push(m);
            });
            objects.flash = 0;
            objects.lastPulse = 0;
        }
        const s = st.current;
        if (s.pulse !== objects.lastPulse) { objects.lastPulse = s.pulse; objects.flash = 1; }
        objects.flash = Math.max(0, objects.flash - delta * 1.4);

        objects.nodes.forEach((m, i) => {
            const inGroup = m.userData.group === s.group;
            m.material.opacity = inGroup ? 1 : 0.25;
            m.material.transparent = !inGroup;
            const jump = inGroup ? objects.flash * Math.abs(Math.sin(t * 12 + i)) * 1.2 : 0;
            m.position.y = 0.5 + jump;
            m.scale.setScalar(inGroup ? 1 + objects.flash * 0.2 : 0.8);
        });
    }, null, { cameraPos: [0, 6, 9], grid: false, axes: false });

    const counts = { enemies: 3, pickups: 2, doors: 3 }[group];

    return (
        <Demo containerRef={containerRef} hint={`"${group}" — ${counts} nodes`}
            code={`func _ready() -> void:\n    add_to_group("${group}")\n\nfunc alert() -> void:\n    # fire-and-forget message to every member\n    get_tree().call_group("${group}", "on_alert", global_position)\n\n    # or work with the actual nodes\n    for n in get_tree().get_nodes_in_group("${group}"):\n        n.queue_free()\n\n    print(get_tree().get_node_count_in_group("${group}"))  # ${counts}\n\nif is_in_group("${group}"):\n    remove_from_group("${group}")`}>
            <Choice value={group} onChange={setGroup} options={['enemies', 'pickups', 'doors']} />
            <div className="flex justify-center mt-4">
                <button onClick={() => setPulse((p) => p + 1)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded">
                    call_group(&quot;{group}&quot;, &quot;on_alert&quot;)
                </button>
            </div>
            <Note>Groups are just tags. They let you reach a set of nodes without any of them holding a reference to each other, which is what keeps scenes independently testable.</Note>
        </Demo>
    );
};

DEMOS.timers = () => {
    const containerRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef(null);
    const st = useRef({});
    st.current = { timeLeft, running };

    // Clean up the interval if the lesson is switched mid-countdown.
    useEffect(() => () => clearInterval(intervalRef.current), []);

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.bomb) {
            scene.add(mkFloor(10, 0x2b2b2b));
            objects.bomb = mkMesh(new THREE.SphereGeometry(0.7, 24, 18), 0x444444);
            objects.bomb.position.y = 0.8;
            scene.add(objects.bomb);
            objects.fuse = mkMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), 0x886644);
            objects.fuse.position.y = 1.65;
            scene.add(objects.fuse);
            objects.spark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8),
                new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
            objects.spark.position.y = 1.85;
            scene.add(objects.spark);
        }
        const s = st.current;
        if (s.running) {
            const urgency = 1 + (3 - s.timeLeft);
            const k = 1 + Math.sin(t * 6 * urgency) * 0.08;
            objects.bomb.scale.setScalar(k);
            objects.bomb.material.color.setHex(0xcc3333);
            objects.spark.visible = Math.sin(t * 30) > 0;
            objects.spark.scale.setScalar(1 + Math.random() * 0.6);
        } else {
            objects.bomb.scale.setScalar(1);
            objects.bomb.material.color.setHex(s.timeLeft === 0 && objects.everRan ? 0x44dd66 : 0x444444);
            objects.spark.visible = false;
        }
    }, null, { cameraPos: [0, 2.4, 6], lookAt: [0, 1.1, 0], grid: false, axes: false });

    const start = () => {
        if (running) return;
        setRunning(true);
        setTimeLeft(3);
        let t = 3;
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            t = Math.max(0, t - 0.1);
            setTimeLeft(t);
            if (t <= 0) { clearInterval(intervalRef.current); setRunning(false); }
        }, 100);
    };

    return (
        <Demo containerRef={containerRef} hint={running ? 'awaiting timeout…' : 'idle'}
            code={`func fuse() -> void:\n    arm_bomb()\n    await get_tree().create_timer(3.0).timeout   # ${timeLeft.toFixed(1)}s left\n    explode()\n\n# The function resumes exactly where it stopped —\n# no state machine, no callback.\n\n# Repeating work belongs on a Timer node:\n$Timer.wait_time = 2.0\n$Timer.autostart = true\n$Timer.timeout.connect(spawn_wave)`}>
            <div className="text-center">
                <div className="text-4xl font-bold font-mono text-white mb-4">{timeLeft.toFixed(1)}s</div>
                <button onClick={start} disabled={running}
                    className={`px-6 py-2 rounded font-bold ${running
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                    {running ? 'awaiting…' : 'await create_timer(3.0).timeout'}
                </button>
            </div>
        </Demo>
    );
};

DEMOS.time_scale = () => {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const st = useRef({});
    st.current = { scale };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.balls) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.balls = [];
            for (let i = 0; i < 4; i++) {
                const b = mkMesh(new THREE.SphereGeometry(0.4, 20, 16), GODOT_BLUE);
                b.position.set((i - 1.5) * 1.8, 1 + i * 1.2, 0);
                scene.add(b);
                b.userData.vel = 0;
                objects.balls.push(b);
            }
            objects.ui = mkMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 0xffdd44);
            objects.ui.position.set(0, 4.5, 0);
            scene.add(objects.ui);
            scene.add(mkTextSprite('PROCESS_MODE_ALWAYS', '#ffdd44', 3.4).translateY(5.6));
        }
        // Engine.time_scale multiplies every delta the game sees.
        const scaled = delta * st.current.scale;
        objects.balls.forEach((b) => {
            b.userData.vel -= 14 * scaled;
            b.position.y += b.userData.vel * scaled;
            if (b.position.y < 0.4) { b.position.y = 0.4; b.userData.vel = Math.abs(b.userData.vel) * 0.82; }
            if (Math.abs(b.userData.vel) < 0.5 && b.position.y <= 0.41) b.userData.vel = 7;
            b.rotation.x += scaled * 3;
        });
        // A node with PROCESS_MODE_ALWAYS keeps its own real-time delta.
        objects.ui.rotation.y += delta * 2;
    }, null, { cameraPos: [0, 4, 12], lookAt: [0, 2.4, 0], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={scale === 0 ? 'time_scale = 0 — frozen' : `time_scale = ${scale.toFixed(2)}`}
            code={`func hit_stop() -> void:\n    Engine.time_scale = 0.05\n    # the 4th arg = ignore_time_scale, so this still lasts 0.08 real seconds\n    await get_tree().create_timer(0.08, true, false, true).timeout\n    Engine.time_scale = 1.0\n\nEngine.time_scale = ${scale.toFixed(2)}\n\n# Pausing is separate:\nget_tree().paused = true\n$PauseMenu.process_mode = Node.PROCESS_MODE_ALWAYS`}>
            <Slider label="Engine.time_scale" value={scale} min={0} max={2} step={0.05} onChange={setScale} />
            <Note>The yellow cube keeps spinning at any time scale — that is what PROCESS_MODE_ALWAYS buys you for menus and transitions.</Note>
        </Demo>
    );
};

DEMOS.state_machine = () => {
    const containerRef = useRef(null);
    const [state, setState] = useState('IDLE');
    const [log, setLog] = useState(['change_state(IDLE)']);
    const st = useRef({});
    st.current = { state };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.char) {
            scene.add(mkFloor(12, 0x2b2b2b));
            objects.char = new THREE.Group();
            scene.add(objects.char);
            objects.body = mkMesh(capsuleGeometry(0.45, 1), 0x888888);
            objects.body.position.y = 1;
            objects.char.add(objects.body);
            objects.hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 1, 1.6),
                new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.3 }));
            objects.hitbox.position.set(0, 1, -1.3);
            objects.char.add(objects.hitbox);
            objects.vel = 0;
        }
        const s = st.current;
        const c = objects.char;
        objects.hitbox.visible = s.state === 'ATTACK';

        if (s.state === 'IDLE') {
            objects.body.material.color.setHex(0x888888);
            c.position.y = Math.sin(t * 2) * 0.05;
            c.rotation.z = 0;
        } else if (s.state === 'RUN') {
            objects.body.material.color.setHex(GODOT_BLUE);
            c.position.y = Math.abs(Math.sin(t * 8)) * 0.18;
            c.rotation.z = Math.sin(t * 8) * 0.12;
            c.position.x = Math.sin(t * 1.2) * 2.5;
        } else if (s.state === 'JUMP') {
            objects.body.material.color.setHex(0x44dd66);
            objects.vel -= 16 * delta;
            c.position.y += objects.vel * delta;
            if (c.position.y < 0) { c.position.y = 0; objects.vel = 6; }
            c.rotation.z = 0;
        } else if (s.state === 'ATTACK') {
            objects.body.material.color.setHex(0xff4444);
            c.position.y = 0;
            c.rotation.y = Math.sin(t * 12) * 0.5;
        }
    }, null, { cameraPos: [0, 3, 7], grid: false, axes: false });

    const change = (next) => {
        if (next === state) return;
        setLog((l) => [
            `exit ${state}` + (state === 'ATTACK' ? '  -> hitbox.monitoring = false' : ''),
            `enter ${next}` + (next === 'ATTACK' ? '  -> hitbox.monitoring = true' : ''),
            ...l,
        ].slice(0, 6));
        if (next === 'JUMP') { /* fresh jump velocity handled in the loop */ }
        setState(next);
    };

    return (
        <Demo containerRef={containerRef} hint={`current_state = State.${state}`}
            code={`enum State { IDLE, RUN, JUMP, ATTACK }\nvar state := State.${state}\n\nfunc change_state(next: State) -> void:\n    if next == state:\n        return\n    match state:                       # leaving\n        State.ATTACK: $Hitbox.monitoring = false\n    state = next\n    match state:                       # entering\n        State.IDLE:   $Anim.play("idle")\n        State.RUN:    $Anim.play("run")\n        State.JUMP:   velocity.y = JUMP_VELOCITY\n        State.ATTACK: $Hitbox.monitoring = true\n\nfunc _physics_process(delta: float) -> void:\n    match state:\n        State.IDLE, State.RUN:\n            handle_movement(delta)\n        State.ATTACK:\n            velocity = Vector3.ZERO`}>
            <Choice value={state} onChange={change} options={['IDLE', 'RUN', 'JUMP', 'ATTACK']} />
            <div className="mt-4 font-mono text-xs bg-black rounded p-3 h-28 overflow-hidden">
                {log.map((l, i) => (
                    <div key={i} className={i < 2 ? 'text-green-400' : 'text-gray-600'}>{l}</div>
                ))}
            </div>
            <Note>Routing every change through one function is what gives you enter/exit hooks. Assigning <code>state</code> directly skips them and is where the bugs come from.</Note>
        </Demo>
    );
};

DEMOS.math_lerp = () => {
    const containerRef = useRef(null);
    const [weight, setWeight] = useState(5);
    const [target, setTarget] = useState(3);
    const st = useRef({});
    st.current = { weight, target };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.lerpBox) {
            scene.add(mkFloor(14, 0x2b2b2b));
            objects.lerpBox = mkMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0x44aaff);
            objects.lerpBox.position.set(-4, 2.2, 0);
            objects.moveBox = mkMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0x44dd66);
            objects.moveBox.position.set(-4, 1.2, 0);
            objects.expBox = mkMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0xffdd44);
            objects.expBox.position.set(-4, 0.4, 0);
            scene.add(objects.lerpBox, objects.moveBox, objects.expBox);
            objects.marker = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 3.4, 0.9),
                new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 }));
            scene.add(objects.marker);
            scene.add(mkTextSprite('lerp', '#88ccff', 1.6).translateX(-5.6).translateY(2.2));
            scene.add(mkTextSprite('move_toward', '#88ee99', 2.6).translateX(-6).translateY(1.2));
            scene.add(mkTextSprite('exp lerp', '#ffdd88', 2).translateX(-5.8).translateY(0.4));
        }
        const s = st.current;
        objects.marker.position.set(s.target, 1.6, 0);

        // lerp with a raw delta weight — framerate dependent, still the common form
        objects.lerpBox.position.x = THREE.MathUtils.lerp(
            objects.lerpBox.position.x, s.target, Math.min(1, s.weight * delta));
        // constant speed, lands exactly
        const d = s.target - objects.moveBox.position.x;
        const step = s.weight * delta;
        objects.moveBox.position.x += Math.sign(d) * Math.min(Math.abs(d), step);
        // framerate-independent smoothing
        const t = 1 - Math.exp(-s.weight * delta);
        objects.expBox.position.x = THREE.MathUtils.lerp(objects.expBox.position.x, s.target, t);
    }, null, { cameraPos: [0, 3.5, 9], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="red line = target · all three chase it differently"
            code={`# Eases in, never quite lands\nposition = position.lerp(target, ${weight.toFixed(1)} * delta)\n\n# Constant speed, lands exactly\nposition = position.move_toward(target, ${weight.toFixed(1)} * delta)\n\n# Framerate-independent smoothing — the correct form\nvar t := 1.0 - exp(-${weight.toFixed(1)} * delta)\nposition = position.lerp(target, t)\n\nvar angle := lerp_angle(rotation.y, goal, 0.1)   # wraps past PI`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="target.x" value={target} min={-4} max={4} step={0.1} onChange={setTarget} />
                <Slider label="speed / weight" value={weight} min={0.5} max={15} step={0.1} onChange={setWeight} />
            </div>
            <Note>Blue never technically arrives — it just gets close enough. Green lands exactly and stops. Yellow behaves like blue but gives the same result at 30 or 144 FPS.</Note>
        </Demo>
    );
};

DEMOS.instantiation = () => {
    const containerRef = useRef(null);
    const [count, setCount] = useState(0);
    const [freeMode, setFreeMode] = useState('queue_free');
    const bulletsRef = useRef([]);
    const spawnRef = useRef(0);
    const st = useRef({});
    st.current = { freeMode };

    const { sceneRef } = useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.gun) {
            scene.add(mkFloor(20, 0x2b2b2b));
            objects.gun = mkMesh(new THREE.BoxGeometry(0.6, 0.6, 1.4), GODOT_BLUE);
            objects.gun.position.set(0, 0.6, 3);
            scene.add(objects.gun);
            objects.muzzle = new THREE.Object3D();
            objects.muzzle.position.set(0, 0, -0.9);
            objects.gun.add(objects.muzzle);
            [[-2, -4], [2, -6], [0, -9]].forEach(([x, z]) => {
                const t = mkMesh(new THREE.BoxGeometry(1, 2, 1), 0x8a5a3a);
                t.position.set(x, 1, z);
                scene.add(t);
            });
            objects.dispose = () => { bulletsRef.current = []; };
        }
        // Move and expire bullets. Iterate backwards so splicing is safe.
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            const b = bulletsRef.current[i];
            b.position.z -= 14 * delta;
            if (b.position.z < -12) {
                destroy(scene, b);                 // queue_free()
                bulletsRef.current.splice(i, 1);
            }
        }
        if (spawnRef.current > 0) {
            spawnRef.current--;
            const bullet = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 12, 10),
                new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
            objects.gun.updateMatrixWorld(true);
            objects.muzzle.getWorldPosition(bullet.position);
            scene.add(bullet);
            bulletsRef.current.push(bullet);
        }
        objects.gun.position.x = Math.sin(Date.now() * 0.0008) * 2;
        setCountThrottled(objects, bulletsRef.current.length, delta, setCount);
    }, null, { cameraPos: [0, 5, 8], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={`${count} live instances`}
            code={`const BULLET := preload("res://bullet.tscn")   # loaded at compile time\n\nfunc shoot() -> void:\n    var b := BULLET.instantiate()      # exists, but not in the tree yet\n    get_tree().current_scene.add_child(b)   # NOT a child of the gun\n    b.global_transform = $Muzzle.global_transform\n\nfunc _on_lifetime_timeout() -> void:\n    ${freeMode}()   ${freeMode === 'free' ? '# DANGER: frees mid-frame, can crash the tree' : '# freed safely at the end of the frame'}\n\nif is_instance_valid(target) and not target.is_queued_for_deletion():\n    target.take_damage(10)`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                <button onClick={() => { spawnRef.current += 1; }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-8 rounded">
                    instantiate() + add_child()
                </button>
                <Choice value={freeMode} onChange={setFreeMode} options={[
                    { value: 'queue_free', label: 'queue_free()' }, { value: 'free', label: 'free()' }]} />
            </div>
            <Note>Adding the bullet to the gun would make it inherit the gun's movement. Parent it to the scene root (or set <code>top_level</code>) so it flies straight.</Note>
        </Demo>
    );
};

/* Avoids a setState on every animation frame. */
function setCountThrottled(objects, value, delta, setter) {
    objects._t = (objects._t || 0) + delta;
    if (objects._t > 0.2) {
        objects._t = 0;
        if (objects._last !== value) { objects._last = value; setter(value); }
    }
}

/* ------------------------------------------------------- Performance */

DEMOS.multimesh = () => {
    const containerRef = useRef(null);
    const [count, setCount] = useState(800);
    const [instanced, setInstanced] = useState(true);
    const st = useRef({});
    st.current = { count, instanced };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        const MAX = 4000;
        if (!objects.built) {
            scene.add(mkFloor(40, 0x2a3324));
            objects.geom = new THREE.ConeGeometry(0.09, 0.55, 4);
            objects.mat = new THREE.MeshLambertMaterial({ color: 0x5ba84a });
            objects.multi = new THREE.InstancedMesh(objects.geom, objects.mat, MAX);
            objects.multi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            scene.add(objects.multi);
            objects.dummy = new THREE.Object3D();
            objects.transforms = [];
            for (let i = 0; i < MAX; i++) {
                objects.transforms.push({
                    x: (Math.random() - 0.5) * 34,
                    z: (Math.random() - 0.5) * 34,
                    r: Math.random() * Math.PI,
                    s: 0.6 + Math.random() * 0.8,
                });
            }
            objects.separate = new THREE.Group();   // the "one node each" version
            scene.add(objects.separate);
            objects.built = true;
            objects.lastCount = -1;
            objects.lastMode = null;
        }
        const s = st.current;
        if (objects.lastCount !== s.count || objects.lastMode !== s.instanced) {
            objects.lastCount = s.count;
            objects.lastMode = s.instanced;

            objects.multi.visible = s.instanced;
            objects.multi.count = s.instanced ? s.count : 0;
            if (s.instanced) {
                for (let i = 0; i < s.count; i++) {
                    const tr = objects.transforms[i];
                    objects.dummy.position.set(tr.x, 0.3, tr.z);
                    objects.dummy.rotation.set(0, tr.r, 0);
                    objects.dummy.scale.setScalar(tr.s);
                    objects.dummy.updateMatrix();
                    objects.multi.setMatrixAt(i, objects.dummy.matrix);
                }
                objects.multi.instanceMatrix.needsUpdate = true;
                while (objects.separate.children.length) {
                    objects.separate.remove(objects.separate.children[0]);
                }
            } else {
                // Cap the naive path — this is the point of the lesson.
                const n = Math.min(s.count, 900);
                while (objects.separate.children.length) {
                    objects.separate.remove(objects.separate.children[0]);
                }
                for (let i = 0; i < n; i++) {
                    const tr = objects.transforms[i];
                    const m = new THREE.Mesh(objects.geom, objects.mat);
                    m.position.set(tr.x, 0.3, tr.z);
                    m.rotation.y = tr.r;
                    m.scale.setScalar(tr.s);
                    objects.separate.add(m);
                }
            }
        }
    }, null, { cameraPos: [0, 11, 22], lookAt: [0, 0, 0], zoomRange: [6, 42], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef}
            hint={instanced ? `MultiMesh — ${count} instances, 1 draw call` : `${Math.min(count, 900)} separate nodes, ${Math.min(count, 900)} draw calls`}
            code={`@onready var mm: MultiMeshInstance3D = $MultiMeshInstance3D\n\nfunc scatter(count: int) -> void:\n    var multi := MultiMesh.new()\n    multi.transform_format = MultiMesh.TRANSFORM_3D\n    multi.use_colors = true\n    multi.mesh = preload("res://grass.tres")\n    multi.instance_count = ${count}\n\n    for i in ${count}:\n        var t := Transform3D()\n        t.origin = Vector3(randf_range(-17, 17), 0, randf_range(-17, 17))\n        t = t.rotated_local(Vector3.UP, randf() * TAU)\n        multi.set_instance_transform(i, t)\n\n    mm.multimesh = multi\n    multi.visible_instance_count = ${count}   # draw fewer without rebuilding`}>
            <Slider label="instance_count" value={count} min={50} max={4000} step={50} onChange={(v) => setCount(Math.round(v))} />
            <div className="flex justify-center mt-4">
                <Toggle label="Use MultiMesh" value={instanced} onChange={setInstanced} />
            </div>
            <Note>Both paths draw the same triangles. The difference is the number of draw calls — and draw calls, not triangles, are what usually caps a 3D scene.</Note>
        </Demo>
    );
};

DEMOS.lod_system = () => {
    const containerRef = useRef(null);
    const [dist, setDist] = useState(8);
    const [begin, setBegin] = useState(18);
    const [autoLod, setAutoLod] = useState(true);
    const st = useRef({});
    st.current = { dist, begin, autoLod };

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.built) {
            scene.add(mkFloor(60, 0x2b2b2b));
            objects.high = mkMesh(new THREE.IcosahedronGeometry(1.4, 4), GODOT_BLUE);
            objects.mid = mkMesh(new THREE.IcosahedronGeometry(1.4, 2), 0xdddd44);
            objects.low = mkMesh(new THREE.IcosahedronGeometry(1.4, 0), 0xff5555);
            [objects.high, objects.mid, objects.low].forEach((m) => {
                m.position.y = 1.6;
                scene.add(m);
            });
            objects.wire = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.405, 4),
                new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.25 }));
            objects.wire.position.y = 1.6;
            scene.add(objects.wire);
            objects.built = true;
        }
        const s = st.current;
        objects.wire.visible = false;

        // Slider and mouse wheel both write the orbit radius, so zooming out
        // drops the LOD exactly like walking away from the mesh would.
        const orbit = objects.orbit;
        if (objects.lastDist !== s.dist) {
            objects.lastDist = s.dist;
            orbit.radius = s.dist;
        } else if (Math.abs(orbit.radius - s.dist) > 0.1) {
            objects.lastDist = orbit.radius;
            setDist(Math.round(orbit.radius * 10) / 10);
        }

        const level = !s.autoLod ? 0 : orbit.radius < s.begin ? 0
            : orbit.radius < s.begin * 2 ? 1 : 2;
        objects.high.visible = level === 0;
        objects.mid.visible = level === 1;
        objects.low.visible = level === 2;
    }, null, { cameraPos: [0, 2.4, 8], lookAt: [0, 1.6, 0], zoomRange: [3, 60], grid: false, axes: false });

    const level = !autoLod ? 0 : dist < begin ? 0 : dist < begin * 2 ? 1 : 2;
    const names = ['LOD0 — full detail', 'LOD1 — reduced', 'LOD2 — coarse'];
    const tris = ['5120 tris', '320 tris', '20 tris'];

    return (
        <Demo containerRef={containerRef} hint={`camera at ${dist.toFixed(1)} m — ${names[level]}`}
            code={`# Godot generates mesh LODs on import (Import dock > Generate LODs).\n$MeshInstance3D.lod_bias = 1.0     # < 1 swaps sooner\n\n# Swapping whole nodes instead:\n$Detailed.visibility_range_begin = 0.0\n$Detailed.visibility_range_end = ${begin.toFixed(0)}.0\n$Detailed.visibility_range_end_margin = 4.0\n$Detailed.visibility_range_fade_mode = \\\n    GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF\n\n$Simple.visibility_range_begin = ${begin.toFixed(0)}.0\n$Simple.visibility_range_end = ${(begin * 2).toFixed(0)}.0`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="camera distance (m)" value={dist} min={3} max={60} step={0.5} onChange={setDist} />
                <Slider label="visibility_range_end" value={begin} min={5} max={40} step={1} onChange={setBegin} />
            </div>
            <div className="flex flex-col md:flex-row items-center justify-around gap-3 mt-4">
                <Toggle label="LOD active" value={autoLod} onChange={setAutoLod} />
                <div className="font-mono text-sm">
                    <span className="text-gray-500">drawing: </span>
                    <span className={['text-blue-400', 'text-yellow-400', 'text-red-400'][level]}>
                        {names[level]} · {tris[level]}
                    </span>
                </div>
            </div>
            <Note>Pull the camera back with LOD off and you keep paying for 5120 triangles across a dozen pixels. That is the cost LOD removes.</Note>
        </Demo>
    );
};

DEMOS.occlusion = () => {
    const containerRef = useRef(null);
    const [occlusion, setOcclusion] = useState(true);
    const [drawn, setDrawn] = useState(0);
    const st = useRef({});
    st.current = { occlusion };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(60, 0x2b2b2b));
            objects.wall = mkMesh(new THREE.BoxGeometry(12, 7, 0.5), 0x8a5a3a);
            objects.wall.position.set(0, 3.5, -6);
            scene.add(objects.wall);
            objects.props = [];
            for (let i = 0; i < 60; i++) {
                const p = mkMesh(new THREE.BoxGeometry(0.8, 1.6, 0.8),
                    new THREE.Color().setHSL((i % 10) / 10, 0.5, 0.55).getHex());
                p.position.set((Math.random() - 0.5) * 20, 0.8, -8 - Math.random() * 22);
                scene.add(p);
                objects.props.push(p);
            }
            objects.built = true;
            objects.timer = 0;
        }
        const s = st.current;
        let visible = 0;
        objects.props.forEach((p) => {
            // Behind the wall AND inside its silhouette -> occluded.
            const hidden = s.occlusion
                && p.position.z < -6
                && Math.abs(p.position.x) < 6
                && p.position.y < 7;
            p.visible = !hidden;
            if (!hidden) visible++;
        });
        objects.wall.material.transparent = true;
        objects.wall.material.opacity = 0.82;

        objects.timer += delta;
        if (objects.timer > 0.25) { objects.timer = 0; setDrawn(visible); }
    }, null, { cameraPos: [0, 4.5, 13], lookAt: [0, 3, -8], zoomRange: [5, 34], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={`${drawn} / 60 props submitted for drawing`}
            code={`# Project Settings > Rendering > Occlusion Culling > Use Occlusion Culling = ${occlusion}\n\n# Add an OccluderInstance3D and press "Bake Occluders",\n# or build one by hand:\nvar occ := OccluderInstance3D.new()\nvar poly := PolygonOccluder3D.new()\npoly.polygon = PackedVector2Array([\n    Vector2(-6, -3.5), Vector2(6, -3.5), Vector2(6, 3.5), Vector2(-6, 3.5)\n])\nocc.occluder = poly\nadd_child(occ)\n\n# Small movable props should not occlude anything:\n$Barrel.set_meta("_occlusion_baking_exclude", true)`}>
            <div className="flex justify-center">
                <Toggle label="Occlusion culling" value={occlusion} onChange={setOcclusion} />
            </div>
            <Note>Frustum culling only drops what is off-screen. Occlusion culling also drops what is on-screen but hidden — the difference between paying for a city and paying for the wall in front of it.</Note>
        </Demo>
    );
};

DEMOS.visibility_notifier = () => {
    const containerRef = useRef(null);
    const [onScreen, setOnScreen] = useState(true);
    const [enabler, setEnabler] = useState(true);
    const st = useRef({});
    st.current = { enabler };

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta, t) => {
        if (!objects.built) {
            scene.add(mkFloor(40, 0x2b2b2b));
            objects.enemy = mkMesh(capsuleGeometry(0.5, 1.2), 0xff5555);
            objects.enemy.position.set(6, 1.1, 0);
            scene.add(objects.enemy);
            objects.aabb = mkWireBox(1.6, 2.6, 1.6, 0xffdd44);
            objects.enemy.add(objects.aabb);
            objects.fx = new THREE.Points(
                new THREE.BufferGeometry().setAttribute('position',
                    new THREE.BufferAttribute(new Float32Array(120 * 3), 3)),
                new THREE.PointsMaterial({ color: 0xffdd44, size: 0.12 }));
            scene.add(objects.fx);
            objects.fxData = [];
            for (let i = 0; i < 120; i++) objects.fxData.push({ a: Math.random() * 7, r: Math.random() * 1.2 });
            objects.frustum = new THREE.Frustum();
            objects.mat4 = new THREE.Matrix4();
            objects.built = true;
            objects.was = true;
        }
        // Walk the ENEMY through the view instead of sweeping the camera, so
        // orbiting the scene does not fight the demo.
        objects.enemy.position.x = Math.sin(t * 0.45) * 7.5;
        cam.updateMatrixWorld();
        objects.mat4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        objects.frustum.setFromProjectionMatrix(objects.mat4);
        const visible = objects.frustum.containsPoint(objects.enemy.position);

        if (visible !== objects.was) { objects.was = visible; setOnScreen(visible); }
        objects.aabb.material.color.setHex(visible ? 0x44dd66 : 0xff4444);

        // The expensive per-frame work is what the notifier switches off.
        const running = visible || !st.current.enabler;
        objects.fx.visible = running;
        if (running) {
            const pos = objects.fx.geometry.attributes.position.array;
            objects.fxData.forEach((d, i) => {
                d.a += delta * 2;
                pos[i * 3] = objects.enemy.position.x + Math.cos(d.a) * d.r;
                pos[i * 3 + 1] = 1.1 + Math.sin(d.a * 1.7) * 1.1;
                pos[i * 3 + 2] = objects.enemy.position.z + Math.sin(d.a) * d.r;
            });
            objects.fx.geometry.attributes.position.needsUpdate = true;
        }
    }, null, { cameraPos: [0, 3.5, 9], lookAt: [0, 1.1, 0], fov: 34, zoomRange: [5, 20], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint={onScreen ? 'screen_entered — logic running' : 'screen_exited — logic suspended'}
            code={`@onready var notifier: VisibleOnScreenNotifier3D = $VisibleOnScreenNotifier3D\n\nfunc _ready() -> void:\n    notifier.aabb = AABB(Vector3(-0.8, 0, -0.8), Vector3(1.6, 2.6, 1.6))\n    notifier.screen_entered.connect(func(): set_physics_process(true))\n    notifier.screen_exited.connect(func(): set_physics_process(false))\n\nif notifier.is_on_screen():   # ${onScreen}\n    play_expensive_effect()\n\n# VisibleOnScreenEnabler3D does the toggling for you:\n#   enable_mode = VisibleOnScreenEnabler3D.ENABLE_MODE_INHERIT\n#   enable_node_path = ^"../Enemy"`}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-3">
                <Toggle label="Suspend when off-screen" value={enabler} onChange={setEnabler} />
                <Status label="is_on_screen()" value={String(onScreen)} good={onScreen} />
            </div>
            <Note>Culling stops the <em>drawing</em>. The script, the particles and the physics keep running until something switches them off — that is what the notifier is for.</Note>
        </Demo>
    );
};

/* ---------------------------------------------------------- Workflow */

DEMOS.tool_scripts = () => {
    const containerRef = useRef(null);
    const [segments, setSegments] = useState(5);
    const [spacing, setSpacing] = useState(1.6);
    const st = useRef({});
    st.current = { segments, spacing };

    useThreeScene(containerRef, (scene, cam, renderer, objects) => {
        if (!objects.group) {
            scene.add(mkFloor(20, 0x2b2b2b));
            objects.group = new THREE.Group();
            scene.add(objects.group);
            objects.key = null;
        }
        const s = st.current;
        const key = s.segments + ':' + s.spacing;
        if (objects.key === key) return;       // rebuild only when a property changes
        objects.key = key;
        while (objects.group.children.length) destroy(objects.group, objects.group.children[0]);

        for (let i = 0; i < s.segments; i++) {
            const x = (i - (s.segments - 1) / 2) * s.spacing;
            const post = mkMesh(new THREE.BoxGeometry(0.16, 2, 0.16), 0x9a6b3a);
            post.position.set(x, 1, 0);
            objects.group.add(post);
            if (i < s.segments - 1) {
                [1.5, 0.8].forEach((y) => {
                    const rail = mkMesh(new THREE.BoxGeometry(s.spacing, 0.1, 0.08), 0xb8834a);
                    rail.position.set(x + s.spacing / 2, y, 0);
                    objects.group.add(rail);
                });
            }
        }
    }, null, { cameraPos: [0, 3, 8], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="the fence rebuilds itself as you drag — in the editor, not at runtime"
            code={`@tool\nextends Node3D\n\nconst POST := preload("res://post.tscn")\n\n@export var segments: int = ${segments}:\n    set(value):\n        segments = value\n        rebuild()\n\n@export var spacing: float = ${spacing.toFixed(2)}:\n    set(value):\n        spacing = value\n        rebuild()\n\nfunc rebuild() -> void:\n    if not is_node_ready():\n        return\n    for c in get_children():\n        c.queue_free()\n    for i in segments:\n        var post := POST.instantiate()\n        post.position.x = i * spacing\n        add_child(post)\n        post.owner = get_tree().edited_scene_root   # or it will not save\n\nfunc _process(delta: float) -> void:\n    if Engine.is_editor_hint():\n        return\n    # runtime-only code goes below`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="segments" value={segments} min={2} max={12} step={1} onChange={(v) => setSegments(Math.round(v))} />
                <Slider label="spacing" value={spacing} min={0.8} max={3} step={0.1} onChange={setSpacing} />
            </div>
            <Note>Without <code>post.owner = edited_scene_root</code> the generated children exist in the viewport but vanish when you save. That one line is the most common @tool bug.</Note>
        </Demo>
    );
};

DEMOS.custom_resources = () => {
    const containerRef = useRef(null);
    const [item, setItem] = useState('potion');

    const items = {
        potion: { name: 'Health Potion', cost: 25, color: 0xff4466, shape: 'sphere' },
        sword: { name: 'Iron Sword', cost: 120, color: 0xc0d8e8, shape: 'blade' },
        shield: { name: 'Oak Shield', cost: 80, color: 0x9a6b3a, shape: 'disc' },
    };
    const data = items[item];

    useThreeScene(containerRef, (scene, cam, renderer, objects, delta) => {
        if (!objects.holder) {
            scene.add(mkFloor(10, 0x2b2b2b));
            objects.holder = new THREE.Group();
            objects.holder.position.y = 1.3;
            scene.add(objects.holder);
            objects.shape = null;
        }
        if (objects.shape !== item) {
            objects.shape = item;
            while (objects.holder.children.length) destroy(objects.holder, objects.holder.children[0]);
            let mesh;
            if (data.shape === 'sphere') {
                mesh = mkMesh(new THREE.SphereGeometry(0.6, 24, 18), data.color);
            } else if (data.shape === 'blade') {
                mesh = mkMesh(new THREE.BoxGeometry(0.12, 1.8, 0.32), data.color);
            } else {
                mesh = mkMesh(new THREE.CylinderGeometry(0.75, 0.75, 0.16, 24), data.color);
                mesh.rotation.x = Math.PI / 2;
            }
            objects.holder.add(mesh);
        }
        objects.holder.rotation.y += 0.8 * delta;
    }, null, { cameraPos: [0, 2.2, 4.8], lookAt: [0, 1.3, 0], grid: false, axes: false });

    return (
        <Demo containerRef={containerRef} hint="one script, three .tres files — no code per item"
            code={`class_name ItemData\nextends Resource\n\n@export var display_name: String = "${data.name}"\n@export var icon: Texture2D\n@export_range(0, 999) var cost: int = ${data.cost}\n@export var mesh: Mesh\n@export var tint: Color = Color("#${data.color.toString(16).padStart(6, '0')}")\n\n# FileSystem dock -> right click -> New Resource -> ItemData\n# Save as res://items/${item}.tres\n\n# Anywhere that needs it:\n@export var item: ItemData\n\nfunc use() -> void:\n    var copy := item.duplicate()   # resources are shared by reference\n    copy.cost += 1\n    ResourceSaver.save(copy, "res://items/${item}_plus.tres")`}>
            <Choice value={item} onChange={setItem} options={[
                { value: 'potion', label: 'potion.tres' },
                { value: 'sword', label: 'sword.tres' },
                { value: 'shield', label: 'shield.tres' },
            ]} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-500">display_name</div>
                    <div className="font-mono text-blue-300 text-sm">{data.name}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-500">cost</div>
                    <div className="font-mono text-yellow-300 text-sm">{data.cost}</div>
                </div>
            </div>
            <Note>Adding a fourth item means creating a fourth .tres file. No new script, no new branch in an if-chain — that is the reason to reach for Resource.</Note>
        </Demo>
    );
};
