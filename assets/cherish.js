const posterStage = document.querySelector('#poster-stage');
const posterMotion = document.querySelector('#poster-motion');
const posterReplay = document.querySelector('#poster-replay');
const posterBurstLayer = document.querySelector('#poster-bursts');
const posterStatus = document.querySelector('#poster-status');
const posterAssets = posterStage.dataset.assets || '/philia/assets/cherish';
let posterBurstTimer;
let posterBurstNumber = 0;
let posterBurstAnchor;
let posterMoving = !reducedMotion.matches;
let posterFrame = 0;
let posterPointer;
let posterEntranceObserver;
let posterEntranceTimer;
let posterEntranceRun = 0;
let posterEntranceGroups = [];

function finishPosterEntrance() {
  posterEntranceRun++;
  clearTimeout(posterEntranceTimer);
  posterEntranceObserver?.disconnect();
  posterStage.classList.remove('poster-entering');
}

function startPosterEntrance() {
  finishPosterEntrance();
  if (!posterMoving || reducedMotion.matches) return;
  // Order whole content groups by position, preserving their authored local order.
  posterStage.classList.add('poster-ordering');
  const groups = posterEntranceGroups.map(group => ({...group, bounds: group.anchor.getBoundingClientRect()})).sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left);
  const pieces = groups.flatMap(group => group.parts.map((piece, step) => {
    piece.dataset.entranceGroup = group.key;
    piece.dataset.groupStep = step;
    return piece;
  })).map((piece, index) => {
    piece.classList.remove('is-revealed', 'is-written');
    piece.dataset.entranceOrder = index;
    return piece;
  });
  posterStage.classList.remove('poster-ordering');
  posterStage.getBoundingClientRect();
  posterStage.classList.add('poster-entering');
  const run = posterEntranceRun;
  let index = 0;
  let waiting = false;
  function nextPiece() {
    if (run !== posterEntranceRun) return;
    posterEntranceObserver.disconnect();
    if (index === pieces.length) { finishPosterEntrance(); return; }
    const piece = pieces[index];
    // Only the queue head can start, even if lower sections are already visible.
    if (piece.getBoundingClientRect().top >= innerHeight) {
      waiting = true;
      posterEntranceObserver.observe(piece);
      return;
    }
    waiting = false;
    piece.classList.add('is-revealed');
    index++;
    posterEntranceTimer = setTimeout(() => {
      if (run !== posterEntranceRun) return;
      piece.classList.add('is-written');
      nextPiece();
    }, Number(piece.dataset.revealDuration) + 90);
  }
  posterEntranceObserver = new IntersectionObserver(entries => {
    if (waiting && entries.some(entry => entry.isIntersecting)) nextPiece();
  }, {threshold: 0});
  nextPiece();
}

