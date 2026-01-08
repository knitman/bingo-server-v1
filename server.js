import express from "express";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

let numbers = Array.from({ length: 75 }, (_, i) => i + 1);
let drawn = [];
let tickets = {};
let running = false;

/* ================== ΚΛΗΡΩΣΗ ================== */

// Τραβάει αριθμό (MANUAL ή AUTO)
app.get("/api/draw", (req, res) => {
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
  res.json({ ok: true });
});

/* ================== ΚΟΥΠΟΝΙΑ ================== */

app.post("/api/ticket", (req, res) => {
  const { name } = req.body;
  const id = uuidv4();

  let nums = [];
  while (nums.length < 15) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  tickets[id] = { id, name, nums };
  res.json({ ticketId: id });
});

app.get("/api/ticket/:id", (req, res) => {
  const ticket = tickets[req.params.id];
  if (!ticket) return res.status(404).json({ error: "Not found" });
  res.json(ticket);
});

/* ================== BINGO ================== */

app.post("/api/bingo/:id", (req, res) => {
  running = false;
  res.json({ winner: tickets[req.params.id] });
});

app.listen(PORT, () => {
  console.log("✅ Bingo server running on port", PORT);
});
