(function () {
  'use strict';
  var root = document.documentElement;
  function translateExtras() {
    var language = root.lang === 'ru' ? 'ru' : 'en';
    document.querySelectorAll('[data-en][data-ru]').forEach(function (node) {
      // These two strings are authored in this file's HTML, never user input.
      node.innerHTML = node.getAttribute('data-' + language);
    });
    document.querySelectorAll('[data-setlang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.setlang === language));
    });
    alignPortraitToPaper();
  }
  document.querySelectorAll('[data-setlang]').forEach(function (button) {
    button.addEventListener('click', translateExtras);
  });
  translateExtras();

  // The portrait shares the paper's exact lower and right edges; its head
  // remains free to extend above the sheet.
  var collage = document.querySelector('.hero__collage--portrait');
  var paper = document.querySelector('.portrait-paper');
  var portraitCrop = document.querySelector('.portrait-crop');
  function alignPortraitToPaper() {
    if (!collage || !paper || !portraitCrop) return;
    var w = paper.offsetWidth, h = paper.offsetHeight;
    var cx = paper.offsetLeft + w / 2, cy = paper.offsetTop + h / 2;
    var matrix = new DOMMatrix(getComputedStyle(paper).transform);
    function corner(x, y) {
      return { x:cx + matrix.a*x + matrix.c*y, y:cy + matrix.b*x + matrix.d*y };
    }
    var tr = corner(w/2, -h/2), br = corner(w/2, h/2), bl = corner(-w/2, h/2);
    var far = -2000;
    var rightAtTop = br.x + (far-br.y)*(tr.x-br.x)/(tr.y-br.y);
    var bottomAtLeft = br.y + (far-br.x)*(bl.y-br.y)/(bl.x-br.x);
    portraitCrop.style.clipPath = 'polygon('+far+'px '+far+'px,'+rightAtTop+'px '+far+'px,'+br.x+'px '+br.y+'px,'+far+'px '+bottomAtLeft+'px)';
    var caption = collage.querySelector('.collage__note');
    var head = collage.querySelector('.portrait-head-anchor');
    if (caption && head) {
      caption.style.top = '';
      var top = parseFloat(getComputedStyle(caption).top);
      var shift = head.getBoundingClientRect().top - 16 - caption.getBoundingClientRect().bottom;
      caption.style.top = (top + Math.min(0, shift)) + 'px';
    }
  }
  alignPortraitToPaper();
  if (collage && typeof ResizeObserver !== 'undefined') new ResizeObserver(alignPortraitToPaper).observe(collage);
  window.addEventListener('resize', alignPortraitToPaper);
  if (document.fonts) document.fonts.ready.then(alignPortraitToPaper);

  var tabs = Array.from(document.querySelectorAll('.project-tab'));
  var panels = Array.from(document.querySelectorAll('.wg'));
  function activate(index, focus) {
    tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
      panels[i].open = true;
    });
    if (focus) tabs[index].focus();
  }
  if (tabs.length) {
    document.body.classList.add('tabs-ready');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(i, false); });
      tab.addEventListener('keydown', function (event) {
        var next = i;
        if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); activate(next, true);
      });
    });
    function followHash() {
      var target;
      try { target = document.querySelector(location.hash || '#works'); } catch (e) { return; }
      var panel = target && (target.matches('.wg') ? target : target.closest('.wg'));
      if (panel) activate(panels.indexOf(panel), false);
    }
    activate(0, false); followHash();
    window.addEventListener('hashchange', followHash);
    document.querySelectorAll('.scrap').forEach(function (scrap) {
      scrap.addEventListener('click', function () {
        var panel = document.querySelector(scrap.getAttribute('href'));
        if (panel) activate(panels.indexOf(panel), false);
      });
    });
    document.querySelectorAll('[data-wg-back]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        document.querySelector('.project-tabs').scrollIntoView({ behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center' });
        tabs[panels.indexOf(link.closest('.wg'))].focus({ preventScroll:true });
      });
    });
  }

  document.querySelectorAll('.slider__slide img').forEach(function (img) {
    img.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); img.click(); }
    });
  });
  var viewer = document.querySelector('.viewer');
  if (viewer) {
    viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Project screenshot / Скриншот проекта');
    viewer.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') { event.preventDefault(); viewer.querySelector('button').focus(); }
    });
  }
  document.querySelectorAll('.slider').forEach(function (slider) {
    var track = slider.querySelector('.slider__track');
    var slides = Array.from(slider.querySelectorAll('.slider__slide'));
    function syncSlides() {
      var offset = /translateX\((-?[\d.]+)%\)/.exec(track.style.transform);
      var current = offset ? Math.round(Math.abs(Number(offset[1])) / 100) : 0;
      slides.forEach(function (slide, index) {
        slide.setAttribute('aria-hidden', String(index !== current));
        slide.inert = index !== current;
        slide.querySelector('img').tabIndex = index === current ? 0 : -1;
      });
    }
    syncSlides();
    new MutationObserver(syncSlides).observe(track, { attributes:true, attributeFilter:['style'] });
    slider.querySelectorAll('.slider__dot').forEach(function (dot) {
      dot.setAttribute('aria-pressed', String(dot.classList.contains('is-active')));
      new MutationObserver(function () { dot.setAttribute('aria-pressed', String(dot.classList.contains('is-active'))); }).observe(dot, { attributes:true, attributeFilter:['class'] });
    });
  });

  // Printing includes every project and restores the current tab afterwards.
  var selectedBeforePrint = 0;
  window.addEventListener('beforeprint', function () {
    selectedBeforePrint = tabs.findIndex(function (tab) { return tab.getAttribute('aria-selected') === 'true'; });
    panels.forEach(function (panel) { panel.hidden = false; panel.open = true; });
  });
  window.addEventListener('afterprint', function () { if (tabs.length) activate(Math.max(0, selectedBeforePrint), false); });
})();
