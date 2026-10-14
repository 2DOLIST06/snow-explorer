import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { absoluteRegionLink, sanitizeRegionHtml } from '@/lib/regionHtml';

export default function RegionHtmlEditor({ value, onChange, disabled = false }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const [source, setSource] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('');
  const [error, setError] = useState('');
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, strike: false, code: false, codeBlock: false, horizontalRule: false }), Link.configure({ openOnClick: false, autolink: false, linkOnPaste: false, HTMLAttributes: { target: null, rel: null, class: null } })],
    content: sanitizeRegionHtml(value),
    editorProps: { attributes: { 'aria-label': 'Description de la région', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : sanitizeRegionHtml(editor.getHTML())),
  });
  useEffect(() => { editor?.setEditable(!disabled && !source); }, [editor, disabled, source]);
  useEffect(() => { if (editor && !source && sanitizeRegionHtml(editor.getHTML()) !== sanitizeRegionHtml(value)) editor.commands.setContent(sanitizeRegionHtml(value), false); }, [editor, value, source]);
  if (!editor) return <p>Chargement de l’éditeur…</p>;
  const button = (label: string, run: () => void, active = false) => <button type="button" disabled={disabled || source} aria-pressed={active} onClick={run}>{label}</button>;
  return <div className="region-html-editor">
    <div className="region-html-editor__toolbar" role="group" aria-label="Mise en forme">
      {button('Paragraphe', () => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'))}
      {([2, 3] as const).map(level => <span key={level}>{button(`H${level}`, () => editor.chain().focus().toggleHeading({ level }).run(), editor.isActive('heading', { level }))}</span>)}
      {button('Gras', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {button('Italique', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      <button type="button" disabled title="Non conservé par le backend">Souligné</button><button type="button" disabled title="Non conservé par le backend">Barré</button>
      {button('Puces', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {button('Liste numérotée', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {button('Citation', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
      {button('Ajouter / modifier un lien', () => { setHref(editor.getAttributes('link').href || ''); setError(''); setLinkOpen(true); }, editor.isActive('link'))}
      {button('Supprimer le lien', () => editor.chain().focus().extendMarkRange('link').unsetLink().run())}
      {button('Annuler', () => editor.chain().focus().undo().run())}{button('Rétablir', () => editor.chain().focus().redo().run())}
      {button('Effacer le formatage', () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
      <button type="button" disabled={disabled} aria-pressed={source} onClick={() => { if (source) onChange(sanitizeRegionHtml(value)); setSource(!source); setLinkOpen(false); }}>Code HTML</button>
    </div>
    <p className="region-html-editor__help">Souligné et barré indisponibles : le backend les supprime. Les liens internes saisis avec / sont convertis en URL HTTPS absolues. Le code source est limité aux balises autorisées ; les autres balises et attributs sont retirés.</p>
    {linkOpen && !source && <div className="region-html-editor__link"><label>Adresse du lien<input value={href} disabled={disabled} onChange={e => setHref(e.target.value)} placeholder="/stations/… ou https://…" /></label><button type="button" disabled={disabled} onClick={() => { const url = absoluteRegionLink(href); if (!url) { setError('Saisissez une URL HTTP/HTTPS absolue ou un chemin interne commençant par /.'); return; } editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); setLinkOpen(false); }}>Appliquer le lien</button><button type="button" onClick={() => setLinkOpen(false)}>Fermer</button>{error && <p role="alert">{error}</p>}</div>}
    {source ? <label>Code HTML source<textarea rows={16} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={() => onChange(sanitizeRegionHtml(value))} /></label> : <EditorContent editor={editor} />}
  </div>;
}