function groupPosterEntrance(svg, heading, credit) {
  if (svg.querySelector('[data-entrance-group]')) {
    return Array.from(svg.querySelectorAll('[data-entrance-group]')).map(group => {
      const prep = group.dataset.photo ? Array.from(svg.querySelectorAll(`[data-photo-for="${group.dataset.photo}"]`)).flatMap(piece => piece.closest('.poster-reveal') || Array.from(piece.querySelectorAll('.poster-reveal'))) : [];
      const ownWrapper = group.closest('.poster-reveal');
      const parts = [...prep, ...(ownWrapper ? [ownWrapper] : []), ...group.querySelectorAll('.poster-reveal')];
      return {key: group.dataset.entranceGroup, anchor: group, parts};
    });
  }
  const groups = [];
  const texts = node => Array.from(node.querySelectorAll('.poster-text-reveal'));
  const add = (key, anchor, parts) => groups.push({key, anchor, parts});
  const quote = (node, side, pair = 0) => node.querySelector(`[data-quote-side="${side}"][data-quote-pair="${pair}"]`);
  add('heading', heading, texts(heading));
  ['heart', 'growing', 'wisdom'].forEach(key => {
    const note = svg.querySelector(`[data-note="${key}"]`);
    add(key, note, texts(note));
  });
  ['curious', 'three-seconds', 'protect'].forEach(key => {
    const note = svg.querySelector(`[data-note="${key}"]`);
    const lines = texts(note);
    add(key, note, [quote(note, 'open'), ...lines.slice(0, -1), quote(note, 'close'), lines.at(-1)]);
  });
  const resolve = svg.querySelector('[data-note="resolve"]');
  const [feelings, decision, feelingsEnglish, decisionEnglish] = texts(resolve);
  const highlight = resolve.querySelector('.poster-image-reveal');
  add('resolve', resolve, [quote(resolve, 'open', 0), feelings, quote(resolve, 'close', 0), feelingsEnglish, highlight, quote(resolve, 'open', 1), decision, quote(resolve, 'close', 1), decisionEnglish]);
  const papers = Array.from(svg.querySelectorAll('.poster-backing-paper rect'));
  const tapes = Array.from(svg.querySelectorAll('.poster-tape'));
  ['garden', 'teeth', 'heart'].forEach((key, index) => {
    const photo = svg.querySelector(`[data-photo="${key}"]`);
    add(`photo-${key}`, photo, [papers[index].closest('.poster-reveal'), tapes[index].closest('.poster-reveal'), photo.querySelector('.photo-float').closest('.poster-reveal'), ...texts(photo)]);
  });
  const glossary = svg.querySelector('.poster-glossary');
  add('glossary', glossary, texts(glossary));
  const repetition = svg.querySelector('.poster-repetition');
  const [korean, beforeArrow, afterArrow] = texts(repetition);
  add('repetition', repetition, [korean, beforeArrow, repetition.querySelector('.poster-stroke-reveal'), afterArrow]);
  svg.querySelectorAll('.poster-doodle').forEach((doodle, index) => add(`doodle-${index}`, doodle, [doodle.closest('.poster-reveal')]));
  add('credit', credit, texts(credit));
  return groups;
}

const posterPhotos = {
  teeth: {korean: '사랑니 속의 우리', english: 'us, inside wisdom teeth', emoji: '🦷'},
  garden: {korean: '설렘은 자라고', english: 'a garden, an open sky', emoji: '🌼'},
  heart: {korean: '빛나는 내 마음', english: 'my shining heart', emoji: '💖'},
  portrait: {korean: '처음 스친 얼굴', english: 'the face i first glimpsed', emoji: '🌼'},
  breeze: {korean: '바람이 머무는 곳', english: 'where the breeze stays', emoji: '🍃'},
  train: {korean: '지나가도 남는 순간', english: 'a moment passes, yet stays', emoji: '🚃'},
  palm: {korean: '먼저 닿는 설렘', english: 'anticipation arrives first', emoji: '🌴'},
  flowers: {korean: '향기로 남은 순간', english: 'a moment held in scent', emoji: '🌼'},
  sea: {korean: '거품 속에 숨었네', english: 'hidden in the bubbles', emoji: '🫧'}
};

function setPosterMotion() {
  if (!posterMoving) finishPosterEntrance();
  posterStage.classList.toggle('poster-paused', !posterMoving);
  posterMotion.setAttribute('aria-pressed', String(posterMoving));
  posterMotion.textContent = posterMoving ? 'motion on' : 'motion off';
  posterMotion.disabled = reducedMotion.matches;
  posterReplay.disabled = reducedMotion.matches;
}
setPosterMotion();
posterMotion.addEventListener('click', () => { posterMoving = !posterMoving; setPosterMotion(); });
reducedMotion.addEventListener('change', event => { posterMoving = !event.matches; setPosterMotion(); });
posterReplay.addEventListener('click', () => { clearPosterBurst(); posterMoving = true; setPosterMotion(); startPosterEntrance(); });

function clearPosterBurst() {
  clearTimeout(posterBurstTimer);
  posterBurstLayer.replaceChildren();
  posterBurstAnchor = null;
  posterStatus.textContent = '';
}

