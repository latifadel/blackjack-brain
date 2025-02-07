const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let betAmount = 0;
let deck = [];
let gameActive = false;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", placeBet);
    });

    document.getElementById("deal-button").addEventListener("click", startGame);
    document.getElementById("hit-button").addEventListener("click", playerHit);
    document.getElementById("stand-button").addEventListener("click", dealerPlay);
    document.getElementById("restart-button").addEventListener("click", restartGame);

    updateBetUI();
});

// Handle betting
function placeBet() {
    if (gameActive) return;
    let value = parseInt(this.getAttribute("data-value"));
    if (balance >= value) {
        betAmount += value;
        balance -= value;
        updateBetUI();
        document.getElementById("deal-button").disabled = false;
    }
}

// Start game
function startGame() {
    if (betAmount <= 0) {
        alert("You must place a bet first!");
        return;
    }

    resetHands();
    deck = createDeck();
    shuffleDeck(deck);

    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];

    gameActive = true;
    updateGameUI(false);

    document.getElementById("deal-button").disabled = true;
    document.getElementById("hit-button").disabled = false;
    document.getElementById("stand-button").disabled = false;
}

// Deck functions
function createDeck() {
    let newDeck = [];
    for (let suit of suits) {
        for (let value of values) {
            newDeck.push({ suit, value });
        }
    }
    return newDeck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard() {
    return deck.pop();
}

// Player actions
function playerHit() {
    if (!gameActive) return;
    playerHand.push(drawCard());
    updateGameUI(false);

    if (calculateScore(playerHand) > 21) {
        balance -= betAmount;
        endGame("Bust! You lose.");
    }
}

function dealerPlay() {
    if (!gameActive) return;
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }
    determineWinner();
}

// Calculate winner
function determineWinner() {
    updateGameUI(true);
    let playerScore = calculateScore(playerHand);
    let dealerScore = calculateScore(dealerHand);

    if (dealerScore > 21 || playerScore > dealerScore) {
        balance += betAmount * 2;
        endGame("You win!");
    } else if (playerScore < dealerScore) {
        balance -= betAmount;
        endGame("Latif wins!");
    } else {
        endGame("It's a tie!");
    }
}

// End game
function endGame(message) {
    document.getElementById("message").textContent = message;
    document.getElementById("balance").textContent = balance;
    gameActive = false;
    betAmount = 0;
    updateBetUI();
}

// Restart game
function restartGame() {
    balance = 1000;
    betAmount = 0;
    document.getElementById("message").textContent = "Game Restarted!";
    resetHands();
    updateBetUI();
}

// Update UI functions
function updateGameUI(showDealerFullHand) {
    document.getElementById("player-score").textContent = calculateScore(playerHand);
    document.getElementById("dealer-score").textContent = showDealerFullHand ? calculateScore(dealerHand) : "?";
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;

    hand.forEach(card => {
        if (card.value === "A") {
            aces++;
            score += 11;
        } else if (["J", "Q", "K"].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    });

    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function updateBetUI() {
    document.getElementById("bet-amount").textContent = betAmount;
    document.getElementById("balance").textContent = balance;
}
