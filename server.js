import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===== Δεδομένα =====
let drawnNumbers = [];
let tickets = {};
let autoRunning = false;
let autoInterval = null;

// ===== Κλήρωση =====
function drawNumber() {
  const remaining = Array.from({length:75}, (_,i)=>i+1).filter(n=>!drawnNumbers.includes(n));
  if(remaining.length===0) return null;
  const num = remaining[Math.floor(Math.random()*remaining.length)];
  drawnNumbers.push(num);
  return num;
}

// ===== API =====

// Πάρε κληρωμένους αριθμούς
app.get("/api/draw", (req,res)=>res.json({drawnNumbers}));

// Δημιουργία κουπονιού
app.post("/api/ticket", (req,res)=>{
  const {name} = req.body;
  const ticketId = uuidv4();
  let nums=[];
  while(nums.length<15){
    let n=Math.floor(Math.random()*75)+1;
    if(!nums.includes(n)) nums.push(n);
  }
  tickets[ticketId] = {name:name||"Παίκτης", numbers: nums, bingo:false};
  res.json({ticketId, numbers: nums, name:name||"Παίκτης"});
});

// Έλεγχος BINGO
app.post("/api/bingo", (req,res)=>{
  const {ticketId} = req.body;
  const ticket = tickets[ticketId];
  if(!ticket) return res.json({valid:false, msg:"Κουπόνι δεν βρέθηκε"});
  const won = ticket.numbers.every(n=>drawnNumbers.includes(n));
  ticket.bingo = won;
  if(won) autoRunning=false;
  res.json({valid:won, numbers:ticket.numbers, name:ticket.name});
});

// Auto draw
app.post("/api/auto", (req,res)=>{
  if(autoRunning) return res.json({running:true});
  autoRunning = true;
  autoInterval = setInterval(()=>{
    if(!autoRunning) return clearInterval(autoInterval);
    const n = drawNumber();
    if(!n) autoRunning=false;
  }, 5000);
  res.json({started:true});
});

// Stop
app.post("/api/stop", (req,res)=>{
  autoRunning=false;
  clearInterval(autoInterval);
  res.json({stopped:true});
});

// Reset
app.post("/api/reset", (req,res)=>{
  drawnNumbers=[];
  tickets={};
  autoRunning=false;
  clearInterval(autoInterval);
  res.json({reset:true});
});

const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log("Server running on port "+PORT));
