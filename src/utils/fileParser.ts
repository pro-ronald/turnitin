import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Normalizes extracted text from PDFs, DOCX, and TXT files while PRESERVING document structure:
 * 1. Strips running PDF headers/footers (e.g. "Página X de Y", "Identificador de la entrega trn:oid...")
 * 2. Identifies structural blocks (headings, subheadings, index rows, tables, figures, metadata) and preserves them as separate lines
 * 3. Safely unwraps soft-wrapped prose lines within paragraphs without destroying block boundaries
 */
export function normalizeExtractedText(rawText: string): string {
  if (!rawText) return '';

  // Step 1: Remove common Turnitin page header / footer artifacts
  let cleaned = rawText
    .replace(/turnitin\s+P[áa]gina\s+\d+\s+de\s+\d+(?:\s*-[^\n\r]*)?/gi, '')
    .replace(/P[áa]gina\s+\d+\s+de\s+\d+(?:\s*-[^\n\r]*)?/gi, '')
    .replace(/Identificador\s+de\s+la\s+entrega\s+trn:oid:::[^\n\r]*/gi, '')
    .replace(/\r\n/g, '\n');

  const lines = cleaned.split('\n');

  // Measure line frequency to identify running header/footer lines that repeat across pages
  const lineFrequency = new Map<string, number>();
  lines.forEach(l => {
    const trimmed = l.trim();
    if (trimmed.length >= 3 && trimmed.length <= 150) {
      lineFrequency.set(trimmed, (lineFrequency.get(trimmed) || 0) + 1);
    }
  });

  const blocks: string[] = [];
  let currentBuffer: string[] = [];

  const flushBuffer = () => {
    if (currentBuffer.length > 0) {
      const combined = currentBuffer.join(' ').replace(/\s+/g, ' ').trim();
      if (combined) {
        blocks.push(combined);
      }
      currentBuffer = [];
    }
  };

  /**
   * Helper to identify running header/footer noise lines (page numbers, repeated author names, repeated thesis titles)
   */
  const isNoiseLine = (line: string): boolean => {
    if (!line) return true;

    // 1. Standalone page numbers (e.g. "1", "2", "62", "- 1 -", "pág 5", "página 1")
    if (/^\d{1,3}$/.test(line) || /^-?\s*\d{1,3}\s*-?$/.test(line) || /^p[áa]g(?:ina)?\.?\s*\d{1,3}$/i.test(line)) {
      return true;
    }

    // 2. Turnitin / PDF running headers & footers
    if (/^(P[áa]gina|\d+\s+P[áa]gina|Identificador|trn:oid|turnitin)$/i.test(line)) {
      return true;
    }

    // 3. Repeated author / thesis running header lines (appearing >2 times in document)
    const freq = lineFrequency.get(line) || 0;
    if (freq > 2 && line.length < 120) {
      if (/^(?:Priscila|Author|Autor|Propuesta|Trabajo Fin|Máster|Universidad)/i.test(line) || line.split(/\s+/).filter(Boolean).length <= 16) {
        return true;
      }
    }

    // 4. Standalone author name repeated alone on a line (e.g. "Priscila Gutiérrez Ríos")
    if (/^[A-ZÁÉÍÓÚÑ][a-zácéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-zácéíóúñ]+){1,3}$/.test(line)) {
      if (/Priscila|Gutierrez|Gutiérrez|Ríos|Rios/i.test(line)) {
        return true;
      }
    }

    return false;
  };

  /**
   * Helper to recursively split inline section headings that are merged on the same line with paragraph prose
   * e.g. "1.1. Justificación y planteamiento del problema La relevancia científica y social..."
   * -> ["1.1. Justificación y planteamiento del problema", "La relevancia científica y social..."]
   */
  const splitInlineHeadings = (line: string): string[] => {
    const result: string[] = [];
    let remaining = line.trim();

    while (remaining) {
      // 1. Match section numbering e.g. "1.1.", "1.2.1.", "2.1.3." followed by title and then prose
      const numMatch = remaining.match(/^(\d+(?:\.\d+){0,5}\.?\s+[A-ZÁÉÍÓÚÑ][^\.\!\?]{2,150}[\.\:]?)\s+([A-ZÁÉÍÓÚÑ].*)$/);
      if (numMatch && numMatch[2]) {
        const headingPart = numMatch[1].trim();
        const words = headingPart.split(/\s+/).filter(Boolean);
        if (words.length <= 20 && headingPart.length <= 160) {
          result.push(headingPart);
          remaining = numMatch[2].trim();
          continue;
        }
      }

      // 2. Match Table / Figure captions merged with prose
      const tableFigMatch = remaining.match(/^((?:Tabla|Figura|Gr[áa]fico|Cuadro)\s+\d+[\.\:]?\s+[A-ZÁÉÍÓÚÑ][^\.\!\?]{2,150}[\.\:]?)\s+([A-ZÁÉÍÓÚÑ].*)$/i);
      if (tableFigMatch && tableFigMatch[2]) {
        const headingPart = tableFigMatch[1].trim();
        const words = headingPart.split(/\s+/).filter(Boolean);
        if (words.length <= 25 && headingPart.length <= 200) {
          result.push(headingPart);
          remaining = tableFigMatch[2].trim();
          continue;
        }
      }

      // 2.5 Match Fuente / Elaboración propia merged with prose
      const sourceMatch = remaining.match(/^((?:Fuente|Source|Elaboraci[óo]n\s+propia)[\:\.]?\s+[^\.\!\?]{2,100}[\.\:]?)\s+([A-ZÁÉÍÓÚÑ].*)$/i);
      if (sourceMatch && sourceMatch[2]) {
        const headingPart = sourceMatch[1].trim();
        const words = headingPart.split(/\s+/).filter(Boolean);
        if (words.length <= 20 && headingPart.length <= 150) {
          result.push(headingPart);
          remaining = sourceMatch[2].trim();
          continue;
        }
      }

      // 3. Match major section headers e.g. "Resumen El presente...", "Abstract This...", "1. Introducción En este..."
      const majorMatch = remaining.match(/^(Resumen|Abstract|Introducci[óo]n|Conclusiones|Metodolog[íi]a|Resultados|Discusi[óo]n|Marco\s+Te[óo]rico|Justificaci[óo]n|Objetivos|Antecedentes|Planteamiento\s+del\s+problema|[IÍ]ndice\s+de\s+\w+|ANEXOS|Anexo\s+[A-Z\d]+[\:\.]?)\b[\.\:]?\s+([A-ZÁÉÍÓÚÑ].*)$/i);
      if (majorMatch && majorMatch[2]) {
        result.push(majorMatch[1].trim());
        remaining = majorMatch[2].trim();
        continue;
      }

      // No further heading split
      result.push(remaining);
      break;
    }

    return result;
  };

  /**
   * Helper to check if a line is a structural block (heading, subheading, table/figure, list, index row, cover metadata)
   */
  const isStructuralBlock = (line: string): boolean => {
    if (!line) return false;

    // 1. Dot leaders for Table of Contents / Index rows e.g. "1. Introducción ....... 9", or just "1. Introducción 9"
    if (/\.{2,}\s*\d+$/.test(line) || /\.{3,}/.test(line) || /^[0-9\.]+\s+.*\.{2,}\s*\d+/.test(line)) return true;
    if (/^[0-9\.]+\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+\s+\d+$/.test(line) && line.length < 80) return true;

    // 2. Section/Subsection numbering: "1.", "1.1", "1.1.1", "2.3.4.", "1.2. Objetivo" on a short heading line
    const words = line.split(/\s+/).filter(Boolean);
    if (/^\d+(?:\.\d+){0,5}\.?\s+[A-ZÁÉÍÓÚÑ]/.test(line) && words.length <= 20 && line.length <= 160) {
      // Must not be a full sentence with internal prose punctuation
      if (!/[.!?]\s+[A-ZÁÉÍÓÚÑ].{15,}/.test(line)) {
        return true;
      }
    }

    // 3. Structural Headings / Captions / Tables / Figures / Annexes / Metadata headers
    if (/^(?:#+\s*|Cap[íi]tulo\s+\d+|Secci[óo]n\s+\d+|Anexo\s+[A-Z\d]*|Tabla\s+\d+|Figura\s+\d+|Gr[áa]fico\s+\d+|Cuadro\s+\d+|Fuente[\:\s]|Source[\:\s]|Elaboraci[óo]n\s+propia|Resumen|Abstract|Introducci[óo]n|Conclusiones|Palabras\s+clave|Keywords|[ÍI]ndice\s+de|Trabajo\s+fin\s+de|Especialidad:|Director\/a:|Fecha:|Autor:|Universidad\s+|Facultad\s+de|M[áa]ster\s+)/i.test(line) && words.length <= 25 && line.length <= 200) {
      return true;
    }

    // 4. Standalone uppercase title/header (e.g. "RESUMEN", "ABSTRACT", "INDICE DE CONTENIDOS")
    if (/^[A-ZÁÉÍÓÚÑ0-9\s\.\:\,\-]{3,80}$/.test(line) && words.length <= 10 && !/[.!?]$/.test(line)) {
      return true;
    }

    // 5. Bullet lists, dash lists, or numbered item lists
    if (/^(?:[\-\•\*]|\d+[\.\)]|[a-z][\.\)])\s+/i.test(line)) return true;

    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine || isNoiseLine(rawLine)) {
      flushBuffer();
      continue;
    }

    const subLines = splitInlineHeadings(rawLine);

    for (const line of subLines) {
      if (!line || isNoiseLine(line)) {
        flushBuffer();
        continue;
      }

      // If line is a structural block, flush current paragraph and push this line as its own block
      if (isStructuralBlock(line)) {
        flushBuffer();
        blocks.push(line);
        continue;
      }

      if (currentBuffer.length === 0) {
        currentBuffer.push(line);
        continue;
      }

      // Check if previous line in buffer ended with sentence punctuation or was a heading line
      const lastLineInBuffer = currentBuffer[currentBuffer.length - 1];
      const bufferEndsWithPunctuation = /[.!?:]\s*$/.test(lastLineInBuffer);
      const lineStartsWithLower = /^[a-zácéíóúñ]/.test(line);
      const lastLineWasHeading = /^\d+(?:\.\d+){0,5}\.?\s+[A-ZÁÉÍÓÚÑ]/.test(lastLineInBuffer) && lastLineInBuffer.split(/\s+/).length <= 16;

      if ((bufferEndsWithPunctuation || lastLineWasHeading) && !lineStartsWithLower) {
        // Previous sentence or heading ended cleanly and next line starts with capital -> start a new paragraph!
        flushBuffer();
        currentBuffer.push(line);
      } else {
        // Continuation of current sentence across line wrap
        currentBuffer.push(line);
      }
    }
  }

  flushBuffer();

  return blocks.filter(b => b.length >= 2).join('\n\n');
}

