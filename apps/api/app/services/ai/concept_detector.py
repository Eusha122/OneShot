import re
from typing import Dict, Any, Optional

CONCEPT_MAPPINGS = [
    # GEOMETRY
    {
        "concept_id": "triangle_angle_sum",
        "subject": "math",
        "keywords": ["triangle", "angle sum", "180", "angles in a triangle"],
        "weight": 0.3
    },
    {
        "concept_id": "supplementary_angles",
        "subject": "math",
        "keywords": ["supplementary", "180 degrees", "straight line", "angles on a line"],
        "weight": 0.3
    },
    {
        "concept_id": "circle_geometry",
        "subject": "math",
        "keywords": ["circle", "radius", "diameter", "circumference", "arc", "tangent"],
        "weight": 0.25
    },
    {
        "concept_id": "pythagorean_theorem",
        "subject": "math",
        "keywords": ["pythagorean", "pythagoras", "right triangle", "hypotenuse", "a^2 + b^2", "a2 + b2"],
        "weight": 0.3
    },
    
    # PHYSICS
    {
        "concept_id": "speed_velocity_acceleration",
        "subject": "physics",
        "keywords": ["velocity", "speed", "acceleration", "kinematics", "displacement"],
        "weight": 0.25
    },
    {
        "concept_id": "projectile_motion",
        "subject": "physics",
        "keywords": ["projectile", "trajectory", "motion", "gravity", "thrown", "launched", "parabola"],
        "weight": 0.25
    },
    {
        "concept_id": "force_motion",
        "subject": "physics",
        "keywords": ["newton", "force", "mass", "friction", "push", "pull", "f = ma", "f=ma"],
        "weight": 0.25
    },
    {
        "concept_id": "optics_reflection",
        "subject": "physics",
        "keywords": ["lens", "mirror", "reflection", "refraction", "optics", "focal length", "light ray"],
        "weight": 0.25
    },
    {
        "concept_id": "electricity_current",
        "subject": "physics",
        "keywords": ["ohm", "current", "electric", "voltage", "resistance", "circuit", "amps"],
        "weight": 0.25
    },
    
    # MATH
    {
        "concept_id": "linear_equation",
        "subject": "math",
        "keywords": ["linear", "y = mx + b", "slope", "intercept", "straight line equation"],
        "weight": 0.25
    },
    {
        "concept_id": "graph_function",
        "subject": "math",
        "keywords": ["graph", "plot", "function", "curve", "coordinates", "x-axis", "y-axis"],
        "weight": 0.25
    },
    {
        "concept_id": "trigonometry_basic",
        "subject": "math",
        "keywords": ["sine", "cosine", "tangent", "sin", "cos", "tan", "sohcahtoa", "trig"],
        "weight": 0.25
    }
]

import json
import logging
from app.services.ai.parameter_extractor import extract_parameters

logger = logging.getLogger(__name__)

async def detect_concept(query: str, context_text: str = "") -> Optional[Dict[str, Any]]:
    """
    Analyzes user query and retrieved context to detect an educational concept.
    Returns: {"concept_id": str, "confidence": float, "subject": str, "extracted_params": dict} or None
    """
    text_to_analyze = f"{query} {context_text}".lower()
    
    # Simple scoring mechanism
    best_concept = None
    max_confidence = 0.0
    
    for concept in CONCEPT_MAPPINGS:
        score = 0.0
        for keyword in concept["keywords"]:
            # Count occurrences using regex for word boundaries
            matches = len(re.findall(r'\b' + re.escape(keyword) + r'\b', text_to_analyze))
            if matches > 0:
                # Add base weight, plus a small bonus for multiple occurrences
                score += concept["weight"] + (0.05 * (matches - 1))
        
        # Boost confidence if the keyword is present in the query itself (user explicit intent)
        query_score = 0.0
        for keyword in concept["keywords"]:
            if re.search(r'\b' + re.escape(keyword) + r'\b', query.lower()):
                query_score += 0.4
                break
                
        total_score = min(score + query_score, 1.0)
        
        if total_score > max_confidence:
            max_confidence = total_score
            best_concept = concept
            
    if best_concept and max_confidence > 0.3: # Minimum threshold to even return something
        cid = best_concept["concept_id"]
        
        # Use our deterministic extractor instead of inline LLM
        extracted_params = await extract_parameters(cid, query, context_text)
            
        return {
            "concept_id": cid,
            "confidence": round(max_confidence, 2),
            "subject": best_concept["subject"],
            "extracted_params": extracted_params
        }
        
    return None
