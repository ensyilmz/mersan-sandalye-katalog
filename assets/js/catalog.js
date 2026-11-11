const total = 36;
const reader = document.querySelector('#reader');
const viewport = document.querySelector('#viewport');
const shell = document.querySelector('#book-shell');
const controls = Object.fromEntries([...document.querySelectorAll('nav button')].map(button => [button.id, button]));
const counter = document.querySelector('#page-number');
const mobile = matchMedia('(max-width: 720px), (orientation: portrait)');
const special = {1: 'front', 2: 'about', 35: 'contact', 36: 'back'};
const sections = [
  [21, 'Ahşap Sandalye'],
  [22, 'Ahşap Berjer'],
  [24, 'Bar Sandalyesi'],
  [28, 'Dış Mekân Sandalyesi'],
  [29, 'Dış Mekân Sandalyesi'],
  [30, 'Kapalı Sedir'],
  [31, 'MDF Kasalı Sedir'],
  [32, 'MDF Masa'],
  [33, 'Kompakt Masa'],
  [34, 'Ağaç Masa']
];

function pageFromURL() {
  const value = Number(new URLSearchParams(location.search).get('sayfa'));
  return Number.isInteger(value) && value >= 1 && value <= total ? value : 1;
}

let flip;
let pageWidth = 0;
let pageCount = 0;
let zoom = 1;
let pendingTurn;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function createPage(number) {
  const element = document.createElement('article');
  element.className = 'page';
  element.setAttribute('aria-label', 'Sayfa ' + number);
  if (number === 1 || number === total) element.dataset.density = 'hard';
  if (special[number]) {
    element.append(document.getElementById(special[number]).content.cloneNode(true));
    return element;
  }

  const [, title] = sections.find(([end]) => number <= end);
  const products = catalogProducts[number];
  element.innerHTML = '<div class="product-page">' +
    '<span class="eyebrow">MERSAN MUTFAK</span><h2></h2>' +
    '<div class="products"></div>' +
    '<footer><span class="footer-site">www.mersanmutfak.com</span><span>' + String(number).padStart(2, '0') + '</span></footer></div>';
  element.querySelector('h2').textContent = title;
  const list = element.querySelector('.products');
  list.style.setProperty('--count', products.length);
  list.classList.toggle('product-grid', products.length === 4);
  list.append(...products.map(createProduct));
  return element;
}

const priceFormat = new Intl.NumberFormat('tr-TR');

function createProduct(product) {
  const card = document.createElement('section');
  card.className = 'product';
  card.innerHTML = '<div class="product-photo"><img draggable="false"></div>' +
    '<div class="product-copy"><h3></h3><dl></dl><p class="product-price"></p></div>';

  const name = product.name.toLocaleLowerCase('tr-TR').replace(/(^|\s)\p{L}/gu, letter => letter.toLocaleUpperCase('tr-TR'))
    .replace(/\bMdf\b/g, 'MDF').replace(/ Ve /g, ' ve ');
  const image = card.querySelector('img');
  image.src = 'assets/images/products/' + product.image + '.jpg';
  image.alt = name;
  card.querySelector('h3').textContent = name;
  card.querySelector('.product-price').textContent =
    priceFormat.format(product.price) + (product.perMetre ? ' TL / metre' : ' TL');

  const specs = card.querySelector('dl');
  if (product.code) {
    const code = document.createElement('p');
    code.className = 'product-code';
    code.textContent = product.code;
    card.querySelector('h3').before(code);
  }
  for (const [label, value] of Object.entries(product.details)) {
    const row = document.createElement('div');
    if (['Malzeme', 'Ölçü', 'Renk', 'Oturum Yüksekliği'].includes(label)) row.className = 'full-spec';
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    row.append(term, detail);
    specs.append(row);
  }
  if (product.swatches) {
    const row = document.createElement('div');
    row.className = 'full-spec';
    row.innerHTML = '<dt>Renk</dt><dd class="swatches" aria-label="Üç renk seçeneği"><span></span><span></span><span></span></dd>';
    specs.append(row);
  }
  return card;
}
function updatePage(index) {
  const first = index + 1;
  const spread = flip.getOrientation() === 'landscape' && first !== 1 && first !== total;
  const left = spread ? first - first % 2 : first;
  const right = spread ? left + 1 : left;
  counter.textContent = (spread ? left + '–' + right : first) + ' / ' + total;
  controls.prev.disabled = left === 1;
  controls.next.disabled = right === total;
  const url = new URL(location.href);
  if (pageFromURL() !== first) {
    url.searchParams.set('sayfa', first);
    try {
      history.replaceState(null, '', url);
    } catch (error) {
      if (location.protocol !== 'file:') throw error;
    }
  }
}

