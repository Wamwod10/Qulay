import "./PageContainer.scss";

const PageContainer = ({ title, description, children }) => {
  return (
    <section className="page-container">
      <header className="page-container__header">
        <div>
          <h1>{title}</h1>

          {description && <p>{description}</p>}
        </div>
      </header>

      {children && <div className="page-container__content">{children}</div>}
    </section>
  );
};

export default PageContainer;
