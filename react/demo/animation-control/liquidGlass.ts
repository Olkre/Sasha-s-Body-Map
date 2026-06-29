export function setLiquidGlassPointerVars(
  element: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = element.getBoundingClientRect();
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  const angle = Math.atan2(y, x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  element.style.setProperty("--highlight-x", `${(cos * 3).toFixed(2)}px`);
  element.style.setProperty("--highlight-y", `${(sin * 3).toFixed(2)}px`);
  element.style.setProperty("--glow-x", `${(cos * 2).toFixed(2)}px`);
  element.style.setProperty("--glow-y", `${(sin * 2).toFixed(2)}px`);
  element.style.setProperty(
    "--shine-x",
    `${(clientX - rect.left).toFixed(2)}px`,
  );
  element.style.setProperty(
    "--shine-y",
    `${(clientY - rect.top).toFixed(2)}px`,
  );
  element.style.setProperty(
    "--border-angle",
    `${((angle * 180) / Math.PI + 90).toFixed(2)}deg`,
  );
}

export function resetLiquidGlassPointerVars(element: HTMLElement) {
  element.style.setProperty("--highlight-x", "0px");
  element.style.setProperty("--highlight-y", "-3px");
  element.style.setProperty("--glow-x", "0px");
  element.style.setProperty("--glow-y", "0px");
  window.setTimeout(() => {
    element.style.removeProperty("--shine-x");
    element.style.removeProperty("--shine-y");
    element.style.removeProperty("--border-angle");
  }, 400);
}
