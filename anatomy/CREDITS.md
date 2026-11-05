# Credits & Licenses / 來源與授權

## 3D anatomy data — BodyParts3D
"BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
- Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html (BodyParts3D 4.0, is_a set, OBJ)
- License statement: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html (updated 2025-02-25: CC BY 4.0)
- The original OBJ file headers state CC BY-SA 2.1 JP ("BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan").
  To satisfy both statements, the derived models in `models/` are released under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Changes made: coordinate conversion (mm → cm, Y-up), merging of multiple FMA elements into single study parts,
  mesh decimation (fast-simplification), meshopt compression (gltf-transform), removal of the external-genital surface
  from the translucent skin outline, and LUNGS SYNTHESISED as smoothed convex hulls of each side's bronchial tree
  (BodyParts3D has no lung parenchyma model).

## three.js r160 — MIT License
Copyright © 2010-2023 three.js authors. See `vendor/three/LICENSE`.
Files vendored: build/three.module.min.js, examples/jsm/controls/OrbitControls.js, loaders/GLTFLoader.js,
utils/BufferGeometryUtils.js, libs/meshopt_decoder.module.js (meshoptimizer, MIT, © Arseny Kapoulkine).

## Terminology
Traditional Chinese anatomical names follow 國家教育研究院 樂詞網 (https://terms.naer.edu.tw/) term lists
「人體解剖學」 and 「醫學名詞」, otherwise common Taiwan junior/senior-high biology textbook usage.

## Site code & text
Site code, part explanations and the forensics article: CC BY-SA 4.0 (same as the models). Article sources are listed in the 法醫入門 page.
