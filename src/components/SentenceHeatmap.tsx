import React, { useState, useMemo, useRef, useEffect } from 'react';
import { QualifiedParagraph, EvaluatedSentence } from '../types';
import { Info, X, ExternalLink, Filter, Search, CheckCircle2, ChevronUp, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import { generateHumanizedRewrite } from '../utils/aiDetectionEngine';

/**
 * Extracts AI connectors, clichés, and highly predictable LLM words to replace in a specific sentence.
 */
function getDetectedConnectors(sentence: EvaluatedSentence): string[] {
  const result = new Set<string>();

  if (sentence.clichesFound && sentence.clichesFound.length > 0) {
    sentence.clichesFound.forEach(c => {
      if (c && c.trim()) result.add(c.trim());
    });
  }

  const connectorsPattern = /\b(en la era digital contemporánea|en la era digital|en el panorama contemporáneo|un intrincado tapiz|sirve como testimonio de la|sirve como testimonio|no constituye un atributo estático|no representa un atributo estático|revelar los matices de|revelar los matices|coyunturas inusitadas|emana de la confluencia de|delve into the rich tapestry|delve into|navigating the multifaceted|desempeña un papel fundamental|juega un papel fundamental|es de suma importancia|a partir de estas consideraciones|por consiguiente|cabe destacar|es fundamental|en este sentido|asimismo|en conclusión|por lo tanto|esquema deontológico|metamorfosis de la docencia|singularizar la enseñanza|visibiliza una grieta|erigirse en el principal ecosistema|desmediación parental|abismo tecnológico|encauzar este cauce|imbricación)\b/gi;

  const matches = sentence.text.match(connectorsPattern);
  if (matches) {
    matches.forEach(m => result.add(m.trim()));
  }

  return Array.from(result);
}

interface SentenceHeatmapProps {
  paragraphs: QualifiedParagraph[];
}

export const SentenceHeatmap: React.FC<SentenceHeatmapProps> = ({ paragraphs }) => {
  const [selectedSentence, setSelectedSentence] = useState<EvaluatedSentence | null>(null);
  
  // Legend Category Toggles
  const [showDirectAi, setShowDirectAi] = useState<boolean>(true);
  const [showParaphrasedAi, setShowParaphrasedAi] = useState<boolean>(true);
  const [showHuman, setShowHuman] = useState<boolean>(true);
  const [showStructural, setShowStructural] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Continuous scroll / progressive batch loading
  const BATCH_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Copy state for rewrite suggestion
  const [copiedRewrite, setCopiedRewrite] = useState(false);
  // Copy state for full analyzed text
  const [copiedFullText, setCopiedFullText] = useState(false);

  const handleCopyFullText = () => {
    const fullText = paragraphs.map(p => p.originalText).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedFullText(true);
    setTimeout(() => {
      setCopiedFullText(false);
    }, 2000);
  };

  const totalSentences = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + (p.sentences?.length || 0), 0);
  }, [paragraphs]);

  const directAiSentenceCount = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + (p.sentences?.filter(s => s.classification === 'AI_DIRECT').length || 0), 0);
  }, [paragraphs]);

  const paraphrasedAiSentenceCount = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + (p.sentences?.filter(s => s.classification === 'AI_PARAPHRASED').length || 0), 0);
  }, [paragraphs]);

  const humanSentenceCount = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + (p.sentences?.filter(s => s.classification === 'HUMAN').length || 0), 0);
  }, [paragraphs]);

  const structuralBlockCount = useMemo(() => {
    return paragraphs.filter(p => p.blockType && p.blockType !== 'paragraph' && !p.isQualified).length;
  }, [paragraphs]);

  // Filtered paragraphs based on active legend category toggles
  const filteredParagraphs = useMemo(() => {
    return paragraphs.filter(para => {
      // Handle structural blocks (headings, tables, figures, sources, index)
      const isStructural = para.blockType && para.blockType !== 'paragraph' && !para.isQualified;
      if (isStructural) {
        if (!showStructural) return false;
        if (searchQuery.trim()) {
          return para.originalText.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      }

      if (!para.isQualified) {
        return showHuman;
      }

      // Check if paragraph contains any sentence matching active toggles
      const matchesCategory = para.sentences.some(s => {
        if (s.classification === 'AI_DIRECT' && showDirectAi) return true;
        if (s.classification === 'AI_PARAPHRASED' && showParaphrasedAi) return true;
        if (s.classification === 'HUMAN' && showHuman) return true;
        return false;
      });

      if (!matchesCategory) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = para.originalText.toLowerCase().includes(query);
        if (!textMatch) return false;
      }

      return true;
    });
  }, [paragraphs, showDirectAi, showParaphrasedAi, showHuman, showStructural, searchQuery]);

  // Active sentence count matching current applied filters
  const activeFilteredSentencesCount = useMemo(() => {
    return filteredParagraphs.reduce((acc, p) => {
      if (!p.sentences) return acc;
      return acc + p.sentences.filter(s => {
        if (s.classification === 'AI_DIRECT' && showDirectAi) return true;
        if (s.classification === 'AI_PARAPHRASED' && showParaphrasedAi) return true;
        if (s.classification === 'HUMAN' && showHuman) return true;
        return false;
      }).length;
    }, 0);
  }, [filteredParagraphs, showDirectAi, showParaphrasedAi, showHuman]);

  // Visible subset for continuous scroll
  const visibleParagraphs = useMemo(() => {
    return filteredParagraphs.slice(0, visibleCount);
  }, [filteredParagraphs, visibleCount]);

  // Auto-load more when scrolling near bottom
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 250) {
      if (visibleCount < filteredParagraphs.length) {
        setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredParagraphs.length));
      }
    }
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // State for cycling humanized rewrite variations
  const [variationIndex, setVariationIndex] = useState(0);

  // Generate rewrite suggestion for modal
  const rewriteResult = useMemo(() => {
    if (!selectedSentence) return null;
    return generateHumanizedRewrite(selectedSentence.text, variationIndex);
  }, [selectedSentence, variationIndex]);

  const handleCopyRewrite = () => {
    if (rewriteResult?.humanizedText) {
      navigator.clipboard.writeText(rewriteResult.humanizedText);
      setCopiedRewrite(true);
      setTimeout(() => setCopiedRewrite(false), 2500);
    }
  };

  // Helper to highlight search text inside sentence text
  const highlightSearchText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded shadow-2xs">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Helper to render sentence spans with active highlights
  const renderSentenceSpan = (sentence: EvaluatedSentence) => {
    let styleClass = 'text-slate-800 transition-all rounded px-0.5 py-0.5';
    let badgeIcon = null;
    const isAiSentence = sentence.classification === 'AI_DIRECT' || sentence.classification === 'AI_PARAPHRASED';

    if (sentence.classification === 'AI_DIRECT') {
      if (!showDirectAi) return null;
      styleClass = 'bg-blue-100/90 text-blue-950 hover:bg-blue-200/90 border-b-2 border-blue-500 font-medium cursor-pointer transition-all rounded px-1.5 py-0.5 shadow-2xs';
      badgeIcon = '🔵';
    } else if (sentence.classification === 'AI_PARAPHRASED') {
      if (!showParaphrasedAi) return null;
      styleClass = 'bg-purple-100/90 text-purple-950 hover:bg-purple-200/90 border-b-2 border-purple-500 font-medium cursor-pointer transition-all rounded px-1.5 py-0.5 shadow-2xs';
      badgeIcon = '🟣';
    } else if (sentence.classification === 'HUMAN') {
      if (!showHuman) return null;
    }

    const isSearchMatch = Boolean(searchQuery.trim() && sentence.text.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <span
        key={sentence.id}
        onClick={() => {
          if (isAiSentence) {
            setVariationIndex(0);
            setSelectedSentence(sentence);
          }
        }}
        className={`${styleClass} ${isSearchMatch ? 'ring-2 ring-amber-400/80 bg-amber-100/90 font-bold' : ''} inline my-0.5`}
        title={isAiSentence ? `Haz clic para ver por qué esta oración fue detectada como IA y cómo corregirla (Probabilidad: ${Math.round(sentence.rawProbability * 100)}%)` : undefined}
      >
        {badgeIcon && <span className="mr-1 text-[11px] inline-block">{badgeIcon}</span>}
        {highlightSearchText(sentence.text, searchQuery)}{' '}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
      
      {/* Consolidated Header with Search & Integrated Filter Controls */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 space-y-3.5">
        
        {/* Top Row: Title, Badges & Search Box (Top Right) */}
        <div className="flex flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1 text-[11px]">
              <span className="font-extrabold uppercase tracking-wider text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded border border-red-800/60 inline-block">
                Mapa de Calor
              </span>
              <button
                type="button"
                onClick={handleCopyFullText}
                className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                  copiedFullText
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300'
                }`}
                title="Copiar todo el texto analizado en formato limpio"
              >
                {copiedFullText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <span>Copiar texto completo</span>
                  </>
                )}
              </button>
            </div>
            <h3 className="text-sm sm:text-lg font-extrabold text-slate-100 font-sans tracking-tight truncate">
              Inspección Oracional y Estructura del Documento
            </h3>
          </div>

          {/* Search Box - Fixed Top Right */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <div className="relative w-36 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar en el texto..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(BATCH_SIZE);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs pl-8 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-red-500 w-full placeholder-slate-500 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <span className="hidden sm:inline-flex text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/60 shrink-0">
                {filteredParagraphs.length}
              </span>
            )}
          </div>
        </div>

        {/* Integrated Filter Button Row (Single Unified Header Bar) */}
        <div className="pt-2.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Filtro:
            </span>
            
            {/* Blue: AI Direct Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowDirectAi(prev => !prev);
                setVisibleCount(BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                showDirectAi
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs ring-2 ring-blue-400/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 line-through opacity-60 hover:opacity-100 hover:no-underline'
              }`}
              title="Alternar oraciones de IA Directa"
            >
              <span>🔵 IA Directa</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold font-mono ${showDirectAi ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {directAiSentenceCount}
              </span>
            </button>

            {/* Purple: AI Paraphrased Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowParaphrasedAi(prev => !prev);
                setVisibleCount(BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                showParaphrasedAi
                  ? 'bg-purple-600 text-white border-purple-500 shadow-xs ring-2 ring-purple-400/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 line-through opacity-60 hover:opacity-100 hover:no-underline'
              }`}
              title="Alternar oraciones de IA Parafraseada"
            >
              <span>🟣 IA Parafraseada</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold font-mono ${showParaphrasedAi ? 'bg-purple-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {paraphrasedAiSentenceCount}
              </span>
            </button>

            {/* White/Slate: Human Text Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowHuman(prev => !prev);
                setVisibleCount(BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                showHuman
                  ? 'bg-slate-200 text-slate-900 border-white shadow-xs ring-2 ring-slate-400/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 line-through opacity-60 hover:opacity-100 hover:no-underline'
              }`}
              title="Alternar texto humano"
            >
              <span>Humano</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold font-mono ${showHuman ? 'bg-slate-300 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>
                {humanSentenceCount}
              </span>
            </button>

            {/* Yellow/Amber: Structural / Tables / Figures Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowStructural(prev => !prev);
                setVisibleCount(BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                showStructural
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-400/40 font-extrabold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 line-through opacity-60 hover:opacity-100 hover:no-underline'
              }`}
              title="Alternar Tablas, Figuras, Fuentes e Índices"
            >
              <span>Formato</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold font-mono ${showStructural ? 'bg-amber-950 text-amber-200' : 'bg-slate-700 text-slate-300'}`}>
                {structuralBlockCount}
              </span>
            </button>

            {/* Reset button if any filter is turned off */}
            {(!showDirectAi || !showParaphrasedAi || !showHuman || !showStructural) && (
              <button
                type="button"
                onClick={() => {
                  setShowDirectAi(true);
                  setShowParaphrasedAi(true);
                  setShowHuman(true);
                  setShowStructural(true);
                  setVisibleCount(BATCH_SIZE);
                }}
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline ml-1 cursor-pointer"
              >
                Mostrar todas
              </button>
            )}
          </div>

          {/* Block Counter Status */}
          <div className="text-[11px] text-slate-300 font-mono flex flex-wrap items-center gap-2">
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0"></span>
              <span className="text-slate-200">{filteredParagraphs.length}</span> bloques ({activeFilteredSentencesCount} oraciones)
            </span>
            {visibleCount < filteredParagraphs.length && (
              <button
                type="button"
                onClick={() => setVisibleCount(filteredParagraphs.length)}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline font-sans font-extrabold bg-amber-950/70 px-2.5 py-1 rounded border border-amber-800/80 cursor-pointer transition-all hover:bg-amber-900/80"
              >
                Ver todos ({filteredParagraphs.length} bloques)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Continuous Scroll Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="p-6 md:p-8 space-y-4 max-h-[750px] overflow-y-auto relative scroll-smooth bg-slate-50/50"
      >
        {visibleParagraphs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No se encontraron párrafos con los criterios seleccionados.
          </div>
        ) : (
          visibleParagraphs.map((para) => {
            const pIdx = para.index;
            const bType = para.blockType || 'paragraph';

            if (bType === 'heading') {
              return (
                <div key={pIdx} className="mt-8 mb-3 pt-4 border-t border-slate-300">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 font-sans tracking-tight border-b-2 border-slate-800 pb-1.5 flex items-center gap-2">
                    <span className="w-2.5 h-5 bg-red-600 rounded-full inline-block shrink-0"></span>
                    <span>{para.originalText}</span>
                  </h2>
                </div>
              );
            }

            if (bType === 'subheading') {
              return (
                <div key={pIdx} className="mt-5 mb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-sans tracking-tight border-l-4 border-amber-500 pl-3 py-1 bg-amber-50/70 rounded-r-lg border-y border-r border-amber-200/80 shadow-2xs">
                    {para.originalText}
                  </h3>
                </div>
              );
            }

            if (bType === 'table_figure') {
              const rowLines = para.originalText.split('\n').map(l => l.trim()).filter(Boolean);
              return (
                <div key={pIdx} className="my-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl shadow-md overflow-hidden">
                  <div className="bg-slate-800/90 px-4 py-2 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-2xs font-mono">
                        📊 Tabla / Figura / Fuente
                      </span>
                      <span className="text-xs text-slate-300 font-medium font-sans">
                        Estructura excluidas del análisis de IA según norma Turnitin
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Formato no oracional
                    </span>
                  </div>
                  <div className="p-3.5 font-mono text-xs text-slate-200 leading-relaxed space-y-1 bg-slate-950/70 overflow-x-auto">
                    {rowLines.map((rowLine, rIdx) => {
                      const isTitleOrCaption = /^(?:Tabla|Figura|Gr[áa]fico|Cuadro|Ilustra[cç]i[oó]n|Table|Figure)\s+\d+/i.test(rowLine);
                      const isSource = /^(?:Fuente[\:\s]|Source[\:\s]|Elaboraci[óo]n\s+propia|Adaptado\s+de)/i.test(rowLine);

                      if (isTitleOrCaption) {
                        return (
                          <div key={rIdx} className="font-sans font-bold text-sm text-amber-300 pb-1 border-b border-slate-800 mb-2">
                            {rowLine}
                          </div>
                        );
                      }

                      if (isSource) {
                        return (
                          <div key={rIdx} className="font-sans italic text-xs text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
                            {rowLine}
                          </div>
                        );
                      }

                      return (
                        <div key={rIdx} className="py-1 px-2.5 bg-slate-900/80 rounded border border-slate-800/70 hover:bg-slate-800/80 transition-colors">
                          {rowLine}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (bType === 'list_item') {
              return (
                <div key={pIdx} className="my-1 pl-4 border-l-2 border-slate-300 text-sm text-slate-800 font-sans leading-relaxed">
                  <span className="font-bold text-slate-400 mr-2">•</span>
                  {para.isQualified && para.sentences && para.sentences.length > 0 ? (
                    para.sentences.map(s => renderSentenceSpan(s))
                  ) : (
                    <span>{para.originalText}</span>
                  )}
                </div>
              );
            }

            if (bType === 'bibliography') {
              return (
                <div key={pIdx} className="my-1.5 p-2.5 bg-amber-50/40 border-l-2 border-amber-300 rounded-r text-xs text-slate-600 font-serif leading-relaxed">
                  {para.originalText}
                </div>
              );
            }

            // Standard prose paragraph
            return (
              <div key={pIdx} className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs leading-relaxed font-sans text-sm text-slate-800 space-x-1">
                {para.isQualified && para.sentences && para.sentences.length > 0 ? (
                  para.sentences.map(s => renderSentenceSpan(s))
                ) : (
                  <span className="text-slate-600 italic">
                    "{para.originalText}" <span className="text-amber-700 text-xs font-mono font-semibold">[{para.unqualifiedReason || 'Metadato / Texto corto'}]</span>
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Load More Button at bottom of scroll list */}
        {visibleCount < filteredParagraphs.length && (
          <div className="py-6 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredParagraphs.length))}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cargar {Math.min(BATCH_SIZE, filteredParagraphs.length - visibleCount)} párrafos más (Quedan {filteredParagraphs.length - visibleCount})
            </button>
          </div>
        )}

        {/* Floating Scroll-to-Top Button */}
        {visibleParagraphs.length > 10 && (
          <button
            type="button"
            onClick={scrollToTop}
            title="Volver al inicio del documento"
            className="sticky bottom-4 left-full p-3 bg-slate-900/90 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all border border-slate-700/80 backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 ml-auto"
          >
            <ChevronUp className="w-4 h-4" />
            <span className="hidden sm:inline">Arriba</span>
          </button>
        )}
      </div>

      {/* Sentence Inspector Modal & Rewrite Assistant */}
      {selectedSentence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className={`p-4 text-white flex items-center justify-between shrink-0 ${
                selectedSentence.classification === 'AI_DIRECT' ? 'bg-blue-700' : 'bg-purple-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {selectedSentence.classification === 'AI_DIRECT' ? '🔵' : '🟣'}
                  </span>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider font-mono">
                      Diagnóstico Oracional de IA ({selectedSentence.classification === 'AI_DIRECT' ? 'IA Directa' : 'IA Parafraseada'})
                    </h4>
                    <p className="text-[11px] text-white/80 font-sans">
                      Análisis dinámico forense e instrucciones de corrección
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSentence(null)}
                  className="p-1 rounded-md hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 text-xs overflow-y-auto">
                
                {/* Selected Original Text */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Oración Seleccionada en el Documento
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedSentence.burstinessLength} palabras
                    </span>
                  </div>
                  <p className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg font-serif text-sm text-slate-900 leading-relaxed shadow-2xs">
                    "{selectedSentence.text}"
                  </p>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Probabilidad IA</span>
                    <span className={`text-base font-black ${
                      selectedSentence.classification === 'AI_DIRECT' ? 'text-blue-700' : 'text-purple-700'
                    }`}>
                      {Math.round(selectedSentence.rawProbability * 100)}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Clasificación</span>
                    <span className={`text-xs font-black block mt-0.5 ${
                      selectedSentence.classification === 'AI_DIRECT' ? 'text-blue-700' : 'text-purple-700'
                    }`}>
                      {selectedSentence.classification === 'AI_DIRECT' ? '🔵 IA Directa' : '🟣 IA Parafraseada'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold mb-0.5">Conectores Detectados</span>
                    {(() => {
                      const connectors = getDetectedConnectors(selectedSentence);
                      if (connectors.length === 0) {
                        return (
                          <span className="text-xs font-bold text-slate-500 italic block mt-0.5">
                            Ninguno
                          </span>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-1 justify-center mt-1 max-h-16 overflow-y-auto w-full">
                          {connectors.map((conn, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-rose-100 text-rose-950 rounded border border-rose-300 font-mono font-bold text-[10px]"
                              title={`Conector o término predecible de IA a reemplazar: "${conn}"`}
                            >
                              "{conn}"
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>



              {/* 3. ALTERNATIVA DE REESCRITURA HUMANIZADA Y VERIFICACIÓN FORENSE EN VIVO */}
              {rewriteResult && (
                <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-3 shadow-2xs">
                  <div className="p-3.5 bg-white border border-emerald-200 rounded-lg text-sm text-slate-900 leading-relaxed font-serif shadow-2xs">
                    "{rewriteResult.humanizedText}"
                  </div>

                  {rewriteResult.apaCitationsPreserved && rewriteResult.apaCitationsPreserved.length > 0 && (
                    <div className="p-2 bg-emerald-100/80 border border-emerald-300 rounded-lg text-[11px] text-emerald-950 font-medium flex items-center gap-1.5">
                      <span className="font-bold">Citas APA 7 Preservadas:</span>
                      {rewriteResult.apaCitationsPreserved.map((cit, idx) => (
                        <span key={idx} className="bg-white px-2 py-0.5 rounded text-emerald-950 border border-emerald-300 font-mono text-[10px]">
                          {cit}
                        </span>
                      ))}
                    </div>
                  )}

                  {rewriteResult.changesMade.length > 0 && (
                    <div className="text-[11px] text-emerald-950">
                      <span className="font-bold block mb-0.5">Mecanismos Forenses Aplicados para Eliminar Detección:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        {rewriteResult.changesMade.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyRewrite}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {copiedRewrite ? (
                        <>
                          <Check className="w-4 h-4 text-white" /> ¡Copiado al Portapapeles!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copiar Reescritura Humanizada
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setVariationIndex(prev => prev + 1)}
                      title="Generar otra alternativa de estilo académico"
                      className="py-2 px-3 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Otra variante
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSentence(null)}
                className="px-5 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar Diagnóstico
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
