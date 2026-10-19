/** Sign-in screen logo. */
export function Logo() {
  return (
    <div className="sb-logo">
      <span className="sb-logo__mark">S</span>
      <span className="sb-logo__name">Switchblade</span>
    </div>
  );
}

/** Small mark used in the nav and browser chrome. */
export function Icon() {
  return <span className="sb-logo__mark sb-logo__mark--sm">S</span>;
}
