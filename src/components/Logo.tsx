export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`logo logo-${size}`}>
      <span className="logo-word">FRIEND</span>
      <span className="logo-tag">11</span>
    </span>
  );
}
