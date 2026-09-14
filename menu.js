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
      slide.appendChild(image);
      gallery.appendChild(slide);
      if (paths.length > 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Ver fotografía ${index + 1}`);
        dot.addEventListener('click', () => gallery.scrollTo({left: index * gallery.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth'}));
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
  gallery.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      e.target.classList.toggle('zoomed');
    }
  });
  gallery.addEventListener('scroll', () => selectDot(Math.round(gallery.scrollLeft / gallery.clientWidth)), {passive: true});
  gallery.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    gallery.scrollBy({left: (event.key === 'ArrowRight' ? 1 : -1) * gallery.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  });
  function finishClose() {
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
