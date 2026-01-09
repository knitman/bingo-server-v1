import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

/* ===== ΚΑΤΑΣΤΑΣΗ ΠΑΙΧΝΙΔΙΟΥ ===== */
let numbers = Array.from({ length: 75 }, (_, i) => i + 1);
let drawn = [];
let running = false;

/* ===== ΚΟΥΠΟΝΙΑ ===== */
let tickets = {};

/* helper: τυχαίο 5ψήφιο μοναδικό ID */
function generateTicketId() {
  let id;
  do {
    id = Math.floor(10000 + Math.random() * 90000);
  } while (tickets[id]);
  return id;
}

/* ===== ΚΛΗΡΩΣΗ ===== */

app.get("/api/draw", (req, res) => {
  if (!running) {
    return res.status(400).json({ error: "Game not running" });
  }

  if (numbers.length === 0) {
    running = false;
    return res.json({ done: true });
  }

  const i = Math.floor(Math.random() * numbers.length);
  const num = numbers.splice(i, 1)[0];
  drawn.push(num);

  res.json({ number: num, drawn });
});

app.post("/api/start", (req, res) => {
  running = true;
  res.json({ ok: true });
});

app.post("/api/stop", (req, res) => {
  running = false;
  res.json({ ok: true });
});

app.post("/api/reset", (req, res) => {
  numbers = Array.from({ length: 75 }, (_, i) => i + 1);
  drawn = [];
  running = false;
  tickets = {};
  res.json({ ok: true });
});

/* ===== ΔΗΜΙΟΥΡΓΙΑ ΚΟΥΠΟΝΙΟΥ ===== */

app.post("/api/ticket", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name required" });
  }

  const ticketId = generateTicketId();

  let nums = [];
  while (nums.length < 15) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  tickets[ticketId] = {
    id: ticketId,
    name,
    nums
  };

  res.json({ ticketId });
});

app.get("/api/ticket/:id", (req, res) => {
  const ticket = tickets[req.params.id];
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  res.json(ticket);
});

/* ===== BINGO (LEGIT ΕΛΕΓΧΟΣ) ===== */

app.post("/api/bingo/:id", (req, res) => {
  const ticket = tickets[req.params.id];
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  // ΟΛΟΙ οι αριθμοί του κουπονιού πρέπει να έχουν κληρωθεί
  const isBingo = ticket.nums.every(n => drawn.includes(n));

  if (isBingo) {
    running = false;
    return res.json({ winner: ticket });
  }

  res.json({ winner: null });
});

/* ===== SERVER ===== */

app.listen(PORT, () => {
  console.log("✅ Bingo server running on port", PORT);
});
