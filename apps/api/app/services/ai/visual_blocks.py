import re
import json
import urllib.request
import urllib.error
from app.schemas.chat import VisualBlock


def query_physics_intent_llm(message: str) -> dict | None:
    prompt = f"""
You are an intent parser for a physics lab application.
Analyze the user's message.

Step 1. Check if the formula matches one of these valid formulas:
- kinematics: velocity, acceleration, motion-1, motion-2, motion-3, motion-4
- force: gravitational-force, newton-second-law, momentum, impulse, conservation, centripetal
- energy: kinetic-energy, potential-energy, work
- pressure: pressure, liquid-pressure
- waves: wave-velocity, frequency-period, echo-distance
- optics: lens-mirror, focal-length, magnification, refractive-index, critical-angle, lens-power
- electricity: ohms-law, electric-power

If it matches, return a JSON like:
{{"scenario": "<scenario>", "formulaId": "<formula>", "u": 5, "v": 10, "a": -9.8, "s": 100, "t": 2}}
(Extract any numeric parameters mentioned for u, v, a, s, t, mass, force, etc).

Step 2. If the user asks for a physics concept NOT in the list (e.g. "pendulum", "spring", "coriolis"), generate a schema.
Allowed object types: pendulum, spring, wave.
Return JSON:
{{
  "scenario": "generative",
  "schema": {{
    "sceneType": "custom",
    "title": "<Title>",
    "description": "<Desc>",
    "objects": [
      {{ "id": "obj1", "type": "pendulum", "params": {{"length": 250, "gravity": 9.8, "initialAngle": 45}} }}
    ],
    "sliders": [
      {{ "key": "gravity", "label": "Gravity", "min": 1, "max": 20, "step": 0.1, "value": 9.8, "unit": "m/s²" }}
    ]
  }}
}}

Valid object types: "pendulum", "projectile", "spring", "wave", "vector", "particle", "mass-on-incline", "lens".

User message: "{message}"

Return ONLY a valid JSON object (no markdown, no backticks).
"""
    url = "http://localhost:11434/api/generate"
    data = {
        "model": "qwen2.5:3b",
        "prompt": prompt,
        "format": "json",
        "stream": False
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            text = result['response'].strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.endswith('```'):
                text = text[:-3]
            parsed = json.loads(text.strip())
            return parsed
    except Exception as e:
        print(f"LLM parsing failed: {e}")
        return None


def infer_visual_blocks(message: str) -> list[VisualBlock]:
    normalized = message.lower()
    blocks: list[VisualBlock] = []
    physics_lab_params = infer_physics_lab_params(normalized)

    if physics_lab_params is not None:
        blocks.append(
            VisualBlock(
                id="visual-physics-engine-lab",
                type="physics.engineLab",
                params=physics_lab_params,
            )
        )
        return blocks

    # 1. Full SSC physics engine lab detection
    if any(
        keyword in normalized
        for keyword in [
            "physics engine",
            "physics lab",
            "ssc physics",
            "interactive physics",
            "all physics formulas",
            "formula lab",
        ]
    ):
        scenario = "projectile"
        if any(keyword in normalized for keyword in ["ohm", "current", "electric", "voltage", "resistance"]):
            scenario = "electricity"
        elif any(keyword in normalized for keyword in ["wave", "sound", "frequency", "wavelength", "echo"]):
            scenario = "waves"
        elif any(keyword in normalized for keyword in ["pressure", "liquid", "density", "buoyancy"]):
            scenario = "pressure"
        elif any(keyword in normalized for keyword in ["energy", "work", "power", "kinetic", "potential"]):
            scenario = "energy"
        elif any(keyword in normalized for keyword in ["force", "friction", "newton", "acceleration"]):
            scenario = "force"

        blocks.append(
            VisualBlock(
                id="visual-physics-engine-lab",
                type="physics.engineLab",
                params={"scenario": scenario},
            )
        )

    # 2. Force & Motion Detection
    elif any(keyword in normalized for keyword in ["force", "friction", "newton", "mass", "sliding", "acceleration", "f = ma", "f=ma"]):
        mass = 10.0
        force = 50.0
        friction = 0.2

        mass_matches = re.findall(r'(?:mass|m)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)?', normalized)
        if not mass_matches:
            mass_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)', normalized)
        if mass_matches:
            mass = float(mass_matches[0])

        force_matches = re.findall(r'(?:force|f)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*(?:n|newtons?)?', normalized)
        if not force_matches:
            force_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:n|newtons?)', normalized)
        if force_matches:
            force = float(force_matches[0])

        friction_matches = re.findall(r'(?:friction|coefficient|\bmu\b)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)', normalized)
        if friction_matches:
            friction = float(friction_matches[0])

        blocks.append(
            VisualBlock(
                id="visual-force-response",
                type="physics.forceMotion",
                params={"mass": mass, "force": force, "friction": friction},
            )
        )

    # 3. Projectile detection
    elif any(keyword in normalized for keyword in ["projectile", "trajectory", "motion", "gravity", "thrown", "launched", "fired", "ball", "stone"]):
        speed = 32.0
        angle = 42.0
        gravity = 9.8

        speed_matches = re.findall(r'(?:velocity|speed|v)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*(?:m/s|m\.s\^-1|meters?/second)?', normalized)
        if not speed_matches:
            speed_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:m/s|meters?/second)', normalized)
        if speed_matches:
            speed = float(speed_matches[0])

        angle_matches = re.findall(r'(?:angle\s*(?:of|=|is)?\s*)?(\d+(?:\.\d+)?)\s*(?:deg|degrees?|°)', normalized)
        if not angle_matches:
            angle_matches = re.findall(r'angle\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)', normalized)
        if angle_matches:
            angle = float(angle_matches[0])

        gravity_matches = re.findall(r'(?:gravity|g)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*(?:m/s\^2|m/s2)?', normalized)
        if gravity_matches:
            gravity = float(gravity_matches[0])

        blocks.append(
            VisualBlock(
                id="visual-projectile-response",
                type="physics.projectile",
                params={"speed": speed, "angleDegrees": angle, "gravity": gravity},
            )
        )

    # 4. Quadratic graph detection
    elif any(keyword in normalized for keyword in ["quadratic", "parabola", "x^2", "x2", "vertex", "roots"]):
        a = 1.0
        b = 0.0
        c = 0.0

        quad_expr = re.search(r'(-?\d*(?:\.\d+)?)?\s*x\^?2\s*([+-]\s*\d*(?:\.\d+)?)?\s*x\s*([+-]\s*\d+(?:\.\d+)?)?', normalized)
        if quad_expr:
            a_val, b_val, c_val = quad_expr.groups()
            
            if a_val is not None:
                a_clean = a_val.replace(" ", "")
                if a_clean == "" or a_clean == "+":
                    a = 1.0
                elif a_clean == "-":
                    a = -1.0
                else:
                    a = float(a_clean)
            
            if b_val is not None:
                b_clean = b_val.replace(" ", "")
                if b_clean == "+":
                    b = 1.0
                elif b_clean == "-":
                    b = -1.0
                else:
                    b = float(b_clean)
            else:
                b = 0.0

            if c_val is not None:
                c_clean = c_val.replace(" ", "")
                c = float(c_clean)
            else:
                c = 0.0
        else:
            a_matches = re.findall(r'\ba\s*(?:=|\bis\b)\s*(-?\d+(?:\.\d+)?)', normalized)
            if a_matches:
                a = float(a_matches[0])
            b_matches = re.findall(r'\bb\s*(?:=|\bis\b)\s*(-?\d+(?:\.\d+)?)', normalized)
            if b_matches:
                b = float(b_matches[0])
            c_matches = re.findall(r'\bc\s*(?:=|\bis\b)\s*(-?\d+(?:\.\d+)?)', normalized)
            if c_matches:
                c = float(c_matches[0])

        blocks.append(
            VisualBlock(
                id="visual-quadratic-response",
                type="math.quadraticGraph",
                params={"a": a, "b": b, "c": c},
            )
        )

    # 5. Sine graph detection
    elif any(keyword in normalized for keyword in ["sine", "sin(", "sin ", "wave"]):
        amplitude = 1.4
        frequency = 1.0
        phase = 0.0

        amp_matches = re.findall(r'(?:amplitude|amp|a)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)', normalized)
        if not amp_matches:
            amp_matches = re.findall(r'(\d+(?:\.\d+)?)\s*sin', normalized)
        if amp_matches:
            amplitude = float(amp_matches[0])

        freq_matches = re.findall(r'(?:frequency|freq|f|omega|w)\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)', normalized)
        if not freq_matches:
            freq_matches = re.findall(r'sin\s*\(\s*(\d+(?:\.\d+)?)\s*x', normalized)
        if freq_matches:
            frequency = float(freq_matches[0])

        phase_matches = re.findall(r'(?:phase|phi)\s*(?:of|=|is)?\s*(-?\d+(?:\.\d+)?)', normalized)
        if not phase_matches:
            phase_matches = re.findall(r'sin\s*\(\s*(?:\d+(?:\.\d+)?)?x\s*([+-]\s*\d+(?:\.\d+)?)\)', normalized)
        if phase_matches:
            phase_val = phase_matches[0].replace(" ", "")
            try:
                phase = float(phase_val)
            except ValueError:
                pass

        blocks.append(
            VisualBlock(
                id="visual-sine-response",
                type="math.sineGraph",
                params={"amplitude": amplitude, "frequency": frequency, "phase": phase},
            )
        )

    return blocks


