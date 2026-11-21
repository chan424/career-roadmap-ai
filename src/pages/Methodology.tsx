import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { careers, labels, model, sampleProfile } from '../model/catalog';
import { LEGACY_DEMO_SKILLS, legacyRecommend } from '../model/legacy';
import { LEVEL_RANK, scoreAll } from '../model/scoring';

export function MethodologyPage() {
  useDocumentTitle('How it works · Career Roadmap');
  const location = useLocation();
  const legacy = legacyRecommend(LEGACY_DEMO_SKILLS);
  const sample = scoreAll(sampleProfile, careers, model, labels).slice(0, 5);

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  return (
    <div className="wrap page-block prose">
      <p className="kicker">Methodology</p>
      <h1>How the score works</h1>
      <p className="lead">
        The number on a result is a weighted average of four parts. Each part is between 0 and 1. There is no hidden
        network and no labour-market feed. You can recompute it from the rules on this page.
      </p>

      <h2 id="formula">The formula</h2>
      <pre className="formula">{`fit = ${model.weights.skills}·skills + ${model.weights.interests}·interests + ${model.weights.education}·education + ${model.weights.preferences}·preferences

skills      = sum of min(your level, importance) / sum of importance
interests   = shared themes / themes tagged on the career
education   = ${model.education.levelWeight}·level + ${model.education.streamWeight}·stream
preferences = average of five work-style questions`}</pre>
      <p>The percentage is that fit, rounded to the nearest integer. A value ending in exactly .5 rounds up.</p>

      <h2>What each part means</h2>
      <h3>Skills, {Math.round(model.weights.skills * 100)}% of the score</h3>
      <p>
        Every career lists skills with an importance from 1 to 5. You rate yourself from 0 (None) to 5 (Expert). A
        rating above the listed importance does not add extra credit. A skill you leave unrated counts as 0. This is
        the original overlap idea, except a partial rating counts as partial coverage instead of a yes or no.
      </p>
      <h3>Interests, {Math.round(model.weights.interests * 100)}%</h3>
      <p>
        Each career is tagged with a few themes. Your score is how many of those themes you selected, divided by how
        many the career has. Extra interests you selected do not dilute a career that only needed two of them.
      </p>
      <h3>Education, {Math.round(model.weights.education * 100)}%</h3>
      <p>
        Levels are ordered: secondary, diploma, bachelor’s, master’s, doctorate
        ({Object.entries(LEVEL_RANK)
          .map(([name, rank]) => `${name} ${rank}`)
          .join(', ')}
        ). Meeting or exceeding the usual entry level scores 1. One step below scores {model.education.oneStepBelow}.
        Further below scores {model.education.furtherBelow}. If your stream is one of the common backgrounds, the
        stream part is 1. Otherwise it is {model.education.streamMismatch}. Paths that are open to many backgrounds,
        such as several graduate exams, do not use stream to raise or lower the score.
      </p>
      <h3>Work style, {Math.round(model.weights.preferences * 100)}%</h3>
      <p>
        Five questions: sector, setting, focus, structure, and pace. An exact overlap scores 1. If the career is
        tagged “mixed”, either specific choice matches. “No preference” scores {model.preference.neutral} — neutral,
        not a perfect hit. A clash scores {model.preference.mismatch}. The five answers are averaged.
      </p>

      <h2 id="example">A worked example you can open</h2>
      <p>
        The starter script ranked four careers by overlap. With skills Python, Machine Learning, and AQI Analysis, the
        legacy ratios are still:
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <caption>Original overlap demo, unchanged.</caption>
          <thead>
            <tr>
              <th scope="col">Career in the starter script</th>
              <th scope="col">Overlap</th>
            </tr>
          </thead>
          <tbody>
            {legacy.map((item) => (
              <tr key={item.title}>
                <th scope="row">{item.title}</th>
                <td>{Math.round(item.score * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The live catalog uses the weighted model. The same story — Python, machine learning, air-quality analysis, a
        bachelor’s in engineering, and an interest in data, technology, and the environment — currently ranks like
        this:
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <caption>Top of the sample profile under the current weights. Regenerated from the scoring code.</caption>
          <thead>
            <tr>
              <th scope="col">Career</th>
              <th scope="col">Fit</th>
              <th scope="col">Skills</th>
              <th scope="col">Interests</th>
              <th scope="col">Education</th>
              <th scope="col">Work style</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((item) => (
              <tr key={item.careerId}>
                <th scope="row">{item.title}</th>
                <td>{item.percent}%</td>
                {item.factors.map((factor) => (
                  <td key={factor.key}>{Math.round(factor.score * 100)}%</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link to="/">Open the sample from the home page</Link> if you want to click through that profile.
      </p>

      <h2 id="limitations">Limitations</h2>
      <ul>
        <li>Self-ratings are easy to overstate or understate. The model believes what you enter.</li>
        <li>The catalog is a curated sample. Missing a career does not mean it is a poor idea.</li>
        <li>The weights are a design choice so the score is stable and explainable. They are not a law of hiring.</li>
        <li>
          Pay, vacancy counts, and “demand” are omitted. Publishing a number without a dated, cited source would be
          fiction.
        </li>
        <li>Exam eligibility, syllabi, and medical or teaching licences change. The official notice overrides this site.</li>
        <li>A high score is not a recommendation to leave a course, and it is not a probability of being selected.</li>
        <li>The model does not know location, money, health, family, or visas.</li>
      </ul>

      <h2 id="privacy">Privacy</h2>
      <p>
        Scoring happens in your browser. Answers are saved in local storage so a refresh does not wipe them. A share
        link encodes those answers in the address. Anyone with the link can read them. Do not share it if you consider
        the answers private. Clearing “Start over” removes the saved profile on this browser.
      </p>

      <h2 id="origins">Where this started</h2>
      <p>
        The repository began as <code>recommend.py</code>: four careers, a set intersection, and a ratio. That function
        is still there, and the table above is its output. The website generalises it. The command line can run the
        legacy demo and the weighted model against the same JSON catalog.
      </p>
    </div>
  );
}
