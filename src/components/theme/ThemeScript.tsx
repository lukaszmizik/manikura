/**
 * Inline script: nastaví třídu .dark na <html> před prvním vykreslením,
 * aby nedocházelo k bliknutí při načtení stránky.
 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);})();`,
      }}
    />
  );
}
