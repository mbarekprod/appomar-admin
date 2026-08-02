import { db } from "./firebase.js";
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const prizes = [
    { text: "🎁 تخفيض 25%",         color: "#FFD700", weight: 4 },
    { text: "⏰ ارجع غدوة",          color: "#555555", weight: 4 },
    { text: "🍟 إضافة فريت",         color: "#FF9800", weight: 4 },
    { text: "🔄 دور مرة أخرى",       color: "#4CAF50", weight: 4 },
    { text: "⏰ ارجع غدوة",          color: "#444444", weight: 4 },
    { text: "🍟 إضافة فريت",         color: "#F57C00", weight: 4 },
    { text: "🥤 قازوزة مجانية",      color: "#E91E63", weight: 4 },
    { text: "⏰ ارجع غدوة",          color: "#333333", weight: 4 },
    { text: "🍟 إضافة فريت",         color: "#E65100", weight: 4 },
    { text: "💧 دابوزة ماء مجانية",  color: "#2196F3", weight: 4 },
    { text: "⏰ ارجع غدوة",          color: "#616161", weight: 4 },
    { text: "🎉 تخفيض 50%",          color: "#9C27B0", weight: 1 }
];

const CONFETTI_COLORS = ['#ff7b00', '#e53935', '#1e88e5', '#ffcc33', '#43a047', '#7b1fa2', '#fff'];
const LOGO_SRC = '735043823_122232458936380788_691619389420209673_n (3).jpg';

let currentRotation = 0;
let isSpinning       = false;
let selectedPrize    = null;
let wheelResult       = null;
let wheelLocked       = false;

const canvas = document.getElementById('wheel');
const ctx    = canvas.getContext('2d');
const cx     = canvas.width / 2;
const cy     = canvas.height / 2;
const radius = cx;
const arc    = (2 * Math.PI) / prizes.length;

function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < prizes.length; i++) {
        const start = i * arc - Math.PI / 2;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + arc);
        ctx.closePath();
        ctx.fillStyle = prizes[i].color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Cairo, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 5;
        ctx.fillText(prizes[i].text, radius - 16, 6);
        ctx.restore();
    }
}

function getWeightedRandomIndex() {
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < prizes.length; i++) {
        if (rand < prizes[i].weight) return i;
        rand -= prizes[i].weight;
    }
    return prizes.length - 1;
}

let audioCtx = null;

function playCoinSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const notes = [988, 1319];

        notes.forEach((freq, i) => {
            const start = now + i * 0.075;
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.22, start + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

            osc.connect(gain).connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.24);
        });
    } catch (e) {}
}

function buildPrizeButtons() {
    const container = document.getElementById('prizeButtons');
    container.innerHTML = '';

    prizes.forEach((prize, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prize-btn';
        btn.style.setProperty('--prize-color', prize.color);
        btn.dataset.index = idx;

        const label = document.createElement('span');
        label.className = 'prize-label';
        label.textContent = prize.text;

        const chip = document.createElement('img');
        chip.className = 'chip-token';
        chip.src = LOGO_SRC;
        chip.alt = 'chip';

        const curtainWrap = document.createElement('div');
        curtainWrap.className = 'curtain-wrap';

        const curtainL = document.createElement('div');
        curtainL.className = 'curtain-l';
        const curtainR = document.createElement('div');
        curtainR.className = 'curtain-r';
        const lockIcon = document.createElement('span');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';

        curtainWrap.appendChild(curtainL);
        curtainWrap.appendChild(curtainR);
        curtainWrap.appendChild(lockIcon);

        btn.appendChild(curtainWrap);
        btn.appendChild(chip);
        btn.appendChild(label);
        btn.addEventListener('click', () => handlePrizeSelect(idx, btn));
        container.appendChild(btn);
    });
}

let robotHideTimer = null;

function playRobotReveal() {
    const overlay = document.getElementById('robotOverlay');
    if (!overlay) return;

    overlay.classList.remove('show');
    void overlay.offsetWidth;
    overlay.classList.add('show');

    clearTimeout(robotHideTimer);
    robotHideTimer = setTimeout(() => overlay.classList.remove('show'), 1550);
}

function handlePrizeSelect(idx, btnEl) {
    if (isSpinning || wheelLocked) return;

    document.querySelectorAll('.prize-btn').forEach(b => {
        b.classList.remove('selected', 'locking');
        const oldChip = b.querySelector('.chip-token');
        if (oldChip) oldChip.classList.remove('chip-drop');
    });

    btnEl.classList.add('selected');

    const chip = btnEl.querySelector('.chip-token');
    void chip.offsetWidth;
    chip.classList.add('chip-drop');

    void btnEl.offsetWidth;
    btnEl.classList.add('locking');

    playCoinSound();
    playRobotReveal();

    selectedPrize = prizes[idx].text;

    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = false;
}

