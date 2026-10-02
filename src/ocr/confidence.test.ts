/**
 * Confidence scoring system for OCR results
 * Provides consistent confidence levels across the pipeline
 */

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Calculate confidence level from raw confidence value (0-1)
 * - HIGH: >= 0.95 (95%+)
 * - MEDIUM: 0.80-0.95 (80-95%)
 * - LOW: < 0.80 (<80%)
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.95) return ConfidenceLevel.HIGH;
  if (confidence >= 0.8) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * Check if confidence meets minimum threshold
 */
export function meetsMinimumConfidence(confidence: number, minimumLevel: ConfidenceLevel = ConfidenceLevel.MEDIUM): boolean {
  switch (minimumLevel) {
    case ConfidenceLevel.HIGH:
      return confidence >= 0.95;
    case ConfidenceLevel.MEDIUM:
      return confidence >= 0.8;
    case ConfidenceLevel.LOW:
      return confidence >= 0.0;
  }
}

/**
 * Combine multiple confidence scores (e.g., OCR + fuzzy match + area match)
 * Uses multiplicative averaging to be conservative
 */
export function combineConfidences(...confidences: number[]): number {
  const valid = confidences.filter((c) => typeof c === 'number' && !isNaN(c));
  if (valid.length === 0) return 0;
  const product = valid.reduce((a, b) => a * b, 1);
  return Math.pow(product, 1 / valid.length);
}

/**
 * Boost confidence based on contextual factors
 * e.g., exact match, consistent placement, high contrast
 */
export function boostConfidence(baseConfidence: number, factors: { exactMatch?: boolean; consistentPlacement?: boolean; highContrast?: boolean }): number {
  let boosted = baseConfidence;

  if (factors.exactMatch) boosted = Math.min(1, boosted * 1.1);
  if (factors.consistentPlacement) boosted = Math.min(1, boosted * 1.08);
  if (factors.highContrast) boosted = Math.min(1, boosted * 1.05);

  return boosted;
}
