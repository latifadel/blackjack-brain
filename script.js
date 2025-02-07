const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let betAmount = 100;
let deck = [];
document.getElementById("deal-button").addEventListener("click", startGame);
document.getElementById("hit-button").addEventListener("click", playerHit);
document.getElementById("stand-button").addEventListener("click", dealerPlay);
document.getElementById("restart-button").addEventListener("click", restartGame);
function startGame() {
    betAmount = parseInt(document.getElementById("bet-amount").value);
    if (betAmount > balance || betAmount <= 0) {
        alert("Invalid bet amount.");
        return;
    }
    deck = createDeck();
    shuffleDeck(deck);
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];
    updateGameUI(false);
    document.getElementById("deal-button").disabled = true;
    document.getElementById("hit-button").disabled = false;
    document.getElementById("stand-button").disabled = false;
}
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
function calculateScore(hand) {
    let score = 0;
    let aceCount = 0;
    hand.forEach(card => {
        if (card.value === "A") {
            aceCount += 1;
            score += 11;
        } else if (["J", "Q", "K"].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    });
    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount -= 1;
    }
    return score;
}
function updateGameUI(showDealerFullHand) {
    displayCards("player-cards", playerHand);
    displayCards("dealer-cards", dealerHand, !showDealerFullHand);
    let playerScore = calculateScore(playerHand);
    let dealerScore = calculateScore(dealerHand);
    document.getElementById("player-score").textContent = playerScore;
    document.getElementById("dealer-score").textContent = showDealerFullHand ? dealerScore : "?";
}
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
function playerHit() {
    playerHand.push(drawCard());
    updateGameUI(false);
    if (calculateScore(playerHand) > 21) {
        balance -= betAmount;
        endGame("Bust! You lose.");
    }
}
function dealerPlay() {
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }
    determineWinner();
}
function determineWinner() {
    updateGameUI(true);
    let playerScore = calculateScore(playerHand);
    let dealerScore = calculateScore(dealerHand);
    if (dealerScore > 21 || playerScore > dealerScore) {
        balance += betAmount;
        endGame("You win!");
    } else if (playerScore < dealerScore) {
        balance -= betAmount;
        endGame("Latif wins!");
    } else {
        endGame("It's a tie!");
    }
}
function endGame(message) {
    document.getElementById("message").textContent = message;
    document.getElementById("balance").textContent = balance;
    document.getElementById("deal-button").disabled = false;
    document.getElementById("hit-button").disabled = true;
    document.getElementById("stand-button").disabled = true;
}
function restartGame() {
    balance = 1000;
    document.getElementById("balance").textContent = balance;
    document.getElementById("message").textContent = "Game Restarted!";
}
