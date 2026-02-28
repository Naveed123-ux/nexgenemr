import subprocess
import sys
import os

try:
    python_path = os.path.join("venv", "Scripts", "python.exe")
    if not os.path.exists(python_path):
        python_path = sys.executable # Fallback

    result = subprocess.run(
        [python_path, "scripts/verify_lab_billing.py"],
        capture_output=True,
        text=True,
        check=False,
        encoding='utf-8',
        errors='replace'
    )
    with open("verify_result_full.txt", "w", encoding="utf-8") as f:
        f.write("STDOUT:\n")
        f.write(result.stdout)
        f.write("\nSTDERR:\n")
        f.write(result.stderr)
        
    print("Execution complete. Output written to verify_result_full.txt")
except Exception as e:
    with open("verify_result_full.txt", "w", encoding="utf-8") as f:
        f.write(f"Error running subprocess: {e}")
