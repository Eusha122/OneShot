import re
from app.schemas.chat import VisualBlock


def infer_visual_blocks(message: str) -> list[VisualBlock]:
    normalized = message.lower()
    blocks: list[VisualBlock] = []

    # 1. Force & Motion Detection
    if any(keyword in normalized for keyword in ["force", "friction", "newton", "mass", "sliding", "acceleration", "f = ma", "f=ma"]):
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

    # 2. Projectile detection
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

    # 3. Quadratic graph detection
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

    # 4. Sine graph detection
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
