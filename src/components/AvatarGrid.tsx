import { AVATARS } from '../data/avatars';

interface AvatarGridProps {
  value: number | null;
  onChange: (id: number) => void;
}

/** The 20 approved avatars: round, single-select, clear selected state. */
export function AvatarGrid({ value, onChange }: AvatarGridProps) {
  return (
    <div className="avatar-grid" role="radiogroup" aria-label="Choose an avatar">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={a.id === value}
          aria-label={`${a.label} (${a.id} of ${AVATARS.length})`}
          className={`avatar-option${a.id === value ? ' is-selected' : ''}`}
          onClick={() => onChange(a.id)}
        >
          <img src={a.src} alt="" width={72} height={72} draggable={false} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
