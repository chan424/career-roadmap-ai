import { useId } from 'react';

export interface RadarAxis {
  label: string;
  user: number;
  required: number;
}

export function RadarChart({ axes, title }: { axes: RadarAxis[]; title: string }) {
  const titleId = useId();
  const descId = useId();
  if (axes.length < 3) return null;

  const cx = 180;
  const cy = 168;
  const radius = 92;
  const point = (index: number, value: number): [number, number] => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / axes.length;
    const scale = Math.max(0, Math.min(5, value)) / 5;
    return [cx + radius * scale * Math.cos(angle), cy + radius * scale * Math.sin(angle)];
  };
  const polygon = (key: 'user' | 'required') => axes.map((axis, index) => point(index, axis[key]).join(',')).join(' ');
  const summary = axes
    .map((axis) => `${axis.label}: you ${axis.user} of 5, path lists ${axis.required}`)
    .join('. ');

  return (
    <figure className="radar-figure">
      <svg className="radar" viewBox="0 0 360 340" role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{title}</title>
        <desc id={descId}>{summary}</desc>
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon
            key={ring}
            className="radar-grid"
            points={axes.map((_, index) => point(index, ring).join(',')).join(' ')}
          />
        ))}
        {axes.map((axis, index) => {
          const [x, y] = point(index, 5);
          return <line key={axis.label} className="radar-axis" x1={cx} y1={cy} x2={x} y2={y} />;
        })}
        <polygon className="radar-required" points={polygon('required')} />
        <polygon className="radar-user" points={polygon('user')} />
        {axes.map((axis, index) => {
          const angle = -Math.PI / 2 + (2 * Math.PI * index) / axes.length;
          const x = cx + (radius + 22) * Math.cos(angle);
          const y = cy + (radius + 22) * Math.sin(angle);
          const anchor = x < cx - 8 ? 'end' : x > cx + 8 ? 'start' : 'middle';
          return (
            <text key={axis.label} className="radar-label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
              {axis.label}
            </text>
          );
        })}
      </svg>
      <figcaption className="radar-legend">
        <span>
          <i className="swatch swatch-user" aria-hidden="true" /> Your level
        </span>
        <span>
          <i className="swatch swatch-required" aria-hidden="true" /> Depth this path lists
        </span>
      </figcaption>
    </figure>
  );
}
