import { skillName } from '../model/profile';
import { STATUS_LABEL, skillLearningStatus } from '../model/scoring';
import type { Career, UserProfile } from '../model/types';

export function Timeline({ career, profile }: { career: Career; profile: UserProfile | null }) {
  return (
    <ol className="timeline">
      {career.roadmap.map((phase, index) => (
        <li key={phase.id} className="phase">
          <div className="phase-index" aria-hidden="true">
            {index + 1}
          </div>
          <article className="phase-card">
            <p className="kicker">{phase.timeframe}</p>
            <h3>{phase.title}</h3>
            <p>{phase.summary}</p>
            <h4>Milestones</h4>
            <ul className="milestone-list">
              {phase.milestones.map((milestone) => (
                <li key={milestone}>{milestone}</li>
              ))}
            </ul>
            <h4>Skills in this phase</h4>
            <ul className="chips">
              {phase.skills.map((id) => {
                const importance = career.skills.find((skill) => skill.id === id)?.importance ?? 3;
                const status = profile ? skillLearningStatus(profile.skills[id] ?? 0, importance) : null;
                return (
                  <li key={id} className="chip">
                    <span>{skillName(id)}</span>
                    {status ? <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span> : null}
                  </li>
                );
              })}
            </ul>
            <h4>Ways to learn</h4>
            <ul className="learning-list">
              {phase.learning.map((item) => (
                <li key={`${item.type}-${item.title}`}>
                  <span className="learning-type">{item.type}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </article>
        </li>
      ))}
    </ol>
  );
}
