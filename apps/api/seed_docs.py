import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import sessionmanager
from app.db.models import Base
from app.db.docs.models import DocsSystemConfig, DocsSection, TeamMember

async def seed():
    # Make sure tables exist
    async with sessionmanager._engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with sessionmanager.session() as session:
        # Config
        config = await session.execute(select(DocsSystemConfig).limit(1))
        if not config.scalar_one_or_none():
            new_config = DocsSystemConfig(
                is_public=True,
                site_title="OneShot AI",
                hero_tagline="The first fully-adaptive, subject-gated AI tutor for Bangladeshi students."
            )
            session.add(new_config)

        # Clear existing sections/team for clean seed
        await session.execute(DocsSection.__table__.delete())
        await session.execute(TeamMember.__table__.delete())

        sections = [
            DocsSection(
                slug="problem",
                title="The Problem",
                section_type="pitch",
                order_index=1,
                content_markdown="""
### Why Current Education Fails
Generic LLM wrappers hallucinate STEM facts and lack curriculum alignment. Text-only interfaces alienate visual learners who depend on diagrams, flowcharts, and whiteboards. 

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
  <div class="comparison-card comparison-card-bad">
    <h4 class="text-red-400 font-bold mb-4 flex items-center gap-2"> Traditional Education</h4>
    <ul class="text-gray-300 space-y-2">
      <li>Rote Memorization</li>
      <li>Expensive Coaching Dependency</li>
      <li>Passive, text-only learning</li>
    </ul>
  </div>
  <div class="comparison-card comparison-card-good">
    <h4 class="text-emerald-400 font-bold mb-4 flex items-center gap-2"> OneShot AI</h4>
    <ul class="text-gray-300 space-y-2">
      <li><span class="highlight-chip text-sm px-2 py-0">Visual STEM Learning</span></li>
      <li>Adaptive Exam Engine</li>
      <li>Interactive experimentation</li>
    </ul>
  </div>
</div>
"""
            ),
            DocsSection(
                slug="why-bangladesh",
                title="Why Bangladesh?",
                section_type="pitch",
                order_index=2,
                content_markdown="""
### Our Emotional Moat

The current education landscape presents a massive opportunity for disruption:

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
  <div class="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] hover:border-amber-500/50 transition-colors">
    <div class="text-3xl mb-4"></div>
    <h4 class="font-bold text-white mb-2">Coaching Dependency</h4>
    <p class="text-sm text-gray-400">Students spend extreme amounts on private tutors just to keep up.</p>
  </div>
  <div class="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] hover:border-amber-500/50 transition-colors">
    <div class="text-3xl mb-4"></div>
    <h4 class="font-bold text-white mb-2">Memorization Culture</h4>
    <p class="text-sm text-gray-400">Rote memorization is prioritized over conceptual visual learning.</p>
  </div>
  <div class="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] hover:border-amber-500/50 transition-colors">
    <div class="text-3xl mb-4"></div>
    <h4 class="font-bold text-white mb-2"><span class="highlight-chip text-xs">Rural Accessibility</span></h4>
    <p class="text-sm text-gray-400">Tier 2/3 city students lack access to quality STEM teachers.</p>
  </div>
</div>

OneShot provides a low-cost, patient AI tutor that understands local curriculum nuances and teaches visually.
"""
            ),
            DocsSection(
                slug="solution",
                title="The Solution",
                section_type="pitch",
                order_index=3,
                content_markdown="""
We built a **Live Product Intelligence Layer** powered by <span class="highlight-chip">Subject-Gated RAG</span> and local open-weight inference.

*   Automatically routes questions to curriculum-specific vector stores.
*   Real-time OCR pipeline for notebook and whiteboard analysis.
*   Generates <span class="highlight-chip">Adaptive Exams</span> based on detected weak topics.
"""
            )
        ]
        session.add_all(sections)

        team = [
            TeamMember(
                full_name="Eusha Ibna Akbor",
                role="AI Architect",
                email="eushaibnaakbor@gmail.com",
                order_index=1,
                github_url="https://github.com/eusha122",
                linkedin_url="https://www.linkedin.com/in/eusha-ibna-akbor/"
            )
        ]
        session.add_all(team)

        await session.commit()
        print("Successfully seeded the Live Docs platform!")

if __name__ == "__main__":
    asyncio.run(seed())
