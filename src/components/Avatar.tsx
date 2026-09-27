import { avatarFor } from '../data/avatars';

interface AvatarProps {
  id: number | null | undefined;
  size?: number;
  className?: string;
}

/** Round avatar. Decorative (alt="") — the person's name sits next to it. */
export function Avatar({ id, size = 40, className = '' }: AvatarProps) {
  const a = avatarFor(id);
  return <img className={`avatar ${className}`} src={a.src} alt="" width={size} height={size} draggable={false} loading="lazy" style={{ width: size, height: size }} />;
}
