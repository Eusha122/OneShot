from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from app.api.deps import AsyncSessionDep
from sqlalchemy.future import select
from app.db.models import LearnerProfile

router = APIRouter()

@router.get("/{learner_id}")
async def get_analytics(learner_id: int, session: AsyncSessionDep):
    result = await session.execute(select(LearnerProfile).filter(LearnerProfile.id == learner_id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Learner not found")
        
    metrics = profile.performance_metrics or {}
    
    # 1. Top Cards
    exams_completed = metrics.get("exams_completed", 0)
    questions_solved = metrics.get("questions_solved", 0)
    streak = metrics.get("streak", 0)
    
    chapters = metrics.get("chapters", {})
    total_q = sum(c["total"] for c in chapters.values())
    total_c = sum(c["correct"] for c in chapters.values())
    overall_accuracy = (total_c / total_q * 100) if total_q > 0 else 0
    
    # Find strongest/weakest subject/chapter
    strongest_topic = "N/A"
    weakest_topic = "N/A"
    highest_acc = -1
    lowest_acc = 101
    
    for chap, stats in chapters.items():
        if stats["total"] >= 2:  # Min threshold to count
            acc = stats["correct"] / stats["total"]
            if acc > highest_acc:
                highest_acc = acc
                strongest_topic = chap
            if acc < lowest_acc:
                lowest_acc = acc
                weakest_topic = chap
                
    # 2. Radar Chart Data (Chapter Accuracy)
    topic_data = []
    for chap, stats in chapters.items():
        if stats["total"] > 0:
            topic_data.append({
                "subject": chap,
                "A": round((stats["correct"] / stats["total"]) * 100),
                "fullMark": 100
            })
            
    # 3. Line Chart Data (Trend over time)
    history = metrics.get("history", [])
    trend_data = []
    for i, h in enumerate(history):
        trend_data.append({
            "name": f"Exam {i+1}",
            "score": round(h["score"])
        })
        
    # 4. AI Recommendations & Learning Personality
    # Simple rule-based engine for the hackathon
    ai_recommendation = None
    learning_personality = {
        "strength": "Consistent practice.",
        "struggle": "Maintaining high accuracy across diverse topics."
    }
    
    if len(history) >= 3:
        last_3 = history[-3:]
        avg_last_3 = sum(h["score"] for h in last_3) / 3
        if avg_last_3 < overall_accuracy - 10:
            ai_recommendation = {
                "title": "Recent Accuracy Drop Detected",
                "message": f"Your performance dropped by ~{round(overall_accuracy - avg_last_3)}% in the last few exams.",
                "suggestions": ["Switch to Visual Mode", "Use Step-by-Step breakdown", "Lower difficulty slightly"]
            }
        elif avg_last_3 > overall_accuracy + 10:
            ai_recommendation = {
                "title": "Momentum Building! 🚀",
                "message": "You are crushing it lately! Your recent scores are above your average.",
                "suggestions": ["Try Challenge Mode", "Increase Exam Difficulty"]
            }
            
    if strongest_topic != "N/A" and weakest_topic != "N/A":
        learning_personality = {
            "strength": f"You show high logical retention in {strongest_topic}.",
            "struggle": f"You tend to struggle with abstract concepts in {weakest_topic}."
        }
        if not ai_recommendation:
            ai_recommendation = {
                "title": f"Focus on {weakest_topic}",
                "message": f"Your accuracy in {weakest_topic} is currently {round(lowest_acc*100)}%. Let's fix that.",
                "suggestions": [f"Take a targeted {weakest_topic} exam", "Review core formulas"]
            }

    return {
        "metrics": {
            "accuracy": round(overall_accuracy),
            "exams_completed": exams_completed,
            "questions_solved": questions_solved,
            "streak": streak,
            "strongest": strongest_topic,
            "weakest": weakest_topic
        },
        "topic_data": topic_data,
        "trend_data": trend_data,
        "recommendation": ai_recommendation,
        "personality": learning_personality
    }

@router.post("/seed")
async def seed_analytics(session: AsyncSessionDep):
    """Seed imperfect realistic data for Hackathon demo (Learner ID 1)"""
    result = await session.execute(select(LearnerProfile).filter(LearnerProfile.id == 1))
    profile = result.scalars().first()
    if not profile:
        profile = LearnerProfile(id=1, display_name="Student", language_preference="en")
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
        
    # Generate realistic fluctuations
    history = []
    base_score = 65
    now = datetime.utcnow()
    
    for i in range(15):
        # Fluctuate score between -20 and +25
        fluctuation = random.randint(-20, 25)
        score = max(0, min(100, base_score + fluctuation))
        date = now - timedelta(days=15-i)
        
        # Simulate recent drop to trigger recommendation
        if i >= 12:
            score = max(0, score - 20)
            
        history.append({
            "date": date.isoformat(),
            "subject": random.choice(["Math", "Physics", "Chemistry"]),
            "score": score
        })
        
    chapters = {
        "Algebra": {"total": 40, "correct": 33}, # 82%
        "Geometry": {"total": 35, "correct": 15}, # 42%
        "Statistics": {"total": 20, "correct": 13}, # 65%
        "Trigonometry": {"total": 25, "correct": 22}, # 88%
        "Calculus": {"total": 15, "correct": 5}, # 33%
    }
    
    metrics = {
        "exams_completed": 15,
        "questions_solved": 135,
        "streak": 5,
        "last_active": now.strftime("%Y-%m-%d"),
        "chapters": chapters,
        "history": history
    }
    
    profile.performance_metrics = metrics
    profile.weak_topics = ["Geometry", "Calculus"]
    await session.commit()
    
    return {"status": "Seeded mock data successfully"}
