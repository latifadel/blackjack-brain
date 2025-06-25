/*
  ┌──────────────────────────────────────────────────────────────┐
  │  game.js – Browser UI Controller                            │
  │  • Deals cards, tracks bankroll, renders DOM                │
  │  • Delegates decision-making & learning to Brain (agent.js) │
  │  • Exposes Hint? button (Expectimax)                        │
  │  • Shows live learning stats (hands trained, ε)             │
  └──────────────────────────────────────────────────────────────┘
*/

import { Brain, total, dealerPlay } from './agent.js';

/* ---------- Fast DOM helpers ---------- */
const $ = id => document.getElementById(id);
const dealerDiv = $('dealer-cards');
const playerDiv = $('player-cards');
const dealerScore = $('dealer-score');
const playerScore = $('player-score');
const msg   = $('message');
const bal   = $('balance');
const learnedHands = $('hands-trained');
const epsSpan = $('epsilon');

/* Buttons */
const dealBtn   = $('deal-btn');
const hitBtn    = $('hit-btn');
const standBtn  = $('stand-btn');
const doubleBtn = $('double-btn');
const hintBtn   = $('hint-btn');
const restartBtn= $('restart-btn');

/* Game state */
let shoe = Brain.shoe;
let player=[], dealer=[];
let balance=1000, bet=100, inPlay=false;

/* ---------- Visual helpers ---------- */
function cardDiv(card, hidden=false){
  const el = document.createElement('div');
  el.className = 'card' + (['♦','♥'].includes(card)?' red':'');
  el.textContent = hidden ? '❓' : card;
  return el;
}
function render(showDealer=false){
  dealerDiv.innerHTML=''; playerDiv.innerHTML='';
  dealer.forEach((c,i)=>dealerDiv.appendChild(cardDiv(c, !showDealer && i===0)));
  player.forEach(c=>playerDiv.appendChild(cardDiv(c)));
  dealerScore.textContent = showDealer ? total(dealer).sum : '?';
  playerScore.textContent = total(player).sum;
}

/* ---------- Button enable / disable ---------- */
function toggleActions(active){
  [hitBtn, standBtn, doubleBtn, hintBtn].forEach(b=>b.disabled = !active);
  dealBtn.disabled = active;
}

/* ---------- Game flow handlers ---------- */
function deal(){
  bet = +$('bet-amount').value;
  if (bet<=0 || bet>balance){ alert('Invalid bet'); return; }

  player=[shoe.draw(),shoe.draw()];
  dealer=[shoe.draw(),shoe.draw()];
  inPlay=true; msg.textContent='';
  toggleActions(true); render(false);
}

function hit(){
  if (!inPlay) return;
  player.push(shoe.draw());
  render(false);
  if (total(player).sum > 21) finish(-1);
}

function stand(){
  if (inPlay){ dealerPlay(dealer, shoe); finish(); }
}

function dbl(){
  if (!inPlay) return;
  bet *= 2;
  player.push(shoe.draw());
  dealerPlay(dealer, shoe);
  finish();
}

function hint(){
  if (!inPlay) return;
  const move = Brain.expectimax(player, dealer[0]);
  msg.textContent = `Hint → ${move.toUpperCase()}`;
}

function restart(){
  balance = 1000; bal.textContent = balance;
  msg.textContent = 'Game restarted';
  playerDiv.innerHTML = dealerDiv.innerHTML = '';
  dealerScore.textContent = playerScore.textContent = '0';
  toggleActions(false); inPlay=false;
}

/* Decide outcome & update bankroll */
function finish(forced = null){
  inPlay=false;
  let result = forced;   // -1 bust, +1 win, 0 push, null => compute

  if (result === null){
    const ps = total(player).sum;
    const ds = total(dealer).sum;
    result = ps>21? -1 : ds>21||ps>ds? 1 : ps<ds? -1 : 0;
  }
  balance += result*bet; bal.textContent = balance;
  msg.textContent = result>0? 'You win!' : result<0? 'Dealer wins!' : 'Push.';
  render(true); toggleActions(false);
}

/* ---------- Bind buttons ---------- */
dealBtn.onclick   = deal;
hitBtn.onclick    = hit;
standBtn.onclick  = stand;
doubleBtn.onclick = dbl;
hintBtn.onclick   = hint;
restartBtn.onclick= restart;

/* ---------- Background training + live status ---------- */
(async ()=>{
  await Brain.train(200_000, (i,tot,eps)=>{
    if (i % 1000 === 0){
      learnedHands.textContent = i.toLocaleString();
      epsSpan.textContent      = eps.toFixed(2);
    }
  });
  console.log('📈 Initial self-play training finished');
})();
