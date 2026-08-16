export default function RouteLoader({ label = 'Loading SiteArvo...' }) {
  return (
    <div className="page-loading route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="loading-spinner" />
      <span>{label}</span>
    </div>
  );
}
