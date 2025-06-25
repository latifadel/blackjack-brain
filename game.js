/*
  UI + RL wiring
  ---------------
  • Handles DOM, bets, bust logic.
  • Delegates training & action values to Brain (agent.js).
*/

import { Brain, total, dealerPlay } from './agent.js';

/* --------- DOM shortcuts --------- */
const $ = id => document.getElementById(id);
const dealerDiv=$('dealer-cards'), playerDiv=$('player-cards');
const dealerScore=$('dealer-score'), playerScore=$('player-score');
const msg=$('message'), bal=$('balance');
const [dealBtn,hitBtn,standBtn,doubleBtn,restartBtn] =
  ['deal-btn','hit-btn','stand-btn','double-btn','restart-btn'].map($);

let shoe = Brain.shoe;
let player=[], dealer=[], balance=1000, bet=100, inPlay=false;

/* Card rendering */
function renderCard(card, hidden=false){
  const d=document.createElement('div');
  d.className='card' + (['♦','♥'].includes(card)?' red':'');
  d.textContent = hidden? '❓' : card;
  return d;
}
function updateTable(showDealer=false){
  dealerDiv.innerHTML=''; playerDiv.innerHTML='';
  dealer.forEach((c,i)=>dealerDiv.appendChild(renderCard(c,!showDealer&&i===0)));
  player.forEach(c=>playerDiv.appendChild(renderCard(c)));
  dealerScore.textContent = showDealer? total(dealer).sum : '?';
  playerScore.textContent = total(player).sum;
}

/* ---------- Game controls ---------- */
function deal(){
  bet = +$('bet-amount').value;
  if(bet<=0||bet>balance){ alert('Invalid bet'); return; }
  player=[shoe.draw(),shoe.draw()];
  dealer=[shoe.draw(),shoe.draw()];
  msg.textContent=''; inPlay=true;
  toggleButtons(true); updateTable(false);
}
function hit(){ if(!inPlay) return;
  player.push(shoe.draw()); updateTable(false);
  if(total(player).sum>21) settle(-1);
}
function stand(){ if(inPlay){ dealerPlay(dealer,shoe); settle(); } }
function dbl(){ if(!inPlay) return;
  bet*=2; player.push(shoe.draw()); dealerPlay(dealer,shoe); settle();
}
function restart(){
  balance=1000; bal.textContent=balance; msg.textContent='Game restarted';
  playerDiv.innerHTML=dealerDiv.innerHTML=''; dealerScore.textContent=playerScore.textContent='0';
  toggleButtons(false); inPlay=false;
}

/* Decide winner, update bankroll */
function settle(forced=null){
  inPlay=false;
  let result = forced;           // null = compute, -1 bust, +1 win
  if(result===null){
    const ps=total(player).sum, ds=total(dealer).sum;
    result = ps>21? -1 : (ds>21||ps>ds)?1 : ps<ds?-1:0;
  }
  balance += result*bet; bal.textContent=balance;
  msg.textContent = result>0?'You win!' : result<0?'Dealer wins!':'Push.';
  updateTable(true); toggleButtons(false);
}

/* Button state */
function toggleButtons(active){
  [hitBtn,standBtn,doubleBtn].forEach(b=>b.disabled=!active);
  dealBtn.disabled = active;
}

/* Hook UI */
dealBtn.onclick=deal; hitBtn.onclick=hit; standBtn.onclick=stand; doubleBtn.onclick=dbl; restartBtn.onclick=restart;

/* -------- Background training --------
   First 200k self-play hands run in short async bursts;
   console logs progress every 20k so you can show learning. */
(async()=>{
  await Brain.train(200000,(i,tot,eps)=>{
    if(i%20000===0) console.log(`Training ${i}/${tot}  ε=${eps.toFixed(2)}`);
  });
  console.log('🎓 Initial training done');
})();
