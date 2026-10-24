import { TurnitinReport } from '../types';

export interface AnchorItem {
  text: string;
  category: 'citation' | 'metric' | 'entity';
}

export const extractComprehensiveAnchors = (report: TurnitinReport): AnchorItem[] => {
  const anchors: AnchorItem[] = [];
  
  let fullContent = report.fullText || '';
  if (!fullContent && report.paragraphs) {
    fullContent = report.paragraphs.map(p => p.originalText).filter(Boolean).join('\n');
  }

  if (!fullContent) return [];

  const bracketMatches = fullContent.match(/[({\[][^()\[\]]{2,180}[)}\]]/gu) || [];
  bracketMatches.forEach(parenStr => {
    const isNumericCitation = /^\[\d+(?:\s*[,-\s]\s*\d+)*\]$/.test(parenStr);
    const containsYear = /\b(?:19|20)\d{2}\b/.test(parenStr);
    
    if (containsYear || isNumericCitation) {
      const inner = parenStr.replace(/^[(\[{]|[)}\]]$/gu, '').trim();
      const subParts = inner.split(/;\s*/);
      subParts.forEach(part => {
        const cleanPart = part.trim();
        const hasAuthorLetters = /[a-zA-Z\p{L}]/u.test(cleanPart);
        const hasYear = /\b(?:19|20)\d{2}\b/.test(cleanPart);
        const isNum = /^\d+$/.test(cleanPart);

        if (cleanPart && ((hasAuthorLetters && hasYear) || (isNumericCitation && isNum))) {
          anchors.push({ text: `(${cleanPart})`, category: 'citation' });
        }
      });
    }
  });

  const narrativeRegex = /\b([A-Z\p{L}][\p{L}\s.,&]+?\s+(?:et\s+al\.|y\s+cols?\.|y\s+colaboradores)?)\s*\((?:19|20)\d{2}\)/gu;
  let match: RegExpExecArray | null;
  while ((match = narrativeRegex.exec(fullContent)) !== null) {
    const matchedText = match[0].trim();
    if (matchedText.length > 5 && matchedText.length < 90) {
      anchors.push({ text: matchedText, category: 'citation' });
    }
  }

  const metricRegex = /\b(?:\d+(?:\.\d+)?%\b|\d+(?:\.\d+)?\s*(?:horas|horas\/día|menores|estudiantes|población|dispositivos|pantallas|alumnado|sujetos|participantes)\b|\b\d+\s+de\s+cada\s+\d+\b)/gui;
  const metricMatches = fullContent.match(metricRegex) || [];
  metricMatches.forEach(m => {
    anchors.push({ text: m.trim(), category: 'metric' });
  });

  const acronymMatches = fullContent.match(/\b[A-Z]{2,10}\b/g) || [];
  const knownExcludes = new Set(['LA', 'EL', 'LOS', 'LAS', 'DEL', 'POR', 'QUE', 'UNA', 'UNO', 'UNOS', 'CON', 'SIN', 'MAS', 'MÁS', 'VER', 'HOY', 'PDF']);
  acronymMatches.forEach(acro => {
    if (!knownExcludes.has(acro)) {
      anchors.push({ text: acro, category: 'entity' });
    }
  });

  const seen = new Set<string>();
  const uniqueAnchors: AnchorItem[] = [];

  anchors.forEach(item => {
    const normKey = item.text.toLowerCase().replace(/[\s\.\,]+/g, '');
    if (!seen.has(normKey) && normKey.length >= 2) {
      seen.add(normKey);
      uniqueAnchors.push(item);
    }
  });

  return uniqueAnchors;
};

