import "./GlobalLoader.scss";

const GlobalLoader = () => {
  return (
    <div className="global-loader">
      <div className="global-loader__logo">U</div>

      <div className="global-loader__indicator">
        <span />
        <span />
        <span />
      </div>

      <p>Platforma yuklanmoqda...</p>
    </div>
  );
};

export default GlobalLoader;
