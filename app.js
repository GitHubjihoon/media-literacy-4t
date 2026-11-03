(() => {
  'use strict';
  const slides = window.SLIDES;
  const $ = (id) => document.getElementById(id);
  const titles = ['보이는 게 전부일까?', '수업 전 사전 설문 조사', '오늘 배울 내용', 'AI와 함께 표현하기', '미디어란 무엇일까?', '이야기를 전해주는 도구', '우리 곁의 미디어', '모든 정보가 진짜일까?', '미디어 맞히기 게임', '미디어 맞히기 · 정답', '사실과 의견', '사실이란 무엇일까요?', '의견이란 무엇일까요?', '퀴즈 1 · 주스 광고', '퀴즈 1 · 정답', '퀴즈 2 · 날씨 뉴스', '퀴즈 2 · 정답', '퀴즈 3 · 초콜릿 영상', '퀴즈 3 · 정답', '진짜 뉴스와 가짜 뉴스', '진짜 뉴스란?', '가짜 뉴스의 특징', '뉴스 탐정이 되어보아요', '미디어 속 진짜·가짜 비교', '한 번 더 확인해요', '나만의 확인 문장', '가짜 뉴스 만들기 & 바로잡기', '진짜 뉴스로 고치기', '우리 함께 뉴스를 만들어요', '뉴스 만화 만들기', '미디어와 친해지는 한걸음', '내가 미디어를 만든다고?', '나도 미디어 생산자', '어떤 미디어를 만들까요?', '미디어 생산자의 약속', '따뜻한 표현으로 바꾸기', '책임 있는 미디어 생산자', '미디어를 만드는 마음', '우리 반 미디어 다짐문', '수업 이후 사후 설문 조사', '똑똑한 미디어 시민', '수업 마무리'];
  const count = slides.length;
  let current = 0;
  let loadTimer, toastTimer, thumbnailsBuilt = false;
  const stage = $('stage'), img = $('slide'), input = $('page-input'), remote = $('remote');
  const previousImg = $('slide-previous');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const imageCache = new Map();
  let displayedIndex = 0, renderVersion = 0, transitionVersion = 0;
  let activeAnimations = [];
  input.max = count;
  document.querySelector('.page-total').textContent = `/ ${count}`;
  $('total-label').textContent = count;
  const progress = document.querySelector('.progress-track');
  progress.setAttribute('aria-valuemax', count);

  function notify(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }
  function fromHash() {
    const value = new URLSearchParams(location.hash.slice(1)).get('page');
    const page = Number(value);
    return Number.isInteger(page) && page >= 1 && page <= count ? page - 1 : 0;
  }
  function setHash() {
    const hash = `#page=${current + 1}`;
    if (location.hash === hash) return;
    // Also works when index.html is opened directly from disk.
    try { history.replaceState(null, '', hash); }
    catch { location.hash = hash; }
  }
  function markThumbnails() {
    if (!thumbnailsBuilt) return;
    $('thumbnail-grid').querySelectorAll('button').forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  function loadImage(index, force = false) {
    if (force) imageCache.delete(index);
    if (!imageCache.has(index)) {
      const promise = new Promise((resolve, reject) => {
        const buffer = new Image();
        buffer.onload = () => resolve(buffer);
        buffer.onerror = () => reject(new Error('Slide image could not be loaded'));
        buffer.src = slides[index].src + (force ? `?retry=${Date.now()}` : '');
      });
      // A failed preload must be retryable without leaving a rejected cache entry.
      imageCache.set(index, promise);
      promise.catch(() => { if (imageCache.get(index) === promise) imageCache.delete(index); });
    }
    return imageCache.get(index);
  }
  async function renderSlide(index, animate, force = false) {
    const version = ++renderVersion;
    clearTimeout(loadTimer);
    $('load-state').textContent = '';
    $('image-error').hidden = true;
    stage.setAttribute('aria-busy', 'true');
    loadTimer = setTimeout(() => { $('load-state').textContent = '슬라이드 불러오는 중…'; }, 250);
    try {
      const buffer = await loadImage(index, force);
      if (version !== renderVersion) return;
      clearTimeout(loadTimer);
      $('load-state').textContent = '';
      stage.setAttribute('aria-busy', 'false');
      const direction = index >= displayedIndex ? 1 : -1;
      const doAnimate = animate && index !== displayedIndex && !reducedMotion.matches && typeof img.animate === 'function';
      const transition = ++transitionVersion;
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations = [];
      previousImg.hidden = true;
      if (doAnimate) {
        previousImg.src = img.src;
        previousImg.hidden = false;
      }
      img.src = buffer.src;
      img.alt = `${index + 1}페이지 · ${titles[index]}${slides[index].text ? '\n' + slides[index].text : ''}`;
      displayedIndex = index;
      stage.dataset.displayedPage = index + 1;
      if (doAnimate) {
        const timing = { duration: 440, easing: 'cubic-bezier(.22,.7,.22,1)', fill: 'both' };
        activeAnimations = [
          previousImg.animate([
            { transform: 'translateX(0) scale(1)', opacity: 1 },
            { transform: `translateX(${-direction * 9}%) scale(.985)`, opacity: 0 }
          ], timing),
          img.animate([
            { transform: `translateX(${direction * 12}%) scale(.985)`, opacity: 0 },
            { transform: 'translateX(0) scale(1)', opacity: 1 }
          ], timing)
        ];
        Promise.allSettled(activeAnimations.map((animation) => animation.finished)).then(() => {
          if (transition !== transitionVersion) return;
          previousImg.hidden = true;
          activeAnimations.forEach((animation) => animation.cancel());
          activeAnimations = [];
        });
      }
    } catch {
      if (version !== renderVersion) return;
      clearTimeout(loadTimer);
      $('load-state').textContent = '';
      stage.setAttribute('aria-busy', 'false');
      $('image-error').hidden = false;
    }
  }
  function goTo(index, updateHash = true, animate = true) {
    current = Math.max(0, Math.min(count - 1, index));
    renderSlide(current, animate);
    input.value = current + 1;
    input.setCustomValidity('');
    $('current-label').textContent = String(current + 1).padStart(2, '0');
    $('restore-page').textContent = `${current + 1} / ${count}`;
    $('slide-title').textContent = titles[current];
    $('prev').disabled = current === 0;
    $('next').disabled = current === count - 1;
    $('progress').style.width = `${(current + 1) / count * 100}%`;
    progress.setAttribute('aria-valuenow', current + 1);
    $('announcement').textContent = `${count}페이지 중 ${current + 1}페이지. ${titles[current]}`;
    document.title = `${current + 1}/${count} · 보이는 게 전부일까?`;
    markThumbnails();
    if (updateHash) setHash();
    // Preload only adjacent slides so the first visit stays lightweight.
    [current - 1, current + 1].forEach((i) => { if (slides[i]) loadImage(i).catch(() => {}); });
  }
  $('retry').addEventListener('click', () => renderSlide(current, true, true));
  $('prev').addEventListener('click', () => goTo(current - 1));
  $('next').addEventListener('click', () => goTo(current + 1));
  input.addEventListener('input', () => input.setCustomValidity(''));
  input.addEventListener('focus', () => input.select());
  $('page-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const page = Number(input.value);
    if (!Number.isInteger(page) || page < 1 || page > count) {
      input.setCustomValidity(`1부터 ${count}까지의 페이지 번호를 입력하세요.`);
      input.reportValidity(); return;
    }
    goTo(page - 1);
    input.blur(); stage.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => goTo(fromHash(), false));

  let pointerStart = null, suppressClickUntil = 0;
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId, type: event.pointerType };
  });
  stage.addEventListener('pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goTo(current + (dx < 0 ? 1 : -1));
      suppressClickUntil = Date.now() + 500;
    } else if (Math.abs(dx) > 15 || Math.abs(dy) > 15) suppressClickUntil = Date.now() + 500;
    pointerStart = null;
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; suppressClickUntil = Date.now() + 500; });
  stage.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) return;
    const rect = stage.getBoundingClientRect();
    goTo(current + (event.clientX - rect.left < rect.width * 0.25 ? -1 : 1));
  });

  function showOverview() {
    if (!thumbnailsBuilt) {
      const fragment = document.createDocumentFragment();
      slides.forEach((slide, i) => {
        const button = document.createElement('button');
        button.className = 'thumbnail';
        button.setAttribute('aria-label', `${i + 1}페이지. ${titles[i]}`);
        const thumb = document.createElement('img');
        thumb.src = slide.thumb || slide.src; thumb.alt = ''; thumb.loading = 'lazy'; thumb.decoding = 'async';
        const caption = document.createElement('div'); caption.className = 'thumbnail-caption';
        const number = document.createElement('b'); number.textContent = String(i + 1).padStart(2, '0');
        const title = document.createElement('span'); title.textContent = titles[i];
        caption.append(number, title); button.append(thumb, caption);
        button.addEventListener('click', () => { goTo(i); $('overview-dialog').close(); stage.focus({ preventScroll: true }); });
        fragment.append(button);
      });
      $('thumbnail-grid').append(fragment); thumbnailsBuilt = true;
    }
    markThumbnails();
    $('overview-dialog').showModal();
    const active = $('thumbnail-grid').children[current];
    active.focus({ preventScroll: true });
    active.scrollIntoView({ block: 'nearest' });
  }
  $('overview').addEventListener('click', showOverview);
  $('help').addEventListener('click', () => $('help-dialog').showModal());
  document.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  }));

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else notify('이 브라우저에서는 전체 화면을 지원하지 않습니다.');
    } catch { notify('전체 화면을 시작할 수 없습니다. 브라우저 설정을 확인해 주세요.'); }
  }
  $('fullscreen').addEventListener('click', fullscreen);
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? '전체 화면 종료' : '전체 화면';
    $('fullscreen').setAttribute('aria-label', label);
    $('fullscreen').title = `${label} (F)`;
    requestAnimationFrame(clampRemote);
  });
  $('share').addEventListener('click', async () => {
    if (location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname)) {
      notify('GitHub Pages에 게시한 뒤 공유 링크를 복사할 수 있습니다.'); return;
    }
    try { await navigator.clipboard.writeText(location.href); notify(`${current + 1}페이지 링크를 복사했습니다.`); }
    catch { notify('주소창의 링크를 복사해 주세요. 현재 페이지 번호가 포함되어 있습니다.'); }
  });

  let lastKey = 0;
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.target.closest('input,textarea,select,[contenteditable="true"]') || document.querySelector('dialog[open]')) return;
    if ((event.code === 'Space' || event.key === 'Enter') && event.target.closest('button,a')) return;
    let target;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key) || (event.code === 'Space' && !event.shiftKey)) target = current + 1;
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key) || (event.code === 'Space' && event.shiftKey)) target = current - 1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = count - 1;
    else if (event.key === 'Enter' && event.target === stage) target = current + 1;
    if (target !== undefined) {
      event.preventDefault();
      if (event.repeat && Date.now() - lastKey < 150) return;
      lastKey = Date.now(); goTo(target); return;
    }
    if (!event.repeat && event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
    if (!event.repeat && event.key.toLowerCase() === 'g') { event.preventDefault(); showOverview(); }
    if (!event.repeat && event.key === '?') { event.preventDefault(); $('help-dialog').showModal(); }
    if (!event.repeat && event.key.toLowerCase() === 'r') { event.preventDefault(); remote.hidden ? showRemote() : hideRemote(); }
  });

  let drag = null;
  function clampRemote() {
    if (!remote.style.left || remote.hidden) return;
    const rect = remote.getBoundingClientRect();
    remote.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - rect.width - 8))}px`;
    remote.style.top = `${Math.max(8, Math.min(rect.top, innerHeight - rect.height - 8))}px`;
    remote.classList.toggle('tools-below', remote.getBoundingClientRect().top < 64);
  }
  function resetRemote() { remote.removeAttribute('style'); remote.classList.remove('tools-below'); }
  $('drag-handle').addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const rect = remote.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    remote.style.left = `${rect.left}px`; remote.style.top = `${rect.top}px`;
    remote.style.bottom = 'auto'; remote.style.transform = 'none';
    remote.classList.add('dragging');
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  $('drag-handle').addEventListener('pointermove', (event) => {
    if (!drag) return;
    remote.style.left = `${event.clientX - drag.x}px`;
    remote.style.top = `${event.clientY - drag.y}px`;
    clampRemote();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => $('drag-handle').addEventListener(name, () => {
    drag = null; remote.classList.remove('dragging');
  }));
  $('drag-handle').addEventListener('dblclick', resetRemote);
  $('reset-remote').addEventListener('click', () => { resetRemote(); $('help-dialog').close(); notify('리모컨 위치를 초기화했습니다.'); });
  $('compact').addEventListener('click', () => {
    const compact = remote.classList.toggle('compact');
    $('compact').setAttribute('aria-expanded', String(!compact));
    $('compact').setAttribute('aria-label', compact ? '추가 도구 펼치기' : '추가 도구 접기');
    $('compact').title = compact ? '전체 화면 · 목록 · 링크 · 숨기기' : '추가 도구 접기';
    $('compact').querySelector('use').setAttribute('href', compact ? '#i-more' : '#i-minus');
    clampRemote();
  });
  let idleTimer;
  function hideRemote() {
    if (drag) return;
    const hadFocus = remote.contains(document.activeElement);
    remote.hidden = true;
    $('restore-remote').hidden = false;
    document.body.classList.add('controls-hidden');
    if (hadFocus) $('restore-remote').focus({ preventScroll: true });
  }
  function showRemote() {
    remote.hidden = false;
    $('restore-remote').hidden = true;
    document.body.classList.remove('controls-hidden');
    clampRemote();
    scheduleHide();
  }
  function scheduleHide() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (remote.hidden || drag || remote.matches(':hover') || remote.contains(document.activeElement) || document.querySelector('dialog[open]')) return;
      hideRemote();
    }, 3200);
  }
  $('hide-remote').addEventListener('click', hideRemote);
  $('restore-remote').addEventListener('click', () => {
    showRemote();
    $('compact').focus({ preventScroll: true });
  });
  document.addEventListener('pointermove', scheduleHide, { passive: true });
  document.addEventListener('pointerdown', scheduleHide, { passive: true });
  document.addEventListener('keydown', scheduleHide);
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('close', scheduleHide));
  scheduleHide();
  window.addEventListener('resize', clampRemote);
  goTo(fromHash(), true, false);
})();
