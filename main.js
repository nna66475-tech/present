// Game Constants and Configurations
const CHARACTERS = {
    anzu: {
        name: '美影杏',
        difficulty: 'normal',
        tiki: 'anzu_tiki.gif',
        win: 'anzu_win.gif',
        lose: 'anzu_lose.gif'
    },
    ohasi: {
        name: '大橋理沙',
        difficulty: 'normal',
        tiki: 'ohasi_tiki.gif',
        win: 'ohasi_win.gif',
        lose: 'ohasi_lose.gif'
    },
    erina: {
        name: '吉良えりな',
        difficulty: 'easy',
        tiki: 'erina_tiki.gif',
        win: 'erina_win.gif',
        lose: 'erina_lose.gif'
    },
    numao: {
        name: '沼尾正',
        difficulty: 'hard',
        tiki: 'numao_tiki.gif',
        win: 'numao_win.gif',
        lose: 'numao_lose.gif'
    },
    yuki: {
        name: '宝木雪',
        difficulty: 'hard',
        tiki: 'yuki_tiki.gif',
        win: 'yuki_win.gif',
        lose: 'yuki_lose.gif'
    }
};

const CARDS_DATA = [
    'cards1.PNG', 'cards2.PNG', 'cards3.PNG', 'cards4.PNG',
    'cards5.PNG', 'cards6.PNG', 'cards7.PNG', 'cards8.PNG'
];

// Audio Elements
const bgm = document.getElementById('bgm');
const seSelect = document.getElementById('se-select');
const seClear = document.getElementById('se-clear');
const seDie = document.getElementById('se-die');

let bgmPlaying = false;
function playBGM() {
    if (!bgmPlaying) {
        bgm.play().catch(e => console.log("BGM waiting user action"));
        bgmPlaying = true;
    }
}
function stopBGM() {
    bgm.pause();
    bgm.currentTime = 0;
    bgmPlaying = false;
}

// State
let currentCharId = null;
let cards = [];
let flippedCards = [];
let playerScore = 0;
let cpuScore = 0;
let isPlayerTurn = true;
let canClick = true;
let cpuMemory = {}; 
/* cpuMemory format: { cardId: imageSrc } */

// Screen Transition
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.remove('fade-out');
        s.classList.remove('fade-in');
    });
    document.getElementById(screenId).classList.add('active');
}

function triggerRabbitTransition(onMidpoint) {
    const overlay = document.getElementById('transition-overlay');
    
    // Close the iris (Rabbit hole shrinks to 0)
    overlay.classList.add('closed');
    
    // Wait for close animation
    setTimeout(() => {
        if(onMidpoint) onMidpoint();
        
        // Open the iris
        overlay.classList.remove('closed');
    }, 700);
}

// 1. Title Screen -> Select Screen
document.getElementById('title-screen').addEventListener('click', () => {
    seSelect.play();
    playBGM();
    
    const title = document.getElementById('title-screen');
    title.classList.add('fade-out');
    
    setTimeout(() => {
        showScreen('select-screen');
    }, 500);
});

// 2. Character Select -> Pre Match
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        seSelect.play();
        const charId = card.getAttribute('data-char');
        currentCharId = charId;
        
        triggerRabbitTransition(() => {
            const char = CHARACTERS[charId];
            document.getElementById('tiki-gif').src = char.tiki;
            showScreen('pre-match-screen');
        });
    });
});

// 4. Pre Match -> Game
document.getElementById('start-match-btn').addEventListener('click', () => {
    seSelect.play();
    triggerRabbitTransition(() => {
        initGame();
        showScreen('game-screen');
    });
});

// Game Logic
function initGame() {
    const char = CHARACTERS[currentCharId];
    document.getElementById('cpu-name-display').textContent = char.name;
    
    playerScore = 0;
    cpuScore = 0;
    isPlayerTurn = true;
    canClick = true;
    flippedCards = [];
    cpuMemory = {};
    
    document.getElementById('player-score').textContent = '0';
    document.getElementById('cpu-score').textContent = '0';
    updateTurnDisplay();

    // Shuffle Deck
    const deck = [...CARDS_DATA, ...CARDS_DATA];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Render Board
    const board = document.getElementById('board');
    board.innerHTML = '';
    cards = deck.map((img, index) => {
        const slot = document.createElement('div');
        slot.className = 'card-slot';

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = index;
        card.dataset.img = img;

        const back = document.createElement('div');
        back.className = 'card-face card-back';

        const front = document.createElement('div');
        front.className = 'card-face card-front';
        
        const frontImg = document.createElement('img');
        frontImg.src = img;
        frontImg.className = 'card-front-img';
        front.appendChild(frontImg);

        card.appendChild(back);
        card.appendChild(front);
        slot.appendChild(card);
        board.appendChild(slot);

        card.addEventListener('click', () => handleCardClick(card));

        return card;
    });
}

function updateTurnDisplay() {
    const display = document.getElementById('turn-display');
    if (isPlayerTurn) {
        display.textContent = 'あなたのターン';
        display.className = 'turn-indicator player-turn';
    } else {
        const charName = CHARACTERS[currentCharId].name;
        display.textContent = `${charName}のターン`;
        display.className = 'turn-indicator cpu-turn';
    }
}

