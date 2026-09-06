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

const categoryMeta = {
  theater: { href: 'https://antonioferron.myportfolio.com/theater', label: 'Theater' },
  film: { href: 'https://antonioferron.myportfolio.com/film-television', label: 'Film + Television' },
  sketchbook: { href: 'https://antonioferron.myportfolio.com/digital-models', label: 'Digital Sketchbook' }
};

function categoriesFor(name) {
  const lower = name.toLowerCase();
  const categories = [];
  if (theaterTerms.some(term => lower.includes(term))) categories.push('theater');
  if (filmTerms.some(term => lower.includes(term))) categories.push('film');
  if (sketchbookTerms.some(term => lower.includes(term))) categories.push('sketchbook');
  return categories.join(' ');
}

function primaryCategoryFor(name) {
  const categories = categoriesFor(name).split(' ').filter(Boolean);
  return categories[0] || 'other';
}

/* Keep each rail visually mixed: never allow more than two consecutive
   images from the same portfolio category. This is deterministic, preserves
   each category's internal source order, and also checks the infinite-loop seam. */
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

    const [category, bucket] = candidates[0] || [...buckets.entries()].find(([, items]) => items.length);
    result.push(bucket.shift());

    if (category === lastCategory) runLength += 1;
    else {
      lastCategory = category;
      runLength = 1;
    }
  }

  // Because each track is duplicated for the seamless loop, make sure the
  // join between the end and beginning is mixed too. A rotation preserves
  // the exact same image order while moving the seam to a safe location.
  function cyclicallyValid(sequence) {
    const cats = sequence.map(primaryCategoryFor);
    for (let i = 0; i < cats.length; i++) {
      const a = cats[i];
      const b = cats[(i + 1) % cats.length];
      const c = cats[(i + 2) % cats.length];
      if (a === b && b === c) return false;
    }
    return true;
  }

  if (!cyclicallyValid(result)) {
    for (let offset = 1; offset < result.length; offset++) {
      const rotated = [...result.slice(offset), ...result.slice(0, offset)];
      if (cyclicallyValid(rotated)) return rotated;
    }
  }

  return result;
}

const left = balanceCategories(images.filter((_, i) => i % 2 === 0));
const right = balanceCategories(images.filter((_, i) => i % 2 === 1));

function fill(id, list) {
  const el = document.getElementById(id);
  const doubled = [...list, ...list];

  doubled.forEach((name, index) => {
    const category = primaryCategoryFor(name);
    const allCategories = categoriesFor(name);
    const meta = categoryMeta[category];

    const img = document.createElement('img');
    img.src = `assets/splash_opt/${name}`;
    img.alt = '';
    img.dataset.filename = name;
    img.dataset.category = allCategories;
    img.loading = index < 3 ? 'eager' : 'lazy';
    img.fetchPriority = index < 2 ? 'high' : 'auto';
    img.decoding = 'async';

    // The image itself is now the same category link/preview trigger as its
    // corresponding center button, while the scrolling animation stays live.
    const cell = document.createElement(meta ? 'a' : 'span');
    cell.className = 'image-cell';
    cell.dataset.filename = name;
    cell.dataset.category = allCategories;

    if (meta) {
      cell.href = meta.href;
      cell.dataset.highlight = category;
      cell.setAttribute('aria-label', `Open ${meta.label}`);
    }

    cell.appendChild(img);
    el.appendChild(cell);
  });
}

fill('leftTrack', left);
fill('rightTrack', right);

const splash = document.querySelector('.splash');

function startPreview(kind) {
  splash.classList.add('category-preview');
  document.querySelectorAll('.portals a[data-highlight]').forEach(portal => {
    portal.classList.toggle('image-category-active', portal.dataset.highlight === kind);
  });
  splash.classList.toggle('preview-theater', kind === 'theater');
  splash.classList.toggle('preview-film', kind === 'film');
  splash.classList.toggle('preview-sketchbook', kind === 'sketchbook');
}

function stopPreview() {
  splash.classList.remove('category-preview', 'preview-theater', 'preview-film', 'preview-sketchbook');
  document.querySelectorAll('.portals a.image-category-active').forEach(portal => {
    portal.classList.remove('image-category-active');
  });
}

/* Center buttons and moving images share the exact same preview behavior. */
document.querySelectorAll('[data-highlight]').forEach(trigger => {
  trigger.addEventListener('mouseenter', () => startPreview(trigger.dataset.highlight));
  trigger.addEventListener('mouseleave', stopPreview);
  trigger.addEventListener('focus', () => startPreview(trigger.dataset.highlight));
  trigger.addEventListener('blur', stopPreview);
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
