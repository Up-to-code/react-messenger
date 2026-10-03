import contextlib
import io
import json
import os
import sys

os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["CREWAI_TRACING_ENABLED"] = "false"
os.environ["CREWAI_TELEMETRY_DISABLED"] = "true"

if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        # Crew/library logs never mix with the response or leak into server logs.
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            from crew import run
            output = run(payload)
        sys.stdout.write(json.dumps(output, ensure_ascii=False))
    except Exception:
        sys.exit(1)
