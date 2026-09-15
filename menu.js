'use strict';

(() => {
  const drawer = document.getElementById('menuDrawer');
  const overlay = document.getElementById('menuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const closeMenu = document.getElementById('closeDrawerBtn');
  const sheet = document.getElementById('productSheet');
  const gallery = document.getElementById('previewGallery');
  const dots = document.getElementById('previewDots');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const background = [...document.querySelectorAll('.hero, .topbar, main, footer, .carousel-section')];
  const links = [...document.querySelectorAll('#catnav a')];
  const sections = [...document.querySelectorAll('section.category')];
  let savedScroll = 0;
  let savedBodyStyle;
  let opener;
  let closing = false;
  let closeTimer;

  // One shared scroll lock for either overlay; restore inline styles and position.
  function lockPage() {
    savedScroll = window.scrollY;
    savedBodyStyle = document.body.getAttribute('style');
    Object.assign(document.body.style, {position: 'fixed', top: `-${savedScroll}px`, width: '100%', overflow: 'hidden'});
    background.forEach(element => { element.inert = true; });
  }
  function unlockPage() {
    if (savedBodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', savedBodyStyle);
    background.forEach(element => { element.inert = false; });
    window.scrollTo({top: savedScroll, behavior: 'instant'});
  }
  function closeDrawer(restoreFocus = true) {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    drawer.inert = true;
    unlockPage();
    if (restoreFocus) hamburger.focus({preventScroll: true});
  }
  hamburger.addEventListener('click', () => {
    if (sheet.open) return;
    if (drawer.classList.contains('open')) return closeDrawer();
    lockPage();
    drawer.inert = false;
    drawer.classList.add('open');
    overlay.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    closeMenu.focus({preventScroll: true});
  });
  closeMenu.addEventListener('click', () => closeDrawer());
  overlay.addEventListener('click', () => closeDrawer());
  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
    if (event.key !== 'Tab') return;
    const last = links[links.length - 1];
    if (event.shiftKey && document.activeElement === closeMenu) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); closeMenu.focus(); }
  });
  links.forEach(link => link.addEventListener('click', () => {
    closeDrawer(false);
    const target = document.getElementById(link.hash.slice(1));
    if (target) { target.tabIndex = -1; target.focus({preventScroll: true}); }
  }));
  function updateCategory() {
    let current = '';
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 95) current = section.id; });
    links.forEach(link => {
      const active = link.hash === '#' + current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', updateCategory, {passive: true});
  updateCategory();

  const imagePaths = item => (item.dataset.images || '').split(',').map(path => path.trim()).filter(Boolean).slice(0, 2);
  const camera = '<svg class="photo-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>';
  document.querySelectorAll('.item-preview').forEach(item => {
    if (!imagePaths(item).length) {
      item.classList.remove('item-preview');
      item.removeAttribute('role');
      item.removeAttribute('tabindex');
      return;
    }
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.setAttribute('aria-haspopup', 'dialog');
    item.setAttribute('aria-controls', 'productSheet');
    item.setAttribute('aria-expanded', 'false');
    const name = item.querySelector('.item-name');
    item.setAttribute('aria-label', `Ver imagen de ${name.textContent.trim()}`);
    name.insertAdjacentHTML('beforeend', camera);
  });

  // Real image dimensions create scrollable space; no centered CSS transform clipping.
  function zoomDimensions(width, height, naturalWidth, naturalHeight) {
    const fit = Math.min(width / naturalWidth, height / naturalHeight);
    const imageWidth = naturalWidth * fit * 2.5;
    const imageHeight = naturalHeight * fit * 2.5;
    return {imageWidth, imageHeight, width: Math.max(width, imageWidth), height: Math.max(height, imageHeight)};
  }
  function resetZoom() {
    gallery.querySelectorAll('.image-viewport.is-zoomed').forEach(viewport => {
      viewport.classList.remove('is-zoomed', 'is-dragging');
      viewport.querySelector('.image-surface').removeAttribute('style');
      viewport.querySelector('img').removeAttribute('style');
      viewport.scrollTo({left: 0, top: 0, behavior: 'instant'});
      const button = viewport.parentElement.querySelector('.image-zoom-button');
      button.textContent = 'Ampliar';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Ampliar imagen');
    });
    gallery.classList.remove('has-zoom');
  }
  function configureImageZoom(slide, image) {
    const viewport = document.createElement('div');
    viewport.className = 'image-viewport';
    const surface = document.createElement('div');
    surface.className = 'image-surface';
    surface.appendChild(image);
    viewport.appendChild(surface);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'image-zoom-button';
    button.textContent = 'Ampliar';
    button.setAttribute('aria-label', 'Ampliar imagen');
    button.setAttribute('aria-pressed', 'false');
    button.disabled = true;
    image.draggable = false;
    const ready = () => { button.disabled = !image.naturalWidth; };
    image.addEventListener('load', ready);
    image.addEventListener('error', () => { button.hidden = true; viewport.hidden = true; resetZoom(); });
    if (image.complete) ready();
    function toggleZoom() {
      if (image.hidden || !image.naturalWidth) return;
      if (viewport.classList.contains('is-zoomed')) { resetZoom(); return; }
      resetZoom();
      const size = zoomDimensions(viewport.clientWidth, viewport.clientHeight, image.naturalWidth, image.naturalHeight);
      surface.style.width = `${size.width}px`;
      surface.style.height = `${size.height}px`;
      image.style.width = `${size.imageWidth}px`;
      image.style.height = `${size.imageHeight}px`;
      viewport.classList.add('is-zoomed');
      gallery.classList.add('has-zoom');
      viewport.scrollTo({left: (size.width - viewport.clientWidth) / 2, top: (size.height - viewport.clientHeight) / 2, behavior: 'instant'});
      button.textContent = 'Reducir';
      button.setAttribute('aria-label', 'Reducir imagen. Puedes desplazarla con el dedo, el ratón o las flechas');
      button.setAttribute('aria-pressed', 'true');
    }
    button.addEventListener('click', toggleZoom);
    let pointer = null;
    let moved = false;
    viewport.addEventListener('pointerdown', event => {
      moved = false;
      if (!event.isPrimary || event.button !== 0) return;
      pointer = {id: event.pointerId, x: event.clientX, y: event.clientY,
        left: viewport.scrollLeft, top: viewport.scrollTop,
        drag: event.pointerType === 'mouse' && viewport.classList.contains('is-zoomed')};
    });
    viewport.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (!pointer.drag || !moved) return;
      if (!viewport.hasPointerCapture(event.pointerId)) viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      viewport.scrollLeft = pointer.left - dx;
      viewport.scrollTop = pointer.top - dy;
    });
    function endPointer(event) {
      if (event.type === 'pointercancel') moved = true;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      viewport.classList.remove('is-dragging');
      pointer = null;
    }
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);
    viewport.addEventListener('click', event => {
      if (!moved && event.target === image) toggleZoom();
    });
    slide.append(viewport, button);
  }
  // On rotation/resize return to a complete, correctly fitted image.
  new ResizeObserver(() => resetZoom()).observe(gallery);

  function selectDot(index) {
    [...dots.children].forEach((dot, i) => {
      dot.setAttribute('aria-pressed', String(i === index));
    });
  }
  function openPreview(item, source = item) {
    const paths = imagePaths(item);
    if (!paths.length || sheet.open || closing) return;
    closeDrawer(false);
    opener = source;
    const name = item.querySelector('.item-name').textContent.trim();
    document.getElementById('previewName').textContent = name;
    document.getElementById('previewPrice').textContent = `S/ ${item.querySelector('.item-price').textContent.trim()}`;
    document.getElementById('previewCategory').textContent = item.closest('.category').querySelector('h2').textContent;
    const description = document.getElementById('previewDescription');
    description.textContent = item.dataset.description || item.querySelector('.item-desc')?.textContent || '';
    description.hidden = !description.textContent;
    resetZoom();
    gallery.replaceChildren();
    dots.replaceChildren();
    dots.hidden = paths.length < 2;
    paths.forEach((path, index) => {
      const slide = document.createElement('div');
      slide.className = 'preview-slide';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-label', `Imagen ${index + 1} de ${paths.length}`);
      const image = document.createElement('img');
      image.width = 900;
      image.height = 900;
      image.alt = path.includes('placeholder.svg') ? `Fotografía de ${name} por añadir` : `${name}, imagen referencial ${index + 1}`;
      image.decoding = 'async';
      image.loading = index ? 'lazy' : 'eager';
      image.addEventListener('error', () => {
        image.hidden = true;
        const fallback = document.createElement('p');
        fallback.className = 'image-fallback';
        fallback.textContent = 'La fotografía no está disponible en este momento.';
        slide.appendChild(fallback);
      }, {once: true});
      image.src = path;
      configureImageZoom(slide, image);
      gallery.appendChild(slide);
      if (paths.length > 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Ver fotografía ${index + 1}`);
        dot.addEventListener('click', () => {
          resetZoom();
          gallery.scrollTo({left: index * gallery.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
        });
        dots.appendChild(dot);
      }
    });
    selectDot(0);
    lockPage();
    opener.setAttribute('aria-expanded', 'true');
    sheet.showModal(); // Native modal supplies focus trapping and background isolation.
    gallery.scrollLeft = 0;
    sheet.scrollTop = 0;
  }
  document.addEventListener('click', event => {
    const product = event.target.closest('.item-preview');
    if (product) openPreview(product);
    // Optional future recommendation cards refer to the existing product id.
    const card = event.target.closest('[data-preview-target]');
    if (card) {
      const target = document.getElementById(card.dataset.previewTarget);
      if (target && imagePaths(target).length) { event.preventDefault(); openPreview(target, card); }
    }
  });
  document.addEventListener('keydown', event => {
    const product = event.target.closest('.item-preview');
    if (product && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openPreview(product); }
  });
  gallery.addEventListener('scroll', () => selectDot(Math.round(gallery.scrollLeft / gallery.clientWidth)), {passive: true});
  gallery.addEventListener('keydown', event => {
    const zoomed = gallery.querySelector('.image-viewport.is-zoomed');
    if (zoomed && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      zoomed.scrollBy({left: event.key === 'ArrowLeft' ? -80 : event.key === 'ArrowRight' ? 80 : 0,
        top: event.key === 'ArrowUp' ? -80 : event.key === 'ArrowDown' ? 80 : 0,
        behavior: reducedMotion.matches ? 'instant' : 'smooth'});
      return;
    }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    gallery.scrollBy({left: (event.key === 'ArrowRight' ? 1 : -1) * gallery.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  });
  function finishClose() {
    resetZoom();
    clearTimeout(closeTimer);
    sheet.classList.remove('closing');
    closing = false;
    unlockPage();
    opener?.setAttribute('aria-expanded', 'false');
    opener?.focus({preventScroll: true});
  }
  function closePreview() {
    if (!sheet.open || closing) return;
    closing = true;
    sheet.classList.add('closing');
    closeTimer = setTimeout(() => sheet.close(), reducedMotion.matches ? 0 : 180);
  }
  sheet.querySelector('.sheet-close').addEventListener('click', closePreview);
  sheet.addEventListener('cancel', event => { event.preventDefault(); closePreview(); });
  sheet.addEventListener('close', finishClose);
  let backdropDown = false;
  const outsideSheet = event => {
    const rect = sheet.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  sheet.addEventListener('pointerdown', event => { backdropDown = event.target === sheet && outsideSheet(event); });
  sheet.addEventListener('click', event => {
    if (backdropDown && event.target === sheet && outsideSheet(event)) closePreview();
    backdropDown = false;
  });
})();
