import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("UI render error", error, info);
    }
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main role="alert" style={{ padding: 24, fontFamily: "inherit" }}>
        <h1>Саҳифа кушода нашуд</h1>
        <p>Лутфан саҳифаро аз нав кушоед.</p>
        <button type="button" onClick={this.handleReload}>Аз нав кушодан</button>
      </main>
    );
  }
}
