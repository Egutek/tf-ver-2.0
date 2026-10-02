# Real-photo OCR benchmark

Use real, manually verified board photos to measure OCR and area-assignment quality. Do not use OCR confidence as a substitute for correctness; benchmark identity and area against labels checked by a person.

## Dataset structure

- `photos/`: original board photos, unchanged
- `expected/`: one JSON label file per photo
- `reports/`: exported benchmark reports

For `photos/shift-a.jpg`, create `expected/shift-a.json`:

```json
{
	"photo": "shift-a.jpg",
	"roster": ["NOVÁK JAN", "SVOBODA PETR"],
		"nonEmployeeCandidates": 2,
	"assignments": [
		{ "name": "NOVÁK JAN", "area": "TRANSPORT" },
		{ "name": "SVOBODA PETR", "area": "OUTBOUND" }
	]
}
```

List each employee magnet once and use the area where it appears in the photo. `nonEmployeeCandidates` is the manually verified count of non-employee candidate regions in that photo, including notes and artifacts that the detector presents to OCR. Leave it out if that count is not available; accuracy and false-positive rate will then be `null`, not guessed. Exclude non-employee text from `assignments`; OCR detections of that text count as false positives. Keep the source photo and labels free of personal information that is not needed for this experiment.

## Scoring

`src/ocr/benchmark.ts` exports `evaluateBenchmarkPhoto(expected, detections, nonEmployeeCandidates)` and `createBenchmarkReport(samples)`. It matches names case-insensitively and ignores diacritics, then reports accuracy, precision/recall/F1, false-positive/false-negative rates, false positives, missed employees, wrong areas, and area accuracy among correctly identified employees. Confidence is deliberately not part of the correctness score. `exportBenchmarkReport(report)` serializes the full report as JSON.

Run the focused scorer tests with:

```bash
npm test -- --run src/ocr/benchmark.test.ts
```

The repository currently contains no real photo fixtures. Add labeled samples before drawing accuracy conclusions or tuning OCR thresholds. Keep the same samples and labels across tuning runs so reports remain comparable.
