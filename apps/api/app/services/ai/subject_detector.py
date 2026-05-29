import re

PHYSICS_KEYWORDS = {
    "force", "velocity", "newton", "acceleration", "current", "voltage", 
    "gravity", "kinematics", "projectile", "momentum", "electricity", "magnetism",
    "optics", "thermodynamics", "mass", "friction", "inertia", "watt", "joule"
}

CHEMISTRY_KEYWORDS = {
    "acid", "base", "ph", "atom", "molecule", "reaction", "periodic", "bond",
    "electron", "proton", "neutron", "molar", "compound", "isotope", "ion",
    "oxidation", "reduction", "titration"
}

BIOLOGY_KEYWORDS = {
    "cell", "dna", "mitosis", "meiosis", "plant", "animal", "tissue", "gene",
    "protein", "enzyme", "respiration", "photosynthesis", "blood", "organ",
    "organism", "evolution", "species", "bacteria", "virus"
}

MATH_KEYWORDS = {
    "algebra", "geometry", "calculus", "equation", "quadratic", "integral",
    "derivative", "trigonometry", "sine", "cosine", "tangent", "triangle",
    "circle", "polynomial", "function", "graph", "probability", "statistics",
    "matrix", "vector", "theorem"
}

ICT_KEYWORDS = {
    "computer", "html", "internet", "software", "hardware", "network", "program",
    "code", "database", "binary", "algorithm", "cpu", "ram", "server", "web"
}

def detect_subject(message: str) -> str:
    """
    Lightweight heuristic to detect the subject of a query.
    Returns: "physics", "chemistry", "biology", "mathematics", "ict", or "general".
    """
    msg = message.lower()
    
    # Use regex to find whole words to prevent partial matches
    words = set(re.findall(r'\b[a-z]+\b', msg))
    
    scores = {
        "physics": len(words.intersection(PHYSICS_KEYWORDS)),
        "chemistry": len(words.intersection(CHEMISTRY_KEYWORDS)),
        "biology": len(words.intersection(BIOLOGY_KEYWORDS)),
        "mathematics": len(words.intersection(MATH_KEYWORDS)),
        "ict": len(words.intersection(ICT_KEYWORDS))
    }
    
    best_subject = max(scores, key=scores.get)
    
    # If no keywords matched, default to general
    if scores[best_subject] == 0:
        return "general"
        
    return best_subject
