export type SentenceClassification = 'HUMAN' | 'AI_PARAPHRASED' | 'AI_DIRECT';

export interface EvaluatedSentence {
  id: string;
  paragraphIndex: number;
  sentenceIndexInParagraph: number;
  text: string;
  rawProbability: number; // 0.0 to 1.0
  classification: SentenceClassification;
  perplexity: 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja';
  burstinessLength: number; // word count
  burstinessScore: number; // local std dev
  clichesFound: string[];
  entropyForced: boolean;
  hasAnchor?: boolean;
  reason: string;
}

export interface QualifiedParagraph {
  index: number;
  originalText: string;
  isQualified: boolean;
  unqualifiedReason?: string;
  blockType?: 'heading' | 'subheading' | 'paragraph' | 'table_figure' | 'list_item' | 'bibliography' | 'metadata';
  sentences: EvaluatedSentence[];
}

export interface ForensicMetrics {
  averagePerplexity: 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja';
  perplexityScore?: number; // 0-100 PXP index
  binocularsScore?: number; // Zero-Shot Contrastive Score (SOTA < 0.92 = IA)
  burstinessRating: 'Alta (Variada/Humana)' | 'Moderada' | 'Plana (Monótona/IA)';
  burstinessStdDev: number; // σ
  meanSentenceLength?: number; // μ (average words per sentence)
  variationCoefficient?: number; // CV = σ / μ
  clicheConnectorCount: number;
  clicheConnectorsList: string[];
  situatedContextAnchors: boolean;
  contextAnchorDetails: string;
  cleanProseTrapDetected: boolean;
  slidingWindowsEvaluated?: number;
  edgeSmoothingAdjustments?: number;
  nominalizationDensityRatio?: number; // per 100 words
  semanticLinearity?: number; // Cosine similarity mean of consecutive sentences (0-1)
  semanticLinearityRating?: 'Alta (Uniforme/IA)' | 'Moderada' | 'Baja (Orgánica/Humana)';
}

export interface TurnitinReport {
  documentTitle: string;
  originalFileName?: string;
  originalFileSize?: number;
  authorName?: string;
  fullText?: string;
  processedAt: string;
  totalWords: number;
  totalSentencesEvaluated: number;
  qualifiedSentencesCount: number;
  sampleSufficiency: 'Suficiente (≥300 palabras)' | 'Insuficiente (<300 palabras)';
  
  // Percentages
  globalAiPercentage: number;
  rawGlobalAiPercentage?: number;
  directAiPercentage: number;
  paraphrasedAiPercentage: number;
  humanPercentage: number;

  // Counts
  directAiSentenceCount: number;
  paraphrasedAiSentenceCount: number;
  humanSentenceCount: number;

  // Official Institutional Academic Integrity Scale (Turnitin 2026)
  unirRiskLevel: 'Riesgo Bajo (0-15%)' | 'Riesgo Moderado (16-35%)' | 'Riesgo Alto (36-60%)' | 'Riesgo Muy Alto (61-100%)';
  institutionalRiskLevel?: 'Riesgo Bajo (0-15%)' | 'Riesgo Moderado (16-35%)' | 'Riesgo Alto (36-60%)' | 'Riesgo Muy Alto (61-100%)';
  unirRiskColor: string;
  technicalEvaluation: string;

  metrics: ForensicMetrics;
  paragraphs: QualifiedParagraph[];
  
  findings: {
    clicheConnectors: string[];
    monotonousCadencePatterns: string;
    bypasserIndicators: string[];
  };

  remedialPlan: {
    contextAnchorsSuggestion: string;
    cadenceBurstinessSuggestion: string;
    cleanProseCleanupSuggestion: string;
    detectedDomain?: string;
    specificRewriteExamples?: Array<{
      sentenceId: string;
      originalSentence: string;
      aiType: 'IA Directa' | 'IA Parafraseada';
      detectedFlags: string[];
      suggestedRewrite: string;
      humanizationTechnique: string;
      academicAudit: {
        thirdPersonCheck: boolean;
        apaStyleCheck: boolean;
        academicToneCheck: boolean;
        contextAnchorInjected: boolean;
        aiDetectionPassed: boolean;
        testedAiProbability: number;
      };
    }>;
  };

  markdownReport: string;
}

export interface SampleText {
  id: string;
  title: string;
  category: '100% Humano' | '100% IA Directa (GPT-4o)' | 'IA Parafraseada / Bypassed' | 'Mixto (Híbrido Academic)' | '71% IA (Turnitin Oficial)' | string;
  description: string;
  content: string;
}
