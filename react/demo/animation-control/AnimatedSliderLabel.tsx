export function AnimatedSliderLabel({ text }: { text: string }) {
  return (
    <span key={text} className="t-digit-group" aria-hidden="true">
      {text.split("").map((char, index) => (
        <span
          key={`${text}-${index}-${char}`}
          className="t-digit"
          style={{ animationDelay: `calc(var(--digit-stagger) * ${index})` }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
