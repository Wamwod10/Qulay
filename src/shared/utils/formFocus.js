export const focusFirstInvalidField = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const field = document.querySelector(
        ".ui-input--error input:not(:disabled), .ui-input--error textarea:not(:disabled), .ui-select--error .ui-select__trigger:not(:disabled), .ui-creatable-select--error .ui-creatable-select__trigger:not(:disabled)",
      );

      if (!field) {
        return;
      }

      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
    });
  });
};
