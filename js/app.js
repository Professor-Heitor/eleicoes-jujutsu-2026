/**
 * @fileoverview Main Application Controller — Jujutsu Kaisen x TSE 2º Turno
 * Coordinates the Official TSE EA20 Service, Battle Emotional Engine,
 * Canvas Particle System, and Intro Manga Splash Gate.
 */

import {
  ABRANGENCIAS_2TURNO,
  discoverTseElectionCodes,
  fetchTseElectionData,
  formatBrInt,
  formatBrPct
} from './tse-service.js';

import {
  FIGHTER_DIALOGUES,
  resolveFighterStateKey,
  computeVisualStrengthMetrics
} from './battle-engine.js';

import { CursedParticlesEngine } from './particles-canvas.js';

class JujutsuElectionApp {
  constructor() {
    this.pleitoKey = '2026_OFICIAL';
    this.selectedScope = 'br-0001';
    this.swapped = false;
    this.customOverrides = null;

    this.electionData = null;
    this.tsePollTimer = null;
    this.particlesEngine = null;
  }

  async init() {
    this.particlesEngine = new CursedParticlesEngine('cursed-particles-canvas');
    this.populateScopeSelect();
    this.bindEvents();
    await discoverTseElectionCodes();
    await this.loadFromTseApi();
    this.startTsePolling();
  }

  populateScopeSelect() {
    const selectEl = document.getElementById('scope-select');
    if (!selectEl) return;
    selectEl.innerHTML = '';
    for (const item of ABRANGENCIAS_2TURNO) {
      const opt = document.createElement('option');
      opt.value = `${item.uf}-${item.cargo}`;
      opt.textContent = item.label;
      selectEl.appendChild(opt);
    }
    selectEl.value = this.selectedScope;
  }

