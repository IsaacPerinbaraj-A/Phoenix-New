"""Verify CUDA-capable PyTorch with a REAL GPU operation, not just a flag.

RTX 5050-class (Blackwell) GPUs need CUDA 12.8-compatible wheels:

    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

Run:
    python scripts/verify_gpu.py
"""

import sys


def main() -> int:
    try:
        import torch
    except ImportError:
        print("PyTorch is not installed. See README.md for install steps.")
        return 1

    print(f"torch version: {torch.__version__}")
    if not torch.cuda.is_available():
        print(
            "CUDA is NOT available. The app still runs on CPU (degraded), "
            "but check your driver / wheel combination if a GPU exists.\n"
            "Diagnose: nvidia-smi, then confirm the installed torch wheel "
            "matches your CUDA driver (cu128 for Blackwell)."
        )
        return 1

    print(f"device: {torch.cuda.get_device_name(0)}")
    print(f"capability: {torch.cuda.get_device_capability(0)}")

    # Actual CUDA work — a flag check alone can pass on broken installs.
    a = torch.randn(2000, 2000, device="cuda")
    b = a @ a
    torch.cuda.synchronize()
    print(f"matmul OK, result shape: {tuple(b.shape)}")
    print("GPU verification PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