def infer_physics_lab_params(normalized: str) -> dict[str, float | str] | None:
    formula_id = infer_formula_id(normalized)

    # 1. Try LLM first
    llm_result = query_physics_intent_llm(normalized)
    if llm_result and "scenario" in llm_result:
        # Override generative if we have a strict match
        if llm_result["scenario"] == "generative" and formula_id:
            llm_result["scenario"] = scenario_for_formula(formula_id)
            llm_result["formulaId"] = formula_id

        valid_scenarios = {"projectile", "force", "energy", "pressure", "waves", "optics", "electricity", "generative", "kinematics"}
        if llm_result["scenario"] in valid_scenarios:
            if formula_id and "formulaId" not in llm_result:
                llm_result["formulaId"] = formula_id
            return llm_result

    # 2. Fallback to heuristics
    if formula_id:
        return {"scenario": scenario_for_formula(formula_id), "formulaId": formula_id}

    if not any(
        keyword in normalized
        for keyword in [
            "physics engine",
            "physics lab",
            "ssc physics",
            "interactive physics",
            "all physics formulas",
            "formula lab",
        ]
    ):
        return None

    scenario = "projectile"
    if any(keyword in normalized for keyword in ["velocity", "acceleration", "motion equation", "kinematics"]):
        scenario = "kinematics"
    elif any(keyword in normalized for keyword in ["ohm", "current", "electric", "voltage", "resistance"]):
        scenario = "electricity"
    elif any(keyword in normalized for keyword in ["wave", "sound", "frequency", "wavelength", "echo"]):
        scenario = "waves"
    elif any(keyword in normalized for keyword in ["pressure", "liquid", "density", "buoyancy"]):
        scenario = "pressure"
    elif any(keyword in normalized for keyword in ["energy", "work", "power", "kinetic", "potential"]):
        scenario = "energy"
    elif any(keyword in normalized for keyword in ["force", "friction", "newton", "acceleration"]):
        scenario = "force"
    elif any(keyword in normalized for keyword in ["optics", "lens", "mirror", "light", "refraction", "reflection"]):
        scenario = "optics"

    return {"scenario": scenario}


