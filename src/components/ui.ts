/** Classe CSS selon le signe d'une durée (vert / rouge) */
export const signCls = (v: number | null) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');

/** Ajoute la valeur courante à une liste si elle n'y figure pas */
export const withExtra = <T,>(list: T[], v: T) => (list.includes(v) ? list : [...list, v]);
