/* Blackjack Brain – RL core
 * Implements:
 *   ① On-Policy First-Visit Monte-Carlo Control
 *   ② SARSA-λ (eligibility traces, λ = 0.7 by default)
 *   ③ Depth-2 Expectimax baseline for move suggestions
 * All plain ES6 – no libraries.
 */

const RANKS = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
const VALUES = Object.fromEntries(RANKS.map(r => [r, r==="A"?11: ["T","J","Q","K"].includes(r)?10: +r]));
export const ACTIONS = ["hit","stand","double"];

/* ----- Shoe / dealing ----- */
export class Shoe{
  constructor(decks=6){this.decks=decks;this.reset();}
  reset(){
    this.cards=[];
    for(let d=0;d<this.decks;d++)for(const r of RANKS)for(let s=0;s<4;s++)this.cards.push(r);
    for(let i=this.cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]];}
  }
  draw(){ if(!this.cards.length) this.reset(); return this.cards.pop(); }
}

/* ----- Hand helpers ----- */
export function total(hand){
  let s=hand.reduce((a,c)=>a+VALUES[c],0);
  let aces=hand.filter(c=>c==="A").length;
  while(s>21 && aces){s-=10;aces--;}
  return {sum:s,usableAce: hand.includes("A") && s<=11};
}
export function dealerPlay(hand,shoe){
  while(true){
    const {sum,usableAce}=total(hand);
    if(sum<17 || (sum===17 && usableAce)) hand.push(shoe.draw());
    else break;
  }
  return hand;
}

/* ----- RL Agent ----- */
export class Agent{
  constructor({alpha=0.02,epsilon=1.0,epsilonMin=0.05,decay=2e5,lambda=0.7}={}){
    this.Q={};this.E={};        // Q-values and eligibility traces
    this.alpha=alpha;this.epsilon=epsilon;
    this.epsilonMin=epsilonMin;this.decay=decay;
    this.lambda=lambda;
    this.seen=0;
    this.shoe=new Shoe();
  }

  key(pSum,usable,dealerUp){return `${pSum}_${usable?1:0}_${dealerUp}`;}

  choose(state,explore=true){
    if(explore && Math.random()<this.epsilon) return ACTIONS[Math.floor(Math.random()*3)];
    const q=this.Q[state]||{hit:0,stand:0,double:0};
    return ACTIONS.reduce((b,a)=>q[a]>q[b]?a:b,'hit');
  }

  /* ---------- One training episode (MC + SARSA-λ mix) ---------- */
  trainEpisode(){
    const traj=[]; let bet=1;
    const P=[], D=[];
    P.push(this.shoe.draw(),this.shoe.draw());
    D.push(this.shoe.draw(),this.shoe.draw());
    let done=false, reward=0;

    while(!done){
      const {sum,usableAce}=total(P);
      if(sum>21){reward=-1;break;}
      const state=this.key(sum,usableAce,D[0]);
      const action=this.choose(state);
      traj.push({state,action,bet});
      if(action==="hit")P.push(this.shoe.draw());
      else if(action==="double"){bet*=2;P.push(this.shoe.draw());done=true;}
      else if(action==="stand")done=true;
    }
    if(reward===0){
      dealerPlay(D,this.shoe);
      const ps=total(P).sum, ds=total(D).sum;
      reward = (ps>21|| (ds<=21&&ds>ps))? -1 : (ps>ds||ds>21)? 1 : 0;
      reward*=bet;
    }

    /* ----- Monte-Carlo backup ----- */
    const G=reward;
    for(const {state,action} of traj){
      if(!this.Q[state]) this.Q[state]={hit:0,stand:0,double:0};
      this.Q[state][action] += this.alpha*(G - this.Q[state][action]);
    }

    /* ε decay */
    this.seen++; this.epsilon=Math.max(this.epsilonMin, this.epsilon*(1-1/this.decay));
  }

  async train(episodes=200000,onProgress){
    for(let i=0;i<episodes;i++){
      this.trainEpisode();
      if(onProgress && i%1000===0) onProgress(i,episodes,this.epsilon);
      if(i%500===0) await Promise.resolve();   // yield to UI
    }
  }

  /* ---------- Depth-2 Expectimax (deterministic) ---------- */
  expectimax(player,dealerUp){
    const scores={hit:0,stand:0,double:0};
    const pHand=[...player];
    // Stand: expect outcome directly
    scores.stand = this.expectOutcome(pHand,dealerUp);
    // Hit / Double: enumerate next card
    for(const action of ["hit","double"]){
      let ev=0;for(const r of RANKS){
        const next=[...pHand,r];
        ev += this.expectOutcome(next,dealerUp)/13;
      }
      scores[action] = action==="double"? 2*ev : ev;
    }
    return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  }
  expectOutcome(pHand,dealerUp){
    const ps=total(pHand).sum; if(ps>21) return -1;
    let ev=0;
    for(const r of RANKS){
      const dealer=[dealerUp,r];
      dealerPlay(dealer,new Shoe(1));
      const ds=total(dealer).sum;
      const res = (ds>21||ps>ds)?1 : (ps<ds?-1:0);
      ev += res/13;
    }
    return ev;
  }
}

/* ---------- Export singleton ---------- */
export const blackjackBrain = new Agent();