function buildBook() {
  const count = mobile.matches ? 1 : 2;
  const width = Math.max(1, Math.floor(Math.min(
    (viewport.clientWidth - 28) / count,
    (viewport.clientHeight - 36) / 1.4142
  ) * zoom));
  if (pageWidth === width && pageCount === count && flip) return;

  pageWidth = width;
  pageCount = count;
  const height = Math.round(width * 1.4142);

  if (flip) {
    const renderer = flip.getRender();
    renderer.finishAnimation();
    Object.assign(flip.getSettings(), {width, height});
    const book = shell.firstElementChild;
    book.style.minWidth = width + 'px';
    book.style.minHeight = height + 'px';
    shell.style.width = width * count + 'px';
    shell.style.height = height + 'px';
    flip.update();
    renderer.drawFrame();
    return;
  }

  shell.style.width = width * count + 'px';
  shell.style.height = height + 'px';
  const book = document.createElement('div');
  book.id = 'book';
  book.style.width = '100%';
  book.style.height = '100%';
  const pages = Array.from({length: total}, (_, index) => createPage(index + 1));
  book.append(...pages);
  shell.replaceChildren(book);

  flip = new window.St.PageFlip(book, {
    width, height, size: 'fixed', autoSize: false,
    startPage: pageFromURL() - 1, showCover: true, usePortrait: true,
    drawShadow: true, maxShadowOpacity: .38,
    flippingTime: 900,
    mobileScrollSupport: false, swipeDistance: 25,
    useMouseEvents: true, clickEventForward: true
  });
  flip.on('flip', event => {
    clearTimeout(pendingTurn);
    pendingTurn = undefined;
    updatePage(Number(event.data));
  });
  flip.on('init', () => updatePage(flip.getCurrentPageIndex()));
  flip.loadFromHTML(pages);
  updatePage(flip.getCurrentPageIndex());
}

function turn(direction) {
  if (!flip || pendingTurn) return;
  if (direction > 0 ? controls.next.disabled : controls.prev.disabled) return;

  const engine = flip;
  const current = engine.getCurrentPageIndex();
  const isSpread = engine.getOrientation() === 'landscape' && current > 0 && current < total - 1;
  const target = current + (direction > 0 && isSpread ? 2 : direction);
  const renderer = engine.getRender();

  if (reducedMotion.matches) {
    renderer.finishAnimation();
    engine.turnToPage(target);
    renderer.drawFrame();
    return;
  }

  function finishIfStalled() {
    pendingTurn = undefined;
    if (engine !== flip || engine.getCurrentPageIndex() !== current) return;

    // A suspended preview can stop delivering animation frames mid-turn.
    renderer.finishAnimation();
    if (engine.getCurrentPageIndex() === current) engine.turnToPage(target);
    renderer.drawFrame();
  }

  pendingTurn = setTimeout(finishIfStalled, 1100);
  if (engine.getState() === 'flipping') renderer.finishAnimation();
  if (engine.getCurrentPageIndex() !== current) {
    renderer.drawFrame();
    return;
  }

  if (direction > 0) engine.flipNext('top');
  else engine.flipPrev('top');
}
function setZoom(value) {
  zoom = Math.min(2, Math.max(1, value));
  controls.minus.disabled = zoom === 1;
  controls.plus.disabled = zoom === 2;
  controls.reset.textContent = Math.round(zoom * 100) + '%';
  buildBook();
  viewport.scrollTo(Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2), 0);
}

function syncFullscreen() {
  const active = Boolean(document.fullscreenElement) || reader.classList.contains('expanded');
  controls.fullscreen.setAttribute('aria-pressed', active);
  controls.fullscreen.setAttribute('aria-label', active ? 'Tam ekrandan çık' : 'Tam ekran');
}

controls.prev.onclick = () => turn(-1);
controls.next.onclick = () => turn(1);
controls.minus.onclick = () => setZoom(zoom - .25);
controls.plus.onclick = () => setZoom(zoom + .25);
controls.reset.onclick = () => setZoom(1);
controls.fullscreen.onclick = async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (reader.classList.contains('expanded')) {
    reader.classList.remove('expanded');
  } else {
    try { await reader.requestFullscreen(); }
    catch { reader.classList.add('expanded'); }
  }
  syncFullscreen();
};

viewport.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('fullscreenchange', syncFullscreen);
window.addEventListener('popstate', () => flip?.turnToPage(pageFromURL() - 1));
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') { reader.classList.remove('expanded'); syncFullscreen(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); turn(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); turn(1); }
});

if (window.St?.PageFlip) {
  setZoom(1);
  new ResizeObserver(buildBook).observe(viewport);
  mobile.addEventListener('change', buildBook);
} else {
  counter.textContent = 'Katalog açılamadı';
}