def infer_formula_id(normalized: str) -> str | None:
    aliases: list[tuple[str, list[str]]] = [
        (
            "gravitational-force",
            [
                "gravitational force",
                "law of gravitation",
                "universal gravitation",
                "gravity discovery",
                "discovered gravity",
                "apple fell",
                "apple on head",
                "white long hair",
                "white haired physicist",
                "newton gravity",
                "inverse square",
                "between two masses",
                "m1m2",
            ],
        ),
        (
            "newton-second-law",
            [
                "newton's second law",
                "newtons second law",
                "second law of motion",
                "f = ma",
                "f=ma",
                "force equals mass",
                "mass times acceleration",
                "force and acceleration",
            ],
        ),
        ("momentum", ["momentum", "p = mv", "p=mv", "mass times velocity"]),
        (
            "impulse",
            [
                "impulse",
                "j = ft",
                "j=ft",
                "change in momentum",
                "m(v-u)",
                "force times time",
            ],
        ),
        (
            "conservation",
            [
                "conservation of momentum",
                "momentum is conserved",
                "m1u1",
                "m1v1",
                "m1u1 + m2u2",
                "collision",
                "collisions",
                "collusion",
                "collution",
                "collisions formula explanation",
                "elastic collision",
                "momentum conservation",
            ],
        ),
        (
            "centripetal",
            [
                "centripetal",
                "circular motion",
                "mv^2/r",
                "mv2/r",
                "mv squared by r",
                "force towards center",
            ],
        ),
        (
            "velocity",
            [
                "velocity",
                "speed",
                "v = s / t",
                "v=s/t",
                "distance over time",
            ],
        ),
        (
            "acceleration",
            [
                "acceleration",
                "a = (v - u) / t",
                "a=(v-u)/t",
                "rate of change of velocity",
            ],
        ),
        (
            "motion-1",
            [
                "v = u + at",
                "v=u+at",
                "first equation of motion",
                "final velocity",
                "initial velocity plus acceleration",
            ],
        ),
        (
            "motion-2",
            [
                "s = ((u + v) / 2)",
                "s=((u+v)/2)*t",
                "average velocity times time",
                "second equation of motion",
            ],
        ),
        (
            "motion-3",
            [
                "s = ut",
                "s=ut",
                "half at square",
                "half at squared",
                "displacement with acceleration",
                "third equation of motion",
            ],
        ),
        (
            "motion-4",
            [
                "v^2 = u^2",
                "v2 = u2",
                "v squared equals u squared",
                "fourth equation of motion",
                "2as",
            ],
        ),
        ("kinetic-energy", ["kinetic energy", "energy of motion", "half mv square", "1/2 mv", "moving energy"]),
        ("potential-energy", ["potential energy", "mgh", "stored energy", "height energy"]),
        ("work", ["work formula", "work done", "force times displacement", "fs cos"]),
        ("pressure", ["pressure formula", "force per area", "f/a", "f ÷ a"]),
        ("liquid-pressure", ["liquid pressure", "water pressure", "h rho g", "depth pressure", "pressure in liquid"]),
        ("wave-velocity", ["wave velocity", "wave speed", "v = f", "v=f", "frequency wavelength", "f lambda", "wave speed formula"]),
        ("frequency-period", ["time period", "period and frequency", "f = 1/t", "f=1/t", "frequency period"]),
        ("echo-distance", ["echo", "sound reflection", "distance to wall", "2d = vt", "2d=vt"]),
        ("lens-mirror", ["mirror formula", "lens formula", "lens equation", "1/v", "1/f", "image distance", "reflection", "mirror"]),
        ("focal-length", ["focal length", "r/2", "radius of curvature"]),
        ("magnification", ["magnification", "m = -v/u", "hi/ho", "h_i/h_o"]),
        ("refractive-index", ["refractive index", "snells law", "snell's law", "sin i", "sin r", "refraction", "snell", "index of refraction"]),
        ("critical-angle", ["critical angle", "sin theta c", "n2/n1", "total internal reflection", "tir"]),
        ("lens-power", ["power of lens", "p = 1/f", "dioptre"]),
        ("coulombs-law", ["coulombs law", "coulomb's law", "k q1 q2", "q1q2", "electric force", "coulomb law"]),
        ("electric-field", ["electric field strength", "e = f/q", "f/q"]),
        ("electric-current", ["electric current", "i = q/t", "q/t", "charge over time"]),
        ("ohms-law", ["ohm", "ohm's law", "ohms law", "v = ir", "v=ir", "voltage current resistance"]),
        ("wire-resistance", ["resistance of a wire", "rho l/a", "resistivity", "resistance formula"]),
        ("series-resistance", ["series resistance", "series resistor", "r1 + r2", "resistors in series"]),
        ("parallel-resistance", ["parallel resistance", "parallel resistor", "1/r1 + 1/r2", "resistors in parallel"]),
        ("electric-power", ["electric power", "electrical power", "p = vi", "p=vi", "v squared by r"]),
    ]

    for formula_id, keywords in aliases:
        if any(keyword in normalized for keyword in keywords):
            return formula_id

    return None


def scenario_for_formula(formula_id: str) -> str:
    if formula_id in {"velocity", "acceleration", "motion-1", "motion-2", "motion-3", "motion-4"}:
        return "kinematics"
    if formula_id in {"gravitational-force", "newton-second-law", "momentum", "impulse", "conservation", "centripetal"}:
        return "force"
    if formula_id in {"kinetic-energy", "potential-energy", "work"}:
        return "energy"
    if formula_id in {"pressure", "liquid-pressure"}:
        return "pressure"
    if formula_id in {"wave-velocity", "frequency-period", "echo-distance"}:
        return "waves"
    if formula_id in {"lens-mirror", "focal-length", "magnification", "refractive-index", "critical-angle", "lens-power"}:
        return "optics"
    if formula_id in {"coulombs-law", "electric-field", "electric-current", "ohms-law", "wire-resistance", "series-resistance", "parallel-resistance", "electric-power"}:
        return "electricity"
    return "projectile"