export async function parseUploadedFile(file: File): Promise<{ text: string; fileName: string; fileType: string }> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Plain Text (.txt)
  if (extension === 'txt') {
    const rawText = await file.text();
    const text = normalizeExtractedText(rawText);
    return { text, fileName, fileType: 'TXT' };
  }

  // 2. Word Document (.docx)
  if (extension === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = normalizeExtractedText(result.value || '');
      return { text, fileName, fileType: 'DOCX' };
    } catch (docxErr) {
      console.error('Error al procesar archivo DOCX:', docxErr);
      throw new Error('No se pudo extraer el texto del archivo .docx. Asegúrate de que no esté dañado o protegido con contraseña.');
    }
  }

  // 3. Portable Document Format (.pdf)
  if (extension === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true
      });

      const pdfDoc = await loadingTask.promise;
      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          let lastY: number | null = null;
          let pageString = '';

          for (const item of textContent.items) {
            if ('str' in item) {
              const textItem = item as { str: string; transform?: number[] };
              // Add newline if there is a vertical line jump (> 3.5pt)
              if (textItem.transform && lastY !== null && Math.abs(textItem.transform[5] - lastY) > 3.5) {
                pageString += '\n';
              }
              pageString += textItem.str + ' ';
              if (textItem.transform) {
                lastY = textItem.transform[5];
              }
            }
          }

          if (pageString.trim()) {
            pageTexts.push(pageString.trim());
          }
        } catch (pageErr) {
          console.warn(`Error al extraer página ${pageNum} del PDF:`, pageErr);
        }
      }

      const rawExtracted = pageTexts.join('\n\n').trim();
      const extractedText = normalizeExtractedText(rawExtracted);

      if (extractedText.length > 50) {
        return { text: extractedText, fileName, fileType: `PDF (${pdfDoc.numPages} págs.)` };
      }

      // If text is extremely short, it might be a scanned image-only PDF
      throw new Error('El PDF parece ser un documento escaneado (basado en imágenes) o no contiene texto seleccionable.');

    } catch (pdfErr: any) {
      console.error('Error al procesar PDF con PDF.js:', pdfErr);

      // Secondary regex/stream fallback if PDF.js fails
      try {
        const arrayBuffer = await file.arrayBuffer();
        const textDecoder = new TextDecoder('utf-8');
        const rawPdfString = textDecoder.decode(arrayBuffer);

        const textBlocks: string[] = [];
        const regex = /\(([^)]+)\)\s*T[jJ]/g;
        let match;
        while ((match = regex.exec(rawPdfString)) !== null) {
          if (match[1] && match[1].length > 1) {
            textBlocks.push(match[1]);
          }
        }

        const fallbackText = normalizeExtractedText(textBlocks.join(' ').replace(/\\\(|\x5C\)/g, '').trim());
        if (fallbackText.length > 100) {
          return { text: fallbackText, fileName, fileType: 'PDF (Fallback)' };
        }
      } catch (e) {
        console.warn('Fallback extractor error:', e);
      }

      if (pdfErr.message?.includes('escaneado')) {
        throw pdfErr;
      }
      throw new Error('Error al extraer texto del PDF. Si el PDF es un escaneo de imágenes, conviértelo primero con OCR o copia y pega el texto directamente.');
    }
  }

  // 4. Fallback for other plain text extensions
  const rawText = await file.text();
  const text = normalizeExtractedText(rawText);
  return { text, fileName, fileType: extension.toUpperCase() };
}

