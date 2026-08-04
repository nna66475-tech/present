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
    },
    tanabe: {
        name: '田辺歩',
        difficulty: 'normal',
        tiki: '',
        win: '',
        lose: ''
    },
    takebayashi: {
        name: '竹林蓮',
        difficulty: 'extreme', // will map to memoryChance=0.99
        tiki: '',
        win: '',
        lose: ''
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
let tanabeWinCount = 0;

// Takebayashi state
let tbPhase = 'first';  // 'first' = 1st battle, 'second' = 2nd battle (mid-game prank prompt), 'third' = 3rd battle (hard battle after prank)
let tbDidPrank = false;
let tbHasPromptedPrank = false;

// VN System Variables
let currentVnSequence = [];
let currentVnIndex = 0;
let onVnComplete = null;
let isTyping = false;
let typingTimeout = null;

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

// Hidden NPC Button
document.getElementById('hidden-npc-btn').addEventListener('click', () => {
    seSelect.play();
    triggerRabbitTransition(() => {
        document.getElementById('hidden-npc-input').value = '';
        document.getElementById('hidden-npc-result').style.display = 'none';
        showScreen('hidden-npc-screen');
    });
});

// Hidden NPC Back
document.getElementById('hidden-npc-back').addEventListener('click', () => {
    seSelect.play();
    triggerRabbitTransition(() => {
        showScreen('select-screen');
    });
});

// Hidden NPC Submit
function handleHiddenNpcSubmit() {
    seSelect.play();
    const rawInput = document.getElementById('hidden-npc-input').value;
    const input = rawInput.trim().replace(/[\s\u3000]+/g, '');
    const resultDiv = document.getElementById('hidden-npc-result');
    const tanbeCard = document.getElementById('tanabe-char-card');
    const tbCard = document.getElementById('takebayashi-char-card');

    if (input === '田辺歩' || input === '大村翼' || input === '田辺' || input === '大村') {
        tanbeCard.style.display = 'flex';
        tbCard.style.display = 'none';
        resultDiv.style.display = 'block';
    } else if (input === '竹林蓮' || input === '竹林' || input === '蓮' || input.toLowerCase() === 'takebayashi' || input === 'たけばやしれん' || input === 'たけばやし') {
        tanbeCard.style.display = 'none';
        tbCard.style.display = 'flex';
        resultDiv.style.display = 'block';
    } else {
        tanbeCard.style.display = 'none';
        tbCard.style.display = 'none';
        resultDiv.style.display = 'none';
    }
}

document.getElementById('hidden-npc-submit').addEventListener('click', handleHiddenNpcSubmit);

// Enter key press support for hidden-npc-input
document.getElementById('hidden-npc-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleHiddenNpcSubmit();
    }
});

// Tanabe Card Click
document.getElementById('tanabe-char-card').addEventListener('click', () => {
    seSelect.play();
    currentCharId = 'tanabe';
    tanabeWinCount = 0; // Reset win count when starting fresh
    
    const preMatchSeq = [
        { text: 'は？なぜ俺が神経衰弱を？', img: 'tanabe_ha_ake.PNG' },
        { text: 'やらない', img: 'tanabe_magao_ake.PNG' },
        { text: '子供がやる遊びだろ', img: 'tanabe_sune.PNG' },
        { text: 'は？なんで他のやつとやるんだ', img: 'tanabe_ira.PNG' },
        { text: 'チッ……しょうがない……', img: 'tanabe_tojime.PNG' },
        { text: 'お前を負かすのは……', img: 'tanabe_tojime.PNG' },
        { text: '俺だけだ', img: 'tanabe_ha_ake.PNG' }
    ];
    
    triggerRabbitTransition(() => {
        playVnSequence(preMatchSeq, () => {
            // After dialogue, start match directly
            initGame();
            showScreen('game-screen');
        });
    });
});

