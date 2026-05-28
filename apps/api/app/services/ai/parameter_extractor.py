import re
import json
import logging
from typing import Dict, Any, Optional
from app.services.ai.ollama_adapter import OllamaAdapter

logger = logging.getLogger(__name__)

async def extract_parameters(concept_id: str, query: str, context_text: str = "") -> Dict[str, Any]:
    """
    Extract deterministic parameters from user prompts/questions.
    Prefers regex extraction whenever possible. Uses tiny LLM extraction ONLY as fallback.
    """
    text_to_analyze = f"{query} {context_text}".lower()
    params = {}
    
    # 1. Deterministic Regex Extraction First
    
    if concept_id == "triangle_angle_sum":
        # Look for angles A, B, C
        # E.g. "angle A is 60", "A=60", "A = 60 degrees"
        for angle_name in ["a", "b", "c"]:
            match = re.search(fr'\b{angle_name}\s*(?:is|=|:)\s*(\d+(?:\.\d+)?)\b', query, re.IGNORECASE)
            if not match:
                # Try finding just "angle A ... 60"
                match = re.search(fr'angle {angle_name}.*?(\d+(?:\.\d+)?)', query, re.IGNORECASE)
            if match:
                params[angle_name.upper()] = float(match.group(1))
                
        # If we got at least one angle via regex, we can return early
        if params:
            return params
            
    elif concept_id == "projectile_motion":
        # Look for velocity and angle
        vel_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:m/s|meters per second|velocity)', text_to_analyze)
        if vel_match:
            params["velocity"] = float(vel_match.group(1))
            
        angle_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:degrees|deg|angle)', text_to_analyze)
        if angle_match:
            params["angle"] = float(angle_match.group(1))
            
        if "velocity" in params or "angle" in params:
            return params
            
    elif concept_id in ["newton_second_law", "force_motion"]:
        mass_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilogram|mass)', text_to_analyze)
        if mass_match:
            params["mass"] = float(mass_match.group(1))
            
        force_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:n|newton|force)', text_to_analyze)
        if force_match:
            params["force"] = float(force_match.group(1))
            
        acc_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:m/s\^2|m/s2|acceleration)', text_to_analyze)
        if acc_match:
            params["acceleration"] = float(acc_match.group(1))
            
        if len(params) > 0:
            return params

    # 2. LLM Fallback (if regex failed to find anything)
    logger.info(f"[PARAM EXTRACTOR] Regex failed for {concept_id}. Falling back to LLM.")
    try:
        adapter = OllamaAdapter()
        system_prompt = (
            "You are a strict JSON parameter extractor. "
            f"Extract numerical parameters for the concept: {concept_id} from the user's query. "
            "Only return valid JSON containing the parameters you found. Do not include units in the values, just numbers. "
            "For triangles use keys: 'A', 'B', 'C'. "
            "For projectiles use keys: 'velocity', 'angle'. "
            "For force use keys: 'mass', 'force', 'acceleration', 'friction'. "
            "If no parameters are explicitly stated, return {}."
        )
        response_text = await adapter.generate(
            prompt=query,
            history=[],
            system_prompt=system_prompt,
            temperature=0.0
        )
        
        json_text = response_text
        if "```json" in response_text:
            json_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            json_text = response_text.split("```")[1].split("```")[0]
            
        extracted = json.loads(json_text.strip())
        logger.info(f"[PARAM EXTRACTOR] LLM Extracted params: {extracted}")
        return extracted
    except Exception as e:
        logger.warning(f"Failed to extract JSON parameters via LLM: {e}")
        
    return {}
