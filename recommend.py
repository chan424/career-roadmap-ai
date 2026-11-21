#!/usr/bin/env python3
"""Career Roadmap CLI.

The legacy overlap scorer is the original starter. The weighted model matches
src/model/scoring.ts and src/data/model.json. Run with no arguments for the demo.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "src" / "data"

# Original starter profiles. Names are the display strings the first script used.
CAREERS = {
    "Data Scientist": ["Python", "Machine Learning", "Statistics", "SQL"],
    "Environmental Analyst": ["AQI Analysis", "GIS", "Python", "Research"],
    "Software Engineer": ["Programming", "Web Development", "Algorithms", "Databases"],
    "IoT Engineer": ["Embedded Systems", "Sensors", "Python", "Networking"],
}

LEVEL_RANK = {
    "high_school": 1,
    "diploma": 2,
    "bachelors": 3,
    "masters": 4,
    "doctoral": 5,
}


def recommend_career(user_skills):
    """Original overlap ratio. Ties keep the insertion order of CAREERS."""
    scores = {}
    for career, required in CAREERS.items():
        match = len(set(user_skills) & set(required))
        scores[career] = match / len(required) if required else 0.0
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)


def load_json(name):
    with (DATA / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def round_percent(score):
    """Nearest integer, halves away from zero. Matches the website."""
    return int(math.floor(score * 100 + 0.5))


def skill_score(ratings, requirements, scale):
    total = 0
    earned = 0.0
    for requirement in requirements:
        importance = requirement["importance"]
        if importance <= 0:
            continue
        user = min(scale, max(0, ratings.get(requirement["id"], 0)))
        total += importance
        earned += min(user, importance)
    return 0.0 if total == 0 else earned / total


def interest_score(user_interests, career_interests):
    if not career_interests:
        return 0.0
    selected = set(user_interests)
    return sum(1 for item in career_interests if item in selected) / len(career_interests)


def education_score(level, stream, education, config):
    user_rank = LEVEL_RANK[level]
    min_rank = LEVEL_RANK[education["minLevel"]]
    rules = config["education"]
    if user_rank >= min_rank:
        level_score = 1.0
    elif user_rank == min_rank - 1:
        level_score = rules["oneStepBelow"]
    else:
        level_score = rules["furtherBelow"]
    streams = education["preferredStreams"]
    stream_score = 1.0 if "any" in streams or stream in streams else rules["streamMismatch"]
    return rules["levelWeight"] * level_score + rules["streamWeight"] * stream_score


def dimension_score(choice, accepted, config):
    if choice == "any":
        return config["preference"]["neutral"]
    if "any" in accepted or "mixed" in accepted or choice in accepted:
        return 1.0
    return config["preference"]["mismatch"]


def preference_score(profile, career, config):
    style = career["workStyle"]
    choice = profile["preferences"]
    parts = [
        dimension_score(choice["sector"], style["sector"], config),
        dimension_score(choice["setting"], style["setting"], config),
        dimension_score(choice["focus"], style["focus"], config),
        dimension_score(choice["structure"], [style["structure"]], config),
        dimension_score(choice["pace"], [style["pace"]], config),
    ]
    return sum(parts) / len(parts)


def score_career(profile, career, config):
    weights = config["weights"]
    parts = {
        "skills": skill_score(profile["skills"], career["skills"], config["skillScale"]),
        "interests": interest_score(profile["interests"], career["interests"]),
        "education": education_score(profile["educationLevel"], profile["stream"], career["education"], config),
        "preferences": preference_score(profile, career, config),
    }
    score = sum(weights[key] * value for key, value in parts.items())
    gaps = []
    for requirement in career["skills"]:
        user = profile["skills"].get(requirement["id"], 0)
        if user < requirement["importance"]:
            gaps.append((requirement["id"], requirement["importance"] - user, requirement["importance"]))
    gaps.sort(key=lambda item: (-(item[1] * item[2]), -item[2], item[0]))
    return {
        "id": career["id"],
        "title": career["title"],
        "score": score,
        "percent": round_percent(score),
        "parts": parts,
        "gaps": gaps,
    }


def score_all(profile, careers, config):
    ranked = [score_career(profile, career, config) for career in careers]
    ranked.sort(key=lambda item: (-item["score"], item["title"]))
    return ranked


def parse_skills(text):
    ratings = {}
    if not text:
        return ratings
    for piece in text.split(","):
        if not piece.strip():
            continue
        if "=" not in piece:
            raise ValueError(f"Skill '{piece}' should look like python=4")
        skill_id, raw = piece.split("=", 1)
        ratings[skill_id.strip()] = int(raw)
    return ratings


def build_profile(args, sample):
    if not any([args.skills, args.interests, args.level, args.stream, args.sector, args.setting, args.focus, args.structure, args.pace]):
        return sample
    profile = {
        "interests": [item.strip() for item in (args.interests or "").split(",") if item.strip()],
        "skills": parse_skills(args.skills or ""),
        "educationLevel": args.level or "",
        "stream": args.stream or "",
        "preferences": {
            "sector": args.sector or "",
            "setting": args.setting or "",
            "focus": args.focus or "",
            "structure": args.structure or "",
            "pace": args.pace or "",
        },
        "focusText": args.focus_text or "",
    }
    return profile


def validate_profile(profile, taxonomy):
    interests = {item["id"] for item in taxonomy["interests"]}
    skills = {item["id"] for item in taxonomy["skills"]}
    streams = {item["id"] for item in taxonomy["streams"]}
    levels = {item["id"] for item in taxonomy["levels"]}
    options = {question["id"]: {option["id"] for option in question["options"]} for question in taxonomy["preferences"]}
    errors = []
    if not 2 <= len(profile["interests"]) <= 8 or any(item not in interests for item in profile["interests"]):
        errors.append("Provide 2 to 8 known interest ids.")
    if any(skill not in skills for skill in profile["skills"]):
        errors.append("Unknown skill id in --skills.")
    if not any(level > 0 for level in profile["skills"].values()):
        errors.append("Rate at least one skill above 0.")
    if profile["educationLevel"] not in levels:
        errors.append("Unknown --level.")
    if profile["stream"] not in streams:
        errors.append("Unknown --stream.")
    for key, allowed in options.items():
        if profile["preferences"][key] not in allowed:
            errors.append(f"Missing or unknown --{key}.")
    return errors


def print_legacy():
    user_skills = ["Python", "Machine Learning", "AQI Analysis"]
    print("Career Roadmap")
    print("\nLegacy overlap (the original starter)")
    print(f"Input skills: {', '.join(user_skills)}")
    for career, score in recommend_career(user_skills):
        print(f"  {career}: {score:.0%}")


def print_weighted(ranked, top):
    print("\nWeighted model")
    for item in ranked[:top]:
        parts = item["parts"]
        print(
            f"  {item['title']}: {item['percent']}% fit"
            f"  (skills {parts['skills']:.0%}, interests {parts['interests']:.0%},"
            f" education {parts['education']:.0%}, work style {parts['preferences']:.0%})"
        )


def main(argv=None):
    parser = argparse.ArgumentParser(description="Score careers from the shared catalog.")
    parser.add_argument("--skills", help="Comma-separated id=rating pairs, for example python=4,sql=3")
    parser.add_argument("--interests", help="Comma-separated interest ids")
    parser.add_argument("--level", help="high_school, diploma, bachelors, masters, or doctoral")
    parser.add_argument("--stream", help="Stream id, such as engineering or pcm")
    parser.add_argument("--sector", help="Work-style sector, or any")
    parser.add_argument("--setting", help="remote, hybrid, onsite, field, or any")
    parser.add_argument("--focus", help="people, data, systems, creative, or any")
    parser.add_argument("--structure", help="structured, flexible, or any")
    parser.add_argument("--pace", help="fast, steady, or any")
    parser.add_argument("--focus-text", default="", help="Optional study note")
    parser.add_argument("--top", type=int, default=8, help="How many matches to print")
    parser.add_argument("--career", help="Print gaps for one career id")
    parser.add_argument("--list", action="store_true", help="List career ids and titles")
    parser.add_argument("--json", action="store_true", help="Print weighted matches as JSON")
    args = parser.parse_args(argv)

    taxonomy = load_json("taxonomy.json")
    careers = load_json("careers.json")
    config = load_json("model.json")
    sample = load_json("sample-profile.json")

    if args.list:
        for career in careers:
            print(f"{career['id']}\t{career['title']}")
        return 0

    try:
        profile = build_profile(args, sample)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2

    using_sample = profile is sample
    errors = validate_profile(profile, taxonomy)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 2

    if using_sample and not args.json:
        print_legacy()

    ranked = score_all(profile, careers, config)
    if args.json:
        print(json.dumps(ranked[: args.top], indent=2))
    else:
        if using_sample:
            print("\nSample profile: Python, machine learning, air-quality analysis, bachelor's in engineering.")
        print_weighted(ranked, args.top)

    if args.career:
        found = next((item for item in ranked if item["id"] == args.career), None)
        if not found:
            print(f"Unknown career id {args.career}", file=sys.stderr)
            return 2
        names = {skill["id"]: skill["name"] for skill in taxonomy["skills"]}
        print(f"\nGaps for {found['title']}")
        if not found["gaps"]:
            print("  None. Ratings meet every listed skill.")
        for skill_id, gap, importance in found["gaps"]:
            print(f"  {names.get(skill_id, skill_id)}: short by {gap} (listed {importance})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
