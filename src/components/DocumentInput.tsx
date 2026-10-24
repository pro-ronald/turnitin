import React, { useState, useRef } from 'react';
import { FileText, Upload, Sparkles, AlertCircle, CheckCircle2, FileType, ArrowRight, BookOpen } from 'lucide-react';
import { SAMPLE_TEXTS } from '../data/sampleTexts';
import { parseUploadedFile } from '../utils/fileParser';
import { deriveDocumentTitle } from '../utils/aiDetectionEngine';
import { SampleText } from '../types';

interface DocumentInputProps {
  onAnalyze: (text: string, title: string, originalFileName?: string, originalFileSize?: number) => void;
  isLoading: boolean;
}

export const DocumentInput: React.FC<DocumentInputProps> = ({ onAnalyze, isLoading }) => {
  const [inputMode, setInputMode] = useState<'paste' | 'upload' | 'sample'>('paste');
  const [docTitle, setDocTitle] = useState('');
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [text, setText] = useState('');
  const [selectedSample, setSelectedSample] = useState<SampleText | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordsCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isSufficient = wordsCount >= 300;

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (!isTitleManuallyEdited) {
      const derived = deriveDocumentTitle(newText);
      setDocTitle(derived);
    }
  };

  const handleTitleChange = (val: string) => {
    setDocTitle(val);
    setIsTitleManuallyEdited(true);
  };

  const handleSelectSample = (sample: SampleText) => {
    setSelectedSample(sample);
    setText(sample.content);
    setDocTitle(sample.title);
    setIsTitleManuallyEdited(true);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setInputMode('paste');
  };

  const handleFileChange = async (file: File) => {
    setFileError(null);
    setIsParsingFile(true);
    try {
      const parsed = await parseUploadedFile(file);
      setText(parsed.text);
      const cleanFileName = parsed.fileName.replace(/\.[^/.]+$/, '');
      const derived = deriveDocumentTitle(parsed.text, cleanFileName);
      setDocTitle(derived);
      setIsTitleManuallyEdited(true);
      setUploadedFileName(parsed.fileName);
      setUploadedFileSize(file.size);
      setInputMode('paste');
    } catch (err: any) {
      console.error('Error procesando archivo:', err);
      setFileError(err.message || 'No se pudo extraer el texto del archivo. Asegúrate de subirlos en formato .docx, .pdf o .txt.');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const finalTitle = isTitleManuallyEdited && docTitle.trim()
      ? docTitle.trim()
      : deriveDocumentTitle(text, docTitle);
    onAnalyze(text, finalTitle, uploadedFileName || undefined, uploadedFileSize || undefined);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/80 px-2.5 py-1 rounded border border-red-800/50 inline-block mb-2">
              Módulo de Carga e Ingesta de Documentos
            </span>
            <h2 className="text-xl font-bold text-slate-100 font-sans">
              Ingrese o Suba el Documento Académico a Diagnosticar
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Soporta extracción directa de tesis, artículos y ensayos en formato PDF, Word (.docx) o Texto Plano (.txt).
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                inputMode === 'paste' ? 'bg-red-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              Pegar Texto
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                inputMode === 'upload' ? 'bg-red-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1.5" />
              Subir Archivo
            </button>
            <button
              type="button"
              onClick={() => setInputMode('sample')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                inputMode === 'sample' ? 'bg-red-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
              Muestras Académicas
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        
        {/* Document Title Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Título del Documento / Trabajo Académico
            </label>
            {docTitle && !isTitleManuallyEdited && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Título autogenerado desde el texto
              </span>
            )}
          </div>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ej: TFM - Análisis de Estrategias Pedagógicas en Educación Secundaria"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-slate-800 font-medium"
            required
          />
        </div>

        {/* INPUT MODE: UPLOAD */}
        {inputMode === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isParsingFile && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isParsingFile ? 'border-amber-500 bg-amber-50/40 cursor-wait' :
                isDragOver ? 'border-red-500 bg-red-50/50' : 'border-slate-300 hover:border-red-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt"
                className="hidden"
                disabled={isParsingFile}
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              
              {isParsingFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h3 className="text-sm font-bold text-amber-900">
                    Procesando y extrayendo páginas del documento...
                  </h3>
                  <p className="text-xs text-amber-700">
                    Extrayendo texto cualificado página a página (p. ej., tesis TFM de 64+ páginas). Por favor espera un momento.
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Arrastra y suelta tu archivo PDF o Word (.docx) aquí
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    o haz clic para explorar en tu equipo (Tesis, TFM o ensayos en .pdf, .docx, .txt)
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-mono">.docx</span>
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-mono">.pdf</span>
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-mono">.txt</span>
                  </div>
                </>
              )}
            </div>

            {uploadedFileName && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Archivo procesado correctamente: <strong>{uploadedFileName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => { setUploadedFileName(null); setText(''); }}
                  className="text-slate-500 hover:text-red-600 underline"
                >
                  Quitar
                </button>
              </div>
            )}

            {fileError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {/* INPUT MODE: SAMPLE SELECTOR */}
        {inputMode === 'sample' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Muestras Pre-cargadas de Referencia (Biblioteca Turnitin 2026)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_TEXTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-red-500 hover:bg-red-50/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      sample.category.includes('Humano') ? 'bg-emerald-100 text-emerald-800' :
                      sample.category.includes('Directa') ? 'bg-red-100 text-red-800' :
                      sample.category.includes('Bypassed') ? 'bg-purple-100 text-purple-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {sample.category}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-red-700">
                    {sample.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {sample.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* INPUT MODE: PASTE / TEXT EDITOR */}
        {(inputMode === 'paste' || text.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Cuerpo del Texto Cualificado
              </label>
              
              {/* Word counter status */}
              <div className="flex items-center space-x-2 text-xs">
                <span className={`font-mono font-bold ${isSufficient ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {wordsCount} Palabras
                </span>
                {!isSufficient && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Muestra &lt; 300 palabras (Se activará diagnóstico con advertencia)
                  </span>
                )}
                {isSufficient && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Muestra Suficiente (≥300 palabras)
                  </span>
                )}
              </div>
            </div>

            <textarea
              rows={9}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Pegue aquí el texto académico completo a analizar (se omitirán automáticamente bibliografías, códigos y fragmentos muy cortos)..."
              className="w-full p-3.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-slate-800 leading-relaxed resize-y"
              required
            />
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Fase 1 a 5 de evaluación forense Turnitin aplicadas automáticamente al iniciar.</span>
          </p>

          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${
              isLoading || !text.trim()
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Ejecutando Pipeline 2026...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ejecutar Análisis Forense Turnitin</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
