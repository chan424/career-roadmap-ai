import type { FactorScore } from '../model/types';

export function FactorBars({ factors, compact = false }: { factors: FactorScore[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'factor-list compact' : 'factor-list'}>
      {factors.map((factor) => {
        const percent = Math.round(factor.score * 100);
        return (
          <li key={factor.key}>
            <div className="factor-label">
              <span>{factor.label}</span>
              <span>
                {percent}%
                <span className="factor-weight"> · weight {Math.round(factor.weight * 100)}%</span>
              </span>
            </div>
            <div
              className="factor-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`${factor.label}, ${percent} percent`}
            >
              <span className={`factor-fill fill-${factor.key}`} style={{ width: `${percent}%` }} />
            </div>
            {compact ? null : <p className="factor-note">{factor.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}