function showPosterReaction(note, isPhoto, piece, event) {
  clearPosterBurst();
  const burst = document.createElement('div');
  burst.className = 'poster-burst';
  burst.classList.toggle('is-vocabulary', !isPhoto);
  const duration = isPhoto ? 4400 : 14000;
  burst.style.setProperty('--burst-duration', `${duration}ms`);
  burst.style.width = `${Math.min(isPhoto ? 250 : 330, document.documentElement.clientWidth - 36)}px`;
  burst.style.setProperty('--burst-turn', `${posterBurstNumber++ % 2 ? 3 : -3}deg`);
  const message = document.createElement('div');
  message.className = 'burst-message';
  const emoji = document.createElement('span');
  emoji.className = 'burst-emoji';
  emoji.textContent = note.emoji;
  const english = document.createElement('span');
  english.className = 'burst-english';
  english.textContent = note.english;
  const korean = document.createElement('span');
  korean.className = 'burst-korean';
  korean.lang = note.language || 'ko';
  korean.textContent = note.korean;
  message.append(emoji, korean, english);
  ['usage', 'example', 'translation'].forEach(field => {
    if (!note[field]) return;
    const line = document.createElement('span');
    line.className = `burst-${field}`;
    if (field !== 'translation') {
      const label = document.createElement('small');
      label.className = 'burst-label';
      label.textContent = field;
      line.append(label);
    }
    const content = document.createElement('span');
    content.textContent = note[field];
    if (field === 'example') content.lang = note.language;
    line.append(content);
    message.append(line);
  });
  const hint = document.createElement('small');
  hint.className = 'burst-dismiss-hint';
  hint.textContent = 'tap anywhere to close';
  message.append(hint);
  burst.append(message);
  [[-80,-40],[80,-36],[-88,24],[87,30],[-30,-70],[35,65]].forEach(([dx,dy], index) => {
    const doodle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    doodle.classList.add('burst-doodle');
    doodle.setAttribute('viewBox', '-20 -20 40 40');
    doodle.style.setProperty('--burst-dx', `${dx}px`);
    doodle.style.setProperty('--burst-dy', `${dy}px`);
    doodle.style.setProperty('--doodle-turn', `${index % 2 ? 20 : -18}deg`);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', index % 2 ? 'M0 15 C-27 -3 -10.5 -22.5 0 -6 C12 -24 25.5 -1.5 0 15' : 'M0 -18 L3 -3 L18 0 L3 3 L0 18 L-3 3 L-18 0 L-3 -3 Z');
    doodle.append(path);
    burst.append(doodle);
  });
  posterBurstLayer.append(burst);
  posterBurstAnchor = piece;
  positionPosterBurst(burst, piece);
  posterStatus.textContent = [note.korean, note.english, note.usage && `usage: ${note.usage}`, note.example && `example: ${note.example}`, note.translation].filter(Boolean).join('. ');
  posterBurstTimer = setTimeout(clearPosterBurst, duration + 200);
}

function positionPosterBurst(burst, piece) {
  const edge = 18;
  const gap = 36; // Keep the paper halo clear of the source's gentle floating motion.
  const viewWidth = document.documentElement.clientWidth;
  const viewHeight = innerHeight;
  const bounds = piece.getBoundingClientRect();
  // Focus can scroll an SVG word into view over more than one browser frame.
  const target = {
    left: Math.max(0, Math.min(viewWidth, bounds.left)),
    right: Math.max(0, Math.min(viewWidth, bounds.right)),
    top: Math.max(0, Math.min(viewHeight, bounds.top)),
    bottom: Math.max(0, Math.min(viewHeight, bounds.bottom))
  };
  const message = burst.querySelector('.burst-message');
  burst.style.width = `${Math.min(burst.classList.contains('is-vocabulary') ? 330 : 250, viewWidth - edge * 2)}px`;
  message.style.maxHeight = `${viewHeight - edge * 2}px`;
  const width = burst.offsetWidth;
  let height = burst.offsetHeight;
  const middleX = Math.max(edge, Math.min(viewWidth - edge - width, (target.left + target.right - width) / 2));
  const middleY = Math.max(edge, Math.min(viewHeight - edge - height, (target.top + target.bottom - height) / 2));
  const candidates = {
    right: {left: target.right + gap, top: middleY},
    left: {left: target.left - gap - width, top: middleY},
    below: {left: middleX, top: target.bottom + gap},
    above: {left: middleX, top: target.top - gap - height}
  };
  const order = viewWidth > 680 ? ['right', 'left', 'below', 'above'] : ['below', 'above', 'right', 'left'];
  let position = order.map(side => candidates[side]).find(p => p.left >= edge && p.top >= edge && p.left + width <= viewWidth - edge && p.top + height <= viewHeight - edge);
  if (!position) {
    // Small screens keep the source visible; longer notes scroll inside the card.
    const below = viewHeight - edge - target.bottom - gap;
    const above = target.top - gap - edge;
    const useBelow = below >= above;
    message.style.maxHeight = `${Math.max(1, useBelow ? below : above)}px`;
    height = burst.offsetHeight;
    position = {left: middleX, top: useBelow ? target.bottom + gap : target.top - gap - height};
  }
  burst.style.left = `${position.left}px`;
  burst.style.top = `${position.top}px`;
}

