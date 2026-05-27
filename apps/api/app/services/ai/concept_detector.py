import re
from typing import Dict, Any, Optional

CONCEPT_MAPPINGS = [
    {
        "concept_id": "newton_second_law",
        "subject": "physics",
        "keywords": ["newton", "force", "acceleration", "mass", "f = ma", "f=ma"],
        "weight": 0.25
    },
    {
        "concept_id": "projectile_motion",
        "subject": "physics",
        "keywords": ["projectile", "trajectory", "motion", "gravity", "thrown", "launched", "parabola"],
        "weight": 0.25
    },
    {
        "concept_id": "quadratic_equation",
        "subject": "math",
        "keywords": ["quadratic", "parabola", "x^2", "x2", "vertex", "roots"],
        "weight": 0.25
    },
    {
        "concept_id": "waves",
        "subject": "physics",
        "keywords": ["wave", "sound", "frequency", "wavelength", "echo", "velocity"],
        "weight": 0.25
    },
    {
        "concept_id": "optics",
        "subject": "physics",
        "keywords": ["lens", "mirror", "focal length", "magnification", "refractive index", "critical angle"],
        "weight": 0.25
    },
    {
        "concept_id": "electricity",
        "subject": "physics",
        "keywords": ["ohm", "current", "electric", "voltage", "resistance", "power"],
        "weight": 0.25
    },
    {
        "concept_id": "energy",
        "subject": "physics",
        "keywords": ["energy", "work", "power", "kinetic", "potential"],
        "weight": 0.25
    },
    {
        "concept_id": "pressure",
        "subject": "physics",
        "keywords": ["pressure", "liquid", "density", "buoyancy", "pascal", "archimedes"],
        "weight": 0.25
    },
    {
        "concept_id": "sine_cosine",
        "subject": "math",
        "keywords": ["sine", "cosine", "sin", "cos", "wave", "amplitude", "frequency", "phase"],
        "weight": 0.25
    },
    {
        "concept_id": "kinematics",
        "subject": "physics",
        "keywords": ["velocity", "speed", "displacement", "kinematics"],
        "weight": 0.25
    },
    {
        "concept_id": "momentum",
        "subject": "physics",
        "keywords": ["momentum", "collision", "impulse", "p=mv"],
        "weight": 0.3
    }
]

def detect_concept(query: str, context_text: str = "") -> Optional[Dict[str, Any]]:
    """
    Analyzes user query and retrieved context to detect an educational concept.
    Returns: {"concept_id": str, "confidence": float, "subject": str} or None
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
        return {
            "concept_id": best_concept["concept_id"],
            "confidence": round(max_confidence, 2),
            "subject": best_concept["subject"]
        }
        
    return None
