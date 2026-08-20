/* Lesson content. Verified against the Godot 4.7 stable docs (Aug 2026).
   A topic renders an interactive 3D demo when DEMOS[id] exists, otherwise it
   falls back to the static `code` block. */

const CATEGORIES = [
    'Basics',
    '3D Core',
    'Movement & Camera',
    'Physics',
    'Navigation',
    'Animation & Skeleton',
    'Visuals & Rendering',
    'Game Logic',
    'Performance',
    'Workflow',
];

const TOPICS = [
    /* ---------------------------------------------------------- Basics */
    {
        id: 'intro',
        title: 'Nodes, Scenes & the Tree',
        category: 'Basics',
        content:
            'Everything in Godot is a Node. A Scene is a tree of nodes saved to a .tscn file, ' +
            'and a scene can be instanced inside another scene. For 3D, your root is usually a ' +
            'Node3D (a plain transform) with meshes, lights and bodies parented under it.',
        code: `extends Node3D

# Cached at _ready(), before the first frame.
@onready var mesh: MeshInstance3D = $Body/MeshInstance3D
@onready var cam: Camera3D = %PlayerCamera   # % = scene-unique name

func _ready() -> void:
    print("Godot ", Engine.get_version_info().string)
    mesh.visible = false
    add_to_group("players")

func _process(delta: float) -> void:
    pass`,
    },
    {
        id: 'variables',
        title: 'Variables & Properties',
        category: 'Basics',
        content:
            'GDScript is optionally typed. Static types (var x: int) give you autocomplete, ' +
            'compile-time errors and faster code, so prefer them. @export puts a variable in the ' +
            'Inspector; setters/getters run code whenever a property changes.',
        code: `extends Node3D

var health: int = 100
var speed := 15.5                       # inferred as float
const MAX_AMMO: int = 30                # compile-time constant
static var instances: int = 0           # shared by every instance

@export var jump_height: float = 10.0
@export_range(0.0, 1.0, 0.05) var friction: float = 0.2
@export var target: Node3D

var score: int = 0:
    set(value):
        score = value
        score_changed.emit(score)
    get:
        return score

signal score_changed(new_score: int)`,
    },
    {
        id: 'data_structures',
        title: 'Arrays & Dictionaries',
        category: 'Basics',
        content:
            'Arrays are ordered lists, Dictionaries are key/value maps. Typed arrays ' +
            '(Array[Node3D]) catch mistakes early and avoid boxing. Both are passed by reference — ' +
            'use duplicate() when you need a copy.',
        code: `func _ready() -> void:
    var enemies: Array[Node3D] = []
    enemies.append($Goblin)
    enemies.assign(get_tree().get_nodes_in_group("enemies"))

    var inventory: Dictionary = {"potion": 5, "sword": 1}
    if inventory.has("sword"):
        print("Armed!")
    inventory.get("shield", 0)          # default when missing

    # Typed dictionary (Godot 4.4+)
    var stats: Dictionary[String, int] = {"hp": 100, "mp": 30}

    var copy := enemies.duplicate()     # shallow copy
    enemies.sort_custom(func(a, b): return a.name < b.name)`,
    },
    {
        id: 'loops',
        title: 'Loops (For & While)',
        category: 'Basics',
        content:
            'for iterates a range or a collection, while repeats until a condition fails. ' +
            'Spawning a row of objects in a loop is the most common 3D use — drag the slider ' +
            'to see the loop body run.',
        code: `func spawn_row(count: int) -> void:
    for i in count:
        var orb := ORB_SCENE.instantiate()
        orb.position = Vector3(i * 1.5, 0.5, 0.0)
        add_child(orb)

    for enemy in get_tree().get_nodes_in_group("enemies"):
        enemy.queue_free()

    var i := 0
    while i < 10:
        i += 1`,
    },
    {
        id: 'lifecycle',
        title: 'Node Lifecycle',
        category: 'Basics',
        content:
            'Every node walks the same path: _init when the object is created, _enter_tree when ' +
            'it joins the SceneTree, _ready once its children are ready, then _process / ' +
            '_physics_process every frame, and finally _exit_tree. Children get _ready before parents.',
        code: `func _init() -> void: pass
func _enter_tree() -> void: pass
func _ready() -> void: pass
func _process(delta: float) -> void: pass
func _physics_process(delta: float) -> void: pass
func _exit_tree() -> void: pass`,
    },
    {
        id: 'delta_time',
        title: '_process vs _physics_process',
        category: 'Basics',
        content:
            '_process runs once per rendered frame — its delta varies with your framerate. ' +
            '_physics_process runs at a fixed rate (60 Hz by default), so it is where all physics ' +
            'and movement belongs. Multiplying by delta is what makes speed framerate-independent.',
        code: `# WRONG: moves twice as fast at 120 FPS
func _process(delta: float) -> void:
    position.x += 0.1

# RIGHT: 5 metres per second at any framerate
func _process(delta: float) -> void:
    position.x += 5.0 * delta

# Physics and collisions belong here (fixed 60 Hz tick)
func _physics_process(delta: float) -> void:
    velocity.y -= gravity * delta
    move_and_slide()

# Project Settings > Physics > Common > Physics Ticks Per Second`,
    },

    /* --------------------------------------------------------- 3D Core */
    {
        id: 'transform_basic',
        title: 'Node3D Transforms',
        category: '3D Core',
        content:
            'Every Node3D carries a Transform3D: position, rotation and scale, relative to its ' +
            'parent. Godot is Y-up and right-handed; -Z is "forward". Setting position directly ' +
            'teleports, while translate()/rotate_y() apply a relative change.',
        code: `extends Node3D

func _process(delta: float) -> void:
    rotate_y(deg_to_rad(45.0) * delta)     # 45 deg per second
    translate(Vector3.RIGHT * delta)       # local space
    global_translate(Vector3.UP * delta)   # world space

    position = Vector3(1, 2, 3)
    rotation_degrees.y = 90.0
    scale = Vector3.ONE * 2.0`,
    },
    {
        id: 'vectors',
        title: 'Vector3 Math',
        category: '3D Core',
        content:
            'A Vector3 is either a point or a direction. Subtracting two points gives the vector ' +
            'between them; normalized() strips the length and leaves pure direction. ' +
            'Use distance_squared_to() for comparisons — it skips a square root.',
        code: `var to_target := target.global_position - global_position
var distance := to_target.length()
var direction := to_target.normalized()

if global_position.distance_squared_to(target.global_position) < 25.0:
    print("Within 5 metres")

var flat := Vector3(dir.x, 0.0, dir.z).normalized()   # ignore height
var clamped := velocity.limit_length(MAX_SPEED)`,
    },
    {
        id: 'cross_product',
        title: 'Dot & Cross Product',
        category: '3D Core',
        content:
            'dot() returns how aligned two directions are: 1 = same, 0 = perpendicular, -1 = ' +
            'opposite. It is the cheapest "is the enemy in front of me?" test. cross() returns a ' +
            'vector perpendicular to both — the basis of building your own orientations.',
        code: `var forward := -global_basis.z
var to_enemy := (enemy.global_position - global_position).normalized()

if forward.dot(to_enemy) > 0.7:
    print("Enemy is roughly in front (within ~45 deg)")

var right := forward.cross(Vector3.UP).normalized()
var surface_up := edge_a.cross(edge_b).normalized()`,
    },
    {
        id: 'basis_orientation',
        title: 'Basis (Orientation)',
        category: '3D Core',
        content:
            'A Transform3D is a Basis (3x3 rotation + scale) plus an origin. The basis columns ' +
            'are the node\'s own axes in world space: basis.x = right, basis.y = up, ' +
            'basis.z = backward. So local forward is -basis.z.',
        code: `# Move along the node's own forward axis
position += -global_basis.z * speed * delta

var right := global_basis.x
var up := global_basis.y

# Build a basis by hand, then normalise away accumulated drift
transform.basis = Basis(Vector3.UP, deg_to_rad(90.0))
transform.basis = transform.basis.orthonormalized()`,
    },
    {
        id: 'local_global',
        title: 'Local vs Global Space',
        category: '3D Core',
        content:
            'position is relative to the parent; global_position is world space. to_global() and ' +
            'to_local() convert points between the two — for example turning a muzzle offset on ' +
            'a gun into the world position where a bullet should appear.',
        code: `var muzzle_world := to_global(Vector3(0, 0, -1.5))
var local_point := to_local(hit_position)

# top_level ignores the parent transform entirely
top_level = true

# Reparent while keeping the node visually in place
item.reparent(new_parent, true)`,
    },
    {
        id: 'top_level',
        title: 'top_level & RemoteTransform3D',
        category: '3D Core',
        content:
            'Set top_level = true and a node keeps its own world transform even though it is still ' +
            'a child — perfect for bullets that must not inherit the gun\'s spin. ' +
            'RemoteTransform3D does the opposite: it pushes its transform onto a node elsewhere ' +
            'in the tree, which is how you drive a camera rig without reparenting it.',
        code: `# Bullet spawned under the muzzle but flying in world space
func _ready() -> void:
    top_level = true

# RemoteTransform3D copies its transform onto remote_path
@onready var remote: RemoteTransform3D = $RemoteTransform3D

func _ready() -> void:
    remote.remote_path = camera_rig.get_path()
    remote.update_position = true
    remote.update_rotation = false
    remote.update_scale = false`,
    },
    {
        id: 'look_at',
        title: 'look_at() & Rotation',
        category: '3D Core',
        content:
            'look_at() points the node\'s -Z axis at a target. It fails if the target is exactly ' +
            'along the up vector, so guard degenerate cases. In Godot 4.7 look_at takes a ' +
            'use_model_front flag, handy when your imported mesh faces +Z instead.',
        code: `func _process(delta: float) -> void:
    var target_pos := target.global_position
    if not global_position.is_equal_approx(target_pos):
        look_at(target_pos, Vector3.UP)

# Yaw only: keep the turret level
var flat := target.global_position
flat.y = global_position.y
look_at(flat, Vector3.UP)

# Meshes authored facing +Z
look_at(target_pos, Vector3.UP, true)`,
    },
    {
        id: 'quaternion',
        title: 'Quaternions & slerp',
        category: '3D Core',
        content:
            'Interpolating Euler angles produces gimbal wobble and takes the long way round. ' +
            'Quaternions interpolate along the shortest arc, which is why smooth turning should ' +
            'use slerp. Compare the two in the viewport — the Euler version visibly swings wide.',
        code: `# Smoothly turn towards a target orientation
var target_basis := Basis.looking_at(direction, Vector3.UP)
var current := Quaternion(global_basis)
var goal := Quaternion(target_basis)

global_basis = Basis(current.slerp(goal, 5.0 * delta))

# Equivalent shortcut on the whole transform
global_transform = global_transform.interpolate_with(target_xform, 0.1)`,
    },
    {
        id: 'normals',
        title: 'Surface Normals',
        category: '3D Core',
        content:
            'A normal is the unit vector sticking straight out of a surface. Lighting, decal ' +
            'alignment, bullet-hole rotation and slope detection all read it. A raycast hit gives ' +
            'you one for free in result.normal.',
        code: `var result := space.intersect_ray(query)
if result:
    var n: Vector3 = result.normal
    decal.global_position = result.position + n * 0.01
    decal.look_at(result.position - n, Vector3.UP)

    # Slope steepness from the floor normal
    var slope := rad_to_deg(n.angle_to(Vector3.UP))`,
    },
    {
        id: 'screen_ray',
        title: 'Click a 3D Object',
        category: '3D Core',
        content:
            'Turn a 2D mouse position into a 3D ray with project_ray_origin() and ' +
            'project_ray_normal(), then intersect it against the physics world. This is how RTS ' +
            'selection, click-to-move and 3D inventory picking work.',
        code: `func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.pressed:
        var cam := get_viewport().get_camera_3d()
        var from := cam.project_ray_origin(event.position)
        var to := from + cam.project_ray_normal(event.position) * 1000.0

        var query := PhysicsRayQueryParameters3D.create(from, to)
        query.collide_with_areas = true
        var hit := get_world_3d().direct_space_state.intersect_ray(query)
        if hit:
            print("Clicked ", hit.collider.name, " at ", hit.position)`,
    },
    {
        id: 'aabb',
        title: 'AABB (Bounding Box)',
        category: '3D Core',
        content:
            'An AABB is an axis-aligned box: position plus size. Every VisualInstance3D exposes ' +
            'one via get_aabb(), which is how you fit a camera to a model or do a cheap ' +
            'broad-phase test before real collision.',
        code: `var box: AABB = $MeshInstance3D.get_aabb()
var world_box := global_transform * box

if world_box.has_point(to_local(point)):
    print("Inside")

if world_box.intersects(other_box):
    print("Overlap")

var centre := world_box.get_center()
var radius := world_box.size.length() * 0.5`,
    },
    {
        id: 'proc_mesh',
        title: 'Procedural Mesh (SurfaceTool)',
        category: '3D Core',
        content:
            'SurfaceTool builds geometry triangle by triangle, then commits to an ArrayMesh. ' +
            'Set the normal/uv/colour before add_vertex — the attributes apply to the next vertex ' +
            'you add. Winding order decides which side of the triangle is visible.',
        code: `var st := SurfaceTool.new()
st.begin(Mesh.PRIMITIVE_TRIANGLES)

st.set_normal(Vector3.UP)
st.set_uv(Vector2(0, 0)); st.add_vertex(Vector3(-1, 0, 0))
st.set_uv(Vector2(0.5, 1)); st.add_vertex(Vector3(0, 1.5, 0))
st.set_uv(Vector2(1, 0)); st.add_vertex(Vector3(1, 0, 0))

st.generate_normals()
st.generate_tangents()
$MeshInstance3D.mesh = st.commit()`,
    },

    /* ----------------------------------------------- Movement & Camera */
    {
        id: 'character_body',
        title: 'CharacterBody3D & move_and_slide',
        category: 'Movement & Camera',
        content:
            'CharacterBody3D is the node for anything you steer directly. You write into velocity ' +
            'and call move_and_slide(), which walks the body, slides along walls and reports ' +
            'is_on_floor(). Gravity is not automatic — you apply it yourself every physics tick.',
        code: `extends CharacterBody3D

const SPEED := 5.0
const JUMP_VELOCITY := 4.5

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity += get_gravity() * delta          # Godot 4.3+

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    var input := Input.get_vector("left", "right", "forward", "back")
    var dir := (transform.basis * Vector3(input.x, 0, input.y)).normalized()
    if dir:
        velocity.x = dir.x * SPEED
        velocity.z = dir.z * SPEED
    else:
        velocity.x = move_toward(velocity.x, 0.0, SPEED)
        velocity.z = move_toward(velocity.z, 0.0, SPEED)

    move_and_slide()`,
    },
    {
        id: 'floor_settings',
        title: 'Slopes, Steps & Floor Snap',
        category: 'Movement & Camera',
        content:
            'floor_max_angle decides what counts as walkable — anything steeper is a wall and the ' +
            'body slides back down. floor_snap_length glues the body to the ground going downhill ' +
            'so it does not launch off ramps. Drag the slope past the limit and watch it give way.',
        code: `extends CharacterBody3D

func _ready() -> void:
    up_direction = Vector3.UP
    floor_max_angle = deg_to_rad(46.0)   # walkable up to 46 deg
    floor_snap_length = 0.3              # stay glued going downhill
    floor_stop_on_slope = true           # do not slide when idle
    slide_on_ceiling = true
    max_slides = 6
    platform_on_leave = CharacterBody3D.PLATFORM_ON_LEAVE_ADD_VELOCITY

func _physics_process(delta: float) -> void:
    move_and_slide()
    if is_on_wall():
        var n := get_wall_normal()
    for i in get_slide_collision_count():
        var c := get_slide_collision(i)`,
    },
    {
        id: 'input_handling',
        title: 'Input & Actions',
        category: 'Movement & Camera',
        content:
            'Never hard-code keys. Define actions in Project Settings > Input Map and read them ' +
            'with Input.get_vector() / is_action_pressed(). get_vector() already normalises the ' +
            'result, so diagonal movement is not faster than straight.',
        code: `func _physics_process(delta: float) -> void:
    var input := Input.get_vector("left", "right", "forward", "back")
    var dir := (transform.basis * Vector3(input.x, 0.0, input.y)).normalized()
    velocity.x = dir.x * SPEED
    velocity.z = dir.z * SPEED
    move_and_slide()

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("jump"):
        jump()
    if event is InputEventMouseMotion:
        rotate_y(-event.relative.x * 0.003)`,
    },
    {
        id: 'mouse_look',
        title: 'First-Person Mouse Look',
        category: 'Movement & Camera',
        content:
            'Capture the mouse, then split the rotation: yaw on the body, pitch on the camera. ' +
            'Clamping the pitch to about +/-89 degrees stops the view flipping over. ' +
            'Always give the player a key that releases the cursor.',
        code: `extends CharacterBody3D

@export var sensitivity := 0.003
@onready var cam: Camera3D = $Camera3D

func _ready() -> void:
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        rotate_y(-event.relative.x * sensitivity)                 # yaw on body
        cam.rotate_x(-event.relative.y * sensitivity)             # pitch on cam
        cam.rotation.x = clampf(cam.rotation.x, -1.55, 1.55)

    if event.is_action_pressed("ui_cancel"):
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE`,
    },
    {
        id: 'camera3d',
        title: 'Camera3D & Projection',
        category: 'Movement & Camera',
        content:
            'FOV controls how much of the world fits on screen — low values flatten the scene, ' +
            'high values exaggerate depth. Orthographic projection removes perspective entirely, ' +
            'which is what isometric games use. near/far bound the depth buffer; a tiny near ' +
            'plane causes z-fighting.',
        code: `@onready var cam: Camera3D = $Camera3D

func _ready() -> void:
    cam.projection = Camera3D.PROJECTION_PERSPECTIVE
    cam.fov = 75.0
    cam.near = 0.05
    cam.far = 500.0
    cam.current = true

    # Isometric / 2.5D
    cam.projection = Camera3D.PROJECTION_ORTHOGONAL
    cam.size = 10.0

func zoom_punch() -> void:
    var tween := create_tween()
    tween.tween_property(cam, "fov", 95.0, 0.1)
    tween.tween_property(cam, "fov", 75.0, 0.3)`,
    },
    {
        id: 'spring_arm',
        title: 'SpringArm3D (3rd Person)',
        category: 'Movement & Camera',
        content:
            'SpringArm3D casts its shape backwards and pulls its children in when something is in ' +
            'the way, so the camera never ends up inside a wall. Parent it to a yaw pivot on the ' +
            'player, put the Camera3D under the arm, and exclude the player from the arm\'s mask.',
        code: `extends SpringArm3D

func _ready() -> void:
    spring_length = 4.0
    margin = 0.2
    collision_mask = 1                       # what the arm collides with
    add_excluded_object(get_parent().get_rid())
    shape = SphereShape3D.new()

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        get_parent().rotate_y(-event.relative.x * 0.005)
        rotation.x = clampf(rotation.x - event.relative.y * 0.005, -1.2, 0.4)`,
    },
    {
        id: 'grid_map',
        title: 'GridMap & MeshLibrary',
        category: 'Movement & Camera',
        content:
            'A GridMap places MeshLibrary tiles on a 3D grid and batches them for you, colliders ' +
            'included. local_to_map()/map_to_local() convert between world space and cell ' +
            'coordinates — that is your snapping maths. Godot 4.7 adds a dedicated MeshLibrary editor.',
        code: `@onready var grid: GridMap = $GridMap

func place_at(world_pos: Vector3, tile_id: int) -> void:
    var cell := grid.local_to_map(grid.to_local(world_pos))
    grid.set_cell_item(cell, tile_id)

func snapped_centre(world_pos: Vector3) -> Vector3:
    return grid.to_global(grid.map_to_local(grid.local_to_map(grid.to_local(world_pos))))

# Clear a cell, and read what is there
grid.set_cell_item(cell, GridMap.INVALID_CELL_ITEM)
var id := grid.get_cell_item(cell)`,
        since: '4.7',
    },
    {
        id: 'path_follow',
        title: 'Path3D & PathFollow3D',
        category: 'Movement & Camera',
        content:
            'Path3D holds a Curve3D; PathFollow3D is a child that slides along it. Drive progress ' +
            '(metres) or progress_ratio (0-1). rotation_mode makes the follower bank into the ' +
            'curve — the standard trick for rollercoasters, patrol routes and cutscene cameras.',
        code: `extends PathFollow3D

@export var speed := 4.0

func _ready() -> void:
    rotation_mode = PathFollow3D.ROTATION_ORIENTED
    loop = true
    cubic_interp = true

func _process(delta: float) -> void:
    progress += speed * delta          # metres along the curve
    # progress_ratio stays in 0..1 regardless of length`,
    },

    /* -------------------------------------------------------- Physics */
    {
        id: 'body_types',
        title: 'Which Physics Body?',
        category: 'Physics',
        content:
            'Four collision nodes, four jobs. StaticBody3D never moves (level geometry). ' +
            'RigidBody3D is simulated — you push it with forces. CharacterBody3D is steered by ' +
            'your code with move_and_slide(). Area3D does not collide at all; it only detects ' +
            'overlaps and can override gravity.',
        code: `# StaticBody3D — walls, floors, props that never move
# RigidBody3D  — barrels, debris; driven by the solver
rigid.apply_central_impulse(Vector3.UP * 5.0)
rigid.freeze = true                       # temporarily static

# CharacterBody3D — players, NPCs; you own the velocity
velocity.y -= gravity * delta
move_and_slide()

# Area3D — triggers, pickups, damage zones
area.body_entered.connect(_on_body_entered)
area.gravity_space_override = Area3D.SPACE_OVERRIDE_REPLACE

# AnimatableBody3D — static body moved by animation, pushes rigid bodies`,
    },
    {
        id: 'collision_shapes',
        title: 'CollisionShape3D Types',
        category: 'Physics',
        content:
            'Primitives (box, sphere, capsule, cylinder) are fast and stable. ConvexPolygonShape3D ' +
            'is the cheapest custom shape and works on moving bodies. ConcavePolygonShape3D ' +
            '(trimesh) matches any mesh exactly but only works on static bodies.',
        code: `var shape := CollisionShape3D.new()

shape.shape = BoxShape3D.new()        # size: Vector3
shape.shape = SphereShape3D.new()     # radius
shape.shape = CapsuleShape3D.new()    # radius + height — best for characters
shape.shape = CylinderShape3D.new()
shape.shape = WorldBoundaryShape3D.new()   # infinite plane

# Generated from a mesh
shape.shape = $MeshInstance3D.mesh.create_convex_shape()
shape.shape = $MeshInstance3D.mesh.create_trimesh_shape()  # static only

add_child(shape)`,
    },
    {
        id: 'jolt',
        title: 'Jolt Physics (default)',
        category: 'Physics',
        content:
            'Since Godot 4.4, Jolt is the default 3D physics engine for new projects — it is ' +
            'faster and far more stable for stacking and heavy scenes than the old GodotPhysics3D. ' +
            'Older projects keep their original setting, so check it when you upgrade.',
        code: `# Project Settings > Physics > 3D > Physics Engine  ->  "Jolt Physics"
# then press Save & Restart.

# Jolt-specific tuning lives under Physics > Jolt 3D
# e.g. simulation/velocity_steps, simulation/position_steps

# Read the active engine at runtime:
print(ProjectSettings.get_setting("physics/3d/physics_engine"))

# Notes when migrating from GodotPhysics3D:
#  - contact impulses and bounce feel slightly different
#  - very thin ConcavePolygonShape3D geometry is more reliable
#  - RigidBody3D.custom_integrator behaves the same`,
        since: '4.4',
    },
    {
        id: 'raycast',
        title: 'Raycasting',
        category: 'Physics',
        content:
            'Two ways to cast a ray. RayCast3D is a node that updates every physics tick — good ' +
            'for a permanent ground check. The direct space state is a one-shot query you fire ' +
            'from code — good for hitscan weapons. Both need matching collision masks.',
        code: `# One-shot query (hitscan)
func shoot() -> void:
    var space := get_world_3d().direct_space_state
    var from := muzzle.global_position
    var to := from - muzzle.global_basis.z * 100.0

    var query := PhysicsRayQueryParameters3D.create(from, to)
    query.collision_mask = 1 | 4
    query.exclude = [self.get_rid()]
    query.collide_with_areas = false

    var hit := space.intersect_ray(query)
    if hit:
        print(hit.collider, hit.position, hit.normal)

# Node version — polls automatically in _physics_process
@onready var ground: RayCast3D = $GroundCheck   # target_position is LOCAL
if ground.is_colliding():
    var n := ground.get_collision_normal()`,
    },
    {
        id: 'shapecast',
        title: 'ShapeCast3D (Sweep)',
        category: 'Physics',
        content:
            'A ray is infinitely thin, so it slips through gaps a character would not fit through. ' +
            'ShapeCast3D sweeps a whole volume along target_position and reports every hit — the ' +
            'right tool for "can I step here?", ledge grabs and thick projectiles.',
        code: `extends ShapeCast3D

func _ready() -> void:
    shape = SphereShape3D.new()
    target_position = Vector3(0, 0, -3)      # local space
    max_results = 4
    add_exception(get_parent())

func _physics_process(delta: float) -> void:
    if is_colliding():
        for i in get_collision_count():
            print(get_collider(i).name, get_collision_normal(i))
        # 0..1 along target_position where the sweep first touched
        var safe := get_closest_collision_safe_fraction()`,
    },
    {
        id: 'area_detection',
        title: 'Area3D (Triggers)',
        category: 'Physics',
        content:
            'Area3D reports overlaps instead of blocking them. Connect body_entered / ' +
            'area_entered for pickups, damage volumes and checkpoints. Signals fire during the ' +
            'physics step, so do not free nodes directly in the handler — use queue_free().',
        code: `extends Area3D

func _ready() -> void:
    body_entered.connect(_on_body_entered)
    area_exited.connect(_on_area_exited)
    monitoring = true          # do I detect others?
    monitorable = true         # can others detect me?

func _on_body_entered(body: Node3D) -> void:
    if body.is_in_group("player"):
        body.heal(25)
        queue_free()

# Poll instead of listening
for body in get_overlapping_bodies():
    body.apply_central_impulse(Vector3.UP * 3.0)`,
    },
    {
        id: 'layers_masks',
        title: 'Layers vs Masks',
        category: 'Physics',
        content:
            'collision_layer answers "what am I?" and collision_mask answers "what do I scan for?". ' +
            'A detects B when A\'s mask shares a bit with B\'s layer. They are independent — one-way ' +
            'detection is perfectly legal and very useful.',
        code: `# Name your layers in Project Settings > Layer Names > 3D Physics
const LAYER_WORLD  := 1 << 0    # 1
const LAYER_PLAYER := 1 << 1    # 2
const LAYER_ENEMY  := 1 << 2    # 4

collision_layer = LAYER_PLAYER
collision_mask  = LAYER_WORLD | LAYER_ENEMY

set_collision_layer_value(2, true)   # 1-based, matches the Inspector
set_collision_mask_value(3, false)`,
    },
    {
        id: 'physics_bounce',
        title: 'move_and_collide & Bouncing',
        category: 'Physics',
        content:
            'move_and_collide() moves once and stops at the first contact, handing you a ' +
            'KinematicCollision3D. Reflect the velocity around the hit normal with bounce() and ' +
            'you have a grenade, a pinball or a ricochet.',
        code: `extends CharacterBody3D

func _physics_process(delta: float) -> void:
    var collision := move_and_collide(velocity * delta)
    if collision:
        velocity = velocity.bounce(collision.get_normal())
        velocity *= 0.9                    # energy loss
        var hit_body := collision.get_collider()

# Test a move without committing to it
if not test_move(global_transform, velocity * delta):
    global_position += velocity * delta`,
    },
    {
        id: 'physics_material',
        title: 'PhysicsMaterial (Bounce & Friction)',
        category: 'Physics',
        content:
            'PhysicsMaterial is a resource shared by bodies: friction 0 is ice, 1 is rubber; ' +
            'bounce 0 absorbs everything, 1 returns all energy. Tick absorbent/rough to make the ' +
            'material win over whatever it hits instead of averaging with it.',
        code: `var mat := PhysicsMaterial.new()
mat.friction = 0.2      # 0 = ice, 1 = grippy
mat.bounce = 0.85       # 0 = dead drop, 1 = perfect bounce
mat.rough = false       # true -> use max friction instead of average
mat.absorbent = false   # true -> use max bounce instead of average

$RigidBody3D.physics_material_override = mat

# Per-body damping bleeds energy away over time
$RigidBody3D.linear_damp = 0.1
$RigidBody3D.angular_damp = 0.5`,
    },
    {
        id: 'rigidbody',
        title: 'RigidBody3D & Forces',
        category: 'Physics',
        content:
            'A RigidBody3D is owned by the solver — setting its position each frame fights the ' +
            'simulation. Push it instead: impulses are instant kicks, forces accumulate over time. ' +
            'When you truly need direct control, do it inside _integrate_forces().',
        code: `extends RigidBody3D

func _ready() -> void:
    mass = 2.0
    gravity_scale = 1.0
    continuous_cd = true            # stop fast bodies tunnelling

func explode(origin: Vector3) -> void:
    var dir := (global_position - origin).normalized()
    apply_central_impulse(dir * 12.0)          # instant
    apply_torque_impulse(Vector3.UP * 3.0)

func _physics_process(delta: float) -> void:
    apply_central_force(Vector3.FORWARD * 20.0)  # continuous

func _integrate_forces(state: PhysicsDirectBodyState3D) -> void:
    state.linear_velocity = state.linear_velocity.limit_length(30.0)`,
    },
    {
        id: 'joints_3d',
        title: 'Joints3D',
        category: 'Physics',
        content:
            'A Joint3D constrains two physics bodies. HingeJoint3D is a door or a wheel, ' +
            'PinJoint3D is a rope link, Generic6DOFJoint3D locks each axis individually. ' +
            'Set node_a/node_b, then configure with set_flag() and set_param().',
        code: `extends HingeJoint3D

func _ready() -> void:
    node_a = $"../Anchor".get_path()
    node_b = $"../Door".get_path()

    set_flag(HingeJoint3D.FLAG_USE_LIMIT, true)
    set_param(HingeJoint3D.PARAM_LIMIT_UPPER, deg_to_rad(100.0))
    set_param(HingeJoint3D.PARAM_LIMIT_LOWER, deg_to_rad(-10.0))
    set_param(HingeJoint3D.PARAM_LIMIT_SOFTNESS, 0.9)

    # Powered hinge = a motor
    set_flag(HingeJoint3D.FLAG_ENABLE_MOTOR, true)
    set_param(HingeJoint3D.PARAM_MOTOR_TARGET_VELOCITY, 4.0)`,
    },
    {
        id: 'soft_body',
        title: 'SoftBody3D (Cloth)',
        category: 'Physics',
        content:
            'SoftBody3D simulates a deformable mesh — flags, capes, cushions. It needs a fairly ' +
            'dense mesh, and you pin the vertices that should stay put. Keep the vertex count low; ' +
            'soft bodies are the most expensive thing in the 3D physics budget.',
        code: `extends SoftBody3D

func _ready() -> void:
    mesh = PlaneMesh.new()
    simulation_precision = 5      # solver iterations
    total_mass = 1.0
    linear_stiffness = 0.6        # 0 = floppy, 1 = rigid
    damping_coefficient = 0.01
    pressure_coefficient = 0.0    # > 0 inflates it like a balloon

    # Pin the top edge to an anchor node
    set_point_pinned(0, true, $"../Pole".get_path())
    set_point_pinned(1, true, $"../Pole".get_path())`,
    },
    {
        id: 'vehicle_body',
        title: 'VehicleBody3D',
        category: 'Physics',
        content:
            'VehicleBody3D is a RigidBody3D with a raycast wheel model. Each VehicleWheel3D child ' +
            'handles suspension, grip and steering. It is arcade-grade rather than a full sim, but ' +
            'it gets a drivable car running in minutes.',
        code: `extends VehicleBody3D

const MAX_STEER := 0.6
const ENGINE_POWER := 300.0

func _physics_process(delta: float) -> void:
    steering = move_toward(steering,
        Input.get_axis("right", "left") * MAX_STEER, delta * 3.0)
    engine_force = Input.get_axis("back", "forward") * ENGINE_POWER
    brake = 10.0 if Input.is_action_pressed("handbrake") else 0.0

# On each VehicleWheel3D:
#   use_as_traction / use_as_steering
#   suspension_stiffness, suspension_travel
#   wheel_friction_slip  (grip)`,
    },
    {
        id: 'physics_interp',
        title: 'Physics Interpolation',
        category: 'Physics',
        content:
            'Physics runs at a fixed 60 Hz but your monitor may refresh at 144 Hz, which shows up ' +
            'as micro-stutter. Physics interpolation blends between the last two physics states ' +
            'when drawing, giving smooth motion for free — as long as you only move things inside ' +
            '_physics_process.',
        code: `# Project Settings > Physics > Common > Physics Interpolation  ->  On

# Per node:
physics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_ON
# ..._OFF for nodes you move in _process (e.g. a smoothed camera)
# ..._INHERIT (default) follows the parent

# Teleporting? Tell the interpolator, or it smears across the map.
global_position = spawn_point
reset_physics_interpolation()`,
        since: '4.3',
    },

    /* ----------------------------------------------------- Navigation */
    {
        id: 'navigation',
        title: 'NavigationAgent3D',
        category: 'Navigation',
        content:
            'Bake a NavigationRegion3D over your level, then let a NavigationAgent3D find the path. ' +
            'You never move the agent — you ask it for the next path position and steer your own ' +
            'CharacterBody3D towards it. The path is recalculated when you set target_position.',
        code: `extends CharacterBody3D

@onready var agent: NavigationAgent3D = $NavigationAgent3D

func _ready() -> void:
    agent.path_desired_distance = 0.5
    agent.target_desired_distance = 1.0
    await get_tree().physics_frame        # let the navmesh sync first

func set_goal(point: Vector3) -> void:
    agent.target_position = point

func _physics_process(delta: float) -> void:
    if agent.is_navigation_finished():
        return
    var next := agent.get_next_path_position()
    velocity = (next - global_position).normalized() * SPEED
    move_and_slide()`,
    },
    {
        id: 'nav_avoidance',
        title: 'Avoidance & Obstacles',
        category: 'Navigation',
        content:
            'Turn on avoidance_enabled and the agent stops walking through its neighbours. It ' +
            'no longer moves itself directly — it emits velocity_computed with a corrected vector ' +
            'that you apply. NavigationObstacle3D carves out dynamic blockers the navmesh does not know about.',
        code: `func _ready() -> void:
    agent.avoidance_enabled = true
    agent.radius = 0.5
    agent.max_speed = 5.0
    agent.velocity_computed.connect(_on_velocity_computed)

func _physics_process(delta: float) -> void:
    var next := agent.get_next_path_position()
    var desired := (next - global_position).normalized() * SPEED
    agent.velocity = desired          # ask, do not move

func _on_velocity_computed(safe_velocity: Vector3) -> void:
    velocity = safe_velocity
    move_and_slide()

# Dynamic blocker
$NavigationObstacle3D.radius = 1.5
$NavigationObstacle3D.avoidance_enabled = true`,
    },

    /* ------------------------------------------ Animation & Skeleton */
    {
        id: 'tweens',
        title: 'Tweens',
        category: 'Animation & Skeleton',
        content:
            'A Tween animates properties from code and cleans itself up. Calls chain by default; ' +
            'set_parallel() runs them together. Tweens die with their node, so create one per ' +
            'animation instead of reusing a stored reference.',
        code: `func open_door() -> void:
    var tween := create_tween()
    tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
    tween.tween_property(self, "position:y", 3.0, 0.6)
    tween.parallel().tween_property(self, "rotation:y", PI, 0.6)
    tween.tween_callback(func(): print("open"))
    await tween.finished

func pulse() -> void:
    var t := create_tween().set_loops()
    t.tween_property($Mesh, "scale", Vector3.ONE * 1.2, 0.4)
    t.tween_property($Mesh, "scale", Vector3.ONE, 0.4)`,
    },
    {
        id: 'anim_player',
        title: 'AnimationPlayer',
        category: 'Animation & Skeleton',
        content:
            'AnimationPlayer keys any property of any node, not just skeletons. play() takes a ' +
            'blend time so poses cross-fade instead of snapping. Method-call and audio tracks let ' +
            'the animation itself trigger game logic at the right frame.',
        code: `@onready var anim: AnimationPlayer = $AnimationPlayer

func _ready() -> void:
    anim.animation_finished.connect(_on_finished)
    anim.play("Idle")

func attack() -> void:
    anim.play("Attack", 0.15)          # 0.15s cross-fade
    anim.speed_scale = 1.5
    await anim.animation_finished
    anim.play("Idle", 0.2)

func _on_finished(name: StringName) -> void:
    if name == "Death":
        queue_free()`,
    },
    {
        id: 'anim_tree',
        title: 'AnimationTree & Blending',
        category: 'Animation & Skeleton',
        content:
            'AnimationTree replaces a pile of play() calls with a graph. A BlendSpace1D mixes ' +
            'idle/walk/run from one speed value; a StateMachine handles transitions with ' +
            'conditions. You drive it by setting parameters, never by calling play().',
        code: `@onready var tree: AnimationTree = $AnimationTree
@onready var state: AnimationNodeStateMachinePlayback = \\
    tree["parameters/playback"]

func _ready() -> void:
    tree.active = true

func _physics_process(delta: float) -> void:
    # BlendSpace1D: 0 = idle, 1 = run
    var speed_ratio := velocity.length() / MAX_SPEED
    tree.set("parameters/Locomotion/blend_position", speed_ratio)

func attack() -> void:
    state.travel("Attack")

# One-shot layered on top of locomotion
tree.set("parameters/Hit/request", AnimationNodeOneShot.ONE_SHOT_REQUEST_FIRE)`,
    },
    {
        id: 'skeleton3d',
        title: 'Skeleton3D & Bones',
        category: 'Animation & Skeleton',
        content:
            'Skeleton3D holds a bone hierarchy; a MeshInstance3D skinned to it deforms as the ' +
            'bones move. Poses are local to the parent bone, so rotating an upper arm carries the ' +
            'forearm and hand with it. Write to the pose, never to the rest.',
        code: `@onready var skel: Skeleton3D = $Armature/Skeleton3D

func aim_spine(angle: float) -> void:
    var idx := skel.find_bone("Spine")
    var pose := skel.get_bone_pose_rotation(idx)
    skel.set_bone_pose_rotation(idx, pose * Quaternion(Vector3.RIGHT, angle))

func _ready() -> void:
    print(skel.get_bone_count(), " bones")
    var hand := skel.find_bone("Hand.R")
    var world := skel.global_transform * skel.get_bone_global_pose(hand)`,
    },
    {
        id: 'bone_attach',
        title: 'BoneAttachment3D',
        category: 'Animation & Skeleton',
        content:
            'BoneAttachment3D follows one bone, so anything parented to it rides along with the ' +
            'animation. That is how a sword sits in a hand or a hat stays on a head. Set ' +
            'bone_name and it resolves the index for you.',
        code: `@onready var hand: BoneAttachment3D = $Armature/Skeleton3D/HandAttachment

func _ready() -> void:
    hand.bone_name = "Hand.R"
    hand.use_external_skeleton = false

func equip(weapon_scene: PackedScene) -> void:
    for child in hand.get_children():
        child.queue_free()
    hand.add_child(weapon_scene.instantiate())`,
    },
    {
        id: 'ik',
        title: 'Inverse Kinematics',
        category: 'Animation & Skeleton',
        content:
            'IK solves the joint angles needed to reach a target — foot placement on stairs, a ' +
            'hand gripping a ledge. In Godot 4.7 this lives in the SkeletonModifier3D family: ' +
            'TwoBoneIK3D for limbs, ChainIK3D for longer chains, LookAtModifier3D for heads and ' +
            'turrets. The old SkeletonIK3D node is deprecated — do not start new work with it.',
        code: `# Child of Skeleton3D, runs after the animation each frame.
@onready var leg_ik: TwoBoneIK3D = $Armature/Skeleton3D/LegIK
@onready var head: LookAtModifier3D = $Armature/Skeleton3D/HeadLook

func _ready() -> void:
    leg_ik.active = true
    head.active = true
    head.influence = 1.0

func plant_foot(ground_point: Vector3) -> void:
    $IKTarget.global_position = ground_point

# Deprecated since 4.4 — kept only for old projects:
#   $SkeletonIK3D.start()`,
        since: '4.7',
    },

    /* ----------------------------------------------- Visuals & Rendering */
    {
        id: 'material_std',
        title: 'StandardMaterial3D (PBR)',
        category: 'Visuals & Rendering',
        content:
            'Godot\'s default material is physically based: albedo is the base colour, metallic ' +
            'picks metal vs dielectric, roughness controls how sharp reflections are. Emission ' +
            'makes a surface glow. Keep metallic at 0 or 1 — values in between are rarely real.',
        code: `var mat := StandardMaterial3D.new()
mat.albedo_color = Color(0.28, 0.55, 0.75)
mat.metallic = 0.0
mat.roughness = 0.35
mat.emission_enabled = true
mat.emission = Color.ORANGE
mat.emission_energy_multiplier = 2.0
mat.normal_enabled = true

# Transparency costs a lot — only enable it when needed
mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
mat.cull_mode = BaseMaterial3D.CULL_DISABLED

$MeshInstance3D.material_override = mat
# or per-surface:
$MeshInstance3D.set_surface_override_material(0, mat)`,
    },
    {
        id: 'shaders',
        title: 'Spatial Shaders',
        category: 'Visuals & Rendering',
        content:
            'A spatial shader runs per vertex and per fragment on the GPU. vertex() can push ' +
            'geometry around (waves, wind), fragment() writes ALBEDO / ROUGHNESS / EMISSION. ' +
            'Uniforms are the knobs you turn from GDScript with set_shader_parameter().',
        code: `shader_type spatial;
render_mode blend_mix, cull_back;

uniform vec4 tint : source_color = vec4(1.0);
uniform float dissolve : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D noise_tex;
uniform float wave_strength = 0.2;

void vertex() {
    VERTEX.y += sin(TIME * 2.0 + VERTEX.x) * wave_strength;
}

void fragment() {
    float n = texture(noise_tex, UV).r;
    if (n < dissolve) discard;
    ALBEDO = tint.rgb;
    EMISSION = tint.rgb * smoothstep(dissolve, dissolve + 0.05, n) * 2.0;
    ROUGHNESS = 0.4;
}

// GDScript side:
//   mat.set_shader_parameter("dissolve", 0.6)`,
    },
    {
        id: 'lights',
        title: 'Lights & Shadows',
        category: 'Visuals & Rendering',
        content:
            'DirectionalLight3D is the sun — direction matters, position does not. OmniLight3D is ' +
            'a bulb, SpotLight3D is a cone. Shadows are the expensive part: give each light the ' +
            'smallest range it can get away with and switch shadows off on decorative lights.',
        code: `$DirectionalLight3D.light_energy = 1.2
$DirectionalLight3D.shadow_enabled = true
$DirectionalLight3D.directional_shadow_max_distance = 80.0

$OmniLight3D.light_color = Color.ORANGE
$OmniLight3D.omni_range = 8.0
$OmniLight3D.light_energy = 2.0

$SpotLight3D.spot_range = 15.0
$SpotLight3D.spot_angle = 35.0
$SpotLight3D.spot_angle_attenuation = 1.0
$SpotLight3D.shadow_bias = 0.03      # raise to kill shadow acne

# Bake static lights: light_bake_mode = Light3D.BAKE_STATIC`,
    },
    {
        id: 'area_light',
        title: 'AreaLight3D',
        category: 'Visuals & Rendering',
        content:
            'New in Godot 4.7. AreaLight3D emits from a rectangle instead of a point, so you get ' +
            'genuinely soft shadows from a ceiling panel, a window or a neon tube without stacking ' +
            'fake omnis. It emits along -Z, and area_texture lets the light take on an image\'s pattern.',
        code: `var light := AreaLight3D.new()
light.area_size = Vector2(2.0, 0.5)     # width x height in metres
light.area_range = 8.0                  # max emit distance
light.area_attenuation = 1.0
light.area_normalize_energy = true      # energy independent of size
light.light_color = Color(0.6, 0.85, 1.0)
light.light_energy = 4.0
light.shadow_enabled = true
add_child(light)

# Screen / TV glow: feed it a texture
light.area_texture = preload("res://screen.png")`,
        since: '4.7',
    },
    {
        id: 'gi',
        title: 'Global Illumination',
        category: 'Visuals & Rendering',
        content:
            'GI is the bounced light that makes a room feel lit rather than stamped. LightmapGI ' +
            'bakes it into textures — cheapest at runtime, static only. VoxelGI is real-time and ' +
            'good for medium indoor scenes. SDFGI is fully dynamic and scales to open worlds, at ' +
            'the highest cost.',
        code: `# LightmapGI — bake in the editor, near-free at runtime.
#   set meshes to GI Mode = Static, add LightmapGI, press Bake Lightmaps.

# VoxelGI — real-time bounce inside its box.
var gi := VoxelGI.new()
gi.size = Vector3(20, 10, 20)
gi.subdiv = VoxelGI.SUBDIV_128
add_child(gi)
gi.bake()

# SDFGI — whole-world dynamic GI, lives on the Environment.
var env: Environment = $WorldEnvironment.environment
env.sdfgi_enabled = true
env.sdfgi_cascades = 4
env.ssao_enabled = true              # contact shadows in corners
env.ssil_enabled = true`,
    },
    {
        id: 'reflection_probe',
        title: 'ReflectionProbe',
        category: 'Visuals & Rendering',
        content:
            'Without a probe, smooth metal reflects only the sky. ReflectionProbe captures its ' +
            'surroundings into a cubemap and feeds it to materials inside its box. Use ONCE for ' +
            'static rooms; ALWAYS re-renders every frame and is expensive.',
        code: `var probe := ReflectionProbe.new()
probe.size = Vector3(12, 6, 12)
probe.origin_offset = Vector3.ZERO
probe.update_mode = ReflectionProbe.UPDATE_ONCE   # or UPDATE_ALWAYS
probe.box_projection = true       # match reflections to the room shape
probe.interior = true             # ignore the sky inside a building
probe.intensity = 1.0
add_child(probe)

# Reflections show up on low-roughness materials
mat.roughness = 0.05
mat.metallic = 1.0`,
    },
    {
        id: 'decals',
        title: 'Decals',
        category: 'Visuals & Rendering',
        content:
            'A Decal projects a texture down its local -Y axis onto whatever geometry is inside ' +
            'its box — bullet holes, blood, puddles, road markings. No mesh authoring and no ' +
            'z-fighting. Keep the box shallow so it does not wrap around corners.',
        code: `var decal := Decal.new()
decal.size = Vector3(0.5, 0.4, 0.5)    # projects down -Y
decal.texture_albedo = BULLET_HOLE
decal.texture_normal = BULLET_HOLE_N
decal.albedo_mix = 1.0
decal.upper_fade = 0.3
decal.normal_fade = 0.5                # skip near-perpendicular surfaces
decal.distance_fade_enabled = true
add_child(decal)

# Align to the surface a raycast hit
decal.global_position = hit.position
decal.look_at(hit.position - hit.normal, Vector3.UP)
decal.rotate_object_local(Vector3.RIGHT, PI / 2)`,
    },
    {
        id: 'world_env',
        title: 'WorldEnvironment',
        category: 'Visuals & Rendering',
        content:
            'One WorldEnvironment node owns the sky, fog, glow, tonemap and colour grading for the ' +
            'whole scene. Depth fog fades by distance; volumetric fog is real light-scattering ' +
            'media you can carve with FogVolume nodes.',
        code: `var env: Environment = $WorldEnvironment.environment

env.background_mode = Environment.BG_SKY
env.fog_enabled = true
env.fog_light_color = Color(0.5, 0.6, 0.7)
env.fog_density = 0.02
env.fog_sky_affect = 0.5

env.volumetric_fog_enabled = true
env.volumetric_fog_density = 0.02

env.glow_enabled = true
env.glow_bloom = 0.2
env.adjustment_enabled = true
env.adjustment_saturation = 1.1`,
    },
    {
        id: 'tonemap_hdr',
        title: 'Tonemapping & HDR Output',
        category: 'Visuals & Rendering',
        content:
            'Rendering happens in high dynamic range; the tonemapper squeezes that down to what a ' +
            'display can show. LINEAR clips harshly, ACES keeps highlights rolling off. ' +
            'Godot 4.7 can also hand real HDR to an HDR monitor instead of tonemapping to SDR.',
        code: `var env: Environment = $WorldEnvironment.environment
env.tonemap_mode = Environment.TONE_MAPPER_ACES
env.tonemap_exposure = 1.0
env.tonemap_white = 6.0

# Auto-exposure adapts like an eye entering a dark room
env.auto_exposure_enabled = true
env.auto_exposure_scale = 0.4
env.auto_exposure_speed = 0.5

# Godot 4.7: drive an HDR display directly
# Project Settings > Display > Window > HDR > Enabled`,
        since: '4.7',
    },
    {
        id: 'particles',
        title: 'GPUParticles3D',
        category: 'Visuals & Rendering',
        content:
            'GPUParticles3D simulates on the GPU and is configured through a ' +
            'ParticleProcessMaterial. Emission, gravity and velocity are set on the material, not ' +
            'the node. One-shot bursts plus a restart() call cover most impact effects.',
        code: `@onready var fx: GPUParticles3D = $GPUParticles3D

func _ready() -> void:
    var pm := ParticleProcessMaterial.new()
    pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
    pm.emission_sphere_radius = 0.2
    pm.direction = Vector3.UP
    pm.spread = 25.0
    pm.initial_velocity_min = 3.0
    pm.initial_velocity_max = 6.0
    pm.gravity = Vector3(0, -9.8, 0)
    pm.scale_min = 0.5
    fx.process_material = pm
    fx.amount = 300
    fx.lifetime = 1.5
    fx.one_shot = true
    fx.draw_pass_1 = QuadMesh.new()

func burst() -> void:
    fx.restart()
    fx.emitting = true

# GPUParticlesCollisionSphere3D / ...Box3D make particles bounce
# GPUParticlesAttractorSphere3D pulls or pushes them`,
    },
    {
        id: 'fog_volume',
        title: 'FogVolume',
        category: 'Visuals & Rendering',
        content:
            'Volumetric fog on the Environment fills the whole world. FogVolume adds or removes ' +
            'density in a shape, so you can drop a mist patch in a valley or a light shaft in a ' +
            'window. Negative density carves a hole in the global fog.',
        code: `# Requires env.volumetric_fog_enabled = true
var vol := FogVolume.new()
vol.shape = RenderingServer.FOG_VOLUME_SHAPE_BOX
vol.size = Vector3(10, 4, 10)

var fog_mat := FogMaterial.new()
fog_mat.density = 0.6
fog_mat.albedo = Color(0.7, 0.75, 0.85)
fog_mat.emission = Color.BLACK
fog_mat.height_falloff = 2.0
vol.material = fog_mat
add_child(vol)

# Negative density punches a clearing in the world fog
fog_mat.density = -1.0`,
    },
    {
        id: 'label_3d',
        title: 'Label3D & Sprite3D',
        category: 'Visuals & Rendering',
        content:
            'Label3D draws text as world geometry — damage numbers, name tags, signposts. Turn on ' +
            'billboard so it always faces the camera, and NO_DEPTH_TEST if it must stay readable ' +
            'through walls. Sprite3D does the same for images.',
        code: `var label := Label3D.new()
label.text = "-42"
label.font_size = 64
label.pixel_size = 0.005
label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
label.no_depth_test = true
label.outline_size = 12
label.modulate = Color.RED
add_child(label)

var tween := create_tween()
tween.tween_property(label, "position:y", 2.0, 0.8)
tween.parallel().tween_property(label, "modulate:a", 0.0, 0.8)
tween.tween_callback(label.queue_free)`,
    },
    {
        id: 'viewports',
        title: 'SubViewport & Render Targets',
        category: 'Visuals & Rendering',
        content:
            'A SubViewport renders a second scene to a texture. Put that texture on a material and ' +
            'you have a security monitor, a portal, a minimap or a 3D UI panel. Set update_mode ' +
            'to ALWAYS for live feeds, ONCE for static captures.',
        code: `@onready var view: SubViewport = $SubViewport

func _ready() -> void:
    view.size = Vector2i(512, 512)
    view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
    view.transparent_bg = false

    var mat := StandardMaterial3D.new()
    mat.albedo_texture = view.get_texture()
    mat.emission_enabled = true
    mat.emission_texture = view.get_texture()
    $Screen.material_override = mat

# 3D UI: SubViewport + Control children, shown on a quad
$Screen.set_process_input(true)   # forward clicks into the viewport`,
    },
    {
        id: 'audio_3d',
        title: 'AudioStreamPlayer3D',
        category: 'Visuals & Rendering',
        content:
            'AudioStreamPlayer3D positions sound in space and drops its volume with distance. ' +
            'unit_size is the radius where the sound is at full volume; max_distance clamps how ' +
            'far it carries. Add an emission angle and it only plays loudly in front of the node.',
        code: `var sfx := AudioStreamPlayer3D.new()
sfx.stream = preload("res://sfx/engine.ogg")
sfx.unit_size = 4.0              # full volume radius (metres)
sfx.max_distance = 40.0
sfx.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
sfx.volume_db = -6.0
sfx.bus = "SFX"
sfx.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_PHYSICS_STEP
add_child(sfx)
sfx.play()

# Directional cone
sfx.emission_angle_enabled = true
sfx.emission_angle_degrees = 45.0
sfx.emission_angle_filter_attenuation_db = -12.0`,
    },
    {
        id: 'csg',
        title: 'CSG (Prototyping)',
        category: 'Visuals & Rendering',
        content:
            'CSG nodes add and subtract solid shapes live in the editor — the fastest way to block ' +
            'out a level. They are a prototyping tool, not a shipping one: bake the result to a ' +
            'MeshInstance3D once the layout is settled.',
        code: `# CSGCombiner3D
#   +-- CSGBox3D      (operation = UNION)
#   +-- CSGSphere3D   (operation = SUBTRACTION)  -> carves a hole

$CSGSphere3D.operation = CSGShape3D.OPERATION_SUBTRACTION
$CSGBox3D.operation = CSGShape3D.OPERATION_UNION
$CSGCombiner3D.use_collision = true    # free collider while prototyping

# CSGPolygon3D can extrude or sweep along a Path3D
$CSGPolygon3D.mode = CSGPolygon3D.MODE_PATH
$CSGPolygon3D.path_node = $"../Path3D".get_path()

# Ship it: select the CSG root -> Scene menu -> "Bake Mesh Instance"`,
    },

    /* ----------------------------------------------------- Game Logic */
    {
        id: 'signals_custom',
        title: 'Signals (Observer)',
        category: 'Game Logic',
        content:
            'Signals let a node announce something without knowing who is listening. Declare with ' +
            'typed parameters, emit with .emit(), listen with .connect(). Children signal upward; ' +
            'parents call downward — that rule keeps scenes reusable.',
        code: `extends Node3D

signal health_changed(current: int, maximum: int)
signal died

var health := 100

func take_damage(amount: int) -> void:
    health = maxi(health - amount, 0)
    health_changed.emit(health, 100)
    if health == 0:
        died.emit()

func _ready() -> void:
    died.connect(_on_died)
    died.connect(queue_free, CONNECT_ONE_SHOT)
    health_changed.connect(func(c, m): print(c, "/", m))

    await died          # signals are awaitable`,
    },
    {
        id: 'groups',
        title: 'Groups & the SceneTree',
        category: 'Game Logic',
        content:
            'Groups are tags on nodes. Add a node to "enemies" and you can fetch or message every ' +
            'member without holding references. call_group is fire-and-forget; ' +
            'get_nodes_in_group gives you the actual array.',
        code: `func _ready() -> void:
    add_to_group("enemies")

func alert_all() -> void:
    get_tree().call_group("enemies", "on_player_spotted", global_position)

    for e in get_tree().get_nodes_in_group("enemies"):
        e.queue_free()

    print(get_tree().get_node_count_in_group("enemies"))

if is_in_group("enemies"):
    remove_from_group("enemies")`,
    },
    {
        id: 'autoload',
        title: 'Autoloads (Singletons)',
        category: 'Game Logic',
        content:
            'An autoload is a scene or script Godot loads once and keeps alive across scene ' +
            'changes — the natural home for save data, audio buses and global events. Register it ' +
            'in Project Settings > Autoload and call it by name from anywhere.',
        code: `# res://globals/game_state.gd  -> autoload name "GameState"
extends Node

signal score_changed(value: int)

var score := 0:
    set(v):
        score = v
        score_changed.emit(v)

func reset() -> void:
    score = 0
    get_tree().change_scene_to_file("res://levels/level_01.tscn")

# Anywhere else:
#   GameState.score += 10
#   GameState.score_changed.connect(_on_score_changed)`,
    },
    {
        id: 'timers',
        title: 'Timers & await',
        category: 'Game Logic',
        content:
            'await pauses a function until a signal fires and resumes it exactly where it stopped ' +
            '— no state machine needed for a delay. Scene tree timers are one-shot and self-freeing; ' +
            'a Timer node is better for anything repeating.',
        code: `func fire() -> void:
    shoot()
    can_shoot = false
    await get_tree().create_timer(0.4).timeout
    can_shoot = true

func intro() -> void:
    await get_tree().create_timer(1.0).timeout
    $Anim.play("open")
    await $Anim.animation_finished
    await get_tree().process_frame

# Repeating: a Timer node
$Timer.wait_time = 2.0
$Timer.autostart = true
$Timer.timeout.connect(spawn_wave)`,
    },
    {
        id: 'time_scale',
        title: 'Engine Time Scale',
        category: 'Game Logic',
        content:
            'Engine.time_scale multiplies every delta in the game — 0.5 is slow motion, 0 is a ' +
            'freeze. It also stretches scene tree timers and tweens. Set process_mode to ' +
            'PROCESS_MODE_ALWAYS on your pause menu so it keeps running.',
        code: `func hit_stop() -> void:
    Engine.time_scale = 0.05
    await get_tree().create_timer(0.08, true, false, true).timeout
    Engine.time_scale = 1.0

func pause() -> void:
    get_tree().paused = true      # nodes with PROCESS_MODE_ALWAYS keep going

# $PauseMenu.process_mode = Node.PROCESS_MODE_ALWAYS
# Physics tick scales too:
# Engine.physics_ticks_per_second stays fixed; delta shrinks instead.`,
    },
    {
        id: 'state_machine',
        title: 'State Machines (match)',
        category: 'Game Logic',
        content:
            'An enum plus a match statement is enough for most character logic. Route through a ' +
            'change_state() function so entering and leaving a state can run code — that hook is ' +
            'where animation triggers and timers belong.',
        code: `enum State { IDLE, RUN, JUMP, ATTACK }
var state := State.IDLE

func change_state(next: State) -> void:
    if next == state:
        return
    match state:
        State.ATTACK: $Hitbox.monitoring = false
    state = next
    match state:
        State.IDLE:   $Anim.play("idle")
        State.RUN:    $Anim.play("run")
        State.ATTACK: $Hitbox.monitoring = true

func _physics_process(delta: float) -> void:
    match state:
        State.IDLE, State.RUN:
            handle_movement(delta)
        State.ATTACK:
            velocity = Vector3.ZERO`,
    },
    {
        id: 'math_lerp',
        title: 'Lerp & move_toward',
        category: 'Game Logic',
        content:
            'lerp eases towards a target — fast at first, never quite arriving. move_toward closes ' +
            'at a constant rate and lands exactly. Frame-rate-correct smoothing needs an ' +
            'exponential weight, not a raw delta multiply.',
        code: `# Eases in, asymptotic
position = position.lerp(target, 5.0 * delta)

# Constant speed, reaches the target exactly
position = position.move_toward(target, 5.0 * delta)

# Framerate-independent smoothing (the correct form)
var t := 1.0 - exp(-5.0 * delta)
position = position.lerp(target, t)

var angle := lerp_angle(rotation.y, target_angle, 0.1)   # wraps at PI
var eased := smoothstep(0.0, 1.0, x)`,
    },
    {
        id: 'instantiation',
        title: 'Spawning & queue_free',
        category: 'Game Logic',
        content:
            'preload() loads at compile time, load() at runtime. instantiate() makes a node from ' +
            'the PackedScene, and it only exists once you add_child it. Always destroy with ' +
            'queue_free() — free() mid-frame can crash the tree.',
        code: `const BULLET := preload("res://bullet.tscn")

func shoot() -> void:
    var b := BULLET.instantiate()
    get_tree().current_scene.add_child(b)   # not a child of the gun
    b.global_transform = $Muzzle.global_transform
    b.velocity = -$Muzzle.global_basis.z * 40.0

func despawn() -> void:
    queue_free()                            # freed at end of frame

if is_instance_valid(target) and not target.is_queued_for_deletion():
    target.take_damage(10)`,
    },

    /* --------------------------------------------------- Performance */
    {
        id: 'multimesh',
        title: 'MultiMesh (Instancing)',
        category: 'Performance',
        content:
            'Thousands of separate MeshInstance3D nodes means thousands of draw calls. MultiMesh ' +
            'draws one mesh many times in a single call. Set transform_format and instance_count ' +
            'first, then write each instance transform.',
        code: `@onready var mm: MultiMeshInstance3D = $MultiMeshInstance3D

func scatter(count: int) -> void:
    var multi := MultiMesh.new()
    multi.transform_format = MultiMesh.TRANSFORM_3D
    multi.use_colors = true
    multi.mesh = preload("res://grass.tres")
    multi.instance_count = count

    for i in count:
        var t := Transform3D()
        t.origin = Vector3(randf_range(-25, 25), 0, randf_range(-25, 25))
        t = t.rotated_local(Vector3.UP, randf() * TAU)
        multi.set_instance_transform(i, t)
        multi.set_instance_color(i, Color(1, randf_range(0.8, 1.0), 1))

    mm.multimesh = multi
    # Draw fewer than allocated without rebuilding:
    multi.visible_instance_count = count / 2`,
    },
    {
        id: 'lod_system',
        title: 'LOD & Visibility Ranges',
        category: 'Performance',
        content:
            'Godot auto-generates mesh LODs on import, so distant meshes silently drop triangles. ' +
            'visibility_range_begin/end let you swap whole nodes instead — a detailed prop near ' +
            'the camera, a crude one far away, or nothing at all.',
        code: `# Per GeometryInstance3D
$Detailed.visibility_range_begin = 0.0
$Detailed.visibility_range_end = 25.0
$Detailed.visibility_range_end_margin = 5.0       # fade band
$Detailed.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF

$Simple.visibility_range_begin = 25.0
$Simple.visibility_range_end = 120.0

# Import dock > Mesh > Generate LODs (on by default)
# Tune the aggressiveness with lod_bias:
$MeshInstance3D.lod_bias = 1.0     # < 1 = swap sooner`,
    },
    {
        id: 'occlusion',
        title: 'Occlusion Culling',
        category: 'Performance',
        content:
            'Frustum culling only skips what is off-screen — a wall in front of a whole city still ' +
            'costs you the city. Bake OccluderInstance3D geometry and Godot also skips what is ' +
            'hidden behind it. Occluders should be simple and slightly smaller than the real wall.',
        code: `# Project Settings > Rendering > Occlusion Culling > Use Occlusion Culling

# Add an OccluderInstance3D, press "Bake Occluders" in the toolbar,
# or build one by hand:
var occ := OccluderInstance3D.new()
var poly := PolygonOccluder3D.new()
poly.polygon = PackedVector2Array([
    Vector2(-4, -3), Vector2(4, -3), Vector2(4, 3), Vector2(-4, 3)
])
occ.occluder = poly
add_child(occ)

# Small dynamic props should not occlude:
$Barrel.set_meta("_occlusion_baking_exclude", true)`,
    },
    {
        id: 'visibility_notifier',
        title: 'VisibleOnScreenNotifier3D',
        category: 'Performance',
        content:
            'Culling stops a mesh being drawn, but its script keeps running. ' +
            'VisibleOnScreenNotifier3D tells you when a node enters or leaves any camera\'s view ' +
            'so you can switch off the expensive logic too. The Enabler variant does it for you.',
        code: `@onready var notifier: VisibleOnScreenNotifier3D = $VisibleOnScreenNotifier3D

func _ready() -> void:
    notifier.aabb = AABB(Vector3(-1, 0, -1), Vector3(2, 2, 2))
    notifier.screen_entered.connect(func(): set_physics_process(true))
    notifier.screen_exited.connect(func(): set_physics_process(false))

if notifier.is_on_screen():
    play_expensive_effect()

# VisibleOnScreenEnabler3D does the toggling automatically:
#   enable_mode = VisibleOnScreenEnabler3D.ENABLE_MODE_INHERIT
#   enable_node_path = ^"../Enemy"`,
    },

    /* ------------------------------------------------------ Workflow */
    {
        id: 'custom_resources',
        title: 'Custom Resources',
        category: 'Workflow',
        content:
            'Extend Resource to make your own data type, and it becomes a savable .tres file you ' +
            'can drag into the Inspector. Items, stats, weapon configs and dialogue all belong ' +
            'here instead of in scripts. Resources are shared by reference — duplicate() when you ' +
            'need a per-instance copy.',
        code: `class_name ItemData
extends Resource

@export var display_name: String = "Potion"
@export var icon: Texture2D
@export_range(0, 999) var cost: int = 10
@export var mesh: Mesh
@export var on_use: Callable

# FileSystem dock -> right click -> New Resource -> ItemData
# Then in any script:
@export var item: ItemData

func use() -> void:
    var copy := item.duplicate()   # avoid mutating the shared resource
    copy.cost += 1
    ResourceSaver.save(copy, "res://items/potion_plus.tres")`,
    },
    {
        id: 'advanced_exports',
        title: 'Advanced Exports',
        category: 'Workflow',
        content:
            'Export annotations shape the Inspector so designers cannot enter nonsense. Ranges ' +
            'clamp, enums restrict, groups tidy, and file hints open a picker. Spending a minute ' +
            'here saves an hour of "why is this value 9999".',
        code: `@export_category("Combat")
@export_group("Damage", "dmg_")
@export_range(0, 100, 1, "suffix:hp") var dmg_base: int = 10
@export_range(0.0, 5.0, 0.1) var dmg_multiplier: float = 1.0
@export_group("")

@export_enum("Melee", "Ranged", "Magic") var attack_type: int = 0
@export_flags_3d_physics var hit_layers: int = 1
@export_file("*.tscn") var effect_scene: String
@export_dir var save_folder: String
@export_node_path("Camera3D") var camera_path: NodePath
@export_color_no_alpha var tint: Color = Color.WHITE
@export_multiline var description: String = ""`,
    },
    {
        id: 'tool_scripts',
        title: 'Tool Scripts & Plugins',
        category: 'Workflow',
        content:
            '@tool makes a script run inside the editor, so a fence can rebuild itself as you drag ' +
            'it. Guard anything gameplay-related with Engine.is_editor_hint() — editor code that ' +
            'touches runtime state will corrupt your scenes.',
        code: `@tool
extends Node3D

@export var segments: int = 5:
    set(value):
        segments = value
        rebuild()

func rebuild() -> void:
    if not is_node_ready():
        return
    for c in get_children():
        c.queue_free()
    for i in segments:
        var post := POST_SCENE.instantiate()
        post.position.x = i * 2.0
        add_child(post)
        post.owner = get_tree().edited_scene_root   # so it saves

func _process(delta: float) -> void:
    if Engine.is_editor_hint():
        return
    # runtime-only code here`,
    },
    {
        id: 'import_3d',
        title: 'Importing 3D Models',
        category: 'Workflow',
        content:
            'glTF 2.0 (.glb) is the format to use — Blender exports it cleanly and Godot imports ' +
            'materials, skins and animations. The Advanced Import dialog is where you attach ' +
            'colliders, split animations and set LOD. Name suffixes in Blender do a lot for free.',
        code: `# Blender node-name suffixes Godot understands on import:
#   -col      -> generates a static trimesh collider
#   -convcol  -> convex collider
#   -colonly  -> collider with no visible mesh
#   -noimp    -> skip this object entirely
#   -occ      -> occluder

# Loading at runtime
var scene: PackedScene = load("res://models/tree.glb")
var tree := scene.instantiate()
add_child(tree)

# Import dock > Advanced...:
#   per-mesh Generate LODs / Shadow Meshes / Lightmap UV2
#   per-animation loop mode and slicing
#   Save as a separate .tscn to edit and keep re-import working`,
    },
];
