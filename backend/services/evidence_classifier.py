"""
Citizen-report evidence classifier.

Per both source documents' explicit non-goal: this NEVER outputs a landslide
probability from an image. It only classifies the visual evidence category
(crack / debris / blockage / irrelevant) with a confidence score. A human
must verify (see /api/reports/<id>/verify) before a report can influence any
risk assessment — reports are never an independent trigger.

No real vision model / network is available in this sandbox, so this uses
keyword heuristics on the citizen's own description as a stand-in for a
lightweight image classifier (Module D in the source docs). Swap `classify()`
for a real model (e.g. a small CNN or YOLO) without touching any caller.
"""
import random

_rng = random.Random(7)

KEYWORDS = {
    "crack": ["crack", "cracks", "fissure", "split ground", "ground crack"],
    "debris": ["debris", "rockfall", "boulder", "mud", "landslide", "rocks"],
    "blockage": ["block", "blocked", "closed road", "traffic", "jam", "obstruct"],
}


def classify(description: str, has_photo: bool):
    text = (description or "").lower()
    for category, words in KEYWORDS.items():
        if any(w in text for w in words):
            confidence = _rng.uniform(78, 96) if has_photo else _rng.uniform(55, 75)
            return category, round(confidence, 1)

    if has_photo:
        return "unclassified", round(_rng.uniform(30, 55), 1)
    return "irrelevant", round(_rng.uniform(10, 30), 1)
