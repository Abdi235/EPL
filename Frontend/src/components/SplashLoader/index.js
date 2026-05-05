import "./index.scss";

const SplashLoader = () => {
  return (
    <div className="splash-loader" role="status" aria-live="polite" aria-label="Loading PremierZone">
      <h1 className="splash-loader__title">PremierZone</h1>
      <p className="splash-loader__subtitle">Loading match data</p>
      <div className="splash-loader__spinner" />
    </div>
  );
};

export default SplashLoader;
