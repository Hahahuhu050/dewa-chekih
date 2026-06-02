let state = {
    players: {
        A: { id: 'A', name: 'Pemain A', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
        B: { id: 'B', name: 'Pemain B', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
        C: { id: 'C', name: 'Pemain C', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
        D: { id: 'D', name: 'Pemain D', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 }
    },
    round: 1,
    targetScore: 1000,
    history: [],
    ranking: ['A', 'B', 'C', 'D']
};

let undoStack = [];
let speechQueue = [];
let isSpeaking = false;

const DOM = {
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    playerInputs: { A: document.getElementById('playerA'), B: document.getElementById('playerB'), C: document.getElementById('playerC'), D: document.getElementById('playerD') },
    targetButtons: document.querySelectorAll('.btn-target'),
    customTarget: document.getElementById('customTarget'),
    btnStart: document.getElementById('btn-start'),
    displayRound: document.getElementById('display-round'),
    displayTargetInfo: document.getElementById('display-target-info'),
    btnResetGame: document.getElementById('btn-reset-game'),
    themeBtn: document.getElementById('btn-theme'),
    fullscreenBtn: document.getElementById('btn-fullscreen'),
    screenshotBtn: document.getElementById('btn-screenshot'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    rankingContainer: document.getElementById('ranking-container'),
    historyContainer: document.getElementById('history-container'),
    achievementContainer: document.getElementById('achievement-container'),
    statistikTableBody: document.getElementById('statistik-table-body'),
    scoreInputs: { A: document.getElementById('input-scoreA'), B: document.getElementById('input-scoreB'), C: document.getElementById('input-scoreC'), D: document.getElementById('input-scoreD') },
    lblScores: { A: document.getElementById('lbl-scoreA'), B: document.getElementById('lbl-scoreB'), C: document.getElementById('lbl-scoreC'), D: document.getElementById('lbl-scoreD') },
    btnUndo: document.getElementById('btn-undo'),
    btnSaveRound: document.getElementById('btn-save-round'),
    btnNextRound: document.getElementById('btn-next-round')
};

document.addEventListener('DOMContentLoaded', () => {
    initEventHandlers();
    loadGameState();
});

function initEventHandlers() {
    DOM.targetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            DOM.targetButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.targetScore = parseInt(e.target.dataset.value);
            DOM.customTarget.value = '';
        });
    });

    DOM.customTarget.addEventListener('input', (e) => {
        if(e.target.value) {
            DOM.targetButtons.forEach(b => b.classList.remove('active'));
            state.targetScore = parseInt(e.target.value) || 1000;
        }
    });

    DOM.btnStart.addEventListener('click', startGame);
    DOM.btnSaveRound.addEventListener('click', processRoundScores);
    DOM.btnNextRound.addEventListener('click', advanceRoundStep);
    DOM.btnUndo.addEventListener('click', executeUndoState);
    DOM.btnResetGame.addEventListener('click', resetTotalGameEngine);

    DOM.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.tabButtons.forEach(b => b.classList.remove('active'));
            DOM.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    DOM.themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
    });
    
    DOM.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => alert(err.message));
        } else {
            document.exitFullscreen();
        }
    });

    DOM.screenshotBtn.addEventListener('click', triggerFakeScreenshot);
}

function saveGameState() {
    localStorage.setItem('score_cekih_state', JSON.stringify(state));
    localStorage.setItem('score_cekih_undo', JSON.stringify(undoStack));
}

function loadGameState() {
    const localData = localStorage.getItem('score_cekih_state');
    const undoData = localStorage.getItem('score_cekih_undo');
    if (localData) {
        state = JSON.parse(localData);
        if (undoData) undoStack = JSON.parse(undoData);
        syncPlayerDisplayLabels();
        updateDashboardView();
        DOM.setupScreen.classList.remove('active');
        DOM.gameScreen.classList.add('active');
    }
}

function syncPlayerDisplayLabels() {
    for(let key in state.players) {
        if(DOM.lblScores[key]) DOM.lblScores[key].textContent = state.players[key].name;
    }
}

