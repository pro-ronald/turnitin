import React, { useState } from 'react';
import { TurnitinReport } from '../types';
import {
  Activity,
  Flame,
  MapPin,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Compass,
  Check,
  FileText,
  Copy,
  BookOpen,
  Hash,
  Building2,
  Calendar
} from 'lucide-react';

interface ForensicDiagnosticsAndActionPlanProps {
  report: TurnitinReport;
  onReAnalyze?: (text: string, title: string) => void;
}

interface AnchorItem {
  text: string;
  category: 'citation' | 'metric' | 'entity';
}

/**
 * Comprehensive Anchor Extractor
 * Extracts all citations (APA, IEEE, Vancouver, Harvard), empirical numerical metrics,
 * and institutional domain entities from the report text without truncating.
 */
const extractComprehensiveAnchors = (report: TurnitinReport): AnchorItem[] => {
  const anchors: AnchorItem[] = [];
  
  // Gather full text from report.fullText or paragraph originalTexts
  let fullContent = report.fullText || '';
  if (!fullContent && report.paragraphs) {
    fullContent = report.paragraphs.map(p => p.originalText).filter(Boolean).join('\n');
  }

  if (!fullContent) return [];

  // 1. EXTRACT ALL CITATIONS (Parenthesized, Bracketed, Multi-citations separated by semicolons, and Narrative)
  // Match parenthesized or bracketed chunks e.g. (Author et al., 2024; Smith, 2020), (CRC, 2024), [1-3]
  const bracketMatches = fullContent.match(/[({\[][^()\[\]]{2,180}[)}\]]/gu) || [];
  bracketMatches.forEach(parenStr => {
    const isNumericCitation = /^\[\d+(?:\s*[,-\s]\s*\d+)*\]$/.test(parenStr);
    const containsYear = /\b(?:19|20)\d{2}\b/.test(parenStr);
    
    if (containsYear || isNumericCitation) {
      const inner = parenStr.replace(/^[(\[{]|[)}\]]$/gu, '').trim();
      // Split by semicolon ; if multiple citations are inside a single parenthesis
      const subParts = inner.split(/;\s*/);
      subParts.forEach(part => {
        const cleanPart = part.trim();
        // APA 7 rule: A parenthetical citation MUST contain author/entity letters alongside the year.
        // Standalone years like "(2024)" without author letters inside the parenthesis are NOT citations.
        const hasAuthorLetters = /[a-zA-Z\p{L}]/u.test(cleanPart);
        const hasYear = /\b(?:19|20)\d{2}\b/.test(cleanPart);
        const isNum = /^\d+$/.test(cleanPart);

        if (cleanPart && ((hasAuthorLetters && hasYear) || (isNumericCitation && isNum))) {
          anchors.push({ text: `(${cleanPart})`, category: 'citation' });
        }
      });
    }
  });

  // Match Narrative Citations e.g. "Garmendia et al. (2024)", "Gamito Gómez et al. (2020)", "Švábenský et al. (2021)"
  const narrativeRegex = /\b([A-Z\p{L}][\p{L}\s.,&]+?\s+(?:et\s+al\.|y\s+cols?\.|y\s+colaboradores)?)\s*\((?:19|20)\d{2}\)/gu;
  let match: RegExpExecArray | null;
  while ((match = narrativeRegex.exec(fullContent)) !== null) {
    const matchedText = match[0].trim();
    if (matchedText.length > 5 && matchedText.length < 90) {
      anchors.push({ text: matchedText, category: 'citation' });
    }
  }

  // 2. EXTRACT EMPIRICAL METRICS & NUMERICAL DATA
  // e.g. 61%, 8.9 horas, 91%, Siete de cada diez, 150 participantes, 24.5%
  const metricRegex = /\b(?:\d+(?:\.\d+)?%\b|\d+(?:\.\d+)?\s*(?:horas|horas\/día|menores|estudiantes|población|dispositivos|pantallas|alumnado|sujetos|participantes)\b|\b\d+\s+de\s+cada\s+\d+\b)/gui;
  const metricMatches = fullContent.match(metricRegex) || [];
  metricMatches.forEach(m => {
    anchors.push({ text: m.trim(), category: 'metric' });
  });

  // 3. EXTRACT INSTITUTIONAL & DOMAIN ENTITIES
  // e.g. CRC, UNIR, UNESCO, OECD, TFM, Escape Room, etc.
  const acronymMatches = fullContent.match(/\b[A-Z]{2,10}\b/g) || [];
  const knownExcludes = new Set(['LA', 'EL', 'LOS', 'LAS', 'DEL', 'POR', 'QUE', 'UNA', 'UNO', 'UNOS', 'CON', 'SIN', 'MAS', 'MÁS', 'VER', 'HOY', 'PDF']);
  acronymMatches.forEach(acro => {
    if (!knownExcludes.has(acro)) {
      anchors.push({ text: acro, category: 'entity' });
    }
  });

  // Deduplicate items cleanly
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

export const ForensicDiagnosticsAndActionPlan: React.FC<ForensicDiagnosticsAndActionPlanProps> = ({
  report,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const metrics = report.metrics;

  // Derived calculations with fallback values
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
  const windowsCount = metrics.slidingWindowsEvaluated ?? Math.max(1, Math.ceil(report.totalSentencesEvaluated / 5));
  const edgeAdjustments = metrics.edgeSmoothingAdjustments ?? 0;
  const nominalRatio = metrics.nominalizationDensityRatio ?? 0;

  const detectedDomain = report.remedialPlan?.detectedDomain || 'General / Académico';
  const cliches = metrics.clicheConnectorsList || report.findings?.clicheConnectors || [];
  const globalAiScore = report.globalAiPercentage;

  // Extract all dynamic anchors (citations, metrics, entities)
  const allAnchors = extractComprehensiveAnchors(report);
  const citations = allAnchors.filter(a => a.category === 'citation');
  const empiricalMetrics = allAnchors.filter(a => a.category === 'metric');
  const domainEntities = allAnchors.filter(a => a.category === 'entity');

  // Determine Overall AI Risk Category
  const isHighAi = globalAiScore > 35;
  const isModerateAi = globalAiScore >= 16 && globalAiScore <= 35;

  const humanSentenceCount = report.humanSentenceCount ?? Math.max(0, report.totalSentencesEvaluated - report.directAiSentenceCount - report.paraphrasedAiSentenceCount);

  const documentTitle = report.documentTitle || 'Documento Analizado';

  const formattedDate = React.useMemo(() => {
    if (!report.processedAt) {
      return new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    try {
      const d = new Date(report.processedAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return report.processedAt;
    } catch {
      return report.processedAt;
    }
  }, [report.processedAt]);

  const scoreExplanation = React.useMemo(() => {
    if (globalAiScore > 35) {
      return `Score del ${globalAiScore}% en un texto de ${report.totalWords.toLocaleString()} palabras (${report.totalSentencesEvaluated} oraciones). Se debe principalmente a ${report.directAiPercentage}% de IA directa (${report.directAiSentenceCount} oraciones) y ${report.paraphrasedAiPercentage}% de contenido parafraseado, identificando ${cliches.length} muletillas cliché y elevada predictibilidad sintáctica en el dominio ${detectedDomain}.`;
    }
    if (globalAiScore >= 16) {
      return `Score moderado del ${globalAiScore}% en ${report.totalWords.toLocaleString()} palabras. Derivado de un ${report.directAiPercentage}% de IA directa y ${report.paraphrasedAiPercentage}% parafraseada, manteniendo ${citations.length} citas bibliográficas auténticas y estructura estándar en el área de ${detectedDomain}.`;
    }
    return `Score orgánico del ${globalAiScore}% en ${report.totalWords.toLocaleString()} palabras. Refleja un ${report.humanPercentage}% de autoría humana con baja predictibilidad sintáctica, variabilidad rítmica natural y adecuada fundamentación dentro del dominio ${detectedDomain}.`;
  }, [globalAiScore, report.totalWords, report.totalSentencesEvaluated, report.directAiPercentage, report.directAiSentenceCount, report.paraphrasedAiPercentage, report.humanPercentage, cliches.length, detectedDomain, citations.length]);

  const correctionPrompt = `PROMPT DE CORRECCIÓN PARA DISMINUIR % DE IA EN TURNITIN (SCORE ACTUAL: ${globalAiScore}%):

Actúa como un experto en redacción académica forense y superación de detectores de IA (Turnitin 2026). Mi texto de ${report.totalWords.toLocaleString()} palabras y ${report.totalSentencesEvaluated} oraciones registró un ${globalAiScore}% de índice de detección de IA debido a los siguientes factores específicos identificados en la auditoría forense:

1. COMPOSICIÓN DE DETECCIÓN:
   - IA Directa (P ≥ 0.65): ${report.directAiPercentage}% (${report.directAiSentenceCount} oraciones)
   - IA Parafraseada (0.30 ≤ P < 0.65): ${report.paraphrasedAiPercentage}% (${report.paraphrasedAiSentenceCount} oraciones)
   - Texto Humano (P < 0.30): ${report.humanPercentage}% (${humanSentenceCount} oraciones)

2. DIAGNÓSTICO DE PERPLEJIDAD (PXP):
   - Nivel: ${metrics.averagePerplexity} (PXP Score: ${pxpScore}/100)
   - Causa: Predictibilidad lexical alta con patrones y secuencias sintácticas formales monótonas.
   - Solución requerida: Elevar la impredecibilidad sintáctica incorporando vocabulario técnico específico, giros orgánicos y términos académicos precisos del dominio "${detectedDomain}".

3. DIAGNÓSTICO DE RÁFAGA / CADENCIA SINTÁCTICA (CV):
   - Coeficiente de Variación (CV): ${cvRatio} (Longitud media: ${meanLen} palabras, Desv. Est: ${stdDev})
   - Causa: Cadencia oracional homogénea y monótona típica de modelos de lenguaje.
   - Solución requerida: Inyectar asimetría rítmica combinando oraciones muy breves (5 a 8 palabras) con oraciones complejas y compuestas para elevar el CV a > 0.45.

4. ANCLAJES CONTEXTUALES Y CITAS (${citations.length} citas, ${empiricalMetrics.length} datos numéricos):
   - Citas encontradas: ${citations.length > 0 ? citations.map(c => c.text).join(', ') : 'Ninguna'}
   - Solución requerida: MANTENER INTACTAS absolutamente todas las citas bibliográficas y métricas numéricas.

5. CONECTORES Y MULETILLAS CLICHÉ A ELIMINAR (${cliches.length} DETECTADOS):
   ${cliches.length > 0 ? cliches.map(c => `- "${c}"`).join('\n   ') : '- Ninguno detectado.'}
   - Solución requerida: Eliminar o sustituir absolutamente todos los conectores cliché listados por nexos naturales de autoría orgánica o transiciones directas.

INSTRUCCIONES DE SALIDA:
- Reescribe y corrige el texto a continuación para reducir el índice de IA por debajo del 10%, solucionando puntualmente cada uno de los factores anteriores.
- Devuelve ÚNICAMENTE el texto académico corregido final, sin introducciones ni comentarios de IA.

--- A CONTINUACIÓN, EL TEXTO A REESCRIBIR Y HUMANIZAR ---
[PEGA AQUÍ EL TEXTO QUE QUIERES CORREGIR]`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(correctionPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 transition-all space-y-0">
      
      {/* ------------------------------------------------------------------- */}
      {/* 1. TURNITIN SCORE HERO DISPLAY (MATCHING REFERENCE DESIGN) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-[#0b1326] text-slate-100 p-4 sm:p-6 space-y-4">
        
        {/* Container Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            {/* TURNITIN SCORE BADGE */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black uppercase tracking-wider shrink-0 shadow-xs">
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>TURNITIN SCORE</span>
            </span>

            {/* Document Title */}
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md lg:max-w-lg" title={documentTitle}>
              "{documentTitle}"
            </h3>

            {/* Analysis Date Pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/70 text-[11px] font-mono text-slate-300 shrink-0">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{formattedDate}</span>
            </span>
          </div>

          {/* Clean Subtitle / Status */}
        </div>

        {/* Main Hero Card */}
        <div className="bg-[#0f1933] rounded-2xl p-5 sm:p-7 border border-slate-800/90 shadow-xl space-y-6">
          
          {/* Circular Percentage Ring + Title Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
            
            {/* Glowing Circular Ring Gauge */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#0a1122] flex flex-col items-center justify-center border-4 shadow-2xl transition-all duration-300 ${
                isHighAi
                  ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                  : isModerateAi
                  ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
                  : 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
              }`}>
                {/* Outer Ring Accent */}
                <div className="absolute -inset-1 rounded-full border border-white/10 pointer-events-none"></div>
                
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-mono ${
                  isHighAi ? 'text-rose-400' : isModerateAi ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {globalAiScore}%
                </span>
                <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest mt-1 ${
                  isHighAi ? 'text-rose-300' : isModerateAi ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  Índice IA
                </span>
              </div>
            </div>

            {/* Description Text */}
            <div className="text-center sm:text-left space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                  Porcentaje Global de IA
                </h4>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isHighAi
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                    : isModerateAi
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                }`}>
                  {isHighAi ? 'Riesgo Alto' : isModerateAi ? 'Riesgo Moderado' : 'Auténtico'}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-snug">
                Índice de oraciones sintéticas (directas/parafraseadas) sobre el total cualificado.
              </p>

              {/* Explicación del motivo del score */}
              <div className="mt-2 rounded-xl bg-[#080d1a] border border-slate-800/90 p-3 text-xs text-slate-200 leading-relaxed font-sans shadow-inner">
                <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                  {scoreExplanation}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Categories Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            
            {/* 1. IA Directa */}
            <div className="bg-[#0b1328] p-3.5 rounded-xl border border-blue-900/50 hover:border-blue-700/60 transition-all shadow-inner space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-xs"></span>
                  <span className="text-xs sm:text-sm font-bold text-blue-300">
                    IA Directa: {report.directAiPercentage}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono pl-4">
                ({report.directAiSentenceCount} oraciones P ≥ 0.65)
              </p>
            </div>

            {/* 2. IA Parafraseada */}
            <div className="bg-[#0b1328] p-3.5 rounded-xl border border-purple-900/50 hover:border-purple-700/60 transition-all shadow-inner space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 shadow-xs"></span>
                  <span className="text-xs sm:text-sm font-bold text-purple-300">
                    IA Parafraseada: {report.paraphrasedAiPercentage}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono pl-4">
                ({report.paraphrasedAiSentenceCount} oraciones 0.30≤P&lt;0.65)
              </p>
            </div>

            {/* 3. Autoría Humana */}
            <div className="bg-[#0b1328] p-3.5 rounded-xl border border-emerald-900/50 hover:border-emerald-700/60 transition-all shadow-inner space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs"></span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-300">
                    Autoría Humana: {report.humanPercentage}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono pl-4">
                ({humanSentenceCount} oraciones P &lt; 0.30)
              </p>
            </div>

          </div>

        </div>

        {/* Unified Technical Calibration Note Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-300 bg-[#080d1a] px-3.5 py-2.5 rounded-xl border border-slate-800/80 font-sans shadow-inner">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Calibración:</strong> Umbral de clasificación P ≥ 0.65 con regla de supresión conservadora para minimizar falsos positivos (&lt;1% de margen de error).
            </span>
          </div>
        </div>

        {/* Additional Document Metrics & Dictamen Block */}
        <div className="pt-2 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-sans text-xs">
            
            {/* Palabras Totales */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <FileText className="w-3 h-3 text-emerald-400 shrink-0" /> Palabras Totales
              </span>
              <span className="text-sm font-bold text-slate-100 font-mono mt-1">
                {report.totalWords.toLocaleString()}
              </span>
            </div>

            {/* Oraciones Evaluadas */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <Activity className="w-3 h-3 text-sky-400 shrink-0" /> Oraciones Evaluadas
              </span>
              <span className="text-sm font-bold text-slate-100 font-mono mt-1">
                {report.totalSentencesEvaluated} <span className="text-[10px] text-slate-400 font-normal">({windowsCount} vent)</span>
              </span>
            </div>

            {/* Dominio */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <Compass className="w-3 h-3 text-amber-400 shrink-0" /> Dominio Temático
              </span>
              <span className="text-xs font-bold text-slate-100 font-mono mt-1 truncate">
                {detectedDomain}
              </span>
            </div>

            {/* Nivel de Riesgo */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/70 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <Sparkles className={`w-3 h-3 shrink-0 ${
                  isHighAi ? 'text-rose-400' : isModerateAi ? 'text-amber-400' : 'text-emerald-400'
                }`} /> Riesgo Académico
              </span>
              <span className={`text-xs font-bold font-mono mt-1 truncate ${
                isHighAi ? 'text-rose-400' : isModerateAi ? 'text-amber-300' : 'text-emerald-400'
              }`}>
                {report.unirRiskLevel || (isHighAi ? 'Riesgo Alto' : isModerateAi ? 'Riesgo Moderado' : 'Bajo Riesgo')}
              </span>
            </div>

          </div>

        </div>

      </div>

      <div className="p-6 space-y-4">
        
        {/* Section Title for Detailed Factors */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <h4 className="font-extrabold uppercase tracking-wider text-xs text-slate-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-600" />
            <span>Factores Diagnósticos Específicos</span>
          </h4>
          <span className="text-[10px] font-mono text-slate-500">4 Métricas de Control</span>
        </div>

        {/* 4-Column Factors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Factor 1: Componente Perplejidad Lexical (PXP) */}
          <div className="bg-white/95 p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>1. Perplejidad (PXP)</span>
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                  metrics.averagePerplexity === 'Baja' || metrics.averagePerplexity === 'Muy Baja'
                    ? 'bg-rose-100 text-rose-950 border-rose-300'
                    : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                }`}>
                  {metrics.averagePerplexity === 'Baja' || metrics.averagePerplexity === 'Muy Baja' ? 'Predicible (IA)' : 'Léxico Humano'}
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-700">
                <div className="flex justify-between font-mono bg-slate-50 px-2 py-0.5 rounded">
                  <span>Nivel Perplejidad:</span>
                  <strong className={metrics.averagePerplexity === 'Baja' || metrics.averagePerplexity === 'Muy Baja' ? 'text-rose-700' : 'text-emerald-700'}>
                    {metrics.averagePerplexity}
                  </strong>
                </div>
                <div className="flex justify-between font-mono bg-slate-50 px-2 py-0.5 rounded">
                  <span>Índice Predictivo:</span>
                  <strong className="text-slate-800">{pxpScore} / 100</strong>
                </div>
                {nominalRatio > 0 && (
                  <div className="flex justify-between font-mono text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-600">
                    <span>Nominalización:</span>
                    <strong>{nominalRatio}/100 pal</strong>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight border-t border-slate-100 pt-1.5 mt-1">
              {metrics.averagePerplexity === 'Baja' || metrics.averagePerplexity === 'Muy Baja'
                ? '💡 Usar vocabulario técnico especializado para romper secuencias predecibles.'
                : '✅ Excelente impredecibilidad sintáctica y variedad vocabular.'}
            </p>
          </div>

          {/* Factor 2: Componente Ráfaga y Cadencia (Burstiness / CV) */}
          <div className="bg-white/95 p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>2. Ráfaga (Burstiness)</span>
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  cvRatio < 0.35 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  CV = {cvRatio}
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-700">
                <div className="flex justify-between font-mono bg-slate-50 px-2 py-0.5 rounded">
                  <span>Evaluación Cadencia:</span>
                  <strong className={cvRatio < 0.35 ? 'text-amber-800' : 'text-emerald-800'}>
                    {cvRatio < 0.35 ? 'Monótona (IA)' : 'Asimétrica (Humana)'}
                  </strong>
                </div>
                <div className="flex justify-between font-mono bg-slate-50 px-2 py-0.5 rounded">
                  <span>Desv. Estándar (σ):</span>
                  <strong className="text-slate-800">{stdDev} palabras</strong>
                </div>
                <div className="flex justify-between font-mono bg-slate-50 px-2 py-0.5 rounded">
                  <span>Promedio (μ):</span>
                  <strong className="text-slate-800">{meanLen} pal/oración</strong>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight border-t border-slate-100 pt-1.5 mt-1">
              {cvRatio < 0.35
                ? '💡 Alternar oraciones breves (4-8 palabras) con frases compuestas para variar ritmo.'
                : '✅ Buen contraste de longitud entre oraciones compuestas y breves.'}
            </p>
          </div>

          {/* Factor 3: Anclajes Contextuales & Citas */}
          <div className="bg-white/95 p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>3. Anclajes & Citas</span>
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  allAnchors.length > 0 
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {allAnchors.length} Detectados
                </span>
              </div>

              <div className="space-y-1.5">
                {citations.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-900">
                      <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Citas ({citations.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto pr-1">
                      {citations.map((c, idx) => (
                        <span key={idx} className="text-[9px] bg-emerald-50 text-emerald-950 border border-emerald-300 px-1.5 py-0.5 rounded font-mono font-medium shadow-2xs">
                          {c.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {empiricalMetrics.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-sky-900">
                      <Hash className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>Datos Empíricos ({empiricalMetrics.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-10 overflow-y-auto pr-1">
                      {empiricalMetrics.map((m, idx) => (
                        <span key={idx} className="text-[9px] bg-sky-50 text-sky-950 border border-sky-300 px-1.5 py-0.5 rounded font-mono font-medium shadow-2xs">
                          {m.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {domainEntities.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-900">
                      <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>Entidades ({domainEntities.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-10 overflow-y-auto pr-1">
                      {domainEntities.map((e, idx) => (
                        <span key={idx} className="text-[9px] bg-indigo-50 text-indigo-950 border border-indigo-200 px-1.5 py-0.5 rounded font-mono font-medium shadow-2xs">
                          {e.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {allAnchors.length === 0 && (
                  <div className="p-2 bg-amber-50/80 rounded border border-amber-200 text-[10px] text-amber-800 leading-tight">
                    ⚠️ Sin citas ni datos empíricos numéricos detectados.
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight border-t border-slate-100 pt-1.5 mt-1">
              💡 Conservar citas e investigar con datos numéricos previene falsos positivos.
            </p>
          </div>

          {/* Factor 4: Conectores y Muletillas Cliché */}
          <div className="bg-white/95 p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>4. Conectores Cliché</span>
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  cliches.length > 0 
                    ? 'bg-rose-100 text-rose-950 border border-rose-300' 
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  {cliches.length} {cliches.length === 1 ? 'Detectado' : 'Detectados'}
                </span>
              </div>

              {cliches.length > 0 ? (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block">Muletillas a eliminar:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {cliches.map((cliche, idx) => (
                      <span key={idx} className="text-[10px] bg-rose-100/90 text-rose-950 border border-rose-300 px-2 py-0.5 rounded font-mono font-bold shadow-2xs">
                        "{cliche}"
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-emerald-50/80 rounded border border-emerald-200 text-[10px] text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sin muletillas cliché de plantilla.</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 leading-tight border-t border-slate-100 pt-1.5 mt-1">
              💡 Purgar estas muletillas reduce de forma directa el porcentaje de detección.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
