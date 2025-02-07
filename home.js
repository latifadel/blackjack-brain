document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-game");
    startButton.addEventListener("click", () => {
        document.getElementById("home-screen").classList.add("hidden");
        document.getElementById("game-screen").classList.remove("hidden");
    });
});