document.addEventListener('click', event => {
  if (!posterBurstLayer.firstElementChild) return;
  clearPosterBurst();
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && posterBurstLayer.firstElementChild) {
    clearPosterBurst();
    event.preventDefault();
  }
});
function updatePosterBurstPosition() {
  const burst = posterBurstLayer.firstElementChild;
  if (!burst || !posterBurstAnchor) return;
  positionPosterBurst(burst, posterBurstAnchor);
}
window.addEventListener('scroll', updatePosterBurstPosition, {passive: true});
window.addEventListener('resize', updatePosterBurstPosition);
window.addEventListener('pagehide', clearPosterBurst);

async function loadMovingPoster() {
  const handwritingRequest = fetch(`${posterAssets}/handwriting.json`).then(response => response.ok ? response.json() : null).catch(() => null);
  const vocabularyRequest = fetch(`${posterAssets}/vocabulary-ko.json`).then(async response => {
    if (!response.ok) throw new Error('vocabulary unavailable');
    return response.json();
  });
  const response = await fetch(`${posterAssets}/poster.svg`);
  if (!response.ok) throw new Error('poster unavailable');
  const documentSvg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const svg = documentSvg.documentElement;
  // Animate inside the positioned SVG groups so their original layout stays intact.
  function floatFragment(parent, index, small = false) {
    const fragment = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fragment.classList.add('poster-fragment');
    fragment.style.setProperty('--float-x', `${small ? 1.5 : 2 + index % 3}px`);
    fragment.style.setProperty('--float-y', `${small ? 2 : 7 + index % 4 * 1.5}px`);
    fragment.style.setProperty('--float-turn', `${small ? .15 : .3 + index % 3 * .15}deg`);
    fragment.style.setProperty('--float-duration', `${5.5 + index % 5 * .65}s`);
    fragment.style.setProperty('--float-delay', `${-index * .83}s`);
    fragment.append(...parent.childNodes);
    parent.append(fragment);
  }
  svg.querySelectorAll('.poster-note, .poster-glossary, .poster-repetition, .poster-doodle, .poster-tape').forEach((piece, index) => floatFragment(piece, index));
  let heading = svg.querySelector('.poster-heading');
  let credit = svg.querySelector('.poster-credit');
  if (!heading) {
    const looseText = Array.from(svg.children).filter(piece => piece.localName === 'text');
    heading = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.insertBefore(heading, looseText[0]);
    heading.append(...looseText.slice(0, 2));
    credit = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.insertBefore(credit, looseText[2]);
    credit.append(looseText[2]);
  }
  floatFragment(heading, 15);
  floatFragment(credit, 16, true);

  // Reuse the poster's hand-drawn shapes, behind the text and photographs.
  const fallingLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  fallingLayer.classList.add('poster-falling');
  fallingLayer.setAttribute('aria-hidden', 'true');
  const palette = getComputedStyle(document.body);
  const fallingColors = [palette.getPropertyValue('--cherish-rose').trim(), palette.getPropertyValue('--cherish-blue').trim(), palette.getPropertyValue('--poster-accent').trim() || '#b79b70'];
  for (let index = 0; index < 24; index++) {
    const position = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    position.setAttribute('transform', `translate(${45 + index * 233 % 990} 0)`);
    const fall = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fall.classList.add('falling-mark');
    fall.style.setProperty('--fall-duration', `${17 + index % 6 * 2.3}s`);
    fall.style.setProperty('--fall-delay', `${-index * 1.91}s`);
    fall.style.setProperty('--fall-sway', `${index % 2 ? -35 : 45}px`);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', index % 3 === 0 ? 'M0 15 C-27 -3 -10.5 -22.5 0 -6 C12 -24 25.5 -1.5 0 15' : 'M0 -18 L3 -3 L18 0 L3 3 L0 18 L-3 3 L-18 0 L-3 -3 Z');
    path.setAttribute('transform', `scale(${.45 + index % 4 * .12})`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', fallingColors[index % 3]);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    fall.append(path);
    position.append(fall);
    fallingLayer.append(position);
  }
  svg.insertBefore(fallingLayer, svg.querySelector('[data-entrance-group]') || svg.querySelector('.poster-backing-paper'));

  function revealWrapper(piece, kind, duration = 450) {
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wrapper.classList.add('poster-reveal', kind);
    wrapper.dataset.revealDuration = duration;
    wrapper.style.setProperty('--reveal-duration', `${duration}ms`);
    piece.parentNode.insertBefore(wrapper, piece);
    wrapper.append(piece);
    return wrapper;
  }
  const segmenter = new Intl.Segmenter('ko', {granularity: 'grapheme'});
  // Separate original lines so a lower tspan cannot type ahead of an upper row.
  svg.querySelectorAll('text').forEach(original => {
    let baseline = Number(original.getAttribute('y'));
    Array.from(original.children).forEach(line => {
      baseline = Number(line.getAttribute('y') ?? baseline) + Number(line.getAttribute('dy') || 0);
      const text = original.cloneNode(false);
      text.setAttribute('y', baseline);
      const copy = line.cloneNode(true);
      copy.removeAttribute('y');
      copy.removeAttribute('dy');
      text.append(copy);
      original.parentNode.insertBefore(text, original);
    });
    original.remove();
  });
  svg.querySelectorAll('text').forEach(text => {
    const label = text.textContent.replace(/\s+/g, ' ').trim();
    let index = 0;
    Array.from(text.children).forEach(line => {
      const letters = Array.from(segmenter.segment(line.textContent), item => item.segment);
      line.replaceChildren(...letters.map(letter => {
        const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        span.classList.add('poster-letter');
        span.style.setProperty('--letter-delay', `${index++ * .04}s`);
        span.textContent = letter;
        return span;
      }));
    });
    const wrapper = revealWrapper(text, 'poster-text-reveal', (index - 1) * 40 + 180);
    wrapper.setAttribute('role', 'img');
    wrapper.setAttribute('aria-label', label);
    text.setAttribute('aria-hidden', 'true');
  });
  // These source paths use separate absolute M subpaths for the two quote corners.
  const quoteCounts = new Map();
  svg.querySelectorAll('.poster-quote, .poster-repetition path').forEach(original => {
    original.getAttribute('d').split(/(?=M\s)/).filter(part => part.trim()).forEach(part => {
      const path = original.cloneNode(false);
      path.setAttribute('d', part);
      path.setAttribute('pathLength', '1');
      original.parentNode.insertBefore(path, original);
      const wrapper = revealWrapper(path, 'poster-stroke-reveal', 300);
      if (path.classList.contains('poster-quote')) {
        const note = path.closest('[data-note]');
        const index = quoteCounts.get(note) || 0;
        wrapper.dataset.quoteSide = index % 2 ? 'close' : 'open';
        wrapper.dataset.quotePair = Math.floor(index / 2);
        quoteCounts.set(note, index + 1);
      }
    });
    original.remove();
  });
  svg.querySelectorAll('.photo-float').forEach(piece => revealWrapper(piece, 'poster-image-reveal', 850));
  svg.querySelectorAll('.poster-tape, .poster-doodle, .poster-backing-paper > rect, .poster-note .poster-fragment > rect:not(.poster-hit)').forEach(piece => revealWrapper(piece, 'poster-image-reveal', 350));
  posterEntranceGroups = groupPosterEntrance(svg, heading, credit);
  if (posterMoving) posterStage.classList.add('poster-entering');
  posterStage.replaceChildren(svg, posterBurstLayer);
  posterReplay.hidden = false;
  svg.querySelectorAll('[data-photo], [data-note]').forEach(piece => {
    piece.removeAttribute('role');
    piece.removeAttribute('tabindex');
    piece.removeAttribute('aria-label');
  });
  svg.querySelectorAll('[data-photo]').forEach(photo => {
    // Keep the image interactive without placing its captions inside a button.
    const image = photo.querySelector('image');
    const hit = photo.querySelector('.poster-hit');
    ['x', 'y', 'width', 'height'].forEach(name => hit.setAttribute(name, image.getAttribute(name) ?? '0'));
    const action = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    action.classList.add('poster-photo-action');
    image.before(action);
    action.append(image, hit);
    const note = posterPhotos[photo.dataset.photo];
    bindPosterAction(action, `release a little sparkle: ${note.english}`, event => showPosterReaction(note, true, action, event));
  });
  posterStage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || !posterMoving || reducedMotion.matches) return;
    posterPointer = event;
    if (posterFrame) return;
    posterFrame = requestAnimationFrame(() => {
      const rect = posterStage.getBoundingClientRect();
      const x = ((posterPointer.clientX - rect.left) / rect.width - .5) * 7;
      const y = ((posterPointer.clientY - rect.top) / rect.height - .5) * 7;
      svg.style.setProperty('--paper-x', `${x.toFixed(2)}px`);
      svg.style.setProperty('--paper-y', `${y.toFixed(2)}px`);
      posterFrame = 0;
    });
  });
  posterStage.addEventListener('pointerleave', () => { svg.style.removeProperty('--paper-x'); svg.style.removeProperty('--paper-y'); });
  // Measure the real handwritten text before ordering the visible lines.
  svg.getBoundingClientRect();
  await document.fonts.ready;
  const handwriting = await handwritingRequest;
  if (handwriting) preparePosterHandwriting(svg, handwriting);
  const vocabulary = await vocabularyRequest;
  preparePosterWords(svg, vocabulary);
  startPosterEntrance();
}

