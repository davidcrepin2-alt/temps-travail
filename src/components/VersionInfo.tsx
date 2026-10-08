const REPO = 'https://github.com/davidcrepin2-alt/temps-travail';

/** Commit publié, injecté au build par GitHub Actions (voir vite.config.ts) */
export function VersionInfo({ sha = __COMMIT_SHA__, date = __COMMIT_DATE__ }: { sha?: string; date?: string }) {
  return (
    <p className="note" id="ver" style={{ textAlign: 'center' }}>
      Temps de travail · Version :{' '}
      {sha ? (
        <>
          <a id="commit" href={`${REPO}/commit/${sha}`} target="_blank" rel="noopener"><code>{sha.slice(0, 7)}</code></a>
          {date && <><br />publiée le {new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</>}
        </>
      ) : 'locale (non publiée)'}
    </p>
  );
}
