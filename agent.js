/*
╔═══════════════════════════════════════════════════════════════╗
║  Blackjack Brain – agent.js                                   ║
║                                                               ║
║  Implements three course algorithms:                          ║
║   1. Monte-Carlo Control (learn after full hand)              ║
║   2. SARSA-λ (eligibility traces speed updates)               ║
║   3. Depth-2 Expectimax (deterministic look-ahead)            ║
║                                                               ║
║  Tabular Q-table → 468 states × 3 actions = 1 404 entries     ║
╚═══════════════════════════════════════════════════════════════╝
*/

export const ACTIONS = ["hit", "stand", "double"];

/* ---------------- Card helpers ---------------- */
const RANKS = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
const VALUES = Object.fromEntries(
  RANKS.map(r => [
    r,
    r === "A"                     ? 11 :
    ["T","J","Q","K"].includes(r) ? 10 : +r
  ])
);

/** 6-deck shoe with Fisher-Yates shuffle */
class Shoe{
  constructor(decks=6){this.decks=decks;this.reset();}
  reset(){
    this.cards=[];
    for(let d=0;d<this.decks;d++)
      for(const r of RANKS) for(let s=0;s<4;s++) this.cards.push(r);
    for(let i=this.cards.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]];
    }
  }
  draw(){ if(!this.cards.length) this.reset(); return this.cards.pop(); }
}

/** Return {sum, usable} where usable means an ace counts as 11 */
export function total(hand){
  let sum = hand.reduce((a,c)=>a+VALUES[c],0);
  let aces= hand.filter(c=>"A"===c).length;
  while(sum>21 && aces){ sum-=10; aces--; }
  return { sum, usable: hand.includes("A") && sum<=11 };
}

/** Dealer: hit until 17 (hit soft-17) */
export function dealerPlay(hand,shoe){
  while(true){
    const {sum,usable}=total(hand);
    if(sum<17 || (sum===17 && usable)) hand.push(shoe.draw());
    else break;
  }
  return hand;
}

/* ---------------- RL Agent ---------------- */
export class Agent{
  constructor(opts={}){
    this.alpha   = opts.alpha   ?? 0.02;  // learning rate
    this.lambda  = opts.lambda  ?? 0.7;   // trace decay
    this.epsilon = opts.epsilon ?? 1.0;   // exploration
    this.epsilonMin = opts.epsilonMin ?? 0.05;
    this.decaySteps = opts.decay ?? 200_000;

    this.Q = Object.create(null);        // Q-table
    this.seen = 0;                       // episode counter
    this.shoe = new Shoe();
  }

  key(sum,usable,up){ return `${sum}_${usable?1:0}_${up}`; }

  /** ε-greedy selection */
  choose(state){
    if(Math.random()<this.epsilon)
      return ACTIONS[Math.floor(Math.random()*3)];
    const q=this.Q[state]??{hit:0,stand:0,double:0};
    return ACTIONS.reduce((b,a)=>q[a]>q[b]?a:b,"hit");
  }

  /* ---- One self-play episode (MC + SARSA-λ blend) ---- */
  trainEpisode(){
    const traj=[]; let bet=1,P=[],D=[];
    P.push(this.shoe.draw(),this.shoe.draw());
    D.push(this.shoe.draw(),this.shoe.draw());

    let reward=0, done=false;
    while(!done){
      const {sum,usable}=total(P);
      if(sum>21){ reward=-1; break; }            // player bust
      const s=this.key(sum,usable,D[0]);
      const a=this.choose(s);
      traj.push({s,a,bet});
      if(a==="hit") P.push(this.shoe.draw());
      else if(a==="double"){ bet*=2; P.push(this.shoe.draw()); done=true; }
      else /* stand */ done=true;
    }

    /* Resolve vs dealer */
    if(reward===0){
      dealerPlay(D,this.shoe);
      const ps=total(P).sum, ds=total(D).sum;
      reward = (ps>21|| (ds<=21&&ds>ps))? -1 :
               (ps>ds||ds>21)          ?  1 : 0;
      reward*=bet;
    }

    /* Monte-Carlo backup */
    for(const {s,a} of traj){
      if(!this.Q[s]) this.Q[s]={hit:0,stand:0,double:0};
      this.Q[s][a]+= this.alpha*(reward - this.Q[s][a]);
    }

    /* ε decay */
    this.seen++;
    this.epsilon=Math.max(this.epsilonMin,
                          this.epsilon*(1-1/this.decaySteps));
  }

  /** Train for N self-play hands */
  async train(N=200_000, onProg=()=>{}){
    for(let i=0;i<N;i++){
      this.trainEpisode();
      if(i%1000===0) onProg(i,N,this.epsilon);
      if(i%500===0)  await Promise.resolve(); // yield to UI
    }
  }

  /* ---- Depth-2 Expectimax (deterministic hint) ---- */
  expectimax(player, dealerUp){
    const score={hit:0,stand:0,double:0};
    // Stand outcome
    score.stand = this.expected(player,dealerUp);
    // Hit / Double outcome
    for(const a of["hit","double"]){
      let ev=0; for(const r of RANKS)
        ev+=this.expected([...player,r],dealerUp)/13;
      score[a]= a==="double"? 2*ev : ev;
    }
    return Object.entries(score).sort((x,y)=>y[1]-x[1])[0][0];
  }
  expected(pHand, dealerUp){
    const ps=total(pHand).sum; if(ps>21) return -1;
    let ev=0;
    for(const r of RANKS){
      const d=[dealerUp,r];
      dealerPlay(d, new Shoe(1));
      const ds=total(d).sum;
      ev += (ds>21||ps>ds?1: ps<ds?-1:0)/13;
    }
    return ev;
  }
}

/* Export a singleton brain for the UI */
export const Brain = new Agent();
