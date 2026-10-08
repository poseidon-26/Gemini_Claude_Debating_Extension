// Simple text-overlap / Jaccard similarity heuristic for v1
export function calculateTextOverlap(text1: string, text2: string): number {
  const set1 = new Set(text1.toLowerCase().split(/\s+/));
  const set2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

export function checkConvergence(currentText: string, previousText: string | undefined): boolean {
  // Explicit signal detection
  if (currentText.includes("I believe we've covered the key considerations")) {
    return true;
  }
  
  // If there's no previous text, it hasn't converged
  if (!previousText) {
    return false;
  }
  
  // Similarity heuristic - Threshold can be adjusted (e.g. 0.85 means 85% word overlap)
  const similarity = calculateTextOverlap(currentText, previousText);
  const SIMILARITY_THRESHOLD = 0.85; 
  
  return similarity >= SIMILARITY_THRESHOLD;
}
