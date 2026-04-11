'use strict';

// ── Genre config ──────────────────────────────────────────────
const GENRES = {
  fiction:    { label:'Fiction',           color:'#7B5E3A', types:['Quote','Character','Characteristic','Relationship','Chapter','Setting','Theme','Symbol','Narrator quote'], hasChars:true },
  nonfiction: { label:'Non-Fiction',       color:'#3A5080', types:['Quote','Argument','Concept','Evidence','Chapter','Theme','Author note','Question'], hasChars:false },
  memoir:     { label:'Memoir / Biography',color:'#6B3A80', types:['Quote','Person','Characteristic','Relationship','Event','Reflection','Theme','Setting'], hasChars:true },
  mystery:    { label:'Mystery / Thriller',color:'#3A6B4A', types:['Quote','Character','Clue','Red herring','Suspect','Chapter','Setting','Plot twist','Theme'], hasChars:true },
  scifi:      { label:'Sci-Fi / Fantasy',  color:'#3A5E6B', types:['Quote','Character','Characteristic','World element','Faction','Chapter','Setting','Theme','Symbol'], hasChars:true },
  history:    { label:'History',           color:'#8B3A3A', types:['Quote','Event','Figure','Argument','Evidence','Theme','Date/Period','Place'], hasChars:false },
  selfhelp:   { label:'Self-Help',         color:'#6B6B3A', types:['Key idea','Quote','Exercise','Principle','Chapter','Question','Actionable','Objection'], hasChars:false },
  poetry:     { label:'Poetry',            color:'#804A6B', types:['Line/stanza','Theme','Image','Technique','Poem','Emotion','Symbol'], hasChars:false },
};
const CHAR_TYPES = ['Character','Person','Figure','Suspect'];
const LINK_TYPES = ['Characteristic','Relationship','Clue','Red herring','Faction','Quote','Reflection','Plot twist'];
const STATUS = { reading:'Reading', finished:'Finished', want:'Want to read' };

// ── State ─────────────────────────────────────────────────────
let library = {};
let currentBookId = null;
let activeFilter = 'all';
let activeTab = 'log';

// ── Storage ───────────────────────────────────────────────────
function save() { localStorage.setItem('book-annotator-library', JSON.stringify(library)); }
function load() {
  try { library = JSON.parse(localStorage.getItem('book-annotator-library') || '{}'); }
  catch(e) { library = {}; }
}