function resetSelection() {
    selectedPrize = null;
    document.querySelectorAll('.prize-btn').forEach(b => {
        b.classList.remove('selected', 'locking');
        const chip = b.querySelector('.chip-token');
        if (chip) chip.classList.remove('chip-drop');
    });
    document.getElementById('spinBtn').disabled = true;
}

function triggerConfetti() {
    const count = 80;
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';

    for (let k = 0; k < count; k++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        const size = 6 + Math.random() * 9;
        el.style.cssText = `
          left:${Math.random() * 100}%;
          width:${size}px;
          height:${size * 0.5}px;
          background:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
          animation-duration:${1.8 + Math.random() * 1.5}s;
          animation-delay:${Math.random() * 0.7}s;
          transform:rotate(${Math.random() * 360}deg);
        `;
        container.appendChild(el);
    }
    setTimeout(() => container.innerHTML = '', 3800);
}

async function saveResultToFirestore(prizeText) {
    try {
        await addDoc(collection(db, "wheelResults"), {
            prize: prizeText,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to save wheel result:", e);
    }
}

function spin() {
    if (isSpinning || !selectedPrize || wheelLocked) return;

    isSpinning = true;
    const spinBtn  = document.getElementById('spinBtn');
    const resultEl = document.getElementById('result');
    spinBtn.disabled = true;
    resultEl.textContent = '';
    resultEl.className = '';

    const winIndex = getWeightedRandomIndex();
    wheelResult = prizes[winIndex].text;

    const turns       = 5 + Math.floor(Math.random() * 3);
    const anglePerSeg = 360 / prizes.length;
    const desired     = 360 - (winIndex * anglePerSeg + anglePerSeg / 2);
    const currentMod  = ((currentRotation % 360) + 360) % 360;
    let delta = desired - currentMod;
    if (delta < 0) delta += 360;
    currentRotation += turns * 360 + delta;

    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;

        if (selectedPrize === wheelResult) {
            resultEl.textContent = '🎉 مبروك! ربحت: ' + wheelResult;
            resultEl.className = 'result-show win';
            triggerConfetti();
        } else {
            resultEl.textContent = '😔 حظ أوفر المرة الجاية! النتيجة: ' + wheelResult;
            resultEl.className = 'result-show lose';
        }

        saveResultToFirestore(wheelResult);
        resetSelection();
    }, 6100);
}

function initMusic() {
    const music = document.getElementById('bgMusic');
    music.volume = 0.5;

    function applySavedTime() {
        try {
            const savedTime = localStorage.getItem('musicTime');
            if (savedTime && music.readyState > 0) {
                music.currentTime = parseFloat(savedTime);
            }
        } catch (e) {}
    }

    if (music.readyState > 0) {
        applySavedTime();
    } else {
        music.addEventListener('loadedmetadata', applySavedTime);
    }

    setInterval(() => {
        try { localStorage.setItem('musicTime', music.currentTime); } catch (e) {}
    }, 1000);

    try {
        const muted = localStorage.getItem('musicMuted');
        if (muted === 'true') { music.muted = true; }
    } catch (e) {}

    function startMusic() {
        music.play().catch(() => {});
    }

    window.addEventListener('load', startMusic);
    startMusic();

    function unlockOnce() {
        startMusic();
        document.removeEventListener('click', unlockOnce);
        document.removeEventListener('touchstart', unlockOnce);
        document.removeEventListener('scroll', unlockOnce);
        document.removeEventListener('keydown', unlockOnce);
    }

    document.addEventListener('click', unlockOnce);
    document.addEventListener('touchstart', unlockOnce);
    document.addEventListener('scroll', unlockOnce);
    document.addEventListener('keydown', unlockOnce);
}

function applyLockState() {
    const spinBtn   = document.getElementById('spinBtn');
    const lockedMsg = document.getElementById('lockedMsg');
    const container = document.getElementById('prizeButtons');

    if (wheelLocked) {
        if (!selectedPrize) spinBtn.disabled = true;
        container.classList.add('wheel-locked');
        if (lockedMsg) lockedMsg.classList.add('show');
    } else {
        container.classList.remove('wheel-locked');
        if (lockedMsg) lockedMsg.classList.remove('show');
        if (selectedPrize && !isSpinning) spinBtn.disabled = false;
    }
}

function watchWheelLock() {
    onSnapshot(doc(db, "wheel_settings", "config"), (snap) => {
        wheelLocked = !!(snap.exists() && snap.data().locked);
        applyLockState();
    }, (e) => console.error("تعذر التحقق من حالة العجلة:", e));
}

document.addEventListener('DOMContentLoaded', () => {
    buildPrizeButtons();
    drawWheel();
    document.getElementById('spinBtn').addEventListener('click', spin);
    initMusic();
    watchWheelLock();
});
