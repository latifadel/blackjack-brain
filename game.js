import { Brain, ACTIONS, total, dealerPlay, } from './agent.js';

/* --- DOM helpers --- */
const $ = id => document.getElementById(id);
const dealerDiv = $('dealer-cards'), playerDiv = $('player-cards');
const dealerScore=$('dealer-score'), playerScore=$('player-score');
const msg=$('message'), bal=$('balance');
const [dealBtn,hitBtn,standBtn,doubleBtn,restartBtn] =
  ['deal-btn','hit-btn','stand-btn','double-btn','restart-btn'].map($);

let shoe = Brain.shoe;
let player=[], dealer=[], balance=1000, bet=100, inPlay=false;

/* ---- Rendering ---- */
function renderCard(card, hide=false){
  const div=document.createElement('div');
  div.className='card'+(['♦','♥'].includes(card)?' red':'');
  div.textContent = hide? '❓' : card;
  return div;
}
function updateTable(showDealer=false){
  dealerDiv.innerHTML=''; playerDiv.innerHTML='';
  dealer.forEach((c,i)=>dealerDiv.appendChild(renderCard(c,!showDealer && i===0)));
  player.forEach(c=>playerDiv.appendChild(renderCard(c)));
  dealerScore.textContent = showDealer? total(dealer).sum : '?';
  playerScore.textContent = total(player).sum;
}

/* ---- Game Flow ---- */
function deal(){
  bet=+$('bet-amount').value;
  if(bet<=0||bet>balance){alert('Invalid bet');return;}
  player=[shoe.draw(),shoe.draw()];
  dealer=[shoe.draw(),shoe.draw()];
  inPlay=true; msg.textContent='';
  toggle(true); updateTable(false);
}
function hit(){ if(!inPlay) return; player.push(shoe.draw()); updateTable(false); if(total(player).sum>21) end(-1); }
function stand(){ if(inPlay){dealerPlay(dealer,shoe); end();} }
function dbl(){ if(!inPlay) return; bet*=2; player.push(shoe.draw()); dealerPlay(dealer,shoe); end(); }

function end(forced=-2){
  inPlay=false;
  let res=forced;
  if(res===-2){
    const ps=total(player).sum, ds=total(dealer).sum;
    res = ps>21? -1 : ds>21||ps>ds?1 : ps<ds?-1:0;
  }
  balance+=res*bet; bal.textContent=balance;
  msg.textContent = res>0?'You win!' : res<0?'Dealer wins!':'Push.';
  toggle(false); updateTable(true);
}
function restart(){balance=1000;bal.textContent=balance;msg.textContent='Game reset';toggle(false);playerDiv.innerHTML=dealerDiv.innerHTML='';dealerScore.textContent=playerScore.textContent='0';}

function toggle(active){[hitBtn,standBtn,doubleBtn].forEach(b=>b.disabled=!active);dealBtn.disabled=active;}

dealBtn.onclick=deal;hitBtn.onclick=hit;standBtn.onclick=stand;doubleBtn.onclick=dbl;restartBtn.onclick=restart;

/* ---- Background training ---- */
(async()=>{
  await Brain.train(200000,(i,tot,eps)=>{if(i%20000===0)console.log(`trained ${i}/${tot} ε=${eps.toFixed(2)}`);});
  console.log('Training complete');
})();
