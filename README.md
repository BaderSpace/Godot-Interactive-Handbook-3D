# Godot 4.x — Interactive 3D Handbook

79 lessons on Godot 4.x, 72 of them with a live 3D viewport you can drive.
Content verified against the **Godot 4.7 stable** docs (August 2026).

## Running it

The lessons live in separate `js/*.js` files, and browsers refuse to fetch those
over `file://`. So it needs a local server:

- **Windows:** double-click `serve.bat` — it starts Python's server and opens the page.
- **Manually:** `python -m http.server 8000`, then open <http://localhost:8000/