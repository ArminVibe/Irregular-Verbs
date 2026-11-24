// ===== State =====
let currentMode = 'easy';
let currentGroup = 'all';
let questionCount = 20;
let practiceQueue = [];
let currentIndex = 0;
let score = 0;
let answered = false;

// Progress stored in localStorage
const STORAGE_KEY = 'verbforms_progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateVerbProgress(verbId, correct) {
  const progress = loadProgress();
  if (!progress[verbId]) {
    progress[verbId] = { correct: 0, wrong: 0, last: Date.now() };
  }
  if (correct) {
    progress[verbId].correct += 1;
  } else {
    progress[verbId].wrong += 1;
  }
  progress[verbId].last = Date.now();
  saveProgress(progress);
}

// ===== Navigation =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  if (name === 'list') renderList();
  if (name === 'progress') renderProgress();
  if (name === 'home') updateHomeStats();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

// ===== Home stats =====
function updateHomeStats() {
  document.getElementById('total-verbs').textContent = VERBS.length;
  
  const progress = loadProgress();
  let known = 0;
  Object.values(progress).forEach(p => {
    if (p.correct >= 3 && p.correct > p.wrong) known++;
  });
  document.getElementById('learned-count').textContent = known;
  
  // Simple streak simulation (days with activity)
  const streak = localStorage.getItem('verbforms_streak') || 0;
  document.getElementById('streak-count').textContent = streak;
}

// ===== Practice setup =====
document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
  });
});

document.querySelectorAll('[data-group]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-group]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentGroup = btn.dataset.group;
  });
});

document.querySelectorAll('[data-count]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-count]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    questionCount = parseInt(btn.dataset.count);
  });
});

document.getElementById('start-btn').addEventListener('click', () => {
  startPractice(currentMode);
});

function startPractice(mode) {
  currentMode = mode;
  
  // Sync UI
  document.querySelectorAll('[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  // Filter verbs
  let pool = VERBS;
  if (currentGroup !== 'all') {
    pool = VERBS.filter(v => v.group === currentGroup);
  }

  // Shuffle
  practiceQueue = shuffle([...pool]);
  
  if (questionCount > 0 && questionCount < practiceQueue.length) {
    practiceQueue = practiceQueue.slice(0, questionCount);
  }

  currentIndex = 0;
  score = 0;
  answered = false;

  document.getElementById('practice-setup').classList.add('hidden');
  document.getElementById('practice-results').classList.add('hidden');
  document.getElementById('practice-active').classList.remove('hidden');
  document.getElementById('feedback').classList.add('hidden');

  showScreen('practice');
  renderQuestion();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function exitPractice() {
  document.getElementById('practice-active').classList.add('hidden');
  document.getElementById('practice-results').classList.add('hidden');
  document.getElementById('practice-setup').classList.remove('hidden');
}

function restartPractice() {
  startPractice(currentMode);
}

// ===== Render question =====
function renderQuestion() {
  const verb = practiceQueue[currentIndex];
  const card = document.getElementById('question-card');
  const feedback = document.getElementById('feedback');
  feedback.classList.add('hidden');
  answered = false;

  // Progress
  const pct = (currentIndex / practiceQueue.length) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('score-display').textContent = `${score} / ${currentIndex}`;

  if (currentMode === 'easy') {
    renderEasy(verb, card);
  } else if (currentMode === 'medium') {
    renderMedium(verb, card);
  } else {
    renderHard(verb, card);
  }
}

// ===== Easy mode =====
function renderEasy(verb, card) {
  const correct = `${verb.past} — ${verb.participle}`;
  const distractors = generateDistractors(verb);
  const options = shuffle([correct, ...distractors]);

  card.innerHTML = `
    <div class="question-prompt">Выбери правильные формы</div>
    <div class="question-emoji">${verb.emoji || '📝'}</div>
    <div class="question-verb">${verb.base}</div>
    <div class="question-ru">${verb.ru}</div>
    <div class="options-grid" id="options-grid">
      ${options.map(opt => `
        <button class="option-answer" data-value="${escapeHtml(opt)}">${opt}</button>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.option-answer').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const selected = btn.dataset.value;
      const isCorrect = selected === correct;

      document.querySelectorAll('.option-answer').forEach(b => {
        b.classList.add('disabled');
        if (b.dataset.value === correct) b.classList.add('correct');
        if (b === btn && !isCorrect) b.classList.add('wrong');
      });

      handleAnswer(verb, isCorrect, correct);
    });
  });
}

function generateDistractors(verb) {
  const others = VERBS.filter(v => v.id !== verb.id);
  const picks = shuffle(others).slice(0, 6);
  const distractors = [];

  // Common mistakes
  distractors.push(`${verb.base}ed — ${verb.base}ed`);
  distractors.push(`${verb.past} — ${verb.past}`);
  distractors.push(`${verb.participle} — ${verb.past}`);

  picks.forEach(p => {
    distractors.push(`${p.past} — ${p.participle}`);
  });

  return shuffle(distractors).filter(d => d !== `${verb.past} — ${verb.participle}`).slice(0, 3);
}

// ===== Medium mode =====
function renderMedium(verb, card) {
  // Randomly hide past or participle or both (one of them)
  const hidePast = Math.random() > 0.5;

  card.innerHTML = `
    <div class="question-prompt">Заполни пропущенную форму</div>
    <div class="question-emoji">${verb.emoji || '📝'}</div>
    <div class="question-verb">${verb.base}</div>
    <div class="question-ru">${verb.ru}</div>
    <div class="forms-input">
      <div class="form-row">
        <label>Past Simple</label>
        <input type="text" id="input-past" 
          value="${hidePast ? '' : verb.past}" 
          ${hidePast ? '' : 'disabled'}
          placeholder="${hidePast ? 'Введи Past Simple' : ''}"
          autocomplete="off" spellcheck="false">
      </div>
      <div class="form-row">
        <label>Past Participle</label>
        <input type="text" id="input-participle" 
          value="${hidePast ? verb.participle : ''}" 
          ${hidePast ? 'disabled' : ''}
          placeholder="${hidePast ? '' : 'Введи Past Participle'}"
          autocomplete="off" spellcheck="false">
      </div>
      <button class="btn btn-primary check-btn" id="check-btn">Проверить</button>
    </div>
  `;

  const focusInput = hidePast ? 'input-past' : 'input-participle';
  setTimeout(() => document.getElementById(focusInput)?.focus(), 50);

  document.getElementById('check-btn').addEventListener('click', () => checkMedium(verb, hidePast));
  
  // Enter key
  document.querySelectorAll('.forms-input input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') checkMedium(verb, hidePast);
    });
  });
}

function checkMedium(verb, hidePast) {
  if (answered) return;
  answered = true;

  const pastInput = document.getElementById('input-past');
  const partInput = document.getElementById('input-participle');
  
  let isCorrect = true;
  let userAnswer = '';

  if (hidePast) {
    const val = normalize(pastInput.value);
    const accepted = normalizeAlternatives(verb.past);
    isCorrect = accepted.includes(val);
    pastInput.classList.add(isCorrect ? 'correct' : 'wrong');
    pastInput.disabled = true;
    userAnswer = pastInput.value;
  } else {
    const val = normalize(partInput.value);
    const accepted = normalizeAlternatives(verb.participle);
    isCorrect = accepted.includes(val);
    partInput.classList.add(isCorrect ? 'correct' : 'wrong');
    partInput.disabled = true;
    userAnswer = partInput.value;
  }

  document.getElementById('check-btn').disabled = true;
  handleAnswer(verb, isCorrect, `${verb.past} — ${verb.participle}`);
}

// ===== Hard mode =====
function renderHard(verb, card) {
  card.innerHTML = `
    <div class="question-prompt">Напиши все три формы</div>
    <div class="question-emoji">${verb.emoji || '📝'}</div>
    <div class="question-verb">${verb.base}</div>
    <div class="question-ru">${verb.ru}</div>
    <div class="forms-input">
      <div class="form-row">
        <label>Base (Infinitive)</label>
        <input type="text" id="input-base" value="${verb.base}" disabled>
      </div>
      <div class="form-row">
        <label>Past Simple</label>
        <input type="text" id="input-past" placeholder="Past Simple" autocomplete="off" spellcheck="false">
      </div>
      <div class="form-row">
        <label>Past Participle</label>
        <input type="text" id="input-participle" placeholder="Past Participle" autocomplete="off" spellcheck="false">
      </div>
      <button class="btn btn-primary check-btn" id="check-btn">Проверить</button>
    </div>
  `;

  setTimeout(() => document.getElementById('input-past')?.focus(), 50);

  document.getElementById('check-btn').addEventListener('click', () => checkHard(verb));
  
  document.querySelectorAll('.forms-input input:not([disabled])').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') checkHard(verb);
    });
  });
}

function checkHard(verb) {
  if (answered) return;
  answered = true;

  const pastInput = document.getElementById('input-past');
  const partInput = document.getElementById('input-participle');

  const pastVal = normalize(pastInput.value);
  const partVal = normalize(partInput.value);

  const pastOk = normalizeAlternatives(verb.past).includes(pastVal);
  const partOk = normalizeAlternatives(verb.participle).includes(partVal);

  pastInput.classList.add(pastOk ? 'correct' : 'wrong');
  partInput.classList.add(partOk ? 'correct' : 'wrong');
  pastInput.disabled = true;
  partInput.disabled = true;

  document.getElementById('check-btn').disabled = true;

  const isCorrect = pastOk && partOk;
  handleAnswer(verb, isCorrect, `${verb.past} — ${verb.participle}`);
}

