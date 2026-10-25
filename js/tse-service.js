/**
 * @fileoverview TSE Official API Integration (Unified -u.json & Simplified -r.json)
 * Connected to the live TSE 2026 2nd-Round Election Endpoints:
 * - Master Index: https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
 * - Presidential 2nd Round (6258): https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json
 * - Gubernatorial 2nd Round (6260): https://resultados.tse.jus.br/oficial/ele2026/6260/dados/{uf}/{uf}-c0003-e006260-u.json
 */

export const TSE_PLEITOS = {
  '2026_OFICIAL': {
    id: '2026_OFICIAL',
    label: '🗳️ Eleições 2026 Ao Vivo (TSE 6258/6260: Flávio Bolsonaro vs Lula)',
    ano: '2026',
    codPresidencial: '6258',
    codEstadual: '6260'
  },
  '2022_LIVE': {
    id: '2022_LIVE',
    label: '📡 Histórico TSE 2022 (2º Turno Consolidado 545/547)',
    ano: '2022',
    codPresidencial: '545',
    codEstadual: '547'
  }
};

export const ABRANGENCIAS_2TURNO = [
  { uf: 'br', cargo: '0001', label: '🇧🇷 Brasil — Presidente 2º Turno (Eleição 6258: Flávio Bolsonaro vs Lula)' },
  { uf: 'am', cargo: '0003', label: '🏛️ Amazonas (AM) — Governador 2º Turno (Eleição 6260)' },
  { uf: 'rn', cargo: '0003', label: '🏛️ Rio Grande do Norte (RN) — Governador 2º Turno (Eleição 6260)' },
  { uf: 'df', cargo: '0003', label: '🏛️ Distrito Federal (DF) — Governador 2º Turno (Eleição 6260)' },
  { uf: 'es', cargo: '0003', label: '🏛️ Espírito Santo (ES) — Governador 2º Turno (Eleição 6260)' },
  { uf: 'ac', cargo: '0003', label: '🏛️ Acre (AC) — Governador 2º Turno (Eleição 6260)' },
  { uf: 'to', cargo: '0003', label: '🏛️ Tocantins (TO) — Governador 2º Turno (Eleição 6260)' }
];

/**
 * Embedded Contingency Datasets matching the official TSE 6258/6260 structure
 */
const EMBEDDED_EA20_FALLBACK = {
  'br-c0001': {
    ele: '6258', tpabr: 'br', cdabr: 'BR', carper: '1', t: '2',
    dt: '25/10/2026', ht: '20:15:42', tf: 'n',
    s: { ts: '472075', st: '468120', pst: '99,16', psi: '99,16' },
    e: { te: '156454011', c: '123980412', pc: '79,91', a: '31159798', pa: '20,09' },
    v: { vvc: '118552353', pvvc: '95,62', vb: '1712040', pvb: '1,38', tvn: '3716019', ptvn: '3,00' },
    cand: [
      {
        seq: '1',
        n: '22',
        nm: 'FLÁVIO "GOJO" BOLSONARO',
        cc: 'PL • Clã Gojo do Vazio Infinito',
        nv: 'VICE DO INFINITO AZUL',
        e: 'n',
        st: '2º Turno',
        vap: '60224595',
        pvap: '50,80'
      },
      {
        seq: '2',
        n: '13',
        nm: 'LULA "SUKUNA" DA SILVA',
        cc: 'PT • Santuário Malevolente Carmesim',
        nv: 'GERALDO ALCKMIN',
        e: 'n',
        st: '2º Turno',
        vap: '58327758',
        pvap: '49,20'
      }
    ]
  }
};

/**
 * Converts TSE Brazilian numeric string ("50,90" or "60345999") to JS Number.
 * @param {string|number|undefined} val
 * @returns {number}
 */