// VN System Logic
function playVnSequence(sequence, onCompleteCallback) {
    if (typingTimeout) clearTimeout(typingTimeout);
    isTyping = false;
    currentVnSequence = sequence;
    currentVnIndex = 0;
    onVnComplete = onCompleteCallback;
    // Hide all choice panels
    document.getElementById('vn-choices').style.display = 'none';
    document.getElementById('vn-tb-start').style.display = 'none';
    document.getElementById('vn-tb-prank').style.display = 'none';
    document.getElementById('vn-click-indicator').style.display = 'block';
    // Hide tiki, show character img
    document.getElementById('vn-tiki-img').style.display = 'none';
    document.getElementById('vn-character-img').style.display = 'block';
    showScreen('vn-screen');
    showNextVnDialogue();
}

// Same as playVnSequence but calls onPauseCallback at end (doesn't auto-complete)
function playVnSequenceWithPause(sequence, onPauseCallback) {
    if (typingTimeout) clearTimeout(typingTimeout);
    isTyping = false;
    currentVnSequence = sequence;
    currentVnIndex = 0;
    onVnComplete = onPauseCallback; // treated as pause point
    document.getElementById('vn-choices').style.display = 'none';
    document.getElementById('vn-tb-start').style.display = 'none';
    document.getElementById('vn-tb-prank').style.display = 'none';
    document.getElementById('vn-click-indicator').style.display = 'block';
    document.getElementById('vn-tiki-img').style.display = 'none';
    document.getElementById('vn-character-img').style.display = 'block';
    showScreen('vn-screen');
    showNextVnDialogue();
}

function safeSetSrc(imgEl, src) {
    if (!imgEl) return;
    imgEl.style.visibility = 'visible';
    imgEl.src = src;
    imgEl.onerror = function() {
        if (this.src.endsWith('.PNG')) {
            this.src = this.src.replace(/\.PNG$/, '.png');
        } else if (this.src.endsWith('.png')) {
            this.src = this.src.replace(/\.png$/, '.PNG');
        } else {
            this.style.visibility = 'hidden';
        }
    };
}

function showNextVnDialogue() {
    if (typingTimeout) clearTimeout(typingTimeout);
    isTyping = false;

    if (currentVnIndex >= currentVnSequence.length) {
        if (onVnComplete) onVnComplete();
        return;
    }
    
    const step = currentVnSequence[currentVnIndex];
    safeSetSrc(document.getElementById('vn-character-img'), step.img);
    const textBox = document.getElementById('vn-text');
    textBox.textContent = '';
    
    isTyping = true;
    let charIndex = 0;
    
    function typeChar() {
        if (charIndex < step.text.length) {
            textBox.textContent += step.text.charAt(charIndex);
            charIndex++;
            typingTimeout = setTimeout(typeChar, 50); // Typewriter speed
        } else {
            isTyping = false;
        }
    }
    typeChar();
}

document.getElementById('vn-dialogue-box').addEventListener('click', () => {
    // If any choices are showing, don't allow advancing by clicking the box
    const choicesShowing = [
        document.getElementById('vn-choices'),
        document.getElementById('vn-tb-start'),
        document.getElementById('vn-tb-prank')
    ].some(el => el.style.display === 'flex');
    if (choicesShowing) return;

    if (isTyping) {
        // Skip typing
        clearTimeout(typingTimeout);
        isTyping = false;
        document.getElementById('vn-text').textContent = currentVnSequence[currentVnIndex].text;
    } else {
        // Next dialogue
        seSelect.play();
        currentVnIndex++;
        showNextVnDialogue();
    }
});

// =====================================
// TAKEBAYASHI LOGIC
// =====================================

// Takebayashi Card Click
document.getElementById('takebayashi-char-card').addEventListener('click', () => {
    seSelect.play();
    currentCharId = 'takebayashi';
    tbPhase = 'first';
    tbDidPrank = false;
    tbHasPromptedPrank = false;

    // Pre-match dialogue (1-8), then show 対戦する button
    const preMatchSeq = [
        { text: '………', img: 'taiki.gif' },
        { text: '………は？', img: 'paku1.PNG' },
        { text: '神経衰弱？', img: 'paku1.PNG' },
        { text: 'お前が…？', img: 'paku3.PNG' },
        { text: '俺と？', img: 'paku3.PNG' },
        { text: 'バカも休み休み言ったらどうだ', img: 'wara.PNG' },
        { text: 'でも……そうだな', img: 'metumuri.PNG' },
        { text: '俺が勝ったら土下座するってんなら', img: 'wara.PNG' },
        { text: '考えてやるけど', img: 'wara.PNG' }
    ];

    triggerRabbitTransition(() => {
        // Show pre-match sequence, then pause for "対戦する" button
        playVnSequenceWithPause(preMatchSeq, () => {
            // Pause: show the 対戦する button
            document.getElementById('vn-tb-start').style.display = 'flex';
            document.getElementById('vn-click-indicator').style.display = 'none';
        });
    });
});