function startGame() {
    state.players.A.name = DOM.playerInputs.A.value.trim() || 'Pemain A';
    state.players.B.name = DOM.playerInputs.B.value.trim() || 'Pemain B';
    state.players.C.name = DOM.playerInputs.C.value.trim() || 'Pemain C';
    state.players.D.name = DOM.playerInputs.D.value.trim() || 'Pemain D';

    if(DOM.customTarget.value) state.targetScore = parseInt(DOM.customTarget.value) || 1000;

    syncPlayerDisplayLabels();
    state.round = 1;
    state.history = [];
    undoStack = [];
    
    for (let key in state.players) {
        Object.assign(state.players[key], { score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 });
    }
    
    logActivity("Permainan Baru Dimulai. Target: " + state.targetScore);
    recalculateStandingsRanking();
    updateDashboardView();
    saveGameState();

    DOM.setupScreen.classList.remove('active');
    DOM.gameScreen.classList.add('active');
}

function processRoundScores() {
    const backup = JSON.parse(JSON.stringify(state));
    let addedScores = {
        A: parseInt(DOM.scoreInputs.A.value) || 0,
        B: parseInt(DOM.scoreInputs.B.value) || 0,
        C: parseInt(DOM.scoreInputs.C.value) || 0,
        D: parseInt(DOM.scoreInputs.D.value) || 0
    };

    for (let key in addedScores) {
        if(addedScores[key] > 1000) {
            alert(`Skor maksimal 1000! Periksa input Pemain ${state.players[key].name}.`);
            return;
        }
    }

    let previousScores = { A: state.players.A.score, B: state.players.B.score, C: state.players.C.score, D: state.players.D.score };
    let calculatedNextScores = {};
    for(let key in state.players) calculatedNextScores[key] = previousScores[key] + addedScores[key];

    let burnTrackers = { A: false, B: false, C: false, D: false };
    let burnMessages = [];
    let playersBurnedCount = 0;
    let burnerKey = null;

    if (state.round > 1) {
        for (let skey in state.players) {
            if (addedScores[skey] > 0) {
                let localBurn = 0;
                for (let compKey in state.players) {
                    if (skey !== compKey) {
                        if (previousScores[skey] < previousScores[compKey] && calculatedNextScores[skey] > calculatedNextScores[compKey]) {
                            if (!burnTrackers[compKey] && calculatedNextScores[compKey] !== 0) {
                                burnTrackers[compKey] = true;
                                localBurn++;
                                burnMessages.push(`${state.players[skey].name} membakar ${state.players[compKey].name}`);
                                enqueueSpeech(`${state.players[skey].name} membakar ${state.players[compKey].name}`);
                            }
                        }
                    }
                }
                if (localBurn > 0) {
                    state.players[skey].burns += localBurn;
                    if (localBurn > playersBurnedCount) { playersBurnedCount = localBurn; burnerKey = skey; }
                }
            }
        }
    }

    for(let key in burnTrackers) {
        if(burnTrackers[key]) { calculatedNextScores[key] = 0; state.players[key].burned += 1; }
    }

    if (playersBurnedCount === 3 && burnerKey) {
        state.players[burnerKey].tripleBurn += 1;
        logActivity("TRIPLE BURN oleh " + state.players[burnerKey].name, "burn-event");
        enqueueSpeech("Triple Burn");
    }

    burnMessages.forEach(msg => logActivity(msg, "burn-event"));

    for(let key in state.players) {
        state.players[key].score = calculatedNextScores[key];
        if (addedScores[key] !== 0) logActivity(`${state.players[key].name}: ${addedScores[key] >= 0 ? '+' : ''}${addedScores[key]} Poin`);
        if (state.players[key].score > state.players[key].highestScore) state.players[key].highestScore = state.players[key].score;
    }

    let starWinners = [];
    for(let key in state.players) {
        if (state.players[key].score >= state.targetScore) starWinners.push(key);
    }

    if (starWinners.length > 0) {
        starWinners.sort((x, y) => state.players[y].score - state.players[x].score);
        starWinners.forEach(key => {
            state.players[key].stars += 1;
            logActivity(`Selamat ${state.players[key].name} dapet bintang satu!`, "star-event");
            enqueueSpeech(`Selamat kepada ${state.players[key].name} mendapatkan bintang satu`);
        });
        for(let key in state.players) state.players[key].score = 0;
        logActivity("Skor direset ke 0 karena target tercapai.");
        enqueueSpeech("Skor kembali ke nol.");
    } else {
        for(let key of ['A','B','C','D']) enqueueSpeech(`${state.players[key].name} total poin ${state.players[key].score}`);
    }

    undoStack.push(backup);
    recalculateStandingsRanking();
    updateDashboardView();
    saveGameState();

    for(let key in DOM.scoreInputs) DOM.scoreInputs[key].value = '';
}