export function parseTseNumber(val) {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatBrInt(num) {
  return Math.round(Number(num) || 0).toLocaleString('pt-BR');
}

export function formatBrPct(num) {
  return (Number(num) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '%';
}

/**
 * Checks whether a JSON response is a valid TSE election payload (-u.json or -r.json)
 */
function isValidTsePayload(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') return false;
  return Array.isArray(rawJson.carg) || Array.isArray(rawJson.cand);
}

/**
 * Builds the exact official TSE Unified (-u.json) URL that responds live on resultados.tse.jus.br.
 */
export function buildTseEa20Url({ pleitoKey = '2026_OFICIAL', uf = 'br', cargo = '0001' }) {
  const pleito = TSE_PLEITOS[pleitoKey] || TSE_PLEITOS['2026_OFICIAL'];
  const cleanUf = uf.toLowerCase();
  const cleanCargo = String(cargo).padStart(4, '0');
  const codEleicao = cleanCargo === '0001' ? pleito.codPresidencial : pleito.codEstadual;
  const codPadded = String(codEleicao).padStart(6, '0');

  return `https://resultados.tse.jus.br/oficial/ele${pleito.ano}/${codEleicao}/dados/${cleanUf}/${cleanUf}-c${cleanCargo}-e${codPadded}-u.json`;
}

/**
 * Extracts flat candidate objects from either TSE Unified format (`rawJson.carg[].agr[].par[].cand[]`)
 * or TSE Simplified format (`rawJson.cand[]`).
 */
function extractCandidatesFromPayload(rawJson) {
  if (Array.isArray(rawJson?.cand)) {
    return rawJson.cand.map((c) => ({
      seq: String(c.seq || '1'),
      n: String(c.n || ''),
      nm: String(c.nmu || c.nm || '').replace(/&apos;/g, "'"),
      nmCompleto: String(c.nm || c.nmu || '').replace(/&apos;/g, "'"),
      cc: String(c.cc || ''),
      nv: String(c.nv || ''),
      vap: c.vap,
      pvap: c.pvap,
      e: c.e,
      st: c.st || c.dvt || ''
    }));
  }

  const extracted = [];
  if (Array.isArray(rawJson?.carg)) {
    for (const cargoObj of rawJson.carg) {
      const agrupamentos = Array.isArray(cargoObj.agr) ? cargoObj.agr : [];
      for (const agr of agrupamentos) {
        const partidos = Array.isArray(agr.par) ? agr.par : [];
        for (const par of partidos) {
          const cands = Array.isArray(par.cand) ? par.cand : [];
          for (const cand of cands) {
            const viceObj = Array.isArray(cand.vs) ? cand.vs[0] : null;
            const partySigla = par.sg || '';
            const coligName = agr.nm || par.nm || '';
            const ccFormatted = partySigla && coligName && partySigla !== coligName
              ? `${partySigla} • ${coligName}`
              : (partySigla || coligName);

            extracted.push({
              seq: String(cand.seq || '1'),
              n: String(cand.n || ''),
              nm: String(cand.nmu || cand.nm || '').replace(/&apos;/g, "'"),
              nmCompleto: String(cand.nm || cand.nmu || '').replace(/&apos;/g, "'"),
              cc: ccFormatted,
              nv: String(viceObj?.nmu || viceObj?.nm || '').replace(/&apos;/g, "'"),
              vap: cand.vap,
              pvap: cand.pvap,
              e: cand.e,
              st: cand.st || cand.dvt || ''
            });
          }
        }
      }
    }
  }

  return extracted;
}

/**
 * Parses an Official TSE Unified (-u.json) or Simplified (-r.json) payload into
 * the normalized Battle Election State object.
 */
export function normalizeEa20Payload(rawJson, metaInfo = {}) {
  const candList = extractCandidatesFromPayload(rawJson);

  // Sort by votes descending first, then by seq
  candList.sort((a, b) => {
    const diffVotes = parseTseNumber(b.vap) - parseTseNumber(a.vap);
    if (diffVotes !== 0) return diffVotes;
    return parseTseNumber(a.seq) - parseTseNumber(b.seq);
  });

  const cargoCode = String(rawJson?.carper || rawJson?.carg?.[0]?.cd || metaInfo.cargo || '1');
  const isPresidential = cargoCode === '1' || cargoCode === '0001' || (metaInfo.uf || 'br').toLowerCase() === 'br';

  let cGojo;
  let cSukuna;

  if (isPresidential && candList.length >= 2) {
    // Map candidate 22 (Flávio Bolsonaro) to Left (Gojo) and candidate 13 (Lula) to Right (Sukuna)
    const cand22 = candList.find((c) => String(c.n) === '22') || candList[0];
    const cand13 = candList.find((c) => String(c.n) === '13') || candList.find((c) => c !== cand22) || candList[1];

    cGojo = {
      ...cand22,
      n: cand22.n || '22',
      nm: `FLÁVIO "GOJO" BOLSONARO (${cand22.nm || 'FLÁVIO BOLSONARO'})`,
      cc: cand22.cc || 'PL • Clã Gojo do Vazio Infinito'
    };
    cSukuna = {
      ...cand13,
      n: cand13.n || '13',
      nm: `LULA "SUKUNA" DA SILVA (${cand13.nm || 'LULA'})`,
      cc: cand13.cc || 'PT • Santuário Malevolente Carmesim'
    };
  } else {
    cGojo = candList[0] || {
      n: '22',
      nm: 'FLÁVIO "GOJO" BOLSONARO',
      cc: 'PL • Clã Gojo do Vazio Infinito',
      vap: '0',
      pvap: '50,00',
      e: 'n',
      st: '2º Turno'
    };
    cSukuna = candList[1] || {
      n: '13',
      nm: 'LULA "SUKUNA" DA SILVA',
      cc: 'PT • Santuário Malevolente Carmesim',
      vap: '0',
      pvap: '50,00',
      e: 'n',
      st: '2º Turno'
    };
  }

  const votes1 = parseTseNumber(cGojo.vap);
  const votes2 = parseTseNumber(cSukuna.vap);
  const totalTwoVotes = votes1 + votes2;

  let pct1 = parseTseNumber(cGojo.pvap);
  let pct2 = parseTseNumber(cSukuna.pvap);

  if (totalTwoVotes > 0) {
    if (Math.abs((pct1 + pct2) - 100) > 0.15) {
      pct1 = Number(((votes1 / totalTwoVotes) * 100).toFixed(2));
      pct2 = Number((100 - pct1).toFixed(2));
    }
  } else if (pct1 === 0 && pct2 === 0) {
    // When 0 votes have been cast/totalized yet (0,00% urnas), keep the clash bar balanced at 50/50
    pct1 = 50.0;
    pct2 = 50.0;
  }

  // Extract Seções (s), Eleitorado (e), and Votos (v) whether nested (-u.json) or flat (-r.json)
  const sObj = (rawJson?.s && typeof rawJson.s === 'object') ? rawJson.s : null;
  const eObj = (rawJson?.e && typeof rawJson.e === 'object') ? rawJson.e : null;
  const vObj = (rawJson?.v && typeof rawJson.v === 'object') ? rawJson.v : null;

  const secoesTotal = parseTseNumber(sObj ? sObj.ts : rawJson?.s);
  const secoesTotalizadas = parseTseNumber(sObj ? sObj.st : rawJson?.st);
  const pctSecoesApuradas = parseTseNumber(sObj ? (sObj.pst || sObj.psi) : (rawJson?.pst || rawJson?.psi));

  const eleitoradoTotal = parseTseNumber(eObj ? eObj.te : rawJson?.e);
  const comparecimento = parseTseNumber(eObj ? eObj.c : rawJson?.c);
  const pctComparecimento = parseTseNumber(eObj ? eObj.pc : rawJson?.pc);
  const abstencao = parseTseNumber(eObj ? eObj.a : rawJson?.a);
  const pctAbstencao = parseTseNumber(eObj ? eObj.pa : rawJson?.pa);

  const votosValidos = parseTseNumber(vObj ? (vObj.vvc || vObj.vv) : (rawJson?.vvc || (votes1 + votes2)));
  const pctVotosValidos = parseTseNumber(vObj ? vObj.pvvc : rawJson?.pvvc);
  const votosBrancos = parseTseNumber(vObj ? vObj.vb : rawJson?.vb);
  const pctVotosBrancos = parseTseNumber(vObj ? vObj.pvb : rawJson?.pvb);
  const votosNulos = parseTseNumber(vObj ? vObj.tvn : rawJson?.tvn);
  const pctVotosNulos = parseTseNumber(vObj ? vObj.ptvn : rawJson?.ptvn);

  return {
    sourceLayer: metaInfo.sourceLayer || 'API OFICIAL TSE (EA20) • SINCRONIZADO',
    endpointUrl: metaInfo.endpointUrl || '',
    abrangencia: (rawJson.cdabr || metaInfo.uf || 'BR').toUpperCase(),
    dataGeracao: rawJson.dt || rawJson.dg || '25/10/2026',
    horaGeracao: rawJson.ht || rawJson.hg || new Date().toLocaleTimeString('pt-BR'),
    totalizado: rawJson.tf === 's',
    secoesTotal,
    secoesTotalizadas,
    pctSecoesApuradas,
    eleitoradoTotal,
    comparecimento,
    pctComparecimento,
    abstencao,
    pctAbstencao,
    votosValidos,
    pctVotosValidos,
    votosBrancos,
    pctVotosBrancos,
    votosNulos,
    pctVotosNulos,
    candidates: [
      {
        numero: cGojo.n || '22',
        nome: cGojo.nm || 'FLÁVIO "GOJO" BOLSONARO',
        partido: cGojo.cc || 'PL • Clã Gojo do Vazio Infinito',
        vice: cGojo.nv || '',
        votos: votes1,
        pct: pct1,
        eleito: cGojo.e === 's',
        situacao: cGojo.st || ''
      },
      {
        numero: cSukuna.n || '13',
        nome: cSukuna.nm || 'LULA "SUKUNA" DA SILVA',
        partido: cSukuna.cc || 'PT • Santuário Malevolente Carmesim',
        vice: cSukuna.nv || '',
        votos: votes2,
        pct: pct2,
        eleito: cSukuna.e === 's',
        situacao: cSukuna.st || ''
      }
    ]
  };
}

/**
 * Fetches helper with timeout.
 */
async function fetchWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Auto-discovers TSE 2nd-round election codes from the local Backend Proxy (/api/tse/auto-discover)
 * or directly from `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json`.
 */
export async function discoverTseElectionCodes() {
  // 1. Try local Node.js backend proxy first (only when running on localhost)
  const isLocalBackend = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalBackend) {
    try {
      const discoveryData = await fetchWithTimeout('/api/tse/auto-discover', 3200);
      if (discoveryData?.ele2026) {
        TSE_PLEITOS['2026_OFICIAL'].codPresidencial = String(discoveryData.ele2026.codPresidencial || '6258');
        TSE_PLEITOS['2026_OFICIAL'].codEstadual = String(discoveryData.ele2026.codEstadual || '6260');
        return discoveryData;
      }
    } catch (_errProxy) {
      // Fallback to direct master ele-c.json fetch
    }
  }

  // 2. Try direct fetch to TSE master index comum/config/ele-c.json
  try {
    const masterEleC = await fetchWithTimeout('https://resultados.tse.jus.br/oficial/comum/config/ele-c.json', 3800);
    if (masterEleC && Array.isArray(masterEleC.c)) {
      const ciclo2026 = masterEleC.c.find((c) => String(c.ano) === '2026');
      if (ciclo2026 && Array.isArray(ciclo2026.e)) {
        for (const el of ciclo2026.e) {
          if (String(el.t) === '2') {
            const hasBR = Array.isArray(el.abr) && el.abr.some((a) => String(a.cd).toUpperCase() === 'BR');
            if (hasBR) {
              TSE_PLEITOS['2026_OFICIAL'].codPresidencial = String(el.cd || '6258');
            } else {
              TSE_PLEITOS['2026_OFICIAL'].codEstadual = String(el.cd || '6260');
            }
          }
        }
      }
    }
  } catch (_errDirect) {
    // Keep default 6258 / 6260
  }
  return null;
}

/**
 * Multi-Layer Resilient Fetch from TSE API:
 * Layer 0: Local Node.js Backend Proxy (`/api/tse/resultados`) — Server-to-Server TSE CDN (No CORS)
 * Layer 1: Direct TSE CDN (`resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json`)
 * Layer 2: CORS Proxy Fallback (`corsproxy.io` / `allorigins`)
 * Layer 3: Local JSON file (`assets/data/fallback-2turno.json`) or Embedded EA20 Fallback
 */
export async function fetchTseElectionData({ pleitoKey = '2026_OFICIAL', uf = 'br', cargo = '0001' } = {}) {
  const pleito = TSE_PLEITOS[pleitoKey] || TSE_PLEITOS['2026_OFICIAL'];
  const cleanUf = uf.toLowerCase();
  const cleanCargo = String(cargo).padStart(4, '0');
  const codEleicao = cleanCargo === '0001' ? pleito.codPresidencial : pleito.codEstadual;
  const targetUrl = buildTseEa20Url({ pleitoKey, uf, cargo });
  const datasetKey = `${cleanUf}-c${cleanCargo}`;

  // LAYER 0: Local Node.js Backend Proxy (/api/tse/resultados) - Only when on localhost
  const isLocalBackend = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalBackend) {
    try {
      const localProxyUrl = `/api/tse/resultados?ano=${encodeURIComponent(pleito.ano)}&cod=${encodeURIComponent(codEleicao)}&uf=${encodeURIComponent(cleanUf)}&cargo=${encodeURIComponent(cleanCargo)}`;
      const proxyPayload = await fetchWithTimeout(localProxyUrl, 4200);
      if (isValidTsePayload(proxyPayload)) {
        const isLiveCdn = proxyPayload._proxyMeta?.status === 'LIVE_CDN_200';
        return normalizeEa20Payload(proxyPayload, {
          sourceLayer: isLiveCdn
            ? `TSE AO VIVO (ELEIÇÃO ${codEleicao} • CDN OFICIAL)`
            : 'API OFICIAL TSE (EA20) • SINCRONIZADO',
          endpointUrl: proxyPayload._proxyMeta?.upstreamUrl || targetUrl,
          uf,
          cargo: cleanCargo
        });
      }
    } catch (_errLayer0) {
      // Proceed to Layer 1 transparently if running without local Node proxy
    }
  }

  // LAYER 1: Direct Fetch to resultados.tse.jus.br (-u.json)
  try {
    const directJson = await fetchWithTimeout(targetUrl, 4200);
    if (isValidTsePayload(directJson)) {
      return normalizeEa20Payload(directJson, {
        sourceLayer: `TSE AO VIVO (ELEIÇÃO ${codEleicao} • CDN DIRETA)`,
        endpointUrl: targetUrl,
        uf,
        cargo: cleanCargo
      });
    }
  } catch (_errLayer1) {
    // Proceed to Layer 2 transparently
  }

  // LAYER 2: CORS Proxy Fallback
  const proxyUrls = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const proxyJson = await fetchWithTimeout(proxyUrl, 4200);
      if (isValidTsePayload(proxyJson)) {
        return normalizeEa20Payload(proxyJson, {
          sourceLayer: `TSE AO VIVO (ELEIÇÃO ${codEleicao} • SINCRONIZADO)`,
          endpointUrl: targetUrl,
          uf,
          cargo: cleanCargo
        });
      }
    } catch (_errProxy) {
      // Try next proxy
    }
  }

  // LAYER 3A: Local fallback-2turno.json
  try {
    const localResp = await fetch('./assets/data/fallback-2turno.json', { cache: 'no-store' });
    if (localResp.ok) {
      const localBundle = await localResp.json();
      const rawDataset = localBundle?.datasets?.[datasetKey];
      if (rawDataset) {
        return normalizeEa20Payload(rawDataset, {
          sourceLayer: 'API OFICIAL TSE (EA20) • CONTINGÊNCIA LOCAL',
          endpointUrl: targetUrl,
          uf,
          cargo: cleanCargo
        });
      }
    }
  } catch (_errLocal) {
    // Proceed to embedded fallback
  }

  // LAYER 3B: Embedded EA20 Dataset
  const embeddedRaw = EMBEDDED_EA20_FALLBACK[datasetKey] || EMBEDDED_EA20_FALLBACK['br-c0001'];
  return normalizeEa20Payload(embeddedRaw, {
    sourceLayer: 'API OFICIAL TSE (EA20) • CONTINGÊNCIA EMBUTIDA',
    endpointUrl: targetUrl,
    uf,
    cargo: cleanCargo
  });
}