// "対戦する" mid-VN button for Takebayashi
document.getElementById('vn-tb-start-btn').addEventListener('click', () => {
    seSelect.play();
    document.getElementById('vn-tb-start').style.display = 'none';
    document.getElementById('vn-click-indicator').style.display = 'block';

    // Play line 9 then wait for player tap to trigger iris out -> game
    const lastSeq = [
        { text: '終わってから後悔するなよ', img: 'metumuri.PNG' }
    ];
    playVnSequence(lastSeq, () => {
        triggerRabbitTransition(() => {
            playBGM();
            initGame();
            showScreen('game-screen');
        });
    });
});

// Mid-game Prank Modal Buttons (Match 2)
document.getElementById('prank-yes-btn').addEventListener('click', () => {
    seSelect.play();
    document.getElementById('prank-modal').style.display = 'none';
    tbDidPrank = true;
    stopBGM();
    triggerRabbitTransition(() => {
        startDekopinSequence();
    });
});

document.getElementById('prank-no-btn').addEventListener('click', () => {
    seSelect.play();
    document.getElementById('prank-modal').style.display = 'none';
    tbDidPrank = false;
    // Resume match 2 (CPU continues to finish match)
    if (checkGameOver()) {
        endGame();
    } else {
        canClick = isPlayerTurn;
        if (!isPlayerTurn) {
            setTimeout(cpuTurn, 800);
        }
    }
});

// --- Dekopin Sequence ---
let dekopinStep = 0;

function startDekopinSequence() {
    dekopinStep = 0;
    safeSetSrc(document.getElementById('dekopin-bg'), 'cardbayasi1.PNG');
    // Remove any existing dialogue box
    const oldBox = document.querySelector('.dekopin-dialogue-box');
    if (oldBox) oldBox.remove();
    showScreen('dekopin-screen');
}

document.getElementById('dekopin-screen').addEventListener('click', () => {
    seSelect.play();
    if (dekopinStep === 0) {
        // Tap 1: cardbayasi1 → cardbayasi2
        safeSetSrc(document.getElementById('dekopin-bg'), 'cardbayasi2.PNG');
        dekopinStep = 1;
    } else if (dekopinStep === 1) {
        // Tap 2: cardbayasi2 → cardbayasi3, dialogue appears
        safeSetSrc(document.getElementById('dekopin-bg'), 'cardbayasi3.PNG');
        dekopinStep = 2;
        // Show dialogue box
        showDekopinDialogue('お前とはもう二度とやらない');
    } else if (dekopinStep === 2) {
        // Tap on dialogue: transition to okoru2 screen in VN
        triggerRabbitTransition(() => {
            // Show okoru2 first (………), then long angry dialogue
            const angrySeq = [
                { text: '………', img: 'okoru2.PNG' },
                { text: 'やらない', img: 'okoru1.PNG' },
                { text: 'どっかいけ', img: 'okoru1.PNG' },
                { text: 'お前なんか嫌いだ', img: 'okoru1.PNG' },
                { text: '知らない', img: 'okoru1.PNG' },
                { text: 'しつこい', img: 'okoru1.PNG' },
                { text: '嫌いだ', img: 'okoru1.PNG' },
                { text: '鬱陶しい', img: 'okoru1.PNG' },
                { text: '死んだほうがいいんじゃないか', img: 'okoru1.PNG' },
                { text: 'あの時イゴーロナクに殺されてればよかったのに', img: 'okoru1.PNG' },
                { text: 'やらないって言ってるだろ', img: 'okoru1.PNG' },
                { text: '……', img: 'okoru2.PNG' },
                { text: '……………', img: 'okoru2.PNG' },
                { text: '………………', img: 'okoru2.PNG' },
                { text: '……はぁ', img: 'okoru1.PNG' },
                { text: 'この一回やったら二度とやらないからな', img: 'okoru1.PNG' },
                { text: 'お前が負けたら土下座と追加でデコピンだから', img: 'okoru1.PNG' }
            ];
            playVnSequenceWithPause(angrySeq, () => {
                // After last line, show start button
                document.getElementById('vn-tb-start').style.display = 'flex';
                document.getElementById('vn-click-indicator').style.display = 'none';
                
                // Override the start button to display last line and wait for tap before starting match 3
                document.getElementById('vn-tb-start-btn').onclick = () => {
                    seSelect.play();
                    document.getElementById('vn-tb-start').style.display = 'none';
                    document.getElementById('vn-click-indicator').style.display = 'block';
                    tbPhase = 'third';

                    const finalSeq = [
                        { text: '終わってから後悔するなよ', img: 'metumuri.PNG' }
                    ];
                    playVnSequence(finalSeq, () => {
                        triggerRabbitTransition(() => {
                            playBGM();
                            initGame();
                            showScreen('game-screen');
                        });
                    });
                };
            });
        });
    }
});

