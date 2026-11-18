function openExpandedPlayer(player, video, opener) {
  const closeButton = player.querySelector('[data-clip-view-close]');
  if (!closeButton || !video.isConnected || player.classList.contains('clip-view-expanded')) return;

  const inerted = [];
  for (let region = player; region.parentElement && region !== document.body; region = region.parentElement) {
    for (const sibling of region.parentElement.children) {
      if (sibling !== region && sibling instanceof HTMLElement && !sibling.inert) {
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
  }
  const overflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  player.classList.add('clip-view-expanded');
  player.setAttribute('role', 'dialog');
  player.setAttribute('aria-modal', 'true');
  player.setAttribute('aria-label', 'Полноэкранный просмотр клипа');
  closeButton.hidden = false;

  function close() {
    observer.disconnect();
    document.removeEventListener('keydown', onKey, true);
    closeButton.removeEventListener('click', close);
    player.classList.remove('clip-view-expanded');
    player.removeAttribute('role');
    player.removeAttribute('aria-modal');
    player.removeAttribute('aria-label');
    closeButton.hidden = true;
    for (const sibling of inerted) sibling.inert = false;
    document.body.style.overflow = overflow;
    if (opener.isConnected) opener.focus();
  }
  function onKey(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }
  const observer = new MutationObserver(() => { if (!video.isConnected) close(); });
  observer.observe(document.body, { childList: true, subtree: true });
  closeButton.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  closeButton.focus();
}

export function enterClipFullscreen(opener) {
  const player = opener.closest('[data-clip-view]')?.querySelector('[data-clip-player]');
  const video = player?.querySelector('video');
  if (!video || document.fullscreenElement === video) return;
  const expand = () => openExpandedPlayer(player, video, opener);

  try {
    if (document.fullscreenEnabled && video.requestFullscreen) {
      void video.requestFullscreen().catch(expand);
      return;
    }
    if (typeof video.webkitEnterFullscreen === 'function' && video.webkitSupportsFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }
  } catch {
    // A platform request can be rejected when embedded or before the video is ready.
  }
  expand();
}

if (typeof document !== 'undefined' && document.body?.hasAttribute('data-guest-clip-page')) {
  for (const button of document.querySelectorAll('[data-open-clip-view]')) {
    button.addEventListener('click', () => enterClipFullscreen(button));
  }
}
