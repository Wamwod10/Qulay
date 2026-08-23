import "./GlobalLoader.scss";

const GlobalLoader = ({ message = "Platforma yuklanmoqda..." }) => {
  return (
    <div className="global-loader">
      <div className="global-loader__logo">U</div>

      <div className="global-loader__indicator">
        <span />
        <span />
        <span />
      </div>

      <p>{message}</p>
    </div>
  );
};

export default GlobalLoader;
