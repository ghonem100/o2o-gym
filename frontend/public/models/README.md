# Face-API.js Models

The attendance kiosk needs these model files in this folder for face recognition.

Download from the official face-api.js weights repo:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Required files:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

Quick download (PowerShell):

```powershell
$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$files = @(
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2"
)
foreach ($f in $files) { Invoke-WebRequest "$base/$f" -OutFile $f }
```

Until these are present, the kiosk falls back to barcode + manual check-in
(the camera panel will show a loading/error state but the rest works).
