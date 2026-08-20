# Licence notes

Provenance of the components SkinSight builds on:

| Component | Licence |
| --- | --- |
| EfficientNet via `timm` | Apache-style ecosystem (timm: Apache 2.0) |
| Qwen2.5 (7B / 3B Instruct) | Apache 2.0 (per project specification) |
| XGBoost | Apache 2.0 |
| OpenCV | Apache 2.0 |
| pytorch-grad-cam (`grad-cam`) | MIT |
| LangGraph | MIT |
| FastAPI | MIT |
| React | MIT |
| HAM10000 dataset | CC BY-NC-SA 4.0 (per project specification) |

## The important limitation

> HAM10000 is suitable for this non-commercial hackathon prototype but
> introduces a non-commercial/share-alike restriction that prevents simply
> treating resulting work as unrestricted commercial training material.

Any model trained on HAM10000 inherits that constraint in practice: do not
repurpose the resulting weights commercially.

## Future work

Migrate vision training toward appropriately licensed ISIC subsets.
Note that ISIC licensing varies **per subset/image** — not every ISIC image
carries the same licence, so each subset must be checked individually
before use, and datasets with incompatible labels must not be mixed
without a documented mapping.