// ── Helpers ───────────────────────────────────────────────────
function currentBook() { return library[currentBookId]; }
function currentEntries() { return currentBook()?.entries || []; }
function typeKey(t) { return t.toLowerCase().replace(/[^a-z]/g,'').replace('narratorquote','quote').replace('authornote','note').replace('linestanza','quote').replace('redherring','note').replace('worldelement','concept').replace('dateperiod','concept').replace('keyidea','keyidea').replace('actionable','concept'); }
function initials(name) { return name.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Screens ───────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Library ───────────────────────────────────────────────────
function renderLibrary() {
  const books = Object.values(library).sort((a,b) => b.created - a.created);
  const list = document.getElementById('lib-list');
  if (!books.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📖</div><p>Your shelf is empty.<br>Tap + to add your first book.</p></div>`;
    return;
  }
  list.innerHTML = books.map(b => {
    const g = GENRES[b.genre] || GENRES.fiction;
    return `<div class="card card-tap book-card" onclick="openBook('${b.id}')">
      <div class="book-spine spine-${b.genre}"></div>
      <div class="book-info">
        <div class="book-title">${esc(b.title)}</div>
        ${b.author ? `<div class="book-author">${esc(b.author)}</div>` : ''}
        <div class="book-meta">
          <span class="book-badge" style="background:${g.color}22;color:${g.color}">${g.label}</span>
          <span style="font-size:12px;color:var(--ink3)">${b.entries.length} entr${b.entries.length===1?'y':'ies'} · ${STATUS[b.status]||''}</span>
        </div>
      </div>
      <span class="book-arrow">›</span>
    </div>`;
  }).join('');
}

// ── New book sheet ────────────────────────────────────────────
function openNewBookSheet() {
  document.getElementById('nb-title').value = '';
  document.getElementById('nb-author').value = '';
  document.getElementById('nb-genre').value = 'fiction';
  document.getElementById('nb-status').value = 'reading';
  openSheet('new-book-sheet');
}

function createBook() {
  const title = document.getElementById('nb-title').value.trim();
  if (!title) { document.getElementById('nb-title').focus(); return; }
  const id = 'b' + Date.now();
  library[id] = {
    id, title,
    author: document.getElementById('nb-author').value.trim(),
    genre: document.getElementById('nb-genre').value,
    status: document.getElementById('nb-status').value,
    entries: [], created: Date.now()
  };
  save();
  closeSheet('new-book-sheet');
  renderLibrary();
}

// ── Open book ─────────────────────────────────────────────────
function openBook(id) {
  currentBookId = id;
  activeFilter = 'all';
  activeTab = 'log';
  const b = currentBook();
  document.getElementById('book-nav-title').textContent = b.title;
  buildTypeSelect();
  switchTab('log');
  showScreen('book-screen');
}

function goLibrary() {
  currentBookId = null;
  renderLibrary();
  showScreen('lib-screen');
}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const b = currentBook();
  const hasChars = GENRES[b.genre]?.hasChars;

  // Show/hide chars tab
  document.getElementById('tab-chars').style.display = hasChars ? '' : 'none';

  document.getElementById('log-panel').style.display = tab === 'log' ? 'flex' : 'none';
  document.getElementById('chars-panel').style.display = tab === 'chars' ? 'flex' : 'none';
  document.getElementById('web-panel').style.display = tab === 'web' ? 'flex' : 'none';

  if (tab === 'log') { renderEntries(); buildFilterBar(); }
  if (tab === 'chars') renderChars();
  if (tab === 'web') renderWeb();
}

// ── Entry form sheet ──────────────────────────────────────────
function openEntrySheet() {
  buildTypeSelect();
  onTypeChange();
  document.getElementById('entry-content').value = '';
  document.getElementById('entry-note').value = '';
  openSheet('entry-sheet');
}

function buildTypeSelect() {
  const b = currentBook();
  const types = GENRES[b.genre]?.types || GENRES.fiction.types;
  const sel = document.getElementById('entry-type');
  sel.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
  onTypeChange();
}

function onTypeChange() {
  if (!currentBookId) return;
  const type = document.getElementById('entry-type').value;
  const b = currentBook();
  const chars = currentEntries().filter(e => CHAR_TYPES.includes(e.type)).map(e => e.content);
  const needsLink = LINK_TYPES.includes(type);

  const lg = document.getElementById('es-link-group');
  const cb = document.getElementById('es-char-b-group');
  const rt = document.getElementById('es-rel-type-group');
  const xf = document.getElementById('es-extra-group');

  const cl = document.getElementById('es-content-label');
  cl.textContent = type==='Quote'||type==='Line/stanza' ? 'Quote / passage' : type==='Relationship' ? 'Describe the relationship' : type==='Chapter' ? 'Chapter title / number' : 'Content';

  lg.style.display = needsLink && chars.length ? '' : 'none';
  if (needsLink && chars.length) {
    const charLabel = CHAR_TYPES.find(t => GENRES[b.genre]?.types.includes(t)) || 'character';
    document.getElementById('es-link-label').textContent = type==='Relationship' ? 'Character A' : `Link to ${charLabel}`;
    document.getElementById('es-char-link').innerHTML = chars.map(c => `<option>${esc(c)}</option>`).join('');
  }

  cb.style.display = type==='Relationship' && chars.length > 1 ? '' : 'none';
  rt.style.display = type==='Relationship' ? '' : 'none';
  if (type==='Relationship' && chars.length > 1) {
    document.getElementById('es-char-b').innerHTML = chars.map(c => `<option>${esc(c)}</option>`).join('');
  }

  xf.style.display = (type==='Chapter'||type==='Date/Period'||type==='Event') ? '' : 'none';
  if (type==='Chapter') { document.getElementById('es-extra-label').textContent='Chapter number'; document.getElementById('es-extra-val').placeholder='e.g. 1'; document.getElementById('es-extra-val').type='number'; }
  if (type==='Date/Period'||type==='Event') { document.getElementById('es-extra-label').textContent='Date / year'; document.getElementById('es-extra-val').placeholder='e.g. 1945'; document.getElementById('es-extra-val').type='text'; }
}

function addEntry() {
  const type = document.getElementById('entry-type').value;
  const content = document.getElementById('entry-content').value.trim();
  const note = document.getElementById('entry-note').value.trim();
  if (!content) { document.getElementById('entry-content').focus(); return; }

  const entry = { id: Date.now(), type, content, note, links: [] };

  const lg = document.getElementById('es-link-group');
  if (lg.style.display !== 'none') {
    const lv = document.getElementById('es-char-link').value;
    if (lv) entry.links.push(lv);
  }
  if (type === 'Relationship') {
    const cb = document.getElementById('es-char-b');
    const rt = document.getElementById('es-rel-type');
    if (cb && cb.closest('[style*="display: none"]') === null) { entry.charB = cb.value; if (entry.links[0]) entry.links.push(cb.value); }
    if (rt) entry.relType = rt.value;
  }
  const xv = document.getElementById('es-extra-val');
  if (xv && document.getElementById('es-extra-group').style.display !== 'none') entry.extraVal = xv.value;

  currentBook().entries.unshift(entry);
  save();
  closeSheet('entry-sheet');
  activeFilter = 'all';
  renderEntries();
  buildFilterBar();
}

function deleteEntry(id) {
  currentBook().entries = currentBook().entries.filter(e => e.id !== id);
  save();
  renderEntries();
  buildFilterBar();
  if (activeTab === 'web') renderWeb();
}

// ── Filter ────────────────────────────────────────────────────
function buildFilterBar() {
  const types = [...new Set(currentEntries().map(e => e.type))];
  document.getElementById('filter-bar').innerHTML = ['all', ...types].map(t =>
    `<button class="filter-pill${activeFilter===t?' active':''}" onclick="setFilter('${t}')">${t==='all'?'All':t}</button>`
  ).join('');
}

function setFilter(t) { activeFilter = t; buildFilterBar(); renderEntries(); }

// ── Render entries ────────────────────────────────────────────
function renderEntries() {
  let entries = currentEntries();
  if (activeFilter !== 'all') entries = entries.filter(e => e.type === activeFilter);
  const list = document.getElementById('entries-list');
  if (!entries.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">✏️</div><p>No entries yet.<br>Tap + to add your first annotation.</p></div>`;
    return;
  }
  list.innerHTML = entries.map(e => {
    const tk = typeKey(e.type);
    const extra = (e.relType ? ` <span style="color:var(--ink3);font-size:12px">(${esc(e.relType)})</span>` : '') + (e.extraVal ? ` <span style="color:var(--ink3);font-size:12px">· ${esc(e.extraVal)}</span>` : '');
    const linkBadge = e.links.length ? `<span class="entry-link-tag">${e.links.map(esc).join(' + ')}</span>` : '';
    return `<div class="entry-card">
      <div class="entry-top">
        <div class="entry-accent acc-${tk}"></div>
        <div class="entry-body">
          <div class="entry-type-row">
            <span class="entry-tag tag-${tk}">${esc(e.type)}</span>
            ${linkBadge}
          </div>
          <div class="entry-content">${esc(e.content)}${extra}</div>
          ${e.note ? `<div class="entry-note">${esc(e.note)}</div>` : ''}
        </div>
        <button class="entry-delete-btn" onclick="deleteEntry(${e.id})">×</button>
      </div>
    </div>`;
  }).join('');
}

// ── Characters ────────────────────────────────────────────────
function renderChars() {
  const chars = currentEntries().filter(e => CHAR_TYPES.includes(e.type));
  const list = document.getElementById('chars-list');
  if (!chars.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">👤</div><p>No characters logged yet.<br>Add a Character entry first.</p></div>`;
    return;
  }
  list.innerHTML = chars.map(c => {
    const all = currentEntries();
    const traits = all.filter(e => e.links.includes(c.content) && e.type === 'Characteristic');
    const quotes = all.filter(e => e.links.includes(c.content) && e.type === 'Quote');
    const rels = all.filter(e => e.links.includes(c.content) && e.type === 'Relationship');
    const items = [
      ...traits.map(t => `<div class="char-item"><strong>Trait:</strong> ${esc(t.content)}</div>`),
      ...quotes.map(q => `<div class="char-item"><strong>Said:</strong> "${esc(q.content)}"</div>`),
      ...rels.map(r => `<div class="char-item"><strong>Relationship:</strong> ${esc(r.content)}${r.relType ? ` (${esc(r.relType)})` : ''}</div>`),
    ];
    return `<div class="card">
      <div class="char-header">
        <div class="char-avatar">${initials(c.content)}</div>
        <div>
          <div class="char-name">${esc(c.content)}</div>
          ${c.note ? `<div class="char-desc">${esc(c.note)}</div>` : ''}
        </div>
      </div>
      ${items.length ? `<div class="char-items">${items.join('')}</div>` : `<div style="padding:0 16px 14px;font-size:13px;color:var(--ink3)">No linked entries yet.</div>`}
    </div>`;
  }).join('');
}

// ── Connection web ────────────────────────────────────────────
function renderWeb() {
  const svg = document.getElementById('web-svg');
  svg.innerHTML = '';
  const entries = currentEntries();
  const W = svg.parentElement.clientWidth || 340, H = 340;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const nodes = [], links = [], seen = {};
  entries.forEach(e => {
    const id = 'n' + e.id;
    nodes.push({ id, label: e.content.slice(0, 18) + (e.content.length > 18 ? '…' : ''), type: e.type });
    seen[e.content] = id;
    e.links.forEach(l => { if (seen[l]) links.push({ s: seen[l], t: id }); });
    if (e.charB && seen[e.charB]) links.push({ s: seen[e.charB], t: id });
  });

  if (!nodes.length) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', W/2); t.setAttribute('y', H/2); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', '#A89880'); t.setAttribute('font-size', '14');
    t.textContent = 'Add entries to see connections.'; svg.appendChild(t); return;
  }

  const cx = W/2, cy = H/2, r = Math.min(W, H) * 0.36;
  nodes.forEach((n, i) => {
    const a = (2 * Math.PI * i / nodes.length) - Math.PI / 2;
    n.x = nodes.length === 1 ? cx : cx + r * Math.cos(a);
    n.y = nodes.length === 1 ? cy : cy + r * Math.sin(a);
  });

  const TC = { Quote:'#3A6B4A', Character:'#7B5E3A', Person:'#7B5E3A', Suspect:'#7B5E3A', Figure:'#8B3A3A', Theme:'#3A5080', Chapter:'#8B6E2A', Setting:'#7A4A6B', Relationship:'#A89880', Symbol:'#3A6B4A', Argument:'#8B3A3A', Concept:'#3A5080', Evidence:'#3A6B4A', Event:'#6B3A80', 'Key idea':'#3A5080', Characteristic:'#7B5E3A' };

  links.forEach(l => {
    const s = nodes.find(n => n.id === l.s), t = nodes.find(n => n.id === l.t);
    if (!s || !t) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ['x1','y1','x2','y2'].forEach((a,i) => line.setAttribute(a, [s.x,s.y,t.x,t.y][i]));
    line.setAttribute('stroke', 'rgba(44,40,37,0.15)'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  });

  nodes.forEach(n => {
    const col = TC[n.type] || '#7B5E3A';
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ci.setAttribute('cx', n.x); ci.setAttribute('cy', n.y); ci.setAttribute('r', 26);
    ci.setAttribute('fill', col + '22'); ci.setAttribute('stroke', col); ci.setAttribute('stroke-width', '1.5');
    g.appendChild(ci);
    const words = n.label.split(' ');
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('font-size', '9'); txt.setAttribute('fill', col); txt.setAttribute('font-weight', '600');
    if (words.length <= 2) {
      txt.setAttribute('x', n.x); txt.setAttribute('y', n.y); txt.setAttribute('dominant-baseline', 'middle'); txt.textContent = n.label;
    } else {
      [words.slice(0,2).join(' '), words.slice(2,4).join(' ')].forEach((line, i) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ts.setAttribute('x', n.x); ts.setAttribute('dy', i === 0 ? '-5' : '12'); ts.textContent = line; txt.appendChild(ts);
      });
    }
    g.appendChild(txt);
    const tl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tl.setAttribute('x', n.x); tl.setAttribute('y', n.y + 34); tl.setAttribute('text-anchor', 'middle');
    tl.setAttribute('font-size', '8'); tl.setAttribute('fill', '#A89880'); tl.textContent = n.type;
    g.appendChild(tl);
    svg.appendChild(g);
  });
}

// ── Import / Export ───────────────────────────────────────────
function exportData() {
  const data = JSON.stringify(library, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'book-annotations-backup.json'; a.click();
  URL.revokeObjectURL(url);
}

function importData() { document.getElementById('import-file').click(); }

function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (typeof imported !== 'object') throw new Error();
      if (confirm(`Import ${Object.keys(imported).length} book(s)? This will merge with your existing library.`)) {
        Object.assign(library, imported);
        save(); renderLibrary();
      }
    } catch { alert('Could not read that file. Make sure it\'s a valid Book Annotator backup.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function deleteBook(id) {
  if (!confirm(`Delete "${library[id]?.title}" and all its annotations? This cannot be undone.`)) return;
  delete library[id]; save(); renderLibrary();
}

// ── Sheet helpers ─────────────────────────────────────────────
function openSheet(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function closeSheet(id) {
  const overlay = document.getElementById(id);
  overlay.classList.remove('open');
  setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

// Close sheet on overlay tap
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sheet-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeSheet(overlay.id);
    });
  });
});

// ── Init ──────────────────────────────────────────────────────
load();
renderLibrary();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