function bindPosterAction(piece, label, activate) {
  piece.setAttribute('role', 'button');
  piece.setAttribute('tabindex', '0');
  piece.setAttribute('aria-label', label);
  piece.addEventListener('click', event => { event.stopPropagation(); activate(event); });
  piece.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (posterBurstLayer.firstElementChild) clearPosterBurst();
      else activate(event);
    }
  });
}

function preparePosterWords(svg, vocabulary) {
  svg.querySelectorAll('.poster-text-reveal').forEach(wrapper => {
    const text = wrapper.querySelector('text');
    const letters = Array.from(text.querySelectorAll('.poster-letter'));
    const source = text.textContent;
    if (!/[가-힣]/u.test(source)) return;
    wrapper.removeAttribute('role');
    wrapper.removeAttribute('aria-label');
    text.removeAttribute('aria-hidden');
    // Nest the existing letter spans, preserving spacing and every pen-path timing.
    let offset = 0;
    const positions = letters.map(letter => {
      const start = offset;
      offset += letter.textContent.length;
      letter.setAttribute('aria-hidden', 'true');
      return {letter, start};
    });
    for (const match of source.matchAll(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)) {
      const token = match[0];
      if (!/[가-힣]/u.test(token)) continue;
      const entry = vocabulary[token.toLowerCase()];
      if (!entry) throw new Error(`missing vocabulary: ${token}`);
      const word = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      word.classList.add('poster-word');
      word.dataset.word = token.toLowerCase();
      const language = 'ko';
      word.setAttribute('lang', language);
      const parts = positions.filter(part => part.start >= match.index && part.start < match.index + token.length);
      parts[0].letter.before(word);
      word.append(...parts.map(part => part.letter));
      const note = {...entry, korean: token, english: entry.meaning, language};
      bindPosterAction(word, `explore ${token}: ${entry.meaning}`, event => showPosterReaction(note, false, word, event));
    }
  });
}