export function generateCorrectionPrompt(report: TurnitinReport): string {
  const metrics = report.metrics;

  const meanLen = metrics.meanSentenceLength ?? (
    report.totalSentencesEvaluated > 0 
      ? Math.round((report.totalWords / report.totalSentencesEvaluated) * 10) / 10 
      : 18.5
  );
  const stdDev = metrics.burstinessStdDev ?? 0;
  const cvRatio = metrics.variationCoefficient ?? (meanLen > 0 ? Math.round((stdDev / meanLen) * 100) / 100 : 0);
  const pxpScore = metrics.perplexityScore ?? (
    metrics.averagePerplexity === 'Baja' || metrics.averagePerplexity === 'Muy Baja' ? 18 : 
    metrics.averagePerplexity === 'Media' ? 52 : 88
  );

  const detectedDomain = report.remedialPlan?.detectedDomain || 'General / Académico';
  const cliches = metrics.clicheConnectorsList || report.findings?.clicheConnectors || [];
  const globalAiScore = report.globalAiPercentage;

  const allAnchors = extractComprehensiveAnchors(report);
  const citations = allAnchors.filter(a => a.category === 'citation');
  const empiricalMetrics = allAnchors.filter(a => a.category === 'metric');
  
  let fullContent = report.fullText || '';
  if (!fullContent && report.paragraphs) {
    fullContent = report.paragraphs.map(p => p.originalText).filter(Boolean).join('\n\n');
  }

  const aiSentencesList: string[] = [];

  if (report.paragraphs) {
    report.paragraphs.forEach((para, pIdx) => {
      if (!para.isQualified) return;
      
      para.sentences.forEach((s, sIdx) => {
        if (s.classification === 'AI_DIRECT' || s.classification === 'AI_PARAPHRASED') {
          const probPercent = Math.round(s.rawProbability * 100);
          const classificationTag = s.classification === 'AI_DIRECT' 
            ? `[🔵 IA DIRECTA - ${probPercent}% IA]` 
            : `[🟣 IA PARAFRASEADA - ${probPercent}% IA]`;
          
          const clichesTag = s.clichesFound && s.clichesFound.length > 0
            ? `\n  - Conectores / Muletillas en esta oración: ${s.clichesFound.map(c => `"${c}"`).join(', ')}`
            : '';

          aiSentencesList.push(
            `• [Párrafo ${pIdx + 1}, Oración ${sIdx + 1}] ${classificationTag}\n  - Texto de la Oración: "${s.text}"\n  - Razón del Fallo / Error Técnico: ${s.reason}${clichesTag}`
          );
        }
      });
    });
  }

  const clichesFormatted = cliches.length > 0
    ? cliches.map((c, i) => `${i + 1}. "${c}"`).join('\n')
    : 'No se detectaron conectores cliché explícitos (el % de IA se debe a perplejidad lineal y baja variabilidad rítmica).';

  const citationsFormatted = citations.length > 0
    ? citations.map(c => c.text).join(', ')
    : 'Ninguna cita bibliográfica detectada.';

  const metricsFormatted = empiricalMetrics.length > 0
    ? empiricalMetrics.map(m => m.text).join(', ')
    : 'Ningún dato numérico explícito detectado.';

  return `AUDITORÍA FORENSE DE ERRORES Y DIAGNÓSTICO DE IA (A CORREGIR ESTRICTAMENTE)
================================================================================

1. DIAGNÓSTICO DEL PORQUÉ DEL PORCENTAJE GLOBAL DE IA:
• Porcentaje Global Detectado: ${globalAiScore}% de Detección por Algoritmos de IA
• Desglose de Puntos Críticos: ${report.directAiPercentage}% de IA Directa (P ≥ 85%) y ${report.paraphrasedAiPercentage}% de IA Parafraseada (60% ≤ P < 85%).
• Causa Algorítmica Principal: El texto presenta patrones gramaticales altamente predecibles para modelos de lenguaje (LLM), caracterizados por perplejidad léxica ${metrics.averagePerplexity} y monotonía en la variación de longitud de oraciones (Ráfaga / Cadencia ${metrics.burstinessRating}, σ = ${stdDev} palabras, Coeficiente CV = ${cvRatio}).
• Trampa de Prosa Limpia (Clean Prose Trap): ${metrics.cleanProseTrapDetected ? 'DETECTADA. El texto tiene una redacción sintéticamente pulida e inflada sin imperfecciones rítmicas humanas.' : 'No detectada.'}

2. CONECTORES CLICHÉ Y MULETILLAS PREDICTIVAS A ELIMINAR ESTRICTAMENTE (${cliches.length}):
${clichesFormatted}

3. DATOS Y ELEMENTOS CLAVE A BLINDAR E INTACTOS:
• Citas Bibliográficas a Preservar Intactas (${citations.length}): ${citationsFormatted}
• Datos Numéricos y Empíricos a Preservar Intactos (${empiricalMetrics.length}): ${metricsFormatted}

4. DESGLOSE EXCLUSIVO DE ORACIONES DETECTADAS COMO IA (ORACIÓN POR ORACIÓN A ATENDER):
${aiSentencesList.length > 0 
  ? aiSentencesList.join('\n\n')
  : '• No se encontraron oraciones individuales clasificadas como IA Directa o IA Parafraseada en este texto.'}`;
}
