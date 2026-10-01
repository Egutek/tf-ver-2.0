# ZF Shift Board OCR - experimentální MVP

Samostatný prototyp domluveného workflow: fotografie magnetické tabule -> automatické kontrastní předzpracování -> lokální OCR -> validace proti seznamu OP -> detekce nejistých výsledků a duplicit.

## Spuštění
```bash
npm install
npm run dev
```

## Důležité
- Experimentální MVP, ne produkční docházkový systém.
- Aktuální preprocessing dělá automatické škálování, grayscale a kontrast. Perspektivní korekce a robustní detekce magnetek jsou další P0.
- OCR běží v browseru přes Tesseract.js; fotografie se v této verzi neukládá na backend.
- Automatické rozhodnutí není dovoleno u nejistého výsledku.

## Další P0
1. OpenCV.js detekce hran tabule a perspective transform.
2. Detekce jednotlivých magnetek a OCR po ROI místo celé fotografie.
3. Geometrické přiřazování magnetky k nejbližšímu nadpisu pracoviště.
4. Druhý nezávislý OCR průchod a disagreement gate.
5. Benchmark na reálných snímcích: missed magnets, wrong identity, wrong area, false positives.
