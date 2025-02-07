const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let betAmount = 0;
let deck = [];
let gameActive = false;

// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("deal-button").addEventListener("click", startGame);
    document.getElementById("hit-button").addEventListener("click", playerHit);
    document.getElementById("stand-button").addEventListener("click", dealerPlay);
    document.getElementById("restart-button").addEventListener("click", restartGame);
    
    // Betting chips event listener
    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", function () {
            if (gameActive) return; // Prevent betting after game starts
            let value = parseInt(this.getAttribute("data-value"));
            if (balance >= value) {
                betAmount += value;
                balance -= value;
                updateBetUI();
                document.getElementById("deal-button").disabled = false;
            }
        });
    });

    updateBetUI();
});

// Start the game
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

// Create a deck of cards
function createDeck() {
    let newDeck = [];
    for (let suit of suits) {
        for (let value of values) {
            newDeck.push({ suit, value });
        }
    }
    return newDeck;
}

// Shuffle the deck
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Draw a card
function drawCard() {
    return deck.pop();
}

// Calculate hand score
function calculateScore(hand) {
    let score = 0;
    let aceCount = 0;

    hand.forEach(card => {
        if (card.value === "A") {
            aceCount++;
            score += 11;
        } else if (["J", "Q", "K"].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    });

    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }

    return score;
}

// Player chooses to hit
function playerHit() {
    if (!gameActive) return;
    
    playerHand.push(drawCard());
    updateGameUI(false);

    if (calculateScore(playerHand) > 21) {
        balance -= betAmount;
        endGame("Bust! You lose.");
    }
}

// Dealer's turn after player stands
function dealerPlay() {
    if (!gameActive) return;

    document.getElementById("hit-button").disabled = true;
    document.getElementById("stand-button").disabled = true;

    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }

    determineWinner();
}

// Determine game winner
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

// End the game and disable buttons
function endGame(message) {
    document.getElementById("message").textContent = message;
    document.getElementById("balance").textContent = balance;

    document.getElementById("deal-button").disabled = false;
    document.getElementById("hit-button").disabled = true;
    document.getElementById("stand-button").disabled = true;
    gameActive = false;
    betAmount = 0;
    updateBetUI();
}

// Restart the game
function restartGame() {
    balance = 1000;
    betAmount = 0;
    document.getElementById("balance").textContent = balance;
    document.getElementById("message").textContent = "Game Restarted!";
    resetHands();
    updateBetUI();
}

// Reset hands
function resetHands() {
    playerHand = [];
    dealerHand = [];
    document.getElementById("player-cards").innerHTML = "";
    document.getElementById("dealer-cards").innerHTML = "";
}

// Update game UI
function updateGameUI(showDealerFullHand) {
    displayCards("player-cards", playerHand);
    displayCards("dealer-cards", dealerHand, !showDealerFullHand);

    document.getElementById("player-score").textContent = calculateScore(playerHand);
    document.getElementById("dealer-score").textContent = showDealerFullHand ? calculateScore(dealerHand) : "?";
}

// Display cards dynamically
function displayCards(elementId, hand, hideFirst = false) {
    let cardContainer = document.getElementById(elementId);
    cardContainer.innerHTML = "";

    hand.forEach((card, index) => {
        let cardElement = document.createElement("div");
        cardElement.classList.add("card");
        if (["♥", "♦"].includes(card.suit)) {
            cardElement.classList.add("red");
        }
        cardElement.textContent = hideFirst && index === 0 ? "?" : `${card.value}${card.suit}`;
        cardContainer.appendChild(cardElement);
    });
}

// Update bet and balance UI
function updateBetUI() {
    document.getElementById("bet-amount").textContent = betAmount;
    document.getElementById("balance").textContent = balance;
}


