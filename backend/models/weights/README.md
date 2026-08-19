# Model weights

This directory holds locally trained model checkpoints. It is intentionally
empty in git (weights are not committed).

Expected files after training (or copying from your training environment):

| File | Produced by | Used by |
| --- | --- | --- |
| `effnet_b0_ham10000.pt` | `backend/models/train_vision.py` | vision agent |
| `xgb_history.json` | `backend/models/train_history.py` | history agent |

If a file is missing, the corresponding agent degrades safely (reported as
unavailable at `/api/health`; no probabilities are fabricated).
