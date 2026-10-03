"""Private loopback service. One cancellable subprocess per bounded request."""
import asyncio
import hmac
import json
import os
from pathlib import Path
import sys
from fastapi import FastAPI, HTTPException, Request

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
slots = asyncio.Semaphore(2)
MAX_BODY = 100000


def authorize(request):
    token = os.environ.get("CREWAI_SERVICE_TOKEN", "")
    if not token or not hmac.compare_digest(request.headers.get("authorization", ""), "Bearer " + token):
        raise HTTPException(401, "Unauthorized")


@app.get("/health")
def health(request: Request):
    authorize(request)
    ready = bool(os.environ.get("OPENROUTER_API_KEY") and os.environ.get("OPENROUTER_MODEL"))
    return {"ready": ready, "backend": "crewai", "provider": "openrouter"}


async def execute(payload, request):
    async with slots:
        process = await asyncio.create_subprocess_exec(
            sys.executable, str(Path(__file__).with_name("worker.py")),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        async def communicate():
            output, _ = await process.communicate(json.dumps(payload).encode())
            if process.returncode or len(output) > 80000:
                raise HTTPException(502, "Crew execution failed")
            try:
                return json.loads(output)
            except (ValueError, UnicodeDecodeError):
                raise HTTPException(502, "Invalid crew result") from None
        task = asyncio.create_task(communicate())
        try:
            async with asyncio.timeout(110):
                while not task.done():
                    if await request.is_disconnected():
                        raise HTTPException(499, "Request canceled")
                    await asyncio.wait({task}, timeout=0.2)
                return await task
        except TimeoutError:
            raise HTTPException(504, "Crew timed out") from None
        finally:
            if process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), 2)
                except TimeoutError:
                    process.kill()
                    await process.wait()
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)


@app.post("/chat")
async def chat(request: Request):
    authorize(request)
    if not os.environ.get("OPENROUTER_API_KEY") or not os.environ.get("OPENROUTER_MODEL"):
        raise HTTPException(503, "Provider not configured")
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > MAX_BODY:
            raise HTTPException(413, "Request too large")
    try:
        payload = json.loads(raw)
        messages = payload["messages"]
        if (payload["locale"] not in ("ar", "en") or not isinstance(messages, list)
                or not 1 <= len(messages) <= 40 or messages[-1].get("role") != "user"
                or any(m.get("role") not in ("user", "assistant") or not isinstance(m.get("text"), str)
                       or len(m["text"]) > 10000 or m.get("image") for m in messages)
                or sum(len(m["text"]) for m in messages) > 40000
                or not isinstance(payload["instructions"], str) or len(payload["instructions"]) > 20000
                or not isinstance(payload["tools"], list) or len(payload["tools"]) > 12):
            raise ValueError()
    except (ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(400, "Invalid text conversation") from None
    return await execute(payload, request)
