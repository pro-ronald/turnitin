import { TurnitinReport } from '../types';

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  formattedDate: string;
  documentTitle: string;
  wordCount: number;
  globalAiPercentage: number;
  directAiPercentage: number;
  paraphrasedAiPercentage: number;
  unirRiskLevel: TurnitinReport['unirRiskLevel'];
  sampleSnippet: string;
  report: TurnitinReport;
}

const HISTORY_STORAGE_KEY = 'turnitin_analysis_history_v2';

export function getAnalysisHistory(): AnalysisHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('Error reading analysis history from localStorage:', err);
    return [];
  }
}

export function saveAnalysisToHistory(report: TurnitinReport, fullTextSnippet?: string): AnalysisHistoryItem {
  const history = getAnalysisHistory();
  
  // Create snippet preview
  const snippet = fullTextSnippet
    ? (fullTextSnippet.slice(0, 160) + (fullTextSnippet.length > 160 ? '...' : ''))
    : (report.paragraphs.find(p => p.isQualified)?.originalText.slice(0, 160) || '');

  const id = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newItem: AnalysisHistoryItem = {
    id,
    timestamp: new Date().toISOString(),
    formattedDate: report.processedAt || new Date().toLocaleString('es-ES'),
    documentTitle: report.documentTitle || 'Documento sin título',
    wordCount: report.totalWords,
    globalAiPercentage: report.globalAiPercentage,
    directAiPercentage: report.directAiPercentage,
    paraphrasedAiPercentage: report.paraphrasedAiPercentage,
    unirRiskLevel: report.unirRiskLevel,
    sampleSnippet: snippet,
    report
  };

  // Prepend new item, limit history to max 30 items
  const updated = [newItem, ...history.filter(item => item.id !== id)].slice(0, 30);
  
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save analysis history to localStorage (possibly quota exceeded), auto-pruning older items:', err);
    try {
      const pruned = updated.slice(0, 10);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(pruned));
    } catch (retryErr) {
      console.error('Failed to save analysis history even after pruning:', retryErr);
    }
  }

  return newItem;
}

export function deleteAnalysisHistoryItem(id: string): AnalysisHistoryItem[] {
  const history = getAnalysisHistory();
  const updated = history.filter(item => item.id !== id);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting item from localStorage:', err);
  }
  return updated;
}

export function clearAllAnalysisHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing history in localStorage:', err);
  }
}
