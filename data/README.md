# Datasets

No dataset files are committed to this repository. Download them yourself
and lay them out as described below.

## HAM10000 (vision training)

Source: Harvard Dataverse / Kaggle ("Skin Cancer MNIST: HAM10000").
Licence: CC BY-NC-SA 4.0 — suitable for this non-commercial hackathon
prototype; see `LICENSE_NOTES.md` for the implications.

Expected layout:

```
data/ham10000/
├── HAM10000_metadata.csv
└── images/
    ├── ISIC_0024306.jpg
    └── ...
```

(Merge the two Kaggle image zip parts into the single `images/` folder.)

Facts that shape the methodology:

- 10,015 dermatoscopic images, 7 classes (`akiec, bcc, bkl, df, mel, nv, vasc`);
- multiple images can belong to the SAME lesion — all splits are grouped by
  `lesion_id`, never by image index;
- classes are heavily imbalanced — training uses class-weighted loss and
  metrics headline malignant recall / balanced accuracy, not accuracy.

## Fitzpatrick17k (fairness evaluation)

Used only by `eval/bias_report.py`, which additionally requires a
documented label mapping you supply (`--label-map`); the script refuses to
guess how Fitzpatrick17k condition labels map to malignant/benign.

```
data/fitzpatrick17k/
├── fitzpatrick17k.csv
└── images/<md5hash>.jpg
```

## ISIC (future work)

ISIC archives can offer licence-cleaner subsets, but licences vary per
subset/image — check the specific subset before mixing. Do not mix datasets
with incompatible labels without a documented mapping.

## Domain gap — read this

HAM10000 is dermatoscopic imagery; DermaTriage receives ordinary smartphone
photos. Benchmark performance does NOT directly transfer to field
smartphone photography. This is a major, documented limitation of the
prototype.