function showDekopinDialogue(text) {
    let box = document.querySelector('.dekopin-dialogue-box');
    if (!box) {
        box = document.createElement('div');
        box.className = 'dekopin-dialogue-box';
        box.innerHTML = `
            <div class="vn-text" id="dekopin-vn-text"></div>
            <div class="vn-click-indicator">▼</div>
        `;
        document.querySelector('.dekopin-container').appendChild(box);
    }
    const textEl = document.getElementById('dekopin-vn-text');
    textEl.textContent = '';
    let i = 0;
    function typeNext() {
        if (i < text.length) {
            textEl.textContent += text.charAt(i);
            i++;
            setTimeout(typeNext, 50);
        }
    }
    typeNext();
}

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
    
    if (currentCharId === 'tanabe') {
        document.getElementById('tanabe-win-count-display').style.display = 'inline';
        document.getElementById('tanabe-win-count').textContent = tanabeWinCount;
    } else {
        document.getElementById('tanabe-win-count-display').style.display = 'none';
    }
    
    if (currentCharId === 'takebayashi') {
        document.getElementById('prank-modal').style.display = 'none';
        if (tbPhase === 'first' || tbPhase === 'second') {
            CHARACTERS.takebayashi.difficulty = 'extreme';
        } else {
            CHARACTERS.takebayashi.difficulty = 'hard';
        }
    }
    
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

            // Mid-game prank prompt for Takebayashi Match 2 when CPU score reaches 4
            if (currentCharId === 'takebayashi' && tbPhase === 'second' && !tbHasPromptedPrank && cpuScore >= 4) {
                tbHasPromptedPrank = true;
                canClick = false;
                setTimeout(() => {
                    document.getElementById('prank-modal').style.display = 'flex';
                }, 400);
                return;
            }

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
    if (difficulty === 'extreme') memoryChance = 1.0;

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
        if (currentCharId === 'tanabe') {
            handleTanabeEndGame();
            return;
        }
        if (currentCharId === 'takebayashi') {
            handleTakebayashiEndGame();
            return;
        }

        // Standard Characters
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

function handleTanabeEndGame() {
    if (playerScore >= cpuScore) {
        // Player Wins against Tanabe
        seClear.play();
        tanabeWinCount++;
        const winSeq = [
            { text: '……………', img: 'tanabe_magao_toji.PNG' },
            { text: '……………………', img: 'tanabe_magao_toji.PNG' },
            { text: '俺が負けるわけないだろ', img: 'tanabe_magao_ake.PNG' },
            { text: 'もう一回だ', img: 'tanabe_retry.PNG' }
        ];
        triggerRabbitTransition(() => {
            playVnSequence(winSeq, () => {
                // Forced retry
                playBGM();
                initGame();
                showScreen('game-screen');
            });
        });
    } else {
        // Player Loses against Tanabe
        seDie.play();
        const loseSeq = [
            { text: '………………', img: 'tanabe_magao_toji.PNG' },
            { text: 'フッ…', img: 'tanabe_doya.PNG' },
            { text: 'お前が俺に勝つなんて100年早いんだよ', img: 'tanabe_doya_ake.PNG' },
            { text: '何？もう一回？', img: 'tanabe_o.PNG' },
            { text: 'どうせ負けるだけだ', img: 'tanabe_doya_ake.PNG' }
        ];
        triggerRabbitTransition(() => {
            playVnSequence(loseSeq, () => {
                // Show choices
                document.getElementById('vn-choices').style.display = 'flex';
            });
        });
    }
}