  bindEvents() {
    // Scope (UF/Cargo) change
    const scopeSelect = document.getElementById('scope-select');
    scopeSelect?.addEventListener('change', (e) => {
      this.selectedScope = e.target.value;
      this.customOverrides = null;
      this.loadFromTseApi();
    });

    // Pleito year selector
    const pleitoSelect = document.getElementById('pleito-select');
    pleitoSelect?.addEventListener('change', (e) => {
      this.pleitoKey = e.target.value;
      this.loadFromTseApi();
    });

    // Sync now button
    const syncBtn = document.getElementById('btn-sync-tse');
    syncBtn?.addEventListener('click', () => {
      this.loadFromTseApi();
    });

    // Swap Gojo <-> Sukuna candidates
    const swapBtn = document.getElementById('btn-swap-fighters');
    swapBtn?.addEventListener('click', () => {
      this.swapped = !this.swapped;
      if (this.electionData) {
        this.renderAll();
      }
    });

    // Customize Modal
    const openModalBtn = document.getElementById('btn-open-customize');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const cancelModalBtn = document.getElementById('btn-cancel-modal');
    const modalBackdrop = document.getElementById('customize-modal');
    const formCustomize = document.getElementById('customize-form');

    openModalBtn?.addEventListener('click', () => {
      this.populateCustomizeModal();
      modalBackdrop?.removeAttribute('hidden');
    });

    const closeModal = () => modalBackdrop?.setAttribute('hidden', '');
    closeModalBtn?.addEventListener('click', closeModal);
    cancelModalBtn?.addEventListener('click', closeModal);

    formCustomize?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCustomizeModal();
      closeModal();
    });

    // Intro Splash Screen Controls
    const splashScreen = document.getElementById('intro-splash-screen');
    const btnEnterDomain = document.getElementById('btn-enter-domain');
    const btnReopenSplash = document.getElementById('btn-reopen-splash');

    btnEnterDomain?.addEventListener('click', () => {
      splashScreen?.classList.add('is-dismissed');
    });

    btnReopenSplash?.addEventListener('click', () => {
      splashScreen?.classList.remove('is-dismissed');
    });
  }

  startTsePolling() {
    if (this.tsePollTimer) clearInterval(this.tsePollTimer);
    this.tsePollTimer = setInterval(() => {
      this.loadFromTseApi();
    }, 30000);
  }

  async loadFromTseApi() {
    const [uf, cargo] = this.selectedScope.split('-');
    const syncBtn = document.getElementById('btn-sync-tse');
    if (syncBtn) syncBtn.textContent = '⏳ Sincronizando...';

    try {
      const data = await fetchTseElectionData({
        pleitoKey: this.pleitoKey,
        uf,
        cargo
      });
      this.electionData = data;
      this.renderAll();
    } finally {
      if (syncBtn) syncBtn.textContent = '🔄 Sincronizar TSE';
    }
  }

  /**
   * Returns [gojoCandidate, sukunaCandidate] respecting the Swap toggle and Custom Overrides.
   */
  getOrderedCandidates() {
    const rawCands = this.electionData?.candidates || [];
    const first = rawCands[0] || { numero: '22', nome: 'FLÁVIO "GOJO" BOLSONARO', partido: 'PL • Clã Gojo do Vazio Infinito', votos: 60224595, pct: 50.8 };
    const second = rawCands[1] || { numero: '13', nome: 'LULA "SUKUNA" DA SILVA', partido: 'PT • Santuário Malevolente Carmesim', votos: 58327758, pct: 49.2 };

    const pair = this.swapped ? [second, first] : [first, second];

    if (this.customOverrides) {
      pair[0].nome = this.customOverrides.gojoNome || pair[0].nome;
      pair[0].numero = this.customOverrides.gojoNumero || pair[0].numero;
      pair[0].partido = this.customOverrides.gojoPartido || pair[0].partido;

      pair[1].nome = this.customOverrides.sukunaNome || pair[1].nome;
      pair[1].numero = this.customOverrides.sukunaNumero || pair[1].numero;
      pair[1].partido = this.customOverrides.sukunaPartido || pair[1].partido;
    }

    return pair;
  }

  /**
   * Main DOM & CSS Variable Render Pipeline
   */
  renderAll() {
    if (!this.electionData) return;

    const [gojoCand, sukunaCand] = this.getOrderedCandidates();
    const gojoPct = Number(gojoCand.pct) || 50;
    const sukunaPct = Number(sukunaCand.pct) || 50;

    // 1. Compute Emotional & Visual Strength States
    const gojoStateKey = resolveFighterStateKey(gojoPct);
    const sukunaStateKey = resolveFighterStateKey(sukunaPct);

    const gojoDialogue = FIGHTER_DIALOGUES.gojo[gojoStateKey];
    const sukunaDialogue = FIGHTER_DIALOGUES.sukuna[sukunaStateKey];

    const gojoMetrics = computeVisualStrengthMetrics(gojoPct);
    const sukunaMetrics = computeVisualStrengthMetrics(sukunaPct);

    // 2. Update Root CSS Custom Properties for Smooth Animations
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--gojo-share', `${gojoPct}%`);
    rootStyle.setProperty('--sukuna-share', `${sukunaPct}%`);
    rootStyle.setProperty('--gojo-scale', String(gojoMetrics.scale));
    rootStyle.setProperty('--gojo-glow', `${gojoMetrics.glowPx}px`);
    rootStyle.setProperty('--gojo-sat', String(gojoMetrics.saturation));
    rootStyle.setProperty('--gojo-bright', String(gojoMetrics.brightness));

    rootStyle.setProperty('--sukuna-scale', String(sukunaMetrics.scale));
    rootStyle.setProperty('--sukuna-glow', `${sukunaMetrics.glowPx}px`);
    rootStyle.setProperty('--sukuna-sat', String(sukunaMetrics.saturation));
    rootStyle.setProperty('--sukuna-bright', String(sukunaMetrics.brightness));

    // 3. Update Particle Canvas Balance
    this.particlesEngine?.setPowerBalance(gojoPct);

    // 4. Update Header Urnas Apuradas Telemetry
    this.setText('urnas-pct-display', formatBrPct(this.electionData.pctSecoesApuradas));
    const urnasBar = document.getElementById('urnas-progress-fill');
    if (urnasBar) {
      urnasBar.style.width = `${Math.min(100, this.electionData.pctSecoesApuradas)}%`;
    }
    this.setText(
      'urnas-secoes-display',
      `Seções: ${formatBrInt(this.electionData.secoesTotalizadas)} / ${formatBrInt(this.electionData.secoesTotal)}`
    );
    this.setText(
      'tse-timestamp-display',
      `Atualizado: ${this.electionData.dataGeracao} às ${this.electionData.horaGeracao}`
    );
    this.setText('tse-source-layer-badge', this.electionData.sourceLayer);

    // 5. Update Central Domain Clash Bar & Splash Screen Live Pill
    this.setText('clash-left-pct', formatBrPct(gojoPct));
    this.setText('clash-right-pct', formatBrPct(sukunaPct));
    this.setText('clash-left-name', gojoCand.nome);
    this.setText('clash-right-name', sukunaCand.nome);
    this.setText('splash-gojo-pct', `🔵 ${gojoCand.nome}: ${formatBrPct(gojoPct)}`);
    this.setText('splash-sukuna-pct', `${sukunaCand.nome}: ${formatBrPct(sukunaPct)} 🔴`);

    const voteDiff = Math.abs(gojoCand.votos - sukunaCand.votos);
    const pctDiff = Math.abs(gojoPct - sukunaPct);

    let dominanceSummary = '⚡ EMPATE TÉCNICO — COLISÃO KOKUSEN NO CENTRO DA ARENA!';
    if (gojoPct > sukunaPct + 0.35) {
      dominanceSummary = `🔵 VAZIO INFINITO AVANÇA (+${formatBrPct(pctDiff)} | +${formatBrInt(voteDiff)} votos)`;
    } else if (sukunaPct > gojoPct + 0.35) {
      dominanceSummary = `🔴 SANTUÁRIO MALEVOLENTE AVANÇA (+${formatBrPct(pctDiff)} | +${formatBrInt(voteDiff)} votos)`;
    }
    this.setText('clash-dominance-pill', dominanceSummary);

    // 6. Update Center Versus Callout
    if (Math.abs(gojoPct - sukunaPct) <= 0.35) {
      this.setText('vs-leader-name', 'CHOQUE KOKUSEN (EMPATE)');
    } else if (gojoPct > sukunaPct) {
      this.setText('vs-leader-name', `GOJO LIDERANDO (${gojoCand.nome})`);
    } else {
      this.setText('vs-leader-name', `SUKUNA LIDERANDO (${sukunaCand.nome})`);
    }
    this.setText('vs-vote-diff', `Diferença: ${formatBrInt(voteDiff)} votos`);

    // 7. Update Gojo Fighter Card (Left)
    this.renderFighterCard({
      prefix: 'gojo',
      cand: gojoCand,
      pct: gojoPct,
      dialogue: gojoDialogue,
      metrics: gojoMetrics
    });

    // 8. Update Sukuna Fighter Card (Right)
    this.renderFighterCard({
      prefix: 'sukuna',
      cand: sukunaCand,
      pct: sukunaPct,
      dialogue: sukunaDialogue,
      metrics: sukunaMetrics
    });

    // 9. Update Footer TSE Official Telemetry Cards
    this.setText('tele-validos-val', formatBrInt(this.electionData.votosValidos));
    this.setText('tele-validos-pct', `${formatBrPct(this.electionData.pctVotosValidos)} dos votos totais`);

    this.setText('tele-brancos-val', formatBrInt(this.electionData.votosBrancos));
    this.setText('tele-brancos-pct', `${formatBrPct(this.electionData.pctVotosBrancos)} em branco`);

    this.setText('tele-nulos-val', formatBrInt(this.electionData.votosNulos));
    this.setText('tele-nulos-pct', `${formatBrPct(this.electionData.pctVotosNulos)} nulos`);

    this.setText('tele-comp-val', formatBrInt(this.electionData.comparecimento));
    this.setText('tele-comp-pct', `${formatBrPct(this.electionData.pctComparecimento)} de comparecimento`);

    this.setText('tele-abst-val', formatBrInt(this.electionData.abstencao));
    this.setText('tele-abst-pct', `${formatBrPct(this.electionData.pctAbstencao)} de abstenção`);
  }

  renderFighterCard({ prefix, cand, pct, dialogue, metrics }) {
    const cardEl = document.getElementById(`${prefix}-fighter-card`);
    if (cardEl) {
      cardEl.setAttribute('data-battle-state', dialogue.stateKey);
    }

    this.setText(`${prefix}-cand-number`, `Nº ${cand.numero}`);
    this.setText(`${prefix}-mood-emoji`, dialogue.moodEmoji);
    this.setText(`${prefix}-mood-label`, dialogue.moodBadge);
    this.setText(`${prefix}-technique-tag`, dialogue.techniqueStatus);
    this.setText(`${prefix}-expression-pill`, `${dialogue.moodEmoji} ${dialogue.expressionLabel}`);
    this.setText(`${prefix}-quote-text`, dialogue.quote);

    this.setText(`${prefix}-real-name`, cand.nome);
    this.setText(`${prefix}-real-party`, cand.partido);
    this.setText(`${prefix}-pct-giant`, formatBrPct(pct));
    this.setText(`${prefix}-abs-votes`, formatBrInt(cand.votos));

    // Toggle Happy vs Sad Portrait smoothly
    const happyImg = document.getElementById(`${prefix}-img-happy`);
    const sadImg = document.getElementById(`${prefix}-img-sad`);
    if (happyImg && sadImg) {
      if (dialogue.isHappy) {
        happyImg.classList.add('is-active');
        happyImg.classList.remove('is-hidden');
        sadImg.classList.add('is-hidden');
        sadImg.classList.remove('is-active');
      } else {
        sadImg.classList.add('is-active');
        sadImg.classList.remove('is-hidden');
        happyImg.classList.add('is-hidden');
        happyImg.classList.remove('is-active');
      }
    }

    // Update Cursed Power Output Meter
    this.setText(`${prefix}-power-pct`, `${metrics.cursedPowerLevel}% PODER`);
    const powerFill = document.getElementById(`${prefix}-power-fill`);
    if (powerFill) {
      powerFill.style.width = `${metrics.cursedPowerLevel}%`;
    }
  }

  populateCustomizeModal() {
    const [gojoCand, sukunaCand] = this.getOrderedCandidates();
    this.setInputValue('input-gojo-nome', gojoCand.nome);
    this.setInputValue('input-gojo-numero', gojoCand.numero);
    this.setInputValue('input-gojo-partido', gojoCand.partido);

    this.setInputValue('input-sukuna-nome', sukunaCand.nome);
    this.setInputValue('input-sukuna-numero', sukunaCand.numero);
    this.setInputValue('input-sukuna-partido', sukunaCand.partido);
  }

  saveCustomizeModal() {
    this.customOverrides = {
      gojoNome: this.getInputValue('input-gojo-nome'),
      gojoNumero: this.getInputValue('input-gojo-numero'),
      gojoPartido: this.getInputValue('input-gojo-partido'),
      sukunaNome: this.getInputValue('input-sukuna-nome'),
      sukunaNumero: this.getInputValue('input-sukuna-numero'),
      sukunaPartido: this.getInputValue('input-sukuna-partido')
    };
    this.renderAll();
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new JujutsuElectionApp();
  app.init();
});
