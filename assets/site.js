document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealElements = document.querySelectorAll('.reveal');

if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  revealElements.forEach(element => element.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealElements.forEach(element => observer.observe(element));
}

document.querySelectorAll('[data-motion-piece]').forEach(piece => {
  const image = piece.querySelector('img');
  const button = piece.querySelector('[data-motion-toggle]');
  const still = image.dataset.stillSrc;
  const animated = image.dataset.motionSrc;
  let playing = !reducedMotion.matches;

  function setPlaying(nextPlaying) {
    playing = nextPlaying;
    image.src = playing ? animated : still;
    button.textContent = playing ? 'pause gif' : 'play gif';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'pause the sample gif' : 'play the sample gif');
  }

  setPlaying(playing);
  button.addEventListener('click', () => setPlaying(!playing));
  reducedMotion.addEventListener('change', event => {
    if (event.matches) setPlaying(false);
  });
});

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const hero = document.querySelector('.hero');
const cursorHalo = document.createElement('div');
cursorHalo.className = 'cursor-halo';
cursorHalo.setAttribute('aria-hidden', 'true');
document.body.append(cursorHalo);

let pointerFrame = 0;
let latestPointer;
let heroActive = false;

function resetHeroPointer() {
  if (!heroActive) return;
  ['--tilt-x', '--tilt-y', '--light-x', '--light-y', '--point-x', '--point-y']
    .forEach(property => hero.style.removeProperty(property));
  heroActive = false;
}

function resetPointerEffects() {
  cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  cursorHalo.classList.remove('is-visible', 'is-interactive');
  resetHeroPointer();
}

function updatePointerEffects() {
  pointerFrame = 0;
  const { clientX: x, clientY: y, target } = latestPointer;
  cursorHalo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  cursorHalo.classList.add('is-visible');
  cursorHalo.classList.toggle('is-interactive', Boolean(target.closest('a, button, video, [role="button"]')));

  if (hero) {
    const rect = hero.getBoundingClientRect();
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (inside) {
      const nx = (x - rect.left) / rect.width - 0.5;
      const ny = (y - rect.top) / rect.height - 0.5;
      hero.style.setProperty('--tilt-x', `${(-ny * 6).toFixed(2)}deg`);
      hero.style.setProperty('--tilt-y', `${(nx * 10).toFixed(2)}deg`);
      hero.style.setProperty('--light-x', `${42 + nx * 34}%`);
      hero.style.setProperty('--light-y', `${36 + ny * 24}%`);
      hero.style.setProperty('--point-x', `${nx * 14}px`);
      hero.style.setProperty('--point-y', `${ny * 14}px`);
      heroActive = true;
    } else {
      resetHeroPointer();
    }
  }

  const row = target.closest('.topic-row, .playlist-card');
  if (row) {
    const rect = row.getBoundingClientRect();
    row.style.setProperty('--hover-x', `${x - rect.left}px`);
    row.style.setProperty('--hover-y', `${y - rect.top}px`);
  }
}

document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) {
    resetPointerEffects();
    return;
  }
  latestPointer = event;
  if (!pointerFrame) pointerFrame = requestAnimationFrame(updatePointerEffects);
}, { passive: true });

document.documentElement.addEventListener('pointerleave', resetPointerEffects);
window.addEventListener('blur', resetPointerEffects);
window.addEventListener('scroll', resetPointerEffects, { passive: true });
finePointer.addEventListener('change', resetPointerEffects);
reducedMotion.addEventListener('change', resetPointerEffects);

const soundDock = document.createElement('div');
soundDock.className = 'sound-dock';
soundDock.setAttribute('role', 'region');
soundDock.setAttribute('aria-label', 'ambient sound');
soundDock.innerHTML = '<div class="sound-controls"><button class="sound-toggle" type="button" data-sound-toggle aria-label="play ambient sound"><span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span data-sound-label>sound off</span></button><input class="sound-volume" type="range" min="0" max="1" step="0.05" value="0.45" aria-label="ambient volume" title="ambient volume"></div><p class="sound-credit">soft room · synthetic ambient loop</p>';
document.body.append(soundDock);

const ambientAudio = document.createElement('audio');
ambientAudio.src = '/philia/assets/audio/philia-ambient.mp3';
ambientAudio.preload = 'none';
ambientAudio.loop = true;
ambientAudio.hidden = true;
document.body.append(ambientAudio);
const volumeControl = soundDock.querySelector('.sound-volume');
const savedSound = JSON.parse(sessionStorage.getItem('philia.sound') || 'null');
ambientAudio.volume = savedSound?.volume ?? 0.45;
volumeControl.value = ambientAudio.volume;

function updateSoundControls() {
  const playing = !ambientAudio.paused;
  soundDock.classList.toggle('sound-is-playing', playing);
  document.querySelectorAll('[data-sound-toggle]').forEach(button => {
    button.setAttribute('aria-label', playing ? 'pause ambient sound' : 'play ambient sound');
    button.querySelector('[data-sound-label]').textContent = playing ? 'sound on' : 'sound off';
  });
}

document.addEventListener('click', async event => {
  if (!event.target.closest('[data-sound-toggle]')) return;
  if (!ambientAudio.paused) {
    ambientAudio.pause();
  } else {
    try {
      await ambientAudio.play();
    } catch {
      document.querySelectorAll('[data-sound-label]').forEach(label => { label.textContent = 'tap to try sound'; });
    }
  }
});
volumeControl.addEventListener('input', () => { ambientAudio.volume = Number(volumeControl.value); });
ambientAudio.addEventListener('play', updateSoundControls);
ambientAudio.addEventListener('pause', updateSoundControls);
ambientAudio.addEventListener('loadedmetadata', () => {
  if (savedSound) ambientAudio.currentTime = savedSound.time % ambientAudio.duration;
}, {once: true});
window.addEventListener('pagehide', () => {
  sessionStorage.setItem('philia.sound', JSON.stringify({playing: !ambientAudio.paused, volume: ambientAudio.volume, time: ambientAudio.currentTime}));
});
if (savedSound?.playing) ambientAudio.play().catch(updateSoundControls);
