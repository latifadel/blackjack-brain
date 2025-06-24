/* Blackjack Brain – RL core */

export const ACTIONS = ["hit","stand","double"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const VALUES = Object.fromEntries(RANKS.map(r=>[r,r==="A"?11:["T","J","Q","K"].includes(r)?10:+r]));

class Shoe{
  constructor(decks=6){this.decks=decks;this.reset();}
  reset(){this.cards=[];for(let d=0;d<this.decks;d++)for(const r of RANKS)for(let s=0;s<4;s++)this.cards.push(r);
    for(let i=this.cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]];}
  }
  draw(){if(!this.cards.length)this.reset();return this.cards.pop();}
}

/* --- helpers --- */
export function total(hand){
  let s=hand.reduce((a,c)=>a+VALUES[c],0), aces=hand.filter(c=>c==="A").length;
  while(s>21 && aces){s-=10;aces--;}
  return {sum:s,usable:hand.includes("A")&&s<=11};
}
export function dealerPlay(hand,shoe){
  while(true){
    const {sum,usable}=total(hand);
    if(sum<17 || (sum===17 && usable)) hand.push(shoe.draw()); else break;
  }
  return hand;
}

/* --- RL Agent --- */
export class Agent{
  constructor({alpha=0.02,lambda=0.7,epsilon=1.0,epsilonMin=0.05,decay=2e5}={}){
    this.Q={}; this.alpha=alpha; this.lambda=lambda;
    this.epsilon=epsilon; this.epsilonMin=epsilonMin; this.decay=decay;
    this.shoe=new Shoe(); this.seen=0;
  }
  key(sum,usable,up){return `${sum}_${usable?1:0}_${up}`;}

  choose(state,explore=true){
    if(explore && Math.random()<this.epsilon) return ACTIONS[Math.floor(Math.random()*3)];
    const q=this.Q[state]||{hit:0,stand:0,double:0};
    return ACTIONS.reduce((best,a)=>q[a]>q[best]?a:best,'hit');
  }

  trainEpisode(){
    const traj=[]; let bet=1, P=[], D=[];
    P.push(this.shoe.draw(),this.shoe.draw()); D.push(this.shoe.draw(),this.shoe.draw());
    let reward=0, done=false;

    while(!done){
      const {sum,usable}=total(P);
      if(sum>21){reward=-1;break;}
      const state=this.key(sum,usable,D[0]);
      const action=this.choose(state);
      traj.push({state,action,bet});
      if(action==="hit")P.push(this.shoe.draw());
      else if(action==="double"){bet*=2;P.push(this.shoe.draw());done=true;}
      else done=true;
    }
    if(reward===0){
      dealerPlay(D,this.shoe);
      const ps=total(P).sum, ds=total(D).sum;
      reward = (ps>21|| (ds<=21&&ds>ps))? -1 : (ps>ds||ds>21)? 1 : 0;
      reward*=bet;
    }

    for(const {state,action} of traj){
      if(!this.Q[state]) this.Q[state]={hit:0,stand:0,double:0};
      this.Q[state][action]+= this.alpha*(reward - this.Q[state][action]);
    }

    this.seen++; this.epsilon=Math.max(this.epsilonMin,this.epsilon*(1-1/this.decay));
  }

  async train(episodes=200000,onProgress){
    for(let i=0;i<episodes;i++){
      this.trainEpisode();
      if(onProgress && i%1000===0) onProgress(i,episodes,this.epsilon);
      if(i%500===0) await Promise.resolve(); // yield to UI
    }
  }

  /* Depth-2 Expectimax */
  expectimax(player,dealerUp){
    const scores={hit:0,stand:0,double:0};
    // stand outcome
    scores.stand = this.expOutcome(player,dealerUp);
    // hit & double outcomes
    for(const a of ["hit","double"]){
      let v=0; for(const r of RANKS) v += this.expOutcome([...player,r],dealerUp)/13;
      scores[a]=a==="double"?2*v:v;
    }
    return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  }
  expOutcome(p,dealerUp){
    const ps=total(p).sum; if(ps>21) return -1;
    let ev=0;
    for(const r of RANKS){
      const d=[dealerUp,r]; dealerPlay(d,new Shoe(1));
      const ds=total(d).sum;
      const res=(ds>21||ps>ds)?1 : (ps<ds?-1:0);
      ev+=res/13;
    }
    return ev;
  }
}

export const Brain = new Agent();
