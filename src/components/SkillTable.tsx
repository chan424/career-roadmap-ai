import type { SkillRow } from '../model/types';

export function SkillTable({ rows }: { rows: SkillRow[] }) {
  if (rows.length === 0) {
    return <p>This path has no skills listed.</p>;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption>Your rating compared with the depth this path lists, on a scale of 0 to 5.</caption>
        <thead>
          <tr>
            <th scope="col">Skill</th>
            <th scope="col">You</th>
            <th scope="col">Listed</th>
            <th scope="col">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              <td>{row.userLevel}</td>
              <td>{row.importance}</td>
              <td>{row.gap === 0 ? 'Met' : row.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
