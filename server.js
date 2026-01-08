const express = require("express");
const app = express();
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ====== ΔΕΔΟΜΕΝΑ ======
let drawnNumbers = [];
let tickets = {};
let autoRunning = false;

// ====== ΚΛΗΡΩΣΗ ======
function drawNumber() {
  const remaining = Array.from({length:75}, (_,i)=>i+1).filter(n => !drawnNumbers.includes(n));
  if (remaining.length===0) return null;
  const num = remaining[Math.floor(Math.random()*remaining.length)];
  drawnNumbers.push(num);
  return num;
}

// ====== API ======

// TV ζητά αριθμό / ιστορικό
app.get("/api/draw", (req,res)=>{
  res.json({drawnNumbers});
});

// Παίκτης ζητά νέο κουπόνι
app.post("/api/ticket", (req,res)=>{
  const ticketId = uuidv4();
  let nums = [];
  while(nums.length<15){
    let n = Math.floor(Math.random()*75)+1;
    if(!nums.includes(n)) nums.push(n);
  }
  tickets[ticketId] = {numbers: nums, bingo:false};
  res.json({ticketId, numbers: nums});
});

// Παίκτης πατά BINGO
app.post("/api/bingo", (req,res)=>{
  const {ticketId} = req.body;
  const ticket = tickets[ticketId];
  if(!ticket) return res.json({valid:false, msg:"Κουπόνι δεν βρέθηκε"});

  // Έλεγχος αν όλα τα νούμερα στο drawnNumbers
  const won = ticket.numbers.every(n => drawnNumbers.includes(n));
  ticket.bingo = won;
  if(won) autoRunning=false; // σταμάτα την κλήρωση
  res.json({valid:won, numbers: ticket.numbers});
});

// Auto draw (TV)
app.post("/api/auto", (req,res)=>{
  if(autoRunning) return res.json({running:true});
  autoRunning=true;
  const interval = setInterval(()=>{
    if(!autoRunning) return clearInterval(interval);
    const num = drawNumber();
    if(!num) autoRunning=false;
  },5000);
  res.json({started:true});
});

// Stop auto
app.post("/api/stop", (req,res)=>{
  autoRunning=false;
  res.json({stopped:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("Server running on port "+PORT));
