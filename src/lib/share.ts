/** Feuille de partage iOS (Mail, Messages, Fichiers, Imprimer), sinon téléchargement. */
export async function shareFile(blob: Blob, name: string, title: string): Promise<void> {
  const file = new File([blob], name, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '');
