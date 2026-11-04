import pandas as pd

# Sample career profiles
CAREERS = {
    "Data Scientist": ["Python", "Machine Learning", "Statistics", "SQL"],
    "Environmental Analyst": ["AQI Analysis", "GIS", "Python", "Research"],
    "Software Engineer": ["Programming", "Web Development", "Algorithms", "Databases"],
    "IoT Engineer": ["Embedded Systems", "Sensors", "Python", "Networking"]
}

def recommend_career(user_skills):
    scores = {}
    for career, required in CAREERS.items():
        match = len(set(user_skills) & set(required))
        scores[career] = match / len(required)
    
    sorted_careers = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_careers

def main():
    print("Career Roadmap AI - Starter Recommendation Engine")
    user_skills = ["Python", "Machine Learning", "AQI Analysis"]
    print(f"Input skills: {user_skills}")
    
    recommendations = recommend_career(user_skills)
    print("\nTop recommendations:")
    for career, score in recommendations[:3]:
        print(f"  {career}: {score:.0%} match")

if __name__ == "__main__":
    main()
