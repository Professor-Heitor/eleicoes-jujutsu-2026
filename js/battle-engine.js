/**
 * @fileoverview Jujutsu Battle & Emotional State Engine (Paródia Flávio "Gojo" vs Lula "Sukuna")
 * Translates 2nd-Round Electoral Percentages into 5 Distinct Emotional & Power States
 * for Flávio "Gojo" Bolsonaro (Left) and Lula "Sukuna" da Silva (Right).
 */

export const FIGHTER_DIALOGUES = {
  gojo: {
    supreme: {
      stateKey: 'supreme',
      moodBadge: 'DOMÍNIO SUPREMO • FLÁVIO GOJO EUFÓRICO',
      moodEmoji: '😎✨',
      expressionLabel: 'Sorriso Invencível (Seis Olhos)',
      techniqueStatus: 'Muryokusho 22: Expansão Total (200% Vazio Roxo)',
      quote: '“Entre o Senado e o Planalto, eu sou o mais forte! O Vazio Infinito disparou nas urnas!”',
      isHappy: true
    },
    winning: {
      stateKey: 'winning',
      moodBadge: 'LIDERANDO • FELIZ & FORTE',
      moodEmoji: '😁⚡',
      expressionLabel: 'Confiante & Sorrindo',
      techniqueStatus: 'Técnica Ilimitada Ativa: Azul & Roxo Avançando',
      quote: '“Fica tranquilo, pessoal! A barreira do Infinito está segurando tudo e estamos na frente!”',
      isHappy: true
    },
    clash: {
      stateKey: 'clash',
      moodBadge: 'COLISÃO KOKUSEN • TENSÃO MÁXIMA',
      moodEmoji: '😤🔥',
      expressionLabel: 'Foco Absoluto (Seis Olhos)',
      techniqueStatus: 'Choque de Domínios 50/50 — Urna por Urna!',
      quote: '“Cada seção apurada está soltando faísca Kokusen! Concentração total no Vazio Roxo!”',
      isHappy: true
    },
    losing: {
      stateKey: 'losing',
      moodBadge: 'EM DESVANTAGEM • TRISTE & PRESSIONADO',
      moodEmoji: '😣💧',
      expressionLabel: 'Abatido & Suando Frio',
      techniqueStatus: 'Barreira do Infinito Trincando sob os Cortes',
      quote: '“Complicou... O Santuário do Lula Sukuna está cortando nossa vantagem nas urnas...”',
      isHappy: false
    },
    collapsed: {
      stateKey: 'collapsed',
      moodBadge: 'DOMÍNIO QUEBRADO • DEVASTADO',
      moodEmoji: '😭💔',
      expressionLabel: 'Exausto & Desolado',
      techniqueStatus: 'Exaustão de Técnica Amaldiçoada (Colapso)',
      quote: '“Minha Expansão de Domínio quebrou... Cadê os votos que estavam aqui?!”',
      isHappy: false
    }
  },
  sukuna: {
    supreme: {
      stateKey: 'supreme',
      moodBadge: 'REI SUPREMO • LULA SUKUNA GARGALHANDO',
      moodEmoji: '😈🔥',
      expressionLabel: 'Riso Triunfante do Rei',
      techniqueStatus: 'Fukuma Mizushi 13: Santuário Aberto + Chamas',
      quote: '“Companheiros Feiticeiros, nunca antes na história desse país um Santuário dominou tantas urnas!”',
      isHappy: true
    },
    winning: {
      stateKey: 'winning',
      moodBadge: 'LIDERANDO • FELIZ & DOMINANTE',
      moodEmoji: '😏🩸',
      expressionLabel: 'Sorriso Confiante & Forte',
      techniqueStatus: 'Clivar & Desmantelar Expandindo Vantagem',
      quote: '“Pode usar os Seis Olhos, Flávio Gojo, mas o Santuário Malevolente já virou esse jogo!”',
      isHappy: true
    },
    clash: {
      stateKey: 'clash',
      moodBadge: 'COLISÃO KOKUSEN • FÚRIA DE BATALHA',
      moodEmoji: '😠⚡',
      expressionLabel: 'Olhar Predatório Intenso',
      techniqueStatus: 'Choque Direto: Santuário Carmesim vs Vazio Infinito!',
      quote: '“A disputa está voto a voto, companheiro! Vamos expandir esse Domínio até o limite!”',
      isHappy: true
    },
    losing: {
      stateKey: 'losing',
      moodBadge: 'EM DESVANTAGEM • TRISTE & FRUSTRADO',
      moodEmoji: '😖💢',
      expressionLabel: 'Irritado & Enfraquecido',
      techniqueStatus: 'Santuário Instável: Perdendo Território',
      quote: '“Mas que barbaridade... Esse Vazio Infinito do Flávio Gojo está bloqueando meus cortes!”',
      isHappy: false
    },
    collapsed: {
      stateKey: 'collapsed',
      moodBadge: 'SANTUÁRIO DESTRUÍDO • ABATIDO',
      moodEmoji: '😨🥀',
      expressionLabel: 'Derrotado & Sem Forças',
      techniqueStatus: 'Santuário Malevolente em Ruínas',
      quote: '“Companheiros, o Vazio Roxo levou minhas urnas... Minha energia amaldiçoada zerou...”',
      isHappy: false
    }
  }
};

/**
 * Determines which of the 5 emotional/strength states a candidate is in
 * based on their share of valid runoff votes (0 to 100).
 * @param {number} sharePct
 * @returns {'supreme'|'winning'|'clash'|'losing'|'collapsed'}
 */
export function resolveFighterStateKey(sharePct) {
  if (sharePct >= 55.0) return 'supreme';
  if (sharePct > 50.35) return 'winning';
  if (sharePct >= 49.65) return 'clash';
  if (sharePct > 45.0) return 'losing';
  return 'collapsed';
}

/**
 * Computes continuous visual strength metrics (scale, glow, saturation, brightness, powerLevel)
 * from a candidate's percentage share (0-100).
 */
export function computeVisualStrengthMetrics(sharePct) {
  const clamped = Math.max(5, Math.min(95, Number(sharePct) || 50));
  const delta = clamped - 50; // -45 to +45

  // Scale ranges from 0.90 (crushed) to 1.075 (supreme winner)
  const scale = Number((1.0 + (delta / 45) * 0.075).toFixed(3));

  // Glow radius in px (from 6px when losing badly up to 68px when dominating)
  const glowPx = Math.round(Math.max(6, Math.min(68, 28 + delta * 1.15)));

  // Saturation (0.42 when losing badly, up to 1.50 when winning strongly)
  const saturation = Number(Math.max(0.42, Math.min(1.5, 1.05 + (delta / 45) * 0.45)).toFixed(2));

  // Brightness (0.68 when losing badly, up to 1.16 when winning strongly)
  const brightness = Number(Math.max(0.68, Math.min(1.16, 0.98 + (delta / 45) * 0.18)).toFixed(2));

  // Cursed Energy Power Output % (8% to 100% meter)
  const cursedPowerLevel = Math.round(Math.max(8, Math.min(100, 50 + delta * 1.45)));

  return {
    scale,
    glowPx,
    saturation,
    brightness,
    cursedPowerLevel
  };
}
