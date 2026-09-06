"""
Consequence engine — turns a risk score into "what is actually affected".

Uses explainable rules rather than a model: which road outranks which, and
what an authority should do about it, are governance decisions, not
pattern-recognition problems (matches the "where AI is deliberately NOT
used" principle from the source documents).
"""
from services.risk_engine import ALERT_ACTIONS

CRITICALITY_WEIGHT = {
    "national_highway": 1.0,
    "state_road": 0.7,
    "district_road": 0.5,
}


def compute_exposure(roads: list, villages: list, alert_level: str) -> dict:
    at_risk_roads = []
    at_risk_villages = []
    isolated_population = 0

    include_all = alert_level != "GREEN"

    if include_all:
        at_risk_roads = sorted(
            roads, key=lambda r: CRITICALITY_WEIGHT.get(r["criticality"], 0.5), reverse=True
        )
        at_risk_villages = list(villages)
        for v in villages:
            if not v["alternate_route_available"]:
                isolated_population += v["population_estimate"]

    return {
        "at_risk_roads": at_risk_roads,
        "at_risk_villages": at_risk_villages,
        "isolated_population_estimate": isolated_population,
        "recommended_actions": list(ALERT_ACTIONS.get(alert_level, [])),
    }