// ===== Helpers =====
function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeAlternatives(form) {
  // "was/were" → ["was", "were", "was/were"]
  // "got/gotten" → ["got", "gotten", "got/gotten"]
  const parts = form.toLowerCase().split('/').map(s => s.trim());
  return [...parts, form.toLowerCase().replace(/\s+/g, '')];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleAnswer(verb, isCorrect, correctForms) {
  if (isCorrect) score++;
  updateVerbProgress(verb.id, isCorrect);

  const feedback = document.getElementById('feedback');
  feedback.classList.remove('hidden', 'correct', 'wrong');
  feedback.classList.add(isCorrect ? 'correct' : 'wrong');

  feedback.innerHTML = `
    <div class="feedback-title">${isCorrect ? '✓ Правильно!' : '✗ Неправильно'}</div>
    <div class="correct-forms">${verb.base} — ${correctForms}</div>
    <button class="btn btn-primary next-btn" id="next-btn">
      ${currentIndex + 1 >= practiceQueue.length ? 'Результаты' : 'Дальше →'}
    </button>
  `;

  document.getElementById('next-btn').addEventListener('click', nextQuestion);
  document.getElementById('score-display').textContent = `${score} / ${currentIndex + 1}`;
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= practiceQueue.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  document.getElementById('practice-active').classList.add('hidden');
  document.getElementById('practice-results').classList.remove('hidden');

  const total = practiceQueue.length;
  const percent = Math.round((score / total) * 100);

  document.getElementById('final-score').textContent = `${score} / ${total}`;
  document.getElementById('final-percent').textContent = `${percent}%`;

  let message = '';
  if (percent >= 90) message = 'Отличный результат! Ты хорошо знаешь эти глаголы.';
  else if (percent >= 70) message = 'Хорошо! Ещё немного практики — и будет идеально.';
  else if (percent >= 50) message = 'Неплохо, но есть над чем поработать. Повтори слабые глаголы.';
  else message = 'Нужно больше практики. Попробуй режим Easy или меньшую группу.';

  document.getElementById('results-message').textContent = message;

  // Update streak
  const today = new Date().toDateString();
  const lastDay = localStorage.getItem('verbforms_last_day');
  let streak = parseInt(localStorage.getItem('verbforms_streak') || '0');
  if (lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    streak = lastDay === yesterday ? streak + 1 : 1;
    localStorage.setItem('verbforms_streak', streak);
    localStorage.setItem('verbforms_last_day', today);
  }
}

// ===== List =====
function renderList() {
  const tbody = document.getElementById('verbs-tbody');
  const search = document.getElementById('search-input').value.toLowerCase();
  const level = document.getElementById('filter-level').value;

  let filtered = VERBS;
  if (level !== 'all') filtered = filtered.filter(v => v.level === level);
  if (search) {
    filtered = filtered.filter(v => 
      v.base.includes(search) || 
      v.past.includes(search) || 
      v.participle.includes(search) ||
      v.ru.toLowerCase().includes(search)
    );
  }

  tbody.innerHTML = filtered.map((v) => `
    <tr>
      <td>${v.id}</td>
      <td><span style="font-size:1.3rem;margin-right:6px">${v.emoji || ''}</span><strong>${v.base}</strong></td>
      <td>${v.past}</td>
      <td>${v.participle}</td>
      <td>${v.ru}</td>
      <td><span class="level-badge level-${v.level}">${v.level}</span></td>
    </tr>
  `).join('');
}

document.getElementById('search-input')?.addEventListener('input', renderList);
document.getElementById('filter-level')?.addEventListener('change', renderList);

// ===== Progress =====
function renderProgress() {
  const progress = loadProgress();
  const total = VERBS.length;
  
  let known = 0, learning = 0, weak = 0;
  const weakVerbs = [];

  VERBS.forEach(v => {
    const p = progress[v.id];
    if (!p) return;
    const ratio = p.correct / (p.correct + p.wrong || 1);
    if (p.correct >= 3 && ratio >= 0.7) {
      known++;
    } else if (p.wrong > p.correct) {
      weak++;
      weakVerbs.push({ verb: v, wrong: p.wrong });
    } else {
      learning++;
    }
  });

  const percent = Math.round((known / total) * 100);
  document.getElementById('progress-percent').textContent = percent + '%';
  document.getElementById('progress-circle').style.background = 
    `conic-gradient(var(--primary) ${percent}%, #e5e5e5 ${percent}%)`;

  document.getElementById('known-count').textContent = known;
  document.getElementById('learning-count').textContent = learning;
  document.getElementById('weak-count').textContent = weak;

  const weakList = document.getElementById('weak-list');
  if (weakVerbs.length === 0) {
    weakList.innerHTML = '<p class="empty-state">Пока нет слабых глаголов. Отличная работа!</p>';
  } else {
    weakVerbs.sort((a, b) => b.wrong - a.wrong);
    weakList.innerHTML = weakVerbs.slice(0, 20).map(w => 
      `<span class="weak-item">${w.verb.base} (${w.wrong} ошибок)</span>`
    ).join('');
  }
}

function resetProgress() {
  if (confirm('Сбросить весь прогресс? Это действие нельзя отменить.')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('verbforms_streak');
    localStorage.removeItem('verbforms_last_day');
    renderProgress();
    updateHomeStats();
  }
}

// ===== Init =====
updateHomeStats();
showScreen('home');
