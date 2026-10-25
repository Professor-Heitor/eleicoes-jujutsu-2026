/**
 * @fileoverview Servidor Backend Proxy Oficial TSE (EA20 / Unificado -u.json) + Auto-Descoberta ele-c.json
 * Conecta diretamente aos endpoints oficiais ao vivo do TSE:
 * - Índice Mestre: https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
 * - Presidente 2º Turno (6258): https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json
 * - Governador 2º Turno (6260): https://resultados.tse.jus.br/oficial/ele2026/6260/dados/{uf}/{uf}-c0003-e006260-u.json
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3344;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8'
};

/**
 * Helper to fetch JSON from TSE CDN with timeout
 */
async function fetchTseUpstream(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal
    });
    if (!resp.ok) {
      throw new Error(`TSE Upstream HTTP ${resp.status}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks whether a TSE JSON payload is valid (supports both -u.json `carg` and -r.json `cand`)
 */
function isValidTsePayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return Array.isArray(payload.carg) || Array.isArray(payload.cand);
}

/**
 * Parses TSE's `comum/config/ele-c.json` master index file to auto-discover 2nd-round election codes
 */
function parseEleCJson(rawEleC, targetYear = '2026') {
  const discovered = {
    ano: targetYear,
    codPresidencial2Turno: null,
    codEstadual2Turno: null,
    ciclosEncontrados: []
  };

  if (!rawEleC || !Array.isArray(rawEleC.c)) {
    return discovered;
  }

  for (const ciclo of rawEleC.c) {
    const cicloAno = String(ciclo.ano || '');
    if (targetYear && cicloAno && cicloAno !== String(targetYear)) {
      continue;
    }

    const eleicoes = Array.isArray(ciclo.e) ? ciclo.e : [];
    for (const el of eleicoes) {
      const turno = String(el.t || '');
      const nome = String(el.nm || '').toLowerCase();
      const cod = String(el.cd || '');
      const isSegundoTurno = turno === '2' || nome.includes('2º turno') || nome.includes('segundo turno');

      discovered.ciclosEncontrados.push({
        cod,
        turno,
        nome: el.nm || '',
        data: el.dt || ''
      });

      if (isSegundoTurno && cod) {
        const abrangencias = Array.isArray(el.abr) ? el.abr : [];
        const hasBR = abrangencias.some((a) => String(a.cd || '').toUpperCase() === 'BR');
        if (hasBR || nome.includes('federal') || nome.includes('presidente')) {
          discovered.codPresidencial2Turno = cod;
        } else {
          discovered.codEstadual2Turno = cod;
        }
      }
    }
  }

  return discovered;
}

/**
 * Route: GET /api/tse/auto-discover
 */
async function handleAutoDiscover(_req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    ele2026: { status: 'default_codes_active', codPresidencial: '6258', codEstadual: '6260' },
    ele2022: { status: 'default_codes_active', codPresidencial: '545', codEstadual: '547' }
  };

  try {
    const masterEleC = await fetchTseUpstream(
      'https://resultados.tse.jus.br/oficial/comum/config/ele-c.json',
      4500
    );
    const parsed2026 = parseEleCJson(masterEleC, '2026');
    results.ele2026 = {
      status: 'discovered_live_comum_ele_c',
      codPresidencial: parsed2026.codPresidencial2Turno || '6258',
      codEstadual: parsed2026.codEstadual2Turno || '6260',
      detalhes: parsed2026
    };
  } catch (errMaster) {
    results.ele2026.info = errMaster.message;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(results, null, 2));
}

/**
 * Route: GET /api/tse/resultados?ano=2026&cod=6258&uf=br&cargo=0001
 */
async function handleTseResultados(reqUrl, res) {
  const ano = (reqUrl.searchParams.get('ano') || '2026').replace(/\D/g, '');
  const uf = (reqUrl.searchParams.get('uf') || 'br').toLowerCase();
  const cargo = (reqUrl.searchParams.get('cargo') || '0001').padStart(4, '0');
  const defaultCod = ano === '2022'
    ? (cargo === '0001' ? '545' : '547')
    : (cargo === '0001' ? '6258' : '6260');
  const cod = (reqUrl.searchParams.get('cod') || defaultCod).replace(/\D/g, '');
  const codPadded = cod.padStart(6, '0');

  // Official Unified (-u.json) and Simplified (-r.json) candidate URLs on TSE CDN
  const unifiedTseUrl = `https://resultados.tse.jus.br/oficial/ele${ano}/${cod}/dados/${uf}/${uf}-c${cargo}-e${codPadded}-u.json`;
  const simplifiedTseUrl = `https://resultados.tse.jus.br/oficial/ele${ano}/${cod}/dados-simplificados/${uf}/${uf}-c${cargo}-e${codPadded}-r.json`;

  // Attempt 1: Fetch Official Unified (-u.json) directly from TSE CDN
  for (const upstreamUrl of [unifiedTseUrl, simplifiedTseUrl]) {
    try {
      const tsePayload = await fetchTseUpstream(upstreamUrl, 4800);
      if (isValidTsePayload(tsePayload)) {
        tsePayload._proxyMeta = {
          via: 'BACKEND_PROXY_TSE_CDN_LIVE',
          upstreamUrl,
          status: 'LIVE_CDN_200'
        };
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(tsePayload));
        return;
      }
    } catch (_errUpstream) {
      // Try next URL
    }
  }

  // Attempt 2: Serve local EA20 dataset from assets/data/fallback-2turno.json
  try {
    const fallbackPath = path.join(__dirname, 'assets', 'data', 'fallback-2turno.json');
    const rawFile = fs.readFileSync(fallbackPath, 'utf-8');
    const parsedBundle = JSON.parse(rawFile);
    const datasetKey = `${uf}-c${cargo}`;
    const dataset = parsedBundle?.datasets?.[datasetKey] || parsedBundle?.datasets?.['br-c0001'];

    if (dataset) {
      dataset._proxyMeta = {
        via: 'BACKEND_PROXY_EA20_CONTINGENCIA',
        upstreamUrl: unifiedTseUrl,
        status: 'LOCAL_EA20_READY'
      };
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(dataset));
      return;
    }
  } catch (errDisk) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Falha ao carregar dados do TSE', details: errDisk.message }));
  }
}

/**
 * Static File Server
 */
function serveStaticFile(reqPath, res) {
  const safePath = path.normalize(reqPath === '/' ? '/index.html' : reqPath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(__dirname, safePath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (reqUrl.pathname === '/api/tse/auto-discover') {
      await handleAutoDiscover(req, res);
      return;
    }

    if (reqUrl.pathname === '/api/tse/resultados') {
      await handleTseResultados(reqUrl, res);
      return;
    }

    serveStaticFile(reqUrl.pathname, res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`======================================================================`);
  console.log(`⚔️  SERVIDOR PROXY TSE + JUJUTSU KAISEN ATIVO EM: http://localhost:${PORT}`);
  console.log(`📡  Endpoint Proxy TSE (6258/6260): http://localhost:${PORT}/api/tse/resultados`);
  console.log(`🔍  Auto-Discovery ele-c.json:      http://localhost:${PORT}/api/tse/auto-discover`);
  console.log(`======================================================================`);
});
