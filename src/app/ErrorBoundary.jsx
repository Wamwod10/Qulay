import { Component } from "react";

import { translateText } from "../localization/i18n";

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
        <h1>{translateText("Sahifa ochilmadi")}</h1>
        <p>{translateText("Iltimos, sahifani qayta yuklang.")}</p>
        <button type="button" onClick={this.handleReload}>
          {translateText("Qayta yuklash")}
        </button>
      </main>
    );
  }
}
