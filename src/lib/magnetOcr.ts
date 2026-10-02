import { createWorker } from 'tesseract.js';
import type { Rect } from './vision';

/**
 * Result of OCR processing on a single magnet
 */
export interface MagnetOCR {
  id: string;
  rawText: string;
  confidence: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Configuration for magnet OCR processing
 */
export interface MagnetOCRConfig {
  /** Padding to add around magnet ROI in pixels */
  padding: number;
  /** Upscale factor (e.g., 2 for 2x upscaling) */
  upscaleFactor: number;
  /** Minimum confidence threshold for OCR results (0-1) */
  minConfidence: number;
  /** Language for Tesseract OCR */
  language: string;
  /** Enable local contrast enhancement */
  enhanceContrast: boolean;
}

/**
 * Default configuration for magnet OCR
 */
export const DEFAULT_MAGNET_OCR_CONFIG: MagnetOCRConfig = {
  padding: 8,
  upscaleFactor: 2,
  minConfidence: 0.3,
  language: 'eng',
  enhanceContrast: true,
};

/**
 * Crop a region of interest from canvas with padding
 */
export function cropROI(
  source: HTMLCanvasElement,
  rect: Rect,
  padding: number
): HTMLCanvasElement {
  const ctx = source.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  const w = Math.min(source.width - x, rect.width + padding * 2);
  const h = Math.min(source.height - y, rect.height + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const dstCtx = canvas.getContext('2d');
  if (!dstCtx) throw new Error('Could not get destination canvas context');

  dstCtx.drawImage(source, x, y, w, h, 0, 0, w, h);
  return canvas;
}

/**
 * Upscale a canvas by the specified factor using high-quality interpolation
 */
export function upscaleCanvas(
  canvas: HTMLCanvasElement,
  factor: number
): HTMLCanvasElement {
  if (factor <= 1) return canvas;

  const upscaled = document.createElement('canvas');
  upscaled.width = canvas.width * factor;
  upscaled.height = canvas.height * factor;

  const ctx = upscaled.getContext('2d');
  if (!ctx) throw new Error('Could not get upscaled canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, upscaled.width, upscaled.height);

  return upscaled;
}

/**
 * Apply local contrast enhancement using CLAHE-like approach
 * Uses a simple histogram equalization on image blocks
 */
export function enhanceLocalContrast(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Block size for local contrast enhancement
  const blockSize = Math.max(16, Math.floor(Math.min(canvas.width, canvas.height) / 16));
  const stride = blockSize / 2; // 50% overlap

  // Process each block
  for (let by = 0; by < canvas.height; by += stride) {
    for (let bx = 0; bx < canvas.width; bx += stride) {
      const x0 = bx;
      const y0 = by;
      const x1 = Math.min(bx + blockSize, canvas.width);
      const y1 = Math.min(by + blockSize, canvas.height);

      // Calculate histogram for block
      const hist = new Uint32Array(256);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * canvas.width + x) * 4;
          const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
          hist[gray]++;
        }
      }

      // Calculate cumulative distribution
      const cdf = new Uint8Array(256);
      let sum = 0;
      const pixels = (x1 - x0) * (y1 - y0);
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        cdf[i] = Math.round((sum * 255) / pixels);
      }

      // Apply transformation
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * canvas.width + x) * 4;
          const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
          const enhanced = cdf[gray];
          data[idx] = enhanced;
          data[idx + 1] = enhanced;
          data[idx + 2] = enhanced;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Process a single magnet ROI through OCR pipeline
 */
export async function processMagnetROI(
  canvas: HTMLCanvasElement,
  rect: Rect,
  magnetId: string,
  config: MagnetOCRConfig,
  worker: any
): Promise<MagnetOCR | null> {
  try {
    // Step 1: Crop ROI with padding
    const cropped = cropROI(canvas, rect, config.padding);

    // Step 2: Upscale 2x
    const upscaled = upscaleCanvas(cropped, config.upscaleFactor);

    // Step 3: Apply local contrast enhancement
    let processed = upscaled;
    if (config.enhanceContrast) {
      processed = enhanceLocalContrast(upscaled);
    }

    // Step 4: Run Tesseract OCR
    const result = await worker.recognize(processed);
    const confidence = result.data.confidence / 100;

    // Filter by minimum confidence
    if (confidence < config.minConfidence) {
      return null;
    }

    return {
      id: magnetId,
      rawText: result.data.text.trim(),
      confidence,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  } catch (error) {
    console.error(`Error processing magnet ${magnetId}:`, error);
    return null;
  }
}

/**
 * Process all magnet candidates in an image
 * Falls back to board OCR only if no magnet candidates exist
 */
export async function readMagnets(
  canvas: HTMLCanvasElement,
  magnetRects: Rect[],
  config: MagnetOCRConfig = DEFAULT_MAGNET_OCR_CONFIG,
  progress?: (current: number, total: number) => void
): Promise<MagnetOCR[]> {
  // Fallback: if no magnet candidates, return empty (board OCR handled elsewhere)
  if (!magnetRects || magnetRects.length === 0) {
    return [];
  }

  const worker = await createWorker(config.language, 1, {
    logger: () => {
      // Silent logger
    },
  });

  const results: MagnetOCR[] = [];

  try {
    for (let i = 0; i < magnetRects.length; i++) {
      const rect = magnetRects[i];
      const magnetId = `magnet-${i}`;

      if (progress) {
        progress(i, magnetRects.length);
      }

      const result = await processMagnetROI(canvas, rect, magnetId, config, worker);
      if (result) {
        results.push(result);
      }
    }
  } finally {
    await worker.terminate();
  }

  if (progress) {
    progress(magnetRects.length, magnetRects.length);
  }

  return results;
}

/**
 * Find magnet candidates that meet minimum size and confidence thresholds
 */
export function filterMagnetCandidates(
  rects: Rect[],
  minSize: number = 20,
  minScore: number = 0.5
): Rect[] {
  if (!Array.isArray(rects)) {
    return [];
  }

  return rects.filter((rect) => {
    const area = rect.width * rect.height;
    return area >= minSize * minSize && rect.score >= minScore;
  });
}
