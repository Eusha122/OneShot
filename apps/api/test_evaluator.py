import asyncio
from app.services.ai.answer_evaluator import answer_evaluator

async def test_numeric():
    expected = "4"
    tests = ["4", "4.0", "x=4", "x = 4", "The answer is 4", "wrong"]
    print("=== Numeric Tests ===")
    for t in tests:
        res = await answer_evaluator.evaluate_answer(expected, t, "math_numeric")
        print(f"[{t}] -> Correct: {res['correct']}")

async def test_symbolic():
    expected = "4x"
    tests = ["2x+2x", "x+x+x+x", "4*x", "4x", "wrong", "2x+++"]
    print("\n=== Symbolic Tests ===")
    for t in tests:
        res = await answer_evaluator.evaluate_answer(expected, t, "math_expression")
        print(f"[{t}] -> Correct: {res['correct']}")

async def test_mcq():
    print("\n=== MCQ Tests ===")
    expected = "B"
    res = await answer_evaluator.evaluate_answer(expected, "B", "mcq")
    print(f"[B] -> Correct: {res['correct']}")
    
    expected_full = "B) 42"
    res2 = await answer_evaluator.evaluate_answer(expected_full, "B", "mcq")
    print(f"[B] vs 'B) 42' -> Correct: {res2['correct']}")

if __name__ == "__main__":
    asyncio.run(test_numeric())
    asyncio.run(test_symbolic())
    asyncio.run(test_mcq())
