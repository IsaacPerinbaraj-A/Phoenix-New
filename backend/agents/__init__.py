"""SkinSight agents.

Five bounded agents:
  ingestion  — image quality gate + graph routing decision
  vision     — EfficientNet-B0 classification + Grad-CAM
  history    — XGBoost structured-history risk score
  reasoning  — local LLM supporting explanation (advisory only)
  safety     — deterministic, pure-Python final decision (authoritative)
"""