function handleTakebayashiEndGame() {
    if (tbPhase === 'first') {
        seDie.play();
        const loseSeq = [
            { text: 'もう終わりか？', img: 'mizu1.PNG' },
            { text: '退屈だったな', img: 'mizu2.PNG' },
            { text: 'あまりにも味気ないからもう一度対戦してやってもいいぞ', img: 'mizu1.PNG' },
            { text: '暇つぶしくらいにはなってくれよ', img: 'mizu2.PNG' }
        ];
        triggerRabbitTransition(() => {
            playVnSequence(loseSeq, () => {
                // Immediately transition to Match 2
                tbPhase = 'second';
                tbHasPromptedPrank = false;
                triggerRabbitTransition(() => {
                    playBGM();
                    initGame();
                    showScreen('game-screen');
                });
            });
        });
    } else {
        // Match 2 or Match 3 outcome
        if (playerScore >= cpuScore) {
            // Player Win
            seClear.play();
            const winSeq = [
                { text: 'まさかイカサマしてないよな…？', img: 'paku1.PNG' },
                { text: 'チッ……', img: 'hon1.PNG' },
                { text: 'お前なんか大嫌いだ', img: 'okoru3.PNG' }
            ];
            triggerRabbitTransition(() => {
                playVnSequence(winSeq, () => {
                    triggerRabbitTransition(() => {
                        showScreen('select-screen');
                    });
                });
            });
        } else {
            // Player Lose
            seDie.play();
            let loseSeq;
            if (tbDidPrank || tbPhase === 'third') {
                loseSeq = [
                    { text: '俺の勝ち、だな', img: 'metumuri.PNG' },
                    { text: '楽勝すぎて欠伸が出る', img: 'wara.PNG' },
                    { text: 'じゃあ大人し土下座してもらおうか', img: 'wara.PNG' },
                    { text: 'デコピンも忘れるなよ', img: 'paku3.PNG' }
                ];
            } else {
                loseSeq = [
                    { text: 'また俺の勝ち', img: 'wara.PNG' },
                    { text: '退屈だった', img: 'paku3.PNG' },
                    { text: '二度と俺に頭で勝とうとしないことだな', img: 'metumuri.PNG' }
                ];
            }
            triggerRabbitTransition(() => {
                playVnSequence(loseSeq, () => {
                    triggerRabbitTransition(() => {
                        showScreen('select-screen');
                    });
                });
            });
        }
    }
}

// VN Choices Logic
document.getElementById('vn-choice-retry').addEventListener('click', () => {
    seSelect.play();
    document.getElementById('vn-choices').style.display = 'none';
    
    // 1/2 chance to retry
    if (Math.random() < 0.5) {
        // Retry
        playBGM();
        triggerRabbitTransition(() => {
            initGame();
            showScreen('game-screen');
        });
    } else {
        // Fail
        const failSeq = [
            { text: '面倒臭い', img: 'tanabe_magao_ake.PNG' },
            { text: '生徒にでも相手してもらったらどうだ？', img: 'tanabe_doya.PNG' },
            { text: 'よっぽどいい試合になるさ', img: 'tanabe_doya_ake.PNG' }
        ];
        playVnSequence(failSeq, () => {
            triggerRabbitTransition(() => {
                showScreen('select-screen');
            });
        });
    }
});

document.getElementById('vn-choice-quit').addEventListener('click', () => {
    seSelect.play();
    document.getElementById('vn-choices').style.display = 'none';
    triggerRabbitTransition(() => {
        showScreen('select-screen');
    });
});

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
