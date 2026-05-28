import httpx
import time
import json
import sys

def main():
    print("Testing stream from local Ollama directly...")
    start = time.time()
    with httpx.stream("POST", "http://127.0.0.1:11434/api/chat", json={
        "model": "qwen2.5:1.5b",
        "messages": [{"role": "user", "content": "Write a long poem"}],
        "stream": True
    }) as response:
        for line in response.iter_lines():
            if line:
                elapsed = time.time() - start
                print(f"{elapsed:.2f}s: received chunk of size {len(line)}")
                sys.stdout.flush()

if __name__ == "__main__":
    main()
