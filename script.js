const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let betAmount = 0;
let deck = [];
let gameActive = false;

// Add event listeners for both "click" and "touchstart" to ensure mobile compatibility
document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-game");
    startButton.addEventListener("click", showGameScreen);
    startButton.addEventListener("touchstart", showGameScreen);  // Fix for iPhone

    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", placeBet);
        chip.addEventListener("touchstart", placeBet);  // Fix for iPhone
    });

    document.getElementById("deal-button").addEventListener("click", startGame);
    document.getElementById("deal-button").addEventListener("touchstart", startGame);  // Fix for iPhone

    document.getElementById("hit-button").addEventListener("click", playerHit);
    document.getElementById("hit-button").addEventListener("touchstart", playerHit);  // Fix for iPhone

    document.getElementById("stand-button").addEventListener("click", dealerPlay);
    document.getElementById("stand-button").addEventListener("touchstart", dealerPlay);  // Fix for iPhone

    document.getElementById("restart-button").addEventListener("click", restartGame);
    document.getElementById("restart-button").addEventListener("touchstart", restartGame);  // Fix for iPhone

    updateBetUI();
});

// Show the game screen and hide the home screen
function showGameScreen(event) {
    event.preventDefault();  // Prevent double execution on touch devices
    document.getElementById("home-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
}

// Handle chip betting
function placeBet(event) {
    event.preventDefault();  // Prevent double execution on iPhone

    if (gameActive) return;

    let value = parseInt(this.getAttribute("data-value"));
    if (balance >= value) {
        betAmount += value;
        balance -= value;
        updateBetUI();
        document.getElementById("deal-button").disabled = false;
    }
}

// Start the game
function startGame(event) {
    event.preventDefault();

    if (betAmount <= 0) {
        alert("You must place a bet before dealing!");
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

// Create and shuffle deck functions remain unchanged
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

// Draw a card
function drawCard() {
    return deck.pop();
}

// Player hits
function playerHit(event) {
    event.preventDefault();

    if (!gameActive) return;
    playerHand.push(drawCard());
    updateGameUI(false);

    if (calculateScore(playerHand) > 21) {
        balance -= betAmount;
        endGame("Bust! You lose.");
    }
}

// Dealer plays
function dealerPlay(event) {
    event.preventDefault();

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
function restartGame(event) {
    event.preventDefault();

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


