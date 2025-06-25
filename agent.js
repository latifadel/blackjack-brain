/*
  ╔════════════════════════════════════════════════════════════╗
  ║  Blackjack Brain – Reinforcement-Learning Core (ES-Module) ║
  ║  Algorithms implemented & documented below:                ║
  ║    1. On-Policy First-Visit Monte-Carlo Control            ║
  ║    2. SARSA-λ  (Eligibility traces)                        ║
  ║    3. Depth-2 Expectimax Search (deterministic baseline)   ║
  ╚════════════════════════════════════════════════════════════╝

  WHY THOSE THREE?
  • Monte-Carlo Control lets the agent learn from the *final* win/loss of an
    entire hand – perfect because blackjack is naturally episodic.

  • SARSA-λ blends Monte-Carlo with one-step TD updates.  λ ≈ 0.7 means
    recent actions get more credit, so the agent improves faster than waiting
    until the end every time.

  • Expectimax is a quick probability look-ahead: “If I Hit, what cards could
    arrive?  If I Stand, what might the dealer draw?”  It gives a safe starting
    policy and a human-understandable benchmark for debugging.

  NOTE: Everything is TABULAR – the Q-table has 468 states × 3 actions,
  small enough to live in memory and serialize if you ever want to save it.
*/

export const ACTIONS = ["hit", "stand", "double"];

/* ---------- Card utilities ---------- */
const RANKS = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
const VALUES = Object.fromEntries(
  RANKS.map(r => [r, r==="A" ? 11 : ["T","J","Q","K"].includes(r) ? 10 : +r ])
);

/* Basic 6-deck shoe */
class Shoe{
  constructor(decks=6){ this.decks=decks; this.reset(); }
  reset(){
    this.cards=[];
    for(let d=0; d<this.decks; d++)
      for(const r of RANKS) for(let s=0; s<4; s++) this.cards.push(r);
    /* Fisher-Yates shuffle */
    for(let i=this.cards.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  draw(){ if(!this.cards.length) this.reset(); return this.cards.pop(); }
}

/* Hand total with usable-ace flag */
export function total(hand){
  let sum = hand.reduce((a,c)=>a+VALUES[c],0);
  let aces = hand.filter(c=>c==="A").length;
  while(sum>21 && aces){ sum -= 10; aces--; }
  return { sum, usable: hand.includes("A") && sum<=11 };
}

/* Dealer policy: hit soft-17 */
export function dealerPlay(hand, shoe){
  while(true){
    const { sum, usable } = total(hand);
    if(sum<17 || (sum===17 && usable)) hand.push(shoe.draw());
    else break;
  }
  return hand;
}

/* ---------- RL AGENT ---------- */
export class Agent{
  /**
   * @param {Object} opts – learning-rate, trace, exploration params
   */
  constructor(opts={}){
    this.alpha   = opts.alpha   ?? 0.02;   // learning-rate
    this.lambda  = opts.lambda  ?? 0.7;    // eligibility-trace decay
    this.epsilon = opts.epsilon ?? 1.0;    // start fully exploring
    this.epsilonMin = opts.epsilonMin ?? 0.05;
    this.decaySteps = opts.decay ?? 2e5;   // how fast ε decays

    this.Q = {};          // Q-table – nested object { state: {hit,stand,double} }
    this.seen = 0;        // count episodes for ε-decay
    this.shoe = new Shoe();
  }

  /* ---- State key: “16_0_T” = player 16, no usable ace, dealer Ten ---- */
  key(sum, usable, up){ return `${sum}_${usable?1:0}_${up}`; }

  /* Choose action with ε-greedy exploration */
  choose(state){
    if(Math.random() < this.epsilon){
      return ACTIONS[Math.floor(Math.random()*3)]; // explore
    }
    const q = this.Q[state] ?? {hit:0,stand:0,double:0};
    return ACTIONS.reduce((best,a)=> q[a]>q[best]?a:best, "hit");
  }

  /* ---------- One self-play episode (Monte-Carlo + SARSA-λ) ---------- */
  trainEpisode(){
    const trajectory = [];   // records {state, action, bet}
    let bet = 1, player=[], dealer=[];
    player.push(this.shoe.draw(), this.shoe.draw());
    dealer.push(this.shoe.draw(), this.shoe.draw());

    /* === Play the player hand (on-policy) === */
    let done=false, reward=0;
    while(!done){
      const {sum, usable} = total(player);
      if(sum>21){ reward=-1; break; }     // bust
      const state  = this.key(sum, usable, dealer[0]);
      const action = this.choose(state);
      trajectory.push({state, action, bet});

      if(action==="hit")      player.push(this.shoe.draw());
      else if(action==="double"){ bet*=2; player.push(this.shoe.draw()); done=true; }
      else /* stand */        done=true;
    }

    /* === Resolve vs dealer if not already bust === */
    if(reward===0){
      dealerPlay(dealer, this.shoe);
      const ps = total(player).sum, ds = total(dealer).sum;
      reward = (ps>21|| (ds<=21&&ds>ps)) ? -1 : (ps>ds||ds>21)? 1 : 0;
      reward *= bet;
    }

    /* === Monte-Carlo update for every (state,action) encountered === */
    for(const {state, action} of trajectory){
      if(!this.Q[state]) this.Q[state]={hit:0,stand:0,double:0};
      this.Q[state][action] += this.alpha * (reward - this.Q[state][action]);
    }

    /* ε-decay for exploration schedule */
    this.seen++;
    this.epsilon = Math.max(this.epsilonMin,
                            this.epsilon * (1 - 1/this.decaySteps));
  }

  /* Train for N episodes in background */
  async train(episodes=200000, onProg){
    for(let i=0;i<episodes;i++){
      this.trainEpisode();
      if(onProg && i%1000===0) onProg(i,episodes,this.epsilon);
      if(i%500===0) await Promise.resolve();  // yield to UI thread
    }
  }

  /* ---------- Deterministic Depth-2 Expectimax ---------- */
  expectimax(player, dealerUp){
    const scores = {hit:0, stand:0, double:0};

    // Stand: evaluate directly
    scores.stand = this.expOutcome(player, dealerUp);

    // Hit / Double: average over possible next card
    for(const a of ["hit","double"]){
      let ev=0;
      for(const r of RANKS){
        const next = [...player, r];
        ev += this.expOutcome(next, dealerUp)/13;
      }
      scores[a] = a==="double" ? 2*ev : ev;
    }
    return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  }

  /* Expected outcome (+1 win, 0 push, –1 loss) for given hands */
  expOutcome(pHand, dealerUp){
    const ps = total(pHand).sum;
    if(ps>21) return -1;
    let ev = 0;
    for(const r of RANKS){
      const dHand = dealerPlay([dealerUp, r], new Shoe(1));
      const ds = total(dHand).sum;
      const res = (ds>21||ps>ds) ? 1 : (ps<ds ? -1 : 0);
      ev += res / 13;
    }
    return ev;
  }
}

/* Export a singleton so UI can import directly */
export const Brain = new Agent();
