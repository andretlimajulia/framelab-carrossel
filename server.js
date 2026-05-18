const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Pasta de dados ──────────────────────────────────────────────────────────
const DATA_DIR     = path.join(__dirname, 'data');
const TEMPLATES_DB = path.join(DATA_DIR, 'templates.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTemplates() {
  ensureDataDir();
  if (!fs.existsSync(TEMPLATES_DB)) return [];
  try { return JSON.parse(fs.readFileSync(TEMPLATES_DB, 'utf8')); }
  catch (e) { return []; }
}

function writeTemplates(list) {
  ensureDataDir();
  fs.writeFileSync(TEMPLATES_DB, JSON.stringify(list, null, 2));
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));        // templates com SVGs podem ser grandes
app.use(express.static(path.join(__dirname, 'public')));

// ── API ─────────────────────────────────────────────────────────────────────

// ── Stickers DB ─────────────────────────────────────────────────────────────
const STICKERS_DB = path.join(DATA_DIR, 'stickers.json');
function readStickers() {
  ensureDataDir();
  if (!fs.existsSync(STICKERS_DB)) return [];
  try { return JSON.parse(fs.readFileSync(STICKERS_DB, 'utf8')); }
  catch(e) { return []; }
}
function writeStickers(list) {
  ensureDataDir();
  fs.writeFileSync(STICKERS_DB, JSON.stringify(list, null, 2));
}

app.get('/api/stickers', (_req, res) => {
  res.json(readStickers());
});

app.post('/api/stickers', (req, res) => {
  const { nome, src, w, h } = req.body;
  if (!src) return res.status(400).json({ error: 'src required' });
  const list = readStickers();
  const item = { id: Date.now().toString(), nome: nome || 'sticker', src, w: w||null, h: h||null, createdAt: new Date().toISOString() };
  list.push(item);
  writeStickers(list);
  res.json(item);
});

app.delete('/api/stickers/:id', (req, res) => {
  const list = readStickers().filter(s => s.id !== req.params.id);
  writeStickers(list);
  res.json({ ok: true });
});

// Health check — o app HTML usa isso pra detectar se o servidor está rodando
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Listar todos os templates (sem os dados completos — só metadados)
app.get('/api/templates', (_req, res) => {
  try {
    const list = readTemplates().map(({ id, nome, slides, criadoEm, atualizadoEm }) => ({
      id, nome, slides, criadoEm, atualizadoEm
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar um template completo (com todos os dados de slides/elementos)
app.get('/api/templates/:id', (req, res) => {
  try {
    const list = readTemplates();
    const t = list.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salvar template (cria ou atualiza)
app.post('/api/templates', (req, res) => {
  try {
    const { id, nome, dados } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!dados) return res.status(400).json({ error: 'Dados do template são obrigatórios' });

    const list = readTemplates();
    const now  = new Date().toISOString();
    const newId = id || Date.now().toString();

    const template = {
      id:          newId,
      nome:        nome.trim(),
      slides:      Array.isArray(dados.slides) ? dados.slides.length : 0,
      criadoEm:    now,
      dados:       dados,   // objeto completo: { nome, slides: [...] }
    };

    const idx = list.findIndex(t => t.id === newId);
    if (idx >= 0) {
      template.criadoEm    = list[idx].criadoEm;
      template.atualizadoEm = now;
      list[idx] = template;
    } else {
      list.push(template);
    }

    writeTemplates(list);
    res.json({ id: template.id, nome: template.nome, slides: template.slides });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar template existente (salvar edições)
app.put('/api/templates/:id', (req, res) => {
  try {
    const { nome, dados } = req.body;
    const list = readTemplates();
    const idx = list.findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Template não encontrado' });
    list[idx] = {
      ...list[idx],
      nome: nome || list[idx].nome,
      dados: dados || list[idx].dados,
      slides: dados && dados.slides ? dados.slides.length : list[idx].slides,
      atualizadoEm: new Date().toISOString(),
    };
    writeTemplates(list);
    res.json({ id: list[idx].id, nome: list[idx].nome });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar template
app.delete('/api/templates/:id', (req, res) => {
  try {
    const list = readTemplates().filter(t => t.id !== req.params.id);
    writeTemplates(list);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── Palettes ────────────────────────────────────────────────────────────────
const PALETTES_DB = path.join(DATA_DIR, 'palettes.json');

function readPalettes() {
  ensureDataDir();
  if (!fs.existsSync(PALETTES_DB)) return [];
  try { return JSON.parse(fs.readFileSync(PALETTES_DB, 'utf8')); } catch(e) { return []; }
}

app.get('/api/palettes', (_req, res) => {
  try { res.json(readPalettes()); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/palettes', (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : [];
    fs.writeFileSync(PALETTES_DB, JSON.stringify(list, null, 2));
    res.json({ ok: true, count: list.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Fallback — serve o app para qualquer rota não-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  FrameLab Desktop rodando em http://localhost:' + PORT);
  console.log('  Templates salvos em: ' + DATA_DIR);
  console.log('');
});
