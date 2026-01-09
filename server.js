import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

/* ===== ΚΑΤΑΣΤΑΣΗ ΠΑΙΧΝΙΔΙΟΥ ===== */

// Αριθμοί 1–75
let numbers = Array.from({ length: 75 }, (_, i) => i + 1);
// Όσοι έχουν ήδη κληρωθεί
let drawn = [];
// Αν “τρέχει” αυτόματη κλήρωση (λογική flag, το interval είναι client-side)
let running = false;

// Κουπόνια: ticketId → { id, name, nums:[], winner:boolean }
let tickets = {};

/* helper: τυχαίο 5ψήφιο μοναδικό ID */
function generateTicketId() {
  let id;
  do {
    id = Math.floor(10000 + Math.random() * 90000); // 10000–99999
  } while (tickets[id]);
  return id;
}

// Υπολογισμός προόδου παικτών
function getPlayersProgress() {
  return Object.values(tickets).map(t => {
    const hits = t.nums.filter(n => drawn.includes(n)).length;
    const total = t.nums.length;
    const progress = total > 0 ? Math.round((hits / total) * 100) : 0;
    return {
      id: t.id,
      name: t.name || ("Παίκτης " + t.id),
      hits,
      total,
      progress,
      winner: !!t.winner
    };
  }).sort((a, b) => b.progress - a.progress);
}

/* ===== HTTP API ===== */

/* Κλήρωση επόμενου αριθμού */
app.get("/api/draw", (req, res) => {
  if (numbers.length === 0) {
    running = false;
    broadcast({ type: "done" });
    return res.json({ done: true });
  }

  const i = Math.floor(Math.random() * numbers.length);
  const num = numbers.splice(i, 1)[0];
  drawn.push(num);

  const players = getPlayersProgress();

  // Broadcast σε όλους τους WebSocket clients
  broadcast({
    type: "number",
    number: num,
    drawn,
    players
  });

  res.json({ number: num, drawn, players });
});

/* Start (flag μόνο, το auto είναι client-side) */
app.post("/api/start", (req, res) => {
  running = true;
  res.json({ ok: true });
});

/* Stop */
app.post("/api/stop", (req, res) => {
  running = false;
  res.json({ ok: true });
});

/* Reset */
app.post("/api/reset", (req, res) => {
  numbers = Array.from({ length: 75 }, (_, i) => i + 1);
  drawn = [];
  running = false;
  // Κρατάμε τα tickets, απλά ακυρώνουμε νικητές
  Object.values(tickets).forEach(t => t.winner = false);

  broadcast({
    type: "reset"
  });

  res.json({ ok: true });
});

/* Δημιουργία κουπονιού */
app.post("/api/ticket", (req, res) => {
  const { name } = req.body;

  const ticketId = generateTicketId();

  let nums = [];
  while (nums.length < 15) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  tickets[ticketId] = {
    id: ticketId,
    name,
    nums,
    winner: false
  };

  // Ενημέρωση TV για νέο παίκτη
  broadcast({
    type: "players",
    players: getPlayersProgress()
  });

  res.json({ ticketId });
});

/* Λήψη στοιχείων κουπονιού */
app.get("/api/ticket/:id", (req, res) => {
  const ticket = tickets[req.params.id];
  if (!ticket) return res.status(404).json({ error: "Not found" });
  res.json({ id: ticket.id, name: ticket.name, nums: ticket.nums });
});

/* Bingo αίτημα από παίκτη */
app.post("/api/bingo/:id", (req, res) => {
  const ticket = tickets[req.params.id];
  if (!ticket) return res.json({ winner: false });

  const { marked } = req.body;

  // Έλεγχος: όλα τα marked μέσα στα drawn
  const isValidMarks = Array.isArray(marked)
    && marked.every(n => drawn.includes(n));

  // Και εδώ ορίζουμε ότι "Bingo" = όλα τα νούμερα του ticket υπάρχουν στα drawn
  const allTicketDrawn = ticket.nums.every(n => drawn.includes(n));

  const realWinner = isValidMarks && allTicketDrawn;

  if (realWinner) {
    ticket.winner = true;
    running = false;
  }

  // Broadcast σε όλους ότι κάποιος φώναξε Bingo
  broadcast({
    type: "bingo",
    id: ticket.id,
    name: ticket.name || ("Παίκτης " + ticket.id),
    winner: realWinner
  });

  // Ενημέρωση προόδου
  broadcast({
    type: "players",
    players: getPlayersProgress()
  });

  res.json({ winner: realWinner });
});

/* ===== WebSocket Server ===== */

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on("connection", ws => {
  clients.add(ws);

  // Στέλνουμε τρέχουσα κατάσταση με το καλησπέρα
  ws.send(JSON.stringify({
    type: "state",
    drawn,
    players: getPlayersProgress()
  }));

  ws.on("close", () => {
    clients.delete(ws);
  });
});

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

server.listen(PORT, () => {
  console.log("✅ Bingo server running on port", PORT);
});
