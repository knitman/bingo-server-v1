import express from "express";
import { randomInt } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== GAME STATE =====
let availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
let drawnNumbers = [];
let running = false;
let winner = null;

const tickets = new Map(); // id -> { name, numbers }

// ===== HELPERS =====
function generateTicketID() {
  return randomInt(10000, 99999).toString(); // 5ψήφιο random
}

// ===== API =====

// Κλήρωση αριθμού
app.get("/api/draw", (req, res) => {
  if (!running || availableNumbers.length === 0 || winner) {
    return res.json({ stopped: true });
  }

  const index = Math.floor(Math.random() * availableNumbers.length);
  const number = availableNumbers.splice(index, 1)[0];
  drawnNumbers.push(number);

  res.json({ number, drawnNumbers });
});

// Start / Stop
app.post("/api/start", (req, res) => {
  running = true;
  res.json({ ok: true });
});

app.post("/api/stop", (req, res) => {
  running = false;
  res.json({ ok: true });
});

// Δημιουργία κουπονιού
app.post("/api/ticket", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "No name" });

  let nums = [];
  while (nums.length < 15) {
    const n = randomInt(1, 76);
    if (!nums.includes(n)) nums.push(n);
  }

  const id = generateTicketID();
  tickets.set(id, { name, numbers: nums });

  res.json({ id });
});

// Έλεγχος BINGO
app.post("/api/bingo", (req, res) => {
  const { id, marked } = req.body;
  if (!tickets.has(id)) return res.json({ win: false });

  const valid = marked.every(n => drawnNumbers.includes(n));

  if (valid && !winner) {
    winner = { id, name: tickets.get(id).name };
    running = false;
  }

  res.json({ win: valid, winner });
});

// Κατάσταση νικητή
app.get("/api/winner", (req, res) => {
  res.json({ winner });
});

// Reset
app.post("/api/reset", (req, res) => {
  availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  drawnNumbers = [];
  tickets.clear();
  running = false;
  winner = null;
  res.json({ ok: true });
});

// ===== START =====
app.listen(PORT, () => {
  console.log("Bingo server running on port", PORT);
});
