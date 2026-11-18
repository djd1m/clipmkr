'use strict';

const video = document.querySelector('video');
const caption = document.querySelector('.captions');
const toggle = document.querySelector('#toggle-captions');
const fullscreen = document.querySelector('#fullscreen');
const frame = document.querySelector('.frame');
const problem = document.querySelector('#problem');
let enabled = true;
let cues = [];

function updateCaption() {
  const current = cues.find(cue => video.currentTime >= cue.start && video.currentTime < cue.end);
  caption.textContent = enabled ? current?.text ?? '' : 'Субтитры выключены';
}

toggle.addEventListener('click', () => {
  enabled = !enabled;
  toggle.setAttribute('aria-pressed', String(enabled));
  caption.classList.toggle('text-off', !enabled);
  updateCaption();
});
for (const event of ['timeupdate', 'seeking', 'seeked', 'loadedmetadata']) {
  video.addEventListener(event, updateCaption);
}
if (document.fullscreenEnabled && frame.requestFullscreen) {
  video.setAttribute('controlslist', 'nofullscreen');
  fullscreen.hidden = false;
  fullscreen.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Выйти из полного экрана' : 'На весь экран';
  });
}

const slug = new URLSearchParams(location.search).get('episode');
fetch('playback.json')
  .then(response => {
    if (!response.ok) throw new Error('playlist is unavailable');
    return response.json();
  })
  .then(playlist => {
    const episode = playlist.find(candidate => candidate.slug === slug);
    if (!episode) throw new Error('episode is not listed');
    cues = episode.cues;
    video.src = episode.media;
    video.setAttribute('aria-label', episode.title);
    toggle.disabled = false;
    updateCaption();
  })
  .catch(() => {
    problem.hidden = false;
  });
