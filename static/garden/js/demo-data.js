const DAY = 86400000;

function daysAgo(days, hour = 10) {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, (days * 7) % 60, 0, 0);
  return d.toISOString();
}

// [id, title, type, status, tags, description, created (days ago), position, connections, history]
const SEEDS = [
  ["music", "Build a music visualizer", "project", "growing", ["music", "threejs", "web"],
    "Make music feel visual.", 24, [1160, 420], ["webgl", "generative"],
    [["growing", 9]]],
  ["webgl", "Learn WebGL", "idea", "growing", ["graphics", "shaders"],
    "Shaders, buffers and the strange beauty of the GPU pipeline.", 61, [990, 640], ["generative"],
    [["growing", 30]]],
  ["japan", "Travel to Japan", "goal", "growing", ["travel", "japan"],
    "Kyoto in autumn. Walk the Kumano Kodo. Eat far too much.", 142, [1730, 560], ["japanese"],
    [["growing", 50]]],
  ["habits", "Read Atomic Habits", "thought", "bloomed", ["books", "habits"],
    "Small changes, remarkable results. Finished — the 2-minute rule stuck.", 118, [1420, 800], ["morning"],
    [["growing", 100], ["bloomed", 70]]],
  ["startup", "Build a startup", "goal", "seed", ["business"],
    "Not yet. But the seed is in the ground.", 12, [780, 230], ["ai"],
    []],
  ["japanese", "Learn Japanese", "project", "growing", ["language", "japan"],
    "15 minutes of kana every morning. Aiming for N4.", 96, [1560, 260], [],
    [["growing", 60]]],
  ["photo", "Photography project", "project", "dormant", ["photo", "film"],
    "A year of 35mm street photos. Paused for the winter.", 170, [300, 620], ["site"],
    [["growing", 150], ["dormant", 40]]],
  ["ai", "AI experiments", "idea", "seed", ["ai", "code"],
    "Tiny tools that think alongside me.", 6, [610, 560], ["generative"],
    []],
  ["site", "Personal website", "project", "bloomed", ["web", "design"],
    "A quiet corner of the internet. Live and blooming.", 200, [470, 300], [],
    [["growing", 180], ["bloomed", 120]]],
  ["generative", "Generative art", "idea", "growing", ["art", "code"],
    "Rules that make flowers. Noise that makes wind.", 80, [760, 790], [],
    [["growing", 45]]],
  ["morning", "Wake up with the sun", "thought", "seed", ["habits"],
    "What if the first hour belonged to me?", 3, [1200, 880], [],
    []],
];

/** A garden that explains itself: different plant types in every stage of life. */
export function createDemoGarden() {
  const items = SEEDS.map(([id, title, type, status, tags, description, created, [x, y], connections, history]) => {
    const createdAt = daysAgo(created, 9);
    const entries = [{ status: "seed", at: createdAt }, ...history.map(([s, d]) => ({ status: s, at: daysAgo(d, 15) }))];
    return {
      id: "demo-" + id,
      title,
      description,
      type,
      status,
      tags,
      createdAt,
      updatedAt: entries[entries.length - 1].at,
      position: { x, y },
      connections: connections.map((c) => "demo-" + c),
      history: entries,
    };
  });

  // Connections are symmetric.
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const item of items) {
    for (const other of item.connections) {
      const target = byId.get(other);
      if (target && !target.connections.includes(item.id)) target.connections.push(item.id);
    }
  }
  return items;
}
