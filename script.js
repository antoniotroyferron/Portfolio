const images = [
  '3dmodel_001.webp',
  'still_belair_001.webp',
  'still_FF2_001.webp',
  'still_comet_001.webp',
  'still_archive81_001.webp',
  'still_dialm_asolo_001.webp',
  'still_pilgrims_001.webp',
  'still_chickenbiscuits_002.webp',
  '3dmodel_004.webp',
  'still_comet_003.webp',
  'still_primarytrust_002.webp',
  'still_dialm_asolo_002.webp',
  'set_FF2_001.webp',
  'still_FF2_003.webp',
  'still_tlthtm_001.webp',
  'still_dialm_PPT_001.webp',
  'still_FF2_006.webp',
  'still_comet_002.webp',
  '3dmodel_006.webp',
  'still_belair_002.webp',
  'still_FF2_002.webp',
  'still_dialm_PPT_002.webp',
  'still_archive81_002.webp',
  '3dmodel_002.webp',
  'still_tlthtm_002.webp',
  'still_discoinferno_002.webp',
  'process_mtv_001.webp',
  '3dmodel_007.webp',
  'still_comet_004.webp',
  'still_tlthtm_003.webp',
  'still_comet_005.webp'
];

const theaterTerms = ['chickenbiscuits', 'comet', 'dialm', 'pilgrims', 'primarytrust'];
const filmTerms = ['ff2', 'archive81', 'belair', 'discoinferno', 'tlthtm', 'mtv'];
const sketchbookTerms = ['3dmodel'];

function categoriesFor(name) {
  const lower = name.toLowerCase();
  const categories = [];
  if (theaterTerms.some(term => lower.includes(term))) categories.push('theater');
  if (filmTerms.some(term => lower.includes(term))) categories.push('film');
  if (sketchbookTerms.some(term => lower.includes(term))) categories.push('sketchbook');
  return categories.join(' ');
}

function primaryCategoryFor(name) {
  return categoriesFor(name).split(' ').filter(Boolean)[0] || 'other';
}

/* Preserve the V24 mixing rule: no more than two consecutive images from
   one category inside any visible vertical stream. */
function balanceCategories(list) {
  const buckets = new Map();
  list.forEach(name => {
    const category = primaryCategoryFor(name);
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push(name);
  });

  const result = [];
  let lastCategory = null;
  let runLength = 0;

  while ([...buckets.values()].some(bucket => bucket.length)) {
    const candidates = [...buckets.entries()]
      .filter(([, bucket]) => bucket.length)
      .filter(([category]) => !(category === lastCategory && runLength >= 2))
      .sort((a, b) => b[1].length - a[1].length);

    const fallback = [...buckets.entries()].find(([, bucket]) => bucket.length);
    const [category, bucket] = candidates[0] || fallback;
    result.push(bucket.shift());

    if (category === lastCategory) runLength += 1;
    else {
      lastCategory = category;
      runLength = 1;
    }
  }

  const cyclicallyValid = sequence => {
    const cats = sequence.map(primaryCategoryFor);
    for (let i = 0; i < cats.length; i++) {
      if (cats[i] === cats[(i + 1) % cats.length] && cats[i] === cats[(i + 2) % cats.length]) return false;
    }
    return true;
  };

  if (!cyclicallyValid(result)) {
    for (let offset = 1; offset < result.length; offset++) {
      const rotated = [...result.slice(offset), ...result.slice(0, offset)];
      if (cyclicallyValid(rotated)) return rotated;
    }
  }
  return result;
}

function desiredColumnCount() {
  return window.innerWidth >= 1280 ? 3 : 2;
}

function splitForColumns(count) {
  const ordered = balanceCategories(images);
  const columns = Array.from({ length: count }, () => []);
  ordered.forEach((name, index) => columns[index % count].push(name));
  return columns.map(balanceCategories);
}

function makeCell(name, index) {
  const cell = document.createElement('span');
  cell.className = 'image-cell';
  cell.dataset.filename = name;
  cell.dataset.category = categoriesFor(name);

  const img = document.createElement('img');
  img.src = `assets/splash_opt/${name}`;
  img.alt = '';
  img.dataset.filename = name;
  img.dataset.category = categoriesFor(name);
  img.loading = index < 3 ? 'eager' : 'lazy';
  img.fetchPriority = index < 2 ? 'high' : 'auto';
  img.decoding = 'async';

  cell.appendChild(img);
  return cell;
}

let renderedColumnCount = 0;
function renderImageWall(force = false) {
  const count = desiredColumnCount();
  if (!force && count === renderedColumnCount) return;
  renderedColumnCount = count;

  const wall = document.getElementById('imageWall');
  wall.innerHTML = '';
  document.querySelector('.splash').style.setProperty('--column-count', count);

  splitForColumns(count).forEach((list, columnIndex) => {
    const strip = document.createElement('div');
    strip.className = 'filmstrip';

    const track = document.createElement('div');
    track.className = 'track';
    track.id = `track${columnIndex + 1}`;

    [...list, ...list].forEach((name, index) => {
      track.appendChild(makeCell(name, index));
    });

    strip.appendChild(track);
    wall.appendChild(strip);
  });
}

renderImageWall(true);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderImageWall(false), 140);
});

const splash = document.querySelector('.splash');

function startPreview(kind) {
  splash.classList.add('category-preview');
  splash.classList.toggle('preview-theater', kind === 'theater');
  splash.classList.toggle('preview-film', kind === 'film');
  splash.classList.toggle('preview-sketchbook', kind === 'sketchbook');
}

function stopPreview() {
  splash.classList.remove('category-preview', 'preview-theater', 'preview-film', 'preview-sketchbook');
}

/* Only the three word buttons trigger previews now. Images are passive. */
document.querySelectorAll('.portals a[data-highlight]').forEach(button => {
  button.addEventListener('mouseenter', () => startPreview(button.dataset.highlight));
  button.addEventListener('mouseleave', stopPreview);
  button.addEventListener('focus', () => startPreview(button.dataset.highlight));
  button.addEventListener('blur', stopPreview);
});

(async function ensureCormorantLight() {
  if (!document.fonts) return;
  try {
    await document.fonts.load('300 64px "cormorant-garamond"', 'ANTONIO TROY FERRON');
    await document.fonts.ready;
    document.documentElement.classList.add('fonts-ready');
  } catch (e) {
    console.warn('Cormorant Garamond Light did not resolve:', e);
  }
})();
