const express = require("express");
const app = express();
const path = require("path");

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// ================== BINGO DATA ==================
let availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
let drawnNumbers = [];
let tickets = {}; // ticketId -> numbers

// ================== API ==================

// Τράβα αριθμό
app.get("/api/draw", (req, res) => {
  if (availableNumbers.length === 0) {
    return res.json({ done: true });
  }

  const index = Math.floor(Math.random() * availableNumbers.length);
  const number = availableNumbers.splice(index, 1)[0];
  drawnNumbers.push(number);

  res.json({ number, drawnNumbers });
});

// Δημιουργία κουπονιού
app.post("/api/ticket", (req, res) => {
  const ticketId = "BINGO-" + Math.floor(100000 + Math.random() * 900000);

  let nums = [];
  while (nums.length < 15) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  tickets[ticketId] = nums;

  res.json({
    ticketId,
    numbers: nums
  });
});

// Έλεγχος νίκης
app.post("/api/check", (req, res) => {
  const { ticketId, marked } = req.body;

  if (!tickets[ticketId]) {
    return res.json({ win: false, error: "Invalid ticket" });
  }

  const drawnSet = new Set(drawnNumbers);
  const isWin = tickets[ticketId].every(n => drawnSet.has(n));

  res.json({ win: isWin });
});

// Reset παιχνιδιού
app.post("/api/reset", (req, res) => {
  availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  drawnNumbers = [];
  tickets = {};
  res.json({ ok: true });
});

// ================== FRONTEND ==================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================== START ==================
app.listen(PORT, () => {
  console.log("Bingo server running on port", PORT);
});