function advanceRoundStep() {
    undoStack.push(JSON.parse(JSON.stringify(state)));
    state.round += 1;
    logActivity("Mulai Ronde " + state.round);
    updateDashboardView();
    saveGameState();
}

function executeUndoState() {
    if (undoStack.length === 0) return alert("Tidak ada aksi untuk di-undo.");
    state = undoStack.pop();
    logActivity("Aksi terakhir di-Undo");
    syncPlayerDisplayLabels();
    updateDashboardView();
    saveGameState();
}

function resetTotalGameEngine() {
    if (!confirm("Reset total permainan? Semua nama, skor, dan statistik dihapus permanen.")) return;
    localStorage.removeItem('score_cekih_state');
    localStorage.removeItem('score_cekih_undo');
    undoStack = [];
    
    state = {
        players: {
            A: { id: 'A', name: 'Pemain A', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
            B: { id: 'B', name: 'Pemain B', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
            C: { id: 'C', name: 'Pemain C', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
            D: { id: 'D', name: 'Pemain D', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 }
        },
        round: 1, targetScore: 1000, history: [], ranking: ['A', 'B', 'C', 'D']
    };

    DOM.playerInputs.A.value = ''; DOM.playerInputs.B.value = ''; DOM.playerInputs.C.value = ''; DOM.playerInputs.D.value = '';
    DOM.playerInputs.A.placeholder = 'Ketik nama Pemain A...';
    DOM.playerInputs.B.placeholder = 'Ketik nama Pemain B...';
    DOM.playerInputs.C.placeholder = 'Ketik nama Pemain C...';
    DOM.playerInputs.D.placeholder = 'Ketik nama Pemain D...';

    DOM.customTarget.value = '';
    DOM.targetButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-target[data-value="1000"]').classList.add('active');

    window.speechSynthesis.cancel();
    speechQueue = []; isSpeaking = false;
    DOM.gameScreen.classList.remove('active');
    DOM.setupScreen.classList.add('active');
}

function modifyPlayerNameMidGame(playerKey, value) {
    state.players[playerKey].name = value.trim() || `Pemain ${playerKey}`;
    syncPlayerDisplayLabels();
    renderRankingTab();
    renderAchievementsTab();
    saveGameState();
}

function recalculateStandingsRanking() {
    let arr = ['A', 'B', 'C', 'D'];
    arr.sort((x, y) => state.players[y].score - state.players[x].score);
    state.ranking = arr;
}

function logActivity(text, className = '') {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.history.unshift({ text: `[${time}] ${text}`, className });
}

function updateDashboardView() {
    DOM.displayRound.textContent = "Ronde " + state.round;
    DOM.displayTargetInfo.textContent = "Target: " + state.targetScore;
    renderRankingTab();
    renderHistoryTab();
    renderAchievementsTab();
    renderStatistikTab();
}

function renderRankingTab() {
    DOM.rankingContainer.innerHTML = '';
    state.ranking.forEach((pKey, i) => {
        const p = state.players[pKey];
        const card = document.createElement('div');
        card.className = `ranking-card rank-position-${i+1}`;
        card.innerHTML = `
            <div class="rank-badge rank-badge-${i+1}">${i+1}</div>
            <div class="rank-details">
                <div>
                    <span class="rank-pname">${p.name}</span>
                    <div class="rank-stars">${'⭐'.repeat(p.stars) || '-'}</div>
                </div>
                <span class="rank-score-display">${p.score}</span>
            </div>`;
        DOM.rankingContainer.appendChild(card);
    });
}

function renderHistoryTab() {
    DOM.historyContainer.innerHTML = '';
    state.history.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.className || ''}`;
        div.textContent = item.text;
        DOM.historyContainer.appendChild(div);
    });
}

function renderAchievementsTab() {
    DOM.achievementContainer.innerHTML = '';
    const rules = [
        { title: 'Tukang Ngocok Kartu', desc: 'Skor minus (< 0)', icon: '🃏', check: p => p.score < 0 },
        { title: 'Tukang Bakar', desc: 'Membakar >= 3x', icon: '🔥', check: p => p.burns >= 3 },
        { title: 'Hari Apes', desc: 'Terbakar >= 5x', icon: '😭', check: p => p.burned >= 5 },
        { title: 'Dewa Kartu', desc: 'Skor Tertinggi >= 500', icon: '👑', check: p => p.highestScore >= 500 },
        { title: 'Dewa di atas Dewa', desc: 'Bintang > 1', icon: '⚡', check: p => p.stars > 1 },
        { title: 'Triple Burn', desc: 'Bakar 3 lawan sekaligus', icon: '💥', check: p => p.tripleBurn > 0 }
    ];

    for(let key of ['A','B','C','D']) {
        const p = state.players[key];
        rules.forEach(r => {
            const unlocked = r.check(p);
            const div = document.createElement('div');
            div.className = `achievement-card ${unlocked ? 'unlocked' : ''}`;
            div.innerHTML = `<div class="achievement-icon">${r.icon}</div><div class="achievement-title">${r.title}</div><div class="achievement-desc">${p.name}</div>`;
            DOM.achievementContainer.appendChild(div);
        });
    }
}

function renderStatistikTab() {
    DOM.statistikTableBody.innerHTML = '';
    for(let key of ['A','B','C','D']) {
        const p = state.players[key];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="input-table-edit" data-player="${key}" value="${p.name}"></td>
            <td>${p.score}</td><td>${p.highestScore}</td><td>${p.stars}</td><td>${p.burns}</td><td>${p.burned}</td><td>${p.tripleBurn}</td>`;
        DOM.statistikTableBody.appendChild(tr);
    }
    document.querySelectorAll('.input-table-edit').forEach(input => {
        input.addEventListener('input', e => modifyPlayerNameMidGame(e.target.dataset.player, e.target.value));
    });
}

function enqueueSpeech(text) {
    // Perbaikan pembacaan agar angka puluhan seperti 80/100 dibaca normal alami oleh sistem suara HP
    speechQueue.push(text.replace(/-/g, ' minus '));
    processSpeechQueue();
}

function processSpeechQueue() {
    if (isSpeaking || speechQueue.length === 0) return;
    isSpeaking = true;
    let utterance = new SpeechSynthesisUtterance(speechQueue.shift());
    utterance.lang = 'id-ID'; utterance.rate = 0.95;
    utterance.onend = () => { isSpeaking = false; processSpeechQueue(); };
    utterance.onerror = () => { isSpeaking = false; processSpeechQueue(); };
    window.speechSynthesis.speak(utterance);
}

function triggerFakeScreenshot() {
    let pWin = window.open('', '_blank');
    if(!pWin) return alert("Izinkan pop-up browser untuk melihat snapshot skor.");
    
    let html = `<html><head><title>Score Snapshot</title><style>
        body { background:#121212; color:#fff; font-family:sans-serif; text-align:center; padding:20px; }
        .box { border:2px solid #d4af37; padding:20px; border-radius:12px; background:#1e1e1e; max-width:450px; margin:0 auto; }
        table { width:100%; border-collapse:collapse; margin-top:15px; }
        th, td { border:1px solid #333; padding:10px; }
        th { background:#d4af37; color:#000; }
    </style></head><body><div class="box"><h2>Score Cekih Snapshot</h2><p>Ronde: ${state.round} | Target: ${state.targetScore}</p><table>
    <tr><th>Pos</th><th>Pemain</th><th>Skor</th><th>Bintang</th></tr>
    ${state.ranking.map((k, i) => `<tr><td>${i+1}</td><td>${state.players[k].name}</td><td>${state.players[k].score}</td><td>${state.players[k].stars}</td></tr>`).join('')}
    </table></div><script>window.onload=function(){window.print();}<\/script></body></html>`;
    pWin.document.write(html); pWin.document.close();
}
