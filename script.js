let balance = 1000;
let betAmount = 0;
let playerHand = [];
let dealerHand = [];
let deck = [];

document.getElementById("start-game").addEventListener("click", () => {
    document.getElementById("home-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
});

document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", function() {
        let value = parseInt(this.getAttribute("data-value"));
        if (balance >= value) {
            betAmount += value;
            balance -= value;
            updateBetUI();
        }
    });
});

document.getElementById("deal-button").addEventListener("click", startGame);
document.getElementById("hit-button").addEventListener("click", playerHit);
document.getElementById("stand-button").addEventListener("click", dealerPlay);
document.getElementById("restart-button").addEventListener("click", restartGame);

function startGame() {
    if (betAmount <= 0) {
        alert("Place a bet first!");
        return;
    }

    deck = createDeck();
    shuffleDeck(deck);

    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];

    updateGameUI();

    document.getElementById("deal-button").disabled = true;
    document.getElementById("hit-button").disabled = false;
    document.getElementById("stand-button").disabled = false;
}

function createDeck() {
    let suits = ["♠", "♥", "♦", "♣"];
    let values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
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

function playerHit() {
    playerHand.push(drawCard());
    updateGameUI();

    if (calculateScore(playerHand) > 21) {
        endGame("Bust! You lose.");
    }
}

function dealerPlay() {
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }
    updateGameUI();
    determineWinner();
}

function determineWinner() {
    let playerScore = calculateScore(playerHand);
    let dealerScore = calculateScore(dealerHand);

    if (dealerScore > 21 || playerScore > dealerScore) {
        endGame("You win!");
    } else {
        endGame("Dealer wins!");
    }
}

function endGame(message) {
    document.getElementById("message").textContent = message;
    document.getElementById("hit-button").disabled = true;
    document.getElementById("stand-button").disabled = true;
}

function restartGame() {
    balance = 1000;
    betAmount = 0;
    updateBetUI();
}