function preparePosterHandwriting(svg, handwriting) {
  const namespace = 'http://www.w3.org/2000/svg';
  let maskIndex = 0;
  svg.querySelectorAll('.poster-text-reveal').forEach(wrapper => {
    const text = wrapper.querySelector('text');
    const size = parseFloat(getComputedStyle(text).fontSize);
    const font = handwriting.fonts[Number(getComputedStyle(text).fontWeight) >= 600 ? 'bold' : 'regular'];
    const layer = document.createElementNS(namespace, 'g');
    layer.classList.add('poster-pen-layer');
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('fill', getComputedStyle(text).fill);
    const definitions = document.createElementNS(namespace, 'defs');
    layer.append(definitions);
    let time = 0;
    text.querySelectorAll('.poster-letter').forEach(letter => {
      letter.style.setProperty('--letter-delay', `${time}s`);
      const glyph = font.glyphs[letter.textContent];
      if (!letter.textContent.trim()) { time += .025; return; }
      if (!glyph?.outline || !glyph.strokes.length) { time += .12; return; }
      const point = letter.getStartPositionOfChar(0);
      const position = document.createElementNS(namespace, 'g');
      position.setAttribute('transform', `translate(${point.x} ${point.y}) scale(${size / handwriting.unitsPerEm})`);
      const mask = document.createElementNS(namespace, 'mask');
      const id = `cherish-pen-${maskIndex++}`;
      mask.id = id;
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
      const pad = Math.max(...glyph.strokes.map(stroke => stroke.width));
      mask.setAttribute('x', glyph.bbox[0] - pad);
      mask.setAttribute('y', glyph.bbox[1] - pad);
      mask.setAttribute('width', glyph.bbox[2] - glyph.bbox[0] + pad * 2);
      mask.setAttribute('height', glyph.bbox[3] - glyph.bbox[1] + pad * 2);
      const duration = .055 + Math.min(size / 115, 1) * .2 + Math.min(glyph.strokes.length, 8) * .006;
      const weight = glyph.strokes.reduce((sum, stroke) => sum + Math.max(stroke.length, 30), 0);
      const inkTime = Math.max(duration * .55, duration - (glyph.strokes.length - 1) * .008);
      glyph.strokes.forEach(stroke => {
        const pen = document.createElementNS(namespace, 'path');
        const strokeTime = inkTime * Math.max(stroke.length, 30) / weight;
        pen.classList.add('poster-pen-stroke');
        pen.setAttribute('d', stroke.d);
        pen.setAttribute('fill', 'none');
        pen.setAttribute('stroke', 'white');
        pen.setAttribute('stroke-width', stroke.width);
        pen.setAttribute('stroke-linecap', 'round');
        pen.setAttribute('stroke-linejoin', 'round');
        pen.setAttribute('pathLength', '1');
        pen.style.setProperty('--pen-delay', `${time}s`);
        pen.style.setProperty('--pen-duration', `${strokeTime}s`);
        mask.append(pen);
        time += strokeTime + .008;
      });
      definitions.append(mask);
      const ink = document.createElementNS(namespace, 'path');
      ink.setAttribute('d', glyph.outline);
      ink.setAttribute('mask', `url(#${id})`);
      position.append(ink);
      layer.append(position);
      letter.classList.add('has-pen-path');
      time += .025;
    });
    wrapper.append(layer);
    wrapper.dataset.revealDuration = Math.ceil(time * 1000 + 180);
    wrapper.style.setProperty('--reveal-duration', `${wrapper.dataset.revealDuration}ms`);
  });
}

loadMovingPoster().catch(() => {
  finishPosterEntrance();
  document.querySelector('.poster-toolbar > span').textContent = 'the original poster · interactive words are unavailable';
  posterMotion.hidden = true;
  posterReplay.hidden = true;
});
