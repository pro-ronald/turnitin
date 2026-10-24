import { jsPDF } from 'jspdf';
import { TurnitinReport, SentenceClassification } from '../types';

export function generateFullTurnitinReportPdf(report: TurnitinReport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm

  // 1. Stable Delivery ID per document
  const seedStr = (report.documentTitle || '') + (report.totalWords || 0) + (report.processedAt || '');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const numericId = Math.abs(hash * 100000 + 3617579903).toString().slice(0, 10).padEnd(10, '0');
  const deliveryId = `trn:oid:::1:${numericId}`;

  // Helper function to convert accents/tildes properly (ó -> o, á -> a, ñ -> n) before sanitizing
  const removeAccentsAndSanitize = (str: string): string => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  // 2. Author Name & Title Identification
  const docTitle = report.documentTitle || 'Documento Analizado';
  const rawAuthor = report.authorName?.trim() || '';
  const hasAuthor = Boolean(
    rawAuthor &&
    rawAuthor !== 'Autor del Documento' &&
    rawAuthor !== 'Desconocido' &&
    rawAuthor !== 'Autor' &&
    rawAuthor.length > 2
  );
  const authorName = hasAuthor ? rawAuthor : '';

  // Clean title & author for filenames with accent normalization (Introducción -> Introduccion)
  const cleanTitleStr = removeAccentsAndSanitize(docTitle).slice(0, 40) || 'documento';
  const cleanAuthorStr = removeAccentsAndSanitize(authorName).slice(0, 40);

  // Document file name displayed in details box
  const fileName = hasAuthor ? `${cleanAuthorStr}_ENTREGA.docx` : `${cleanTitleStr}_ENTREGA.docx`;

  // Output PDF filename requested by user:
  // "reporte_turnitin_'titulo identificado del archivo o texto analizado'.pdf"
  const pdfDownloadFilename = `reporte_turnitin_${cleanTitleStr}.pdf`;

  const formattedDate = report.processedAt || new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' GMT+2';

  // Extract Institution if available in text
  const fullTextContent = report.fullText || report.paragraphs.map(p => p.originalText).join('\n');
  let institution = '';
  const instMatch = fullTextContent.match(/(Universidad[^\n\r,]+|Institución Educativa[^\n\r,]+|Instituto[^\n\r,]+|Facultad[^\n\r,]+)/i);
  if (instMatch && instMatch[1]) {
    institution = instMatch[1].trim().slice(0, 60);
  }

  // Dynamic Word, Character Counts & File Size
  const totalWordsCount = report.totalWords || fullTextContent.split(/\s+/).filter(Boolean).length;
  const totalCharsCount = fullTextContent.length;

  const formattedWords = totalWordsCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formattedChars = totalCharsCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Dynamic file size estimation or actual uploaded file size
  const actualSizeBytes = (report.originalFileSize && report.originalFileSize > 0)
    ? report.originalFileSize
    : Math.max(16384, Math.round(totalCharsCount * 1.45 + totalWordsCount * 10 + 12288));
  const formattedFileSize = actualSizeBytes >= 1048576
    ? `${(actualSizeBytes / 1048576).toFixed(1)} MB`
    : `${(actualSizeBytes / 1024).toFixed(1)} KB`;

  // 3. Line Packing & Layout Engine
  interface PackedLineToken {
    text: string;
    width: number;
    classification: SentenceClassification;
  }

  interface PackedLine {
    tokens: PackedLineToken[];
    lineHeight: number;
    fontSize: number;
    fontStyle: 'normal' | 'bold' | 'italic';
  }

  interface RenderableParagraphBlock {
    blockType: string;
    gapBefore: number;
    gapAfter: number;
    lines: PackedLine[];
  }

  const prepareRenderableParagraphs = (): RenderableParagraphBlock[] => {
    return report.paragraphs.map((p) => {
      const blockType = p.blockType || 'paragraph';
      let fontSize = 9;
      let fontStyle: 'normal' | 'bold' | 'italic' = 'normal';
      let lineHeight = 5.0;
      let gapBefore = 1;
      let gapAfter = 3.5;

      if (blockType === 'heading') {
        fontSize = 11.5;
        fontStyle = 'bold';
        lineHeight = 6.0;
        gapBefore = 4;
        gapAfter = 3;
      } else if (blockType === 'subheading') {
        fontSize = 10;
        fontStyle = 'bold';
        lineHeight = 5.5;
        gapBefore = 3;
        gapAfter = 2.5;
      } else if (blockType === 'list_item') {
        fontSize = 9;
        fontStyle = 'normal';
        lineHeight = 5.0;
        gapBefore = 1;
        gapAfter = 2;
      } else if (blockType === 'table_figure') {
        fontSize = 8.5;
        fontStyle = 'italic';
        lineHeight = 4.8;
        gapBefore = 2;
        gapAfter = 2.5;
      } else if (blockType === 'bibliography') {
        fontSize = 8;
        fontStyle = 'normal';
        lineHeight = 4.5;
        gapBefore = 1;
        gapAfter = 2;
      }

      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);

      const rawTokens: PackedLineToken[] = [];

      if (p.sentences && p.sentences.length > 0) {
        p.sentences.forEach((s, sIdx) => {
          const sentenceWords = s.text.trim().split(/\s+/).filter(Boolean);
          sentenceWords.forEach((word, wIdx) => {
            const wordWidth = doc.getTextWidth(word);
            rawTokens.push({
              text: word,
              width: wordWidth,
              classification: s.classification,
            });

            if (wIdx < sentenceWords.length - 1) {
              const spaceWidth = doc.getTextWidth(' ');
              rawTokens.push({
                text: ' ',
                width: spaceWidth,
                classification: s.classification,
              });
            }
          });

          if (sIdx < p.sentences.length - 1) {
            const spaceWidth = doc.getTextWidth(' ');
            rawTokens.push({
              text: ' ',
              width: spaceWidth,
              classification: s.classification,
            });
          }
        });
      } else if (p.originalText && p.originalText.trim()) {
        const textWords = p.originalText.trim().split(/\s+/).filter(Boolean);
        textWords.forEach((word, wIdx) => {
          const wordWidth = doc.getTextWidth(word);
          rawTokens.push({
            text: word,
            width: wordWidth,
            classification: 'HUMAN',
          });
          if (wIdx < textWords.length - 1) {
            const spaceWidth = doc.getTextWidth(' ');
            rawTokens.push({
              text: ' ',
              width: spaceWidth,
              classification: 'HUMAN',
            });
          }
        });
      }

      const lines: PackedLine[] = [];
      let currentLineTokens: PackedLineToken[] = [];
      let currentWidth = 0;

      rawTokens.forEach((tok) => {
        if (currentWidth + tok.width > contentWidth && currentLineTokens.length > 0) {
          lines.push({
            tokens: currentLineTokens,
            lineHeight,
            fontSize,
            fontStyle,
          });
          currentLineTokens = [];
          currentWidth = 0;

          if (tok.text === ' ') return;
        }

        currentLineTokens.push(tok);
        currentWidth += tok.width;
      });

      if (currentLineTokens.length > 0) {
        lines.push({
          tokens: currentLineTokens,
          lineHeight,
          fontSize,
          fontStyle,
        });
      }

      return {
        blockType,
        gapBefore,
        gapAfter,
        lines,
      };
    });
  };

  const blocks = prepareRenderableParagraphs();

  // Simulate Page Count for Document Body
  let totalDocPages = 1;
  let testY = 26;

  blocks.forEach((block) => {
    testY += block.gapBefore;
    block.lines.forEach((line) => {
      if (testY + line.lineHeight > pageHeight - 20) {
        totalDocPages++;
        testY = 28;
      }
      testY += line.lineHeight;
    });
    testY += block.gapAfter;
  });

  const totalPdfPages = totalDocPages + 2;

  // 4. Logo & Page Frame Helpers
  const drawTurnitinLogo = (x: number, y: number) => {
    doc.setFillColor(2, 132, 199);
    doc.roundedRect(x, y - 3.2, 4.0, 4.0, 0.8, 0.8, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(x + 2.0, y - 1.2, 0.8, 'F');
    doc.setFillColor(2, 132, 199);
    doc.rect(x + 2.0, y - 2.0, 1.1, 1.1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(2, 132, 199);
    doc.text('turnitin', x + 5.0, y);
  };

  const drawPageHeaderFooter = (pageNum: number, pageTitle: string) => {
    // Header
    drawTurnitinLogo(margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${pageNum} de ${totalPdfPages} - ${pageTitle}`, margin + 25, 12);
    doc.text(`Identificador de la entrega ${deliveryId}`, pageWidth - margin, 12, { align: 'right' });

    // Footer
    const footerY = pageHeight - 10;
    drawTurnitinLogo(margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${pageNum} de ${totalPdfPages} - ${pageTitle}`, margin + 25, footerY);
    doc.text(`Identificador de la entrega ${deliveryId}`, pageWidth - margin, footerY, { align: 'right' });
  };

  // ==========================================
  // PAGE 1: PORTADA (COVER PAGE)
  // ==========================================
  drawPageHeaderFooter(1, 'Portada');

  let y = 62;

  // 1. Document Title as MAIN HEADER (20pt Bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(docTitle, contentWidth);
  doc.text(titleLines, margin, y);

  y += titleLines.length * 7 + 4;

  // 2. Author Name as SUBHEADER (14pt) - only if present and distinct from title
  const isDistinctAuthor = hasAuthor &&
    authorName.toLowerCase().trim() !== docTitle.toLowerCase().trim() &&
    !docTitle.toLowerCase().startsWith(authorName.toLowerCase());

  if (isDistinctAuthor) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    const authorLines = doc.splitTextToSize(authorName, contentWidth);
    doc.text(authorLines, margin, y);

    y += authorLines.length * 6 + 6;
  } else {
    y += 2;
  }

  // Metadata List (Institution if present, NO Quick Submit!)
  if (institution) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(institution, margin, y);
    y += 8;
  }

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 14;
  // Document Details Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Detalles del documento', margin, y);

  y += 10;
  const detailsY = y;

  // Left Details Column
  doc.setFontSize(8.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Identificador de la entrega', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(deliveryId, margin, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Fecha de entrega', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, margin, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Fecha de descarga', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, margin, y);

  if (report.originalFileName) {
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Nombre del archivo', margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const fileLines = doc.splitTextToSize(report.originalFileName, 80);
    doc.text(fileLines, margin, y);
    y += (fileLines.length - 1) * 4;
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Tamaño del archivo', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formattedFileSize, margin, y);

  // Right Side Metrics Gray Box
  const boxX = pageWidth - margin - 58;
  const boxWidth = 58;
  const boxHeight = 52;
  doc.setFillColor(244, 244, 246);
  doc.roundedRect(boxX, detailsY, boxWidth, boxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalDocPages + 2} páginas`, boxX + 8, detailsY + 14);
  doc.text(`${formattedWords} palabras`, boxX + 8, detailsY + 28);
  doc.text(`${formattedChars} caracteres`, boxX + 8, detailsY + 42);

  // ==========================================
  // PAGE 2: DESCRIPCIÓN GENERAL DE LA ESCRITURA CON IA
  // ==========================================
  doc.addPage();
  drawPageHeaderFooter(2, 'Descripción general de la escritura con IA');

  const leftColWidth = 88;
  let leftY = 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  const scoreTitleLines = doc.splitTextToSize(`${report.globalAiPercentage} % detectado como IA`, leftColWidth);
  doc.text(scoreTitleLines, margin, leftY);

  leftY += scoreTitleLines.length * 8 + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const scoreDescLines = doc.splitTextToSize(
    'El porcentaje indica la cantidad de texto calificado en la entrega que probablemente se generó usando IA.',
    leftColWidth
  );
  doc.text(scoreDescLines, margin, leftY);

  // Right Caution Box
  const cautionX = margin + 94;
  const cautionW = contentWidth - 94;
  const cautionY = 28;
  const cautionH = 38;

  doc.setFillColor(224, 242, 254);
  doc.roundedRect(cautionX, cautionY, cautionW, cautionH, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(3, 105, 161);
  doc.text('Precaución: Se necesita revisión.', cautionX + 4, cautionY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  const cautionText = doc.splitTextToSize(
    'Es esencial comprender los límites de la detección de IA antes de tomar decisiones acerca del trabajo del estudiante. Te alentamos a obtener más información acerca de las funciones de detección de IA de Turnitin antes de usar la herramienta.',
    cautionW - 8
  );
  doc.text(cautionText, cautionX + 4, cautionY + 11);

  y = 74;

  const directPct = report.directAiPercentage !== undefined ? report.directAiPercentage : report.globalAiPercentage;
  const paraphrasedPct = report.paraphrasedAiPercentage || 0;

  // AI Breakdown Box 1: Direct AI (Cyan Blue)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

  doc.setFillColor(2, 132, 199);
  doc.roundedRect(margin + 4, y + 3.5, 11, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('IA', margin + 9.5, y + 10.8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Sólo generado con IA ${directPct}%`, margin + 19, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Texto generado probablemente con IA desde un modelo de lenguaje de gran tamaño.', margin + 19, y + 14);

  y += 22;

  // AI Breakdown Box 2: Paraphrased AI (Purple) - displayed if paraphrased AI exists
  if (paraphrasedPct > 0) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

    doc.setFillColor(147, 51, 234);
    doc.roundedRect(margin + 4, y + 3.5, 11, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('IA', margin + 9.5, y + 10.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Generado con IA y parafraseado ${paraphrasedPct}%`, margin + 19, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Texto probablemente generado con IA y posteriormente modificado o parafraseado.', margin + 19, y + 14);

    y += 22;
  }

  y += 6;

  // Legal Disclaimer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Aviso legal', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const legalText = doc.splitTextToSize(
    'Nuestra evaluación de escritura con IA está diseñada para ayudar a los académicos a identificar texto que podrían haberse preparado mediante una herramienta de IA generativa. Es posible que nuestra evaluación de escritura con IA no siempre sea precisa (existe la posibilidad de que identifique erróneamente redacciones probablemente generadas por humanos como generadas por IA, y redacciones probablemente generadas por IA como generadas por humanos), por lo que no debe usarse como único fundamento para aplicar sanciones a un estudiante. Para determinar si es un caso de deshonestidad académica, se necesita de un escrutinio mayor y el juicio humano, junto con la aplicación de las políticas académicas específicas de la organización.',
    contentWidth
  );
  doc.text(legalText, margin, y);

  // ==========================================
  // PAGE 3+: ENTREGA DE ESCRITURA CON IA (FULL TEXT HIGHLIGHTED)
  // ==========================================
  let pdfPageIndex = 3;
  let docPageIndex = 1;

  doc.addPage();
  drawPageHeaderFooter(pdfPageIndex, 'Entrega de escritura con IA');

  const drawDocumentHeaderTopRight = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    const isDistinctTitle = docTitle.toLowerCase().trim() !== authorName.toLowerCase().trim() &&
                            !docTitle.toLowerCase().startsWith(authorName.toLowerCase());

    if (hasAuthor && isDistinctTitle) {
      doc.text(authorName, pageWidth - margin, 17, { align: 'right' });
      doc.text(docTitle.slice(0, 55), pageWidth - margin, 21, { align: 'right' });
      doc.text(`${docPageIndex}`, pageWidth - margin, 25, { align: 'right' });
    } else if (hasAuthor) {
      doc.text(authorName, pageWidth - margin, 17, { align: 'right' });
      doc.text(`${docPageIndex}`, pageWidth - margin, 21, { align: 'right' });
    } else {
      doc.text(docTitle.slice(0, 55), pageWidth - margin, 17, { align: 'right' });
      doc.text(`${docPageIndex}`, pageWidth - margin, 21, { align: 'right' });
    }
  };

  drawDocumentHeaderTopRight();

  y = 26;

  blocks.forEach((block) => {
    y += block.gapBefore;

    block.lines.forEach((line) => {
      if (y + line.lineHeight > pageHeight - 20) {
        doc.addPage();
        pdfPageIndex++;
        docPageIndex++;
        drawPageHeaderFooter(pdfPageIndex, 'Entrega de escritura con IA');
        drawDocumentHeaderTopRight();
        y = 28;
      }

      doc.setFont('helvetica', line.fontStyle);
      doc.setFontSize(line.fontSize);

      interface MergedChunk {
        text: string;
        classification: SentenceClassification;
        width: number;
      }

      const mergedChunks: MergedChunk[] = [];
      line.tokens.forEach((tok) => {
        if (
          mergedChunks.length > 0 &&
          mergedChunks[mergedChunks.length - 1].classification === tok.classification
        ) {
          mergedChunks[mergedChunks.length - 1].text += tok.text;
          mergedChunks[mergedChunks.length - 1].width += tok.width;
        } else {
          mergedChunks.push({
            text: tok.text,
            classification: tok.classification,
            width: tok.width,
          });
        }
      });

      let currentX = margin;

      // Render backgrounds first
      mergedChunks.forEach((chunk) => {
        if (chunk.classification === 'AI_DIRECT') {
          doc.setFillColor(200, 242, 248); // Official Turnitin Cyan #c8f2f8
          doc.rect(currentX - 0.4, y - (line.fontSize * 0.35), chunk.width + 0.8, line.lineHeight, 'F');
        } else if (chunk.classification === 'AI_PARAPHRASED') {
          doc.setFillColor(233, 213, 255); // Official Turnitin Purple #e9d5ff
          doc.rect(currentX - 0.4, y - (line.fontSize * 0.35), chunk.width + 0.8, line.lineHeight, 'F');
        }
        currentX += chunk.width;
      });

      // Render text on top
      currentX = margin;
      mergedChunks.forEach((chunk) => {
        doc.setTextColor(15, 23, 42);
        doc.text(chunk.text, currentX, y);
        currentX += chunk.width;
      });

      y += line.lineHeight;
    });

    y += block.gapAfter;
  });

  // Save PDF with dynamic filename as requested by user
  doc.save(pdfDownloadFilename);
}