function handleCardClick(card) {
    if (!isPlayerTurn || !canClick || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    
    seSelect.currentTime = 0;
    seSelect.play();
    
    flipCard(card);
    flippedCards.push(card);

    if (flippedCards.length === 2) {
        canClick = false;
        checkMatch();
    }
}

function flipCard(card) {
    card.classList.add('flipped');
    cpuMemory[card.dataset.id] = card.dataset.img;
}

function checkMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.img === card2.dataset.img;

    setTimeout(() => {
        if (isMatch) {
            // Match success
            card1.classList.add('matched');
            card2.classList.add('matched');
            delete cpuMemory[card1.dataset.id];
            delete cpuMemory[card2.dataset.id];

            if (isPlayerTurn) {
                playerScore++;
                document.getElementById('player-score').textContent = playerScore;
            } else {
                cpuScore++;
                document.getElementById('cpu-score').textContent = cpuScore;
            }

            flippedCards = [];
            if (checkGameOver()) {
                endGame();
            } else {
                canClick = isPlayerTurn;
                if (!isPlayerTurn) {
                    setTimeout(cpuTurn, 800);
                }
            }
        } else {
            // Match fail
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            
            isPlayerTurn = !isPlayerTurn;
            updateTurnDisplay();

            if (!isPlayerTurn) {
                setTimeout(cpuTurn, 800);
            } else {
                canClick = true;
            }
        }
    }, 1000);
}

function checkGameOver() {
    return cards.every(card => card.classList.contains('matched'));
}

// CPU Logic
function cpuTurn() {
    if (checkGameOver()) return;

    const availableCards = cards.filter(c => !c.classList.contains('matched'));
    let choice1 = null;
    let choice2 = null;
    
    const difficulty = CHARACTERS[currentCharId].difficulty;
    
    // CPU Memory forget rate based on difficulty
    let memoryChance = 0.5; // normal
    if (difficulty === 'easy') memoryChance = 0.2;
    if (difficulty === 'hard') memoryChance = 0.9;

    let foundPair = null;
    const memoryIds = Object.keys(cpuMemory);
    
    // Check if CPU knows a pair in memory
    for (let i = 0; i < memoryIds.length; i++) {
        for (let j = i + 1; j < memoryIds.length; j++) {
            const id1 = memoryIds[i];
            const id2 = memoryIds[j];
            if (cpuMemory[id1] === cpuMemory[id2] && id1 !== id2) {
                const c1 = cards[id1];
                const c2 = cards[id2];
                if (!c1.classList.contains('matched') && !c2.classList.contains('matched')) {
                    foundPair = [c1, c2];
                    break;
                }
            }
        }
        if (foundPair) break;
    }

    if (foundPair && Math.random() < memoryChance) {
        // CPU acts on known pair
        choice1 = foundPair[0];
        choice2 = foundPair[1];
    } else {
        // Pick first card randomly
        choice1 = availableCards[Math.floor(Math.random() * availableCards.length)];
        
        // After picking first card, check if its match is in memory
        let knownMatch = null;
        for (let id in cpuMemory) {
            if (id !== choice1.dataset.id && cpuMemory[id] === choice1.dataset.img) {
                const potentialMatch = cards[id];
                if (!potentialMatch.classList.contains('matched')) {
                    knownMatch = potentialMatch;
                    break;
                }
            }
        }

        if (knownMatch && Math.random() < memoryChance) {
            choice2 = knownMatch;
        } else {
            // Pick second card randomly
            const remaining = availableCards.filter(c => c.dataset.id !== choice1.dataset.id);
            choice2 = remaining[Math.floor(Math.random() * remaining.length)];
        }
    }

    seSelect.currentTime = 0;
    seSelect.play();
    flipCard(choice1);
    flippedCards.push(choice1);

    setTimeout(() => {
        seSelect.currentTime = 0;
        seSelect.play();
        flipCard(choice2);
        flippedCards.push(choice2);
        checkMatch();
    }, 800);
}

// End Game & Results
function endGame() {
    stopBGM();
    
    const char = CHARACTERS[currentCharId];
    
    setTimeout(() => {
        // Player won if playerScore > cpuScore
        // User requested: "杏に勝利した場合、anzu_lose.gif... 敗北した場合、anzu_win.gif..."
        if (playerScore >= cpuScore) { // Player Win
            seClear.play();
            document.getElementById('result-gif').src = char.lose; // CPU loses
            document.getElementById('result-moji').src = 'moji_win.PNG';
            document.getElementById('retry-btn').textContent = 'もう一度対戦してあげる';
        } else { // Player Lose
            seDie.play();
            document.getElementById('result-gif').src = char.win; // CPU wins
            document.getElementById('result-moji').src = 'moji_lose.PNG';
            document.getElementById('retry-btn').textContent = 'もう一度対戦してもらう';
        }
        
        triggerRabbitTransition(() => {
            showScreen('result-screen');
        });
    }, 800);
}

// Result screen buttons
document.getElementById('retry-btn').addEventListener('click', () => {
    seSelect.play();
    if(playerScore >= cpuScore) {
        // if player won, playing again might restart BGM if needed?
        // Wait, user wants BGM "常に流す" (always play) but we stopped it in endGame to play jingle.
        // So we restart BGM here.
    }
    playBGM();
    
    triggerRabbitTransition(() => {
        showScreen('pre-match-screen');
    });
});

document.getElementById('home-btn').addEventListener('click', () => {
    seSelect.play();
    playBGM();
    
    triggerRabbitTransition(() => {
        showScreen('select-screen');
    });
});
