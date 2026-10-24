import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentInput } from './components/DocumentInput';
import { ForensicDiagnosticsAndActionPlan } from './components/ForensicDiagnosticsAndActionPlan';
import { SentenceHeatmap } from './components/SentenceHeatmap';
import { MarkdownReportModal } from './components/MarkdownReportModal';
import { HistoryModal } from './components/HistoryModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AnalysisProgressModal } from './components/AnalysisProgressModal';
import { analyzeDocumentHeuristically, deriveDocumentTitle } from './utils/aiDetectionEngine';
import { generateFullTurnitinReportPdf } from './utils/turnitinPdfExporter';
import { 
  getAnalysisHistory, 
  saveAnalysisToHistory, 
  deleteAnalysisHistoryItem, 
  clearAllAnalysisHistory,
  AnalysisHistoryItem
} from './utils/historyStorage';
import { TurnitinReport } from './types';
import { FileText, ArrowLeft, Download, Sparkles, Copy, Check } from 'lucide-react';
import { generateCorrectionPrompt } from './utils/promptGenerator';

export default function App() {
  const [viewMode, setViewMode] = useState<'input' | 'report'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [analyzingTitle, setAnalyzingTitle] = useState<string>('');
  const [analyzingStats, setAnalyzingStats] = useState<{
    wordCount: number;
    paragraphCount: number;
    sentenceCount: number;
    targetDurationMs: number;
  }>({ wordCount: 0, paragraphCount: 0, sentenceCount: 0, targetDurationMs: 3000 });
  const [report, setReport] = useState<TurnitinReport | null>(null);
  const [engineName, setEngineName] = useState<string>('Heuristic-Engine-2026');
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = () => {
    if (!report) return;
    const prompt = generateCorrectionPrompt(report);
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // Load history & API Key on mount
  useEffect(() => {
    setHistoryItems(getAnalysisHistory());
    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    setUserApiKey(savedKey);
  }, []);

  const handleAnalyze = async (text: string, title: string, originalFileName?: string, originalFileSize?: number) => {
    const storedKey = localStorage.getItem('user_gemini_api_key');
    if (!storedKey || !storedKey.trim()) {
      setIsApiKeyModalOpen(true);
      setAnalysisError('Para realizar el análisis de IA sin consumir la cuota de la cuenta principal, por favor ingresa tu propia Gemini API Key gratuita.');
      return;
    }

    const resolvedTitle = deriveDocumentTitle(text, title);
    const words = text.split(/\s+/).filter(Boolean).length;
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0).length;
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0).length;

    let targetDurationMs = 3000;
    if (words > 3500) {
      targetDurationMs = 8500;
    } else if (words > 1500) {
      targetDurationMs = 6000;
    } else if (words > 500) {
      targetDurationMs = 4200;
    }

    setAnalyzingStats({
      wordCount: words,
      paragraphCount: paragraphs,
      sentenceCount: sentences,
      targetDurationMs
    });
    setIsLoading(true);
    setAnalyzingTitle(resolvedTitle);
    setAnalysisError(null);

    let finalReport: TurnitinReport;
    let engine = 'Turnitin-Engine-2026';

    const minDelay = new Promise((resolve) => setTimeout(resolve, targetDurationMs));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-gemini-api-key': storedKey.trim()
      };

      const apiPromise = fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, title: resolvedTitle, originalFileName, originalFileSize })
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            setIsApiKeyModalOpen(true);
            throw new Error(json.message || 'Se requiere una API Key válida.');
          }
          throw new Error(json.message || json.error || `HTTP Error ${res.status}`);
        }
        return json;
      });

      const [data] = await Promise.all([apiPromise, minDelay]);

      if (data && data.report) {
        finalReport = data.report;
        if (originalFileName) finalReport.originalFileName = originalFileName;
        if (originalFileSize) finalReport.originalFileSize = originalFileSize;
        engine = data.engine || 'Turnitin-Engine-2026';
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err: any) {
      console.warn('Network call or API key error:', err);
      setIsLoading(false);
      setAnalysisError(err?.message || 'Error al procesar la solicitud con Gemini.');
      return;
    } finally {
      setIsLoading(false);
    }

    setReport(finalReport);
    setEngineName(engine);
    setViewMode('report');

    // Save to history storage and update state
    saveAnalysisToHistory(finalReport, text);
    setHistoryItems(getAnalysisHistory());
  };

  const handleNewAnalysis = () => {
    setReport(null);
    setViewMode('input');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = deleteAnalysisHistoryItem(id);
    setHistoryItems(updated);
  };

  const handleClearAllHistory = () => {
    clearAllAnalysisHistory();
    setHistoryItems([]);
  };

  const handleSelectHistoryReport = (selectedReport: TurnitinReport) => {
    setReport(selectedReport);
    setEngineName('Turnitin-History-Archive-2026');
    setViewMode('report');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col justify-between">
      
      <div>
        {/* Global Navigation Header */}
        <Header
          onNewAnalysis={handleNewAnalysis}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          historyCount={historyItems.length}
          hasCustomKey={Boolean(userApiKey)}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* INPUT FORM VIEW */}
          {viewMode === 'input' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-200 space-y-4">
              {analysisError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold">⚠️ Atención:</span>
                    <span>{analysisError}</span>
                  </div>
                  <button
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 ml-2"
                  >
                    Ingresar API Key
                  </button>
                </div>
              )}
              <DocumentInput onAnalyze={handleAnalyze} isLoading={isLoading} />
            </div>
          )}

          {/* REPORT RESULTS VIEW */}
          {viewMode === 'report' && report && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Back & Export Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm mb-2">
                <button
                  onClick={handleNewAnalysis}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Volver a Ingesta</span>
                </button>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                  {/* 1. Reporte PDF */}
                  <button
                    onClick={() => report && generateFullTurnitinReportPdf(report)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-700 to-sky-800 hover:from-sky-800 hover:to-sky-900 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Descargar reporte PDF Turnitin"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                    <span>Reporte PDF</span>
                  </button>

                  {/* 2. Reporte Markdown */}
                  <button
                    onClick={() => setShowMarkdownModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Ver reporte en Markdown"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Reporte Markdown</span>
                  </button>

                  {/* 4. Prompt IA */}
                  <button
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer whitespace-nowrap border border-amber-300/80"
                    title="Copiar prompt de corrección para IA"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span>¡Prompt Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span>Prompt IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1. Unified Forensic Diagnostics & Action Plan */}
              <ForensicDiagnosticsAndActionPlan report={report} />

              {/* 3. Sentence Heatmap Text Inspector */}
              <SentenceHeatmap paragraphs={report.paragraphs} />

            </div>
          )}

        </main>
      </div>

      {/* 5-Phase Analysis Loading Modal */}
      <AnalysisProgressModal
        isOpen={isLoading}
        docTitle={analyzingTitle}
        wordCount={analyzingStats.wordCount}
        paragraphCount={analyzingStats.paragraphCount}
        sentenceCount={analyzingStats.sentenceCount}
        targetDurationMs={analyzingStats.targetDurationMs}
        onFinished={() => {}}
      />

      {/* Markdown Modal */}
      {showMarkdownModal && report && (
        <MarkdownReportModal
          markdown={report.markdownReport}
          onClose={() => setShowMarkdownModal(false)}
        />
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        history={historyItems}
        onClose={() => setIsHistoryOpen(false)}
        onSelectReport={handleSelectHistoryReport}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={(newKey) => setUserApiKey(newKey)}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="font-semibold text-slate-300">
            Turnitin AI Writing Detection System — Sistema Oficial de Verificación de Integridad Académica 2026
          </p>
          <p className="text-slate-500 text-[11px]">
            Diseñado para tribunales académicos, tutores de tesis y docentes de educación superior.
          </p>
        </div>
      </footer>

    </div>
  );
}
