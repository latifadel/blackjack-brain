/*
  game.js – Browser UI Controller
  ───────────────────────────────
  • Deals cards, manages bankroll & messages
  • Uses Brain.expectimax() for Hint button
  • Background-trains 200k hands silently
*/

import { Brain, total, dealerPlay } from './agent.js';

/* ---------- DOM refs ---------- */
const $ = id => document.getElementById(id);
const dealerDiv=$('dealer-cards'), playerDiv=$('player-cards');
const dealerScore=$('dealer-score'), playerScore=$('player-score');
const msg=$('message'), bal=$('balance');
const dealBtn=$('deal-btn'), hitBtn=$('hit-btn'), standBtn=$('stand-btn'),
      doubleBtn=$('double-btn'), hintBtn=$('hint-btn'), restartBtn=$('restart-btn');

/* ---------- Game state ---------- */
let shoe=Brain.shoe;
let player=[], dealer=[];
let balance=1000, bet=100, inPlay=false;

/* ---------- Render helpers ---------- */
function cardElm(card, hidden=false){
  const d=document.createElement('div');
  d.className='card'+(['♦','♥'].includes(card)?' red':'');
  d.textContent = hidden ? '❓' : card;
  return d;
}
function render(showDealer=false){
  dealerDiv.innerHTML = playerDiv.innerHTML = '';
  dealer.forEach((c,i)=> dealerDiv.appendChild(cardElm(c,!showDealer && i===0)));
  player.forEach(c   => playerDiv.appendChild(cardElm(c)));
  dealerScore.textContent = showDealer ? total(dealer).sum : '?';
  playerScore.textContent = total(player).sum;
}

/* Enable/disable action buttons */
function toggle(active){
  [hitBtn,standBtn,doubleBtn,hintBtn].forEach(b=>b.disabled=!active);
  dealBtn.disabled = active;
}

/* ---------- Game actions ---------- */
function deal(){
  bet = +$('bet-amount').value;
  if(bet<=0||bet>balance){ alert('Invalid bet'); return; }

  player=[shoe.draw(),shoe.draw()];
  dealer=[shoe.draw(),shoe.draw()];
  inPlay=true; msg.textContent='';
  toggle(true); render(false);
}

function hit(){
  if(!inPlay) return;
  player.push(shoe.draw());
  render(false);
  if(total(player).sum>21) finish(-1);        // bust
}

function stand(){
  if(inPlay){ dealerPlay(dealer,shoe); finish(); }
}

function dbl(){
  if(!inPlay) return;
  bet*=2;
  player.push(shoe.draw());
  dealerPlay(dealer,shoe);
  finish();
}

function hint(){
  if(!inPlay) return;
  msg.textContent = 'Hint → ' + Brain.expectimax(player, dealer[0]).toUpperCase();
}

/* Compute result & update bankroll */
function finish(forced=null){
  inPlay=false;
  let res=forced;                       // -1 bust / +1 win / 0 push
  if(res===null){
    const ps=total(player).sum, ds=total(dealer).sum;
    res = ps>21? -1 : ds>21||ps>ds? 1 : ps<ds? -1 : 0;
  }
  balance += res*bet; bal.textContent = balance;
  msg.textContent = res>0? 'You win!' : res<0? 'Dealer wins!' : 'Push.';
  render(true); toggle(false);
}

function restart(){
  balance=1000; bal.textContent=balance;
  msg.textContent='Game restarted';
  dealerDiv.innerHTML = playerDiv.innerHTML = '';
  dealerScore.textContent = playerScore.textContent = '0';
  toggle(false); inPlay=false;
}

/* ---------- Wire buttons ---------- */
dealBtn   .onclick = deal;
hitBtn    .onclick = hit;
standBtn  .onclick = stand;
doubleBtn .onclick = dbl;
hintBtn   .onclick = hint;
restartBtn.onclick = restart;

/* ---------- Background self-play (silent) ---------- */
(async()=>{
  await Brain.train(200_000, (i,tot)=>{ if(i%20_000===0) console.log(`Training ${i}/${tot}`); });
  console.log('📈 Self-play training complete');
})();
