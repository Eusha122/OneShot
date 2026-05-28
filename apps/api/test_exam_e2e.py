import httpx, asyncio, json

async def test():
    print("=" * 60)
    print("TEST: SSC Class 9 Math Algebra MCQ (5 questions)")
    print("=" * 60)
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post("http://127.0.0.1:8000/api/exams/generate", json={
            "subject": "Math",
            "topic": "Algebraic Expressions",
            "count": 5,
            "type": "mcq",
            "board": "SSC",
            "class_name": "Class 9",
            "weak_topics": ["Linear Equations"]
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
                print(f"  Chapter: {q.get('chapter', 'N/A')}")
                print(f"  Difficulty: {q.get('difficulty', 'N/A')}")
                print(f"  Type: {q.get('type', 'N/A')}")
        else:
            print(f"ERROR: {r.text}")

asyncio.run(test())
