import unittest

from recommend import CAREERS, load_json, recommend_career, round_percent, score_all


class LegacyOverlapTest(unittest.TestCase):
    def test_original_demo_order_and_ratios(self):
        ranked = recommend_career(["Python", "Machine Learning", "AQI Analysis"])
        self.assertEqual(
            [career for career, _score in ranked],
            ["Data Scientist", "Environmental Analyst", "IoT Engineer", "Software Engineer"],
        )
        scores = dict(ranked)
        self.assertEqual(scores["Data Scientist"], 0.5)
        self.assertEqual(scores["Environmental Analyst"], 0.5)
        self.assertEqual(scores["IoT Engineer"], 0.25)
        self.assertEqual(scores["Software Engineer"], 0)
        self.assertEqual(set(CAREERS), set(scores))


class WeightedModelTest(unittest.TestCase):
    def test_weights_and_sample_agree_with_the_site_rules(self):
        config = load_json("model.json")
        weights = config["weights"]
        self.assertAlmostEqual(sum(weights.values()), 1.0)
        sample = load_json("sample-profile.json")
        careers = load_json("careers.json")
        ranked = score_all(sample, careers, config)
        by_id = {item["id"]: item for item in ranked}
        self.assertGreater(by_id["data-scientist"]["percent"], by_id["graphic-designer"]["percent"])
        self.assertGreater(by_id["data-scientist"]["percent"], by_id["software-engineer"]["percent"])
        self.assertEqual(ranked[0]["percent"], round_percent(ranked[0]["score"]))

    def test_perfect_graphic_design_profile_scores_100(self):
        config = load_json("model.json")
        careers = load_json("careers.json")
        career = next(item for item in careers if item["id"] == "graphic-designer")
        style = career["workStyle"]
        profile = {
            "interests": list(career["interests"]),
            "skills": {skill["id"]: 5 for skill in career["skills"]},
            "educationLevel": career["education"]["minLevel"],
            "stream": career["education"]["preferredStreams"][0],
            "preferences": {
                "sector": style["sector"][0],
                "setting": style["setting"][0],
                "focus": style["focus"][0],
                "structure": "flexible" if style["structure"] == "mixed" else style["structure"],
                "pace": "steady" if style["pace"] == "mixed" else style["pace"],
            },
            "focusText": "",
        }
        ranked = score_all(profile, careers, config)
        self.assertEqual(ranked[0]["id"], "graphic-designer")
        self.assertEqual(ranked[0]["percent"], 100)


if __name__ == "__main__":
    unittest.main()
