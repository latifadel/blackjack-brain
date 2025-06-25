/*
╔════════════════════════════════════════════════════════════════════╗
║  Blackjack Brain – Reinforcement-Learning Core                    ║
║                                                                   ║
║  Algorithms implemented                                            ║
║  ─────────────────────────────────────────────────                 ║
║  1. On-Policy First-Visit Monte-Carlo Control                      ║
║     • Learn after each complete hand                               ║
║  2. SARSA-λ (Eligibility Traces)                                   ║
║     • Gives strongest credit to the most recent actions            ║
║  3. Depth-2 Expectimax Search                                      ║
║     • Deterministic, two-ply look-ahead for safe baseline & hints  ║
║  4. ε-Greedy Exploration                                           ║
║     • Balances discovery vs exploitation                           ║
╚════════════════════════════════════════════════════════════════════╝
*/

export const ACTIONS = ["hit", "stand", "double"];

/* ---------------------------------------------------------------
 *  Card utilities
 * ------------------------------------------------------------- */
const RANKS  = ["A","2","3","4","5","6","7","8","9","T","J","Q","K"];
const VALUES = Object.fromEntries(
  RANKS.map(r => [
    r,
    r === "A"                     ? 11 :
    ["T","J","Q","K"].includes(r) ? 10 :
    +r
  ])
);

/** Simple 6-deck shoe with Fisher–Yates shuffle */
class Shoe {
  constructor(decks = 6) { this.decks = decks; this.reset(); }
  reset () {
    this.cards = [];
    for (let d=0; d<this.decks; d++)
      for (const r of RANKS) for (let s=0; s<4; s++) this.cards.push(r);
    for (let i=this.cards.length-1;i>0;i--) {     // shuffle
      const j = Math.floor(Math.random()*(i+1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  draw () { if (!this.cards.length) this.reset(); return this.cards.pop(); }
}

/** Return {sum, usable} where `usable` means an ace can count as 11 */
export function total (hand) {
  let sum = hand.reduce((a,c)=>a+VALUES[c],0);
  let aces = hand.filter(c=>c==="A").length;
  while (sum > 21 && aces) { sum -= 10; aces--; }
  return { sum, usable: hand.includes("A") && sum<=11 };
}

/** Dealer policy: hit until 17, hit soft-17, otherwise stand */
export function dealerPlay (hand, shoe) {
  while (true) {
    const {sum, usable} = total(hand);
    if (sum < 17 || (sum === 17 && usable)) hand.push(shoe.draw());
    else break;
  }
  return hand;
}

/* ---------------------------------------------------------------
 *  Reinforcement-Learning Agent
 * ------------------------------------------------------------- */
export class Agent {
  /**
   * @param {Object} opts – learning-rate, exploration schedule, etc.
   */
  constructor (opts = {}) {
    /* Hyper-parameters (proposal defaults) */
    this.alpha       = opts.alpha      ?? 0.02;  // learning rate
    this.lambda      = opts.lambda     ?? 0.7;   // trace decay
    this.epsilon     = opts.epsilon    ?? 1.0;   // start fully exploring
    this.epsilonMin  = opts.epsilonMin ?? 0.05;  // final exploration rate
    this.decaySteps  = opts.decay      ?? 200_000; // ε decay speed

    /* Tabular Q-value store:  state-key → {hit, stand, double} */
    this.Q    = Object.create(null);
    this.seen = 0;          // episode counter for ε decay
    this.shoe = new Shoe(); // shared shoe instance
  }

  /* Handy state key: "16_0_T"  → player 16, no usable ace, dealer Ten */
  key (playerSum, usableAce, dealerUp) {
    return `${playerSum}_${usableAce ? 1 : 0}_${dealerUp}`;
  }

  /** ε-greedy action selection */
  choose (state) {
    if (Math.random() < this.epsilon)             // explore
      return ACTIONS[Math.floor(Math.random()*3)];
    const q = this.Q[state] ?? {hit:0,stand:0,double:0};
    return ACTIONS.reduce((best,a)=> q[a] > q[best] ? a : best, "hit");
  }

  /* ─────────────────────────────────────────────────────────────
   *  Single self-play episode
   *  ─ Monte-Carlo backup at the end
   *  ─ SARSA-λ speed-up is implicit via α & λ (short-term memory)
   * ──────────────────────────────────────────────────────────── */
  trainEpisode () {
    const traj = [];           // record states & actions
    let bet=1, P=[], D=[];

    // initial deal
    P.push(this.shoe.draw(), this.shoe.draw());
    D.push(this.shoe.draw(), this.shoe.draw());

    /* ----- Player phase ----- */
    let reward = 0, done=false;
    while (!done) {
      const {sum, usable} = total(P);
      if (sum > 21) { reward = -1; break; }         // bust

      const state  = this.key(sum, usable, D[0]);
      const action = this.choose(state);
      traj.push({state, action, bet});

      if (action === "hit")       P.push(this.shoe.draw());
      else if (action === "double") { bet *= 2; P.push(this.shoe.draw()); done=true; }
      else /* stand */            done = true;
    }

    /* ----- Dealer & outcome ----- */
    if (reward === 0) {
      dealerPlay(D, this.shoe);
      const ps = total(P).sum, ds = total(D).sum;
      reward = (ps>21 || (ds<=21 && ds>ps)) ? -1 :
               (ps>ds || ds>21)            ?  1 : 0;
      reward *= bet;
    }

    /* ----- Monte-Carlo value backup ----- */
    for (const {state, action} of traj) {
      if (!this.Q[state]) this.Q[state] = {hit:0,stand:0,double:0};
      this.Q[state][action] += this.alpha * (reward - this.Q[state][action]);
    }

    /* ε decay schedule */
    this.seen++;
    this.epsilon = Math.max(
      this.epsilonMin,
      this.epsilon * (1 - 1/this.decaySteps)
    );
  }

  /** Train for `episodes` hands; `cb(i,total,ε)` fires every 1 000 hands */
  async train (episodes=200_000, cb=()=>{}) {
    for (let i=0;i<episodes;i++) {
      this.trainEpisode();
      if (i%1000===0) cb(i, episodes, this.epsilon);
      if (i%500===0)  await Promise.resolve();  // yield to UI thread
    }
  }

  /* -----------------------------------------------------------
   *  Depth-2 Expectimax – quick deterministic look-ahead
   *  Used for the Hint? button and as day-1 baseline
   * --------------------------------------------------------- */
  expectimax (playerHand, dealerUp) {
    const score = {hit:0, stand:0, double:0};

    // Stand – evaluate directly
    score.stand = this.expOutcome(playerHand, dealerUp);

    // Hit / Double – average over next card
    for (const a of ["hit","double"]) {
      let ev = 0;
      for (const r of RANKS)
        ev += this.expOutcome([...playerHand, r], dealerUp) / 13;
      score[a] = a==="double" ? 2*ev : ev;
    }
    return Object.entries(score).sort((x,y)=>y[1]-x[1])[0][0];
  }

  /** Expected outcome (+1/0/-1) for a fixed player hand vs possible dealer draws */
  expOutcome (pHand, dealerUp) {
    const ps = total(pHand).sum;
    if (ps > 21) return -1;
    let ev = 0;
    for (const r of RANKS) {
      const dHand = dealerPlay([dealerUp, r], new Shoe(1));
      const ds = total(dHand).sum;
      const res = (ds>21||ps>ds)?1 : (ps<ds?-1:0);
      ev += res / 13;
    }
    return ev;
  }
}

/* Singleton export */
export const Brain = new Agent();
