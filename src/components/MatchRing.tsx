interface MatchRingProps {
  percent: number;
  label: string;
  size?: 'md' | 'sm';
}

export function MatchRing({ percent, label, size = 'md' }: MatchRingProps) {
  const tone = percent >= 70 ? 'good' : percent >= 45 ? 'mid' : 'low';
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <svg
      className={`match-ring match-ring-${size} ring-${tone}`}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${label}: ${percent} percent model fit`}
    >
      <g transform="rotate(-90 60 60)">
        <circle className="ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </g>
      <text className="ring-num" x="60" y="58" textAnchor="middle">
        {percent}%
      </text>
      <text className="ring-caption" x="60" y="76" textAnchor="middle">
        fit
      </text>
    </svg>
  );
}
