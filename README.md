# 🌱 Digital Garden

**Ideas are seeds. Projects are plants. Completed projects bloom.**

A calm, interactive garden where every thought, idea, project and goal becomes a plant. Sign in with Discord (or wander in as a guest), plant ideas, watch them grow, and connect related ones with vines.

## ✨ What you can do

- **Plant** a thought (wildflower), idea (glowing mushroom), project (tree) or goal (tall bloom) with `+ New seed` (or press <kbd>N</kbd>)
- **Grow** each plant through its stages: seed → growing → bloomed, or let it rest as dormant
- **Tend** it: open any plant to edit it, add tags, change its stage, or uproot it (with undo)
- **Entwine** related plants: a vine grows between them
- **Wander**: drag to pan, scroll or pinch to zoom, and use the reset button (or <kbd>0</kbd>) to go back
- **Day / night**: follows your local time, or toggle it yourself. At night the fireflies come out and ideas glow
- **Timeline**: scrub back in time to see what your garden looked like then
- **Explore roots**: go underground to see your garden as a root network (a knowledge graph)

The garden is saved in the browser's `localStorage`, separately for each Discord user (and for guests).

## 🔧 Requirements

- `Python 3`
- [Flask](https://flask.palletsprojects.com/), a lightweight WSGI web framework
- [Flask-Discord](https://github.com/weibeu/Flask-Discord), a Discord OAuth2 extension for Flask

```bash
pip install -r requirements.txt
```

The frontend is plain ES modules, SVG and CSS. There's no build step.

## 🚀 How to run

### 1. Configure your Discord application

Copy `config.example.py` to `config.py` (it's git-ignored), or set the same names as environment variables:

```python
DISCORD_CLIENT_ID = "..."
DISCORD_CLIENT_SECRET = "..."
DISCORD_BOT_TOKEN = "..."   # optional: welcome DM and the /user/ roles page
DISCORD_GUILD_ID = "..."    # optional: the /user/ roles page
```

In the Discord developer portal, add `http://127.0.0.1:5000/callback` as an OAuth2 redirect URI (you can change it with `DISCORD_REDIRECT_URI`).

Without Discord credentials the app still runs, and visitors can enter as guests.

### 2. Run the project

```bash
python app.py
```

### 3. Go to 👉 `http://127.0.0.1:5000` in your browser

## 🗂 Structure

```text
app.py                      Flask app: Discord OAuth, guest mode, routes
templates/garden.html       The garden page
static/garden/garden.css    All styles (CSS variables, day/night, animations)
static/garden/js/
  main.js                   Wires everything together
  model.js                  GardenItem type, constants, helpers
  storage.js                loadGarden() / saveGarden(items): the only localStorage access
  store.js                  Small observable store with all garden actions
  demo-data.js              The demo garden shown on first visit
  layout.js                 Finds a free spot for new plants
  plants.js                 Procedural SVG plants for each type and stage
  vines.js                  Organic connections between plants
  scene.js                  Sky, hills, meadow, grass, fireflies
  camera.js                 Pan / zoom / pinch / inertia
  garden.js                 The garden view
  roots.js                  The underground view
  timeline.js               The time-travel slider
  panel.js                  The plant detail panel
  modal.js                  The create / edit form
```

# ❤️ I Like You
