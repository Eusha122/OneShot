import httpx, asyncio, json

async def test():
    print("=" * 60)
    print("TEST: SSC Class 9 Physics MCQ (5 questions)")
    print("=" * 60)
    async with httpx.AsyncClient(timeout=240) as client:
        r = await client.post("http://127.0.0.1:8000/api/exams/generate", json={
            "subject": "Physics",
            "topic": "Newton's Laws of Motion",
            "count": 5,
            "type": "mcq",
            "board": "SSC",
            "class_name": "Class 9",
            "weak_topics": []
        })
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            questions = r.json()
            for i, q in enumerate(questions):
                print(f"\n--- Question {i+1} ---")
                print(f"  Q: {q.get('question', 'N/A')}")
                if q.get('options'):
                    for j, opt in enumerate(q['options']):
                        marker = "✓" if opt == q.get('answer') else " "
                        print(f"    [{marker}] {opt}")
                print(f"  Answer: {q.get('answer', 'N/A')}")
        else:
            print(f"ERROR: {r.text}")

asyncio.run(test())
