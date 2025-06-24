import { blackjackBrain as Brain, Shoe, dealerPlay, total, ACTIONS } from './agent.js';

/* DOM shortcuts */
const $ = id => document.getElementById(id);
const dealerCards = $('dealer-cards'),
      playerCards = $('player-cards'),
      dealerScore = $('dealer-score'),
      playerScore = $('player-score'),
      balanceSpan = $('balance'),
      msg = $('message');

const btnDeal = $('deal-btn'), btnHit=$('hit-btn'), btnStand=$('stand-btn'),
      btnDouble=$('double-btn'), btnRestart=$('restart-btn');

let shoe = new Shoe(6);
let player=[], dealer=[], balance=1000, bet=100, inPlay=false;

/* ---------- Rendering helpers ---------- */
function renderCardDiv(card, hide=false){
  const div=document.createElement('div');
  div.className='card'+(['♥','♦'].includes(card?.suit)?' red':'');
  div.textContent = hide? '❓' : card;
  return div;
}
function displayHands(showDealerFull=false){
  dealerCards.innerHTML=''; playerCards.innerHTML='';
  dealer.forEach((c,i)=> dealerCards.appendChild(renderCardDiv(`${c}`, !showDealerFull && i===0)));
  player.forEach(c=> playerCards.appendChild(renderCardDiv(`${c}`)));
  dealerScore.textContent = showDealerFull? total(dealer).sum : '?';
  playerScore.textContent = total(player).sum;
}

/* ---------- Game flow ---------- */
function deal(){
  bet = +$('bet-amount').value;
  if(bet<=0||bet>balance){alert('Invalid bet');return;}
  player=[shoe.draw(),shoe.draw()];
  dealer=[shoe.draw(),shoe.draw()];
  inPlay=true; msg.textContent='';
  toggleButtons(true);
  displayHands(false);
}

function hit(){
  if(!inPlay)return;
  player.push(shoe.draw());
  displayHands(false);
  if(total(player).sum>21) bust();
}
function stand(){ finishHand(); }
function double(){
  if(!inPlay)return;
  bet*=2;
  player.push(shoe.draw());
  finishHand();
}

function finishHand(){
  inPlay=false;
  dealerPlay(dealer,shoe);
  settle();
}
function bust(){ inPlay=false; settle(); }

function settle(){
  const ps = total(player).sum;
  const ds = total(dealer).sum;
  let result=0;
  if(ps>21) result=-1;          // player bust
  else if(ds>21|| ps>ds) result=1;
  else if(ps<ds) result=-1;
  balance += result*bet;
  balanceSpan.textContent = balance;
  msg.textContent = result>0? 'You win!' : result<0? 'Dealer wins!' : 'Push.';
  displayHands(true);
  toggleButtons(false);
}

function toggleButtons(active){
  btnHit.disabled = btnStand.disabled = btnDouble.disabled = !active;
  btnDeal.disabled = active;
}

function restart(){
  balance=1000; balanceSpan.textContent=balance;
  msg.textContent='Game restarted!';
  playerCards.innerHTML=dealerCards.innerHTML='';
  dealerScore.textContent=playerScore.textContent='0';
  toggleButtons(false);
}

/* ---------- Hook UI ---------- */
btnDeal.onclick   = deal;
btnHit.onclick    = hit;
btnStand.onclick  = stand;
btnDouble.onclick = double;
btnRestart.onclick= restart;

/* ---------- Background training ---------- */
(async()=>{
  await Brain.train(200000, (i,tot,eps)=>{
    if(i%20000===0) console.log(`Trained ${i}/${tot} hands  ε=${eps.toFixed(3)}`);
  });
  console.log('🎓 Initial training complete');
})();
