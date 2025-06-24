# Blackjack Brain 🎰  
*A Reinforcement-Learning Blackjack Agent (JavaScript + HTML + CSS)*

---

## Table of Contents
1. [Overview](#overview)  
2. [Features](#features)  
3. [How It Learns](#how-it-learns)  
4. [File Structure](#file-structure)  
5. [Getting Started](#getting-started)  
6. [License](#license)  

---

## Overview
**Blackjack Brain** is a browser-based Blackjack game that **keeps improving while you play**.  
The agent starts with no knowledge, explores millions of self-dealt hands, and gradually converges on a profitable strategy—all in plain vanilla JavaScript with no server or ML library required.

| Tech | Why |
|------|-----|
| **JavaScript (ES Modules)** | Single-page app, zero build tools. |
| **HTML + CSS** | Retro casino look via the *Press Start 2P* pixel font. |
| **Service-Worker** | Optional offline play—static files cached on first load. |

---

## Features
- 🎲 **Play vs. Latif** (the AI dealer) with **Hit / Stand / Double** buttons  
- 💰 Bet slider, live balance, and win/loss messages  
- 🧠 **RL Core**  
  - *On-Policy Monte-Carlo Control* (first-visit)  
  - *SARSA-λ* (eligibility traces, λ = 0.7)  
  - *ε-greedy exploration* with decay (1.0 → 0.05)  
- 🤖 **Depth-2 Expectimax** search for deterministic move advice (benchmark)  
- 📊 Console logs show training progress every 20 k hands  
- 🚀 One-click deployment on GitHub Pages; works offline as a PWA  

---

## How It Learns
| Algorithm | Role in Blackjack Brain |
|-----------|-------------------------|
| **Monte-Carlo Control** | Uses the final payoff of each hand to update Q-values—unbiased for this episodic game. |
| **SARSA-λ** | Updates after every action; eligibility traces credit recent decisions more strongly, accelerating learning. |
| **ε-greedy** | Manages exploration vs. exploitation; ε decays as experience grows. |
| **Expectimax (depth 2)** | Expands player actions one ply and dealer chance outcomes the next—provides a deterministic baseline. |

---

## File Structure
blackjack-brain/
│
├─ index.html # UI markup
├─ style.css # Retro casino styling
├─ game.js # DOM wiring & game loop
├─ agent.js # RL algorithms + card engine
│
├─ manifest.json # PWA metadata (optional)
├─ service-worker.js # Offline cache (optional)
└─ README.md


---

## Getting Started
```bash
# 1 · Clone the repo
git clone https://github.com/<your-user>/blackjack-brain.git
cd blackjack-brain

# 2 · Open locally (no build step)
open index.html   # macOS
#  or
start index.html  # Windows

Or go the games website: https://latifadel.github.io/blackjack-brain/


## License
MIT © 2025 Abdullatif Alabdullatif
Feel free to fork and remix—just keep a link back to this repo.
