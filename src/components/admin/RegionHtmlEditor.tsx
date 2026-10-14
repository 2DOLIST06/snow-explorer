import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { cleanRegionHtml, normalizeRegionLink } from "@/lib/regionHtml";

type Props = { value: string; onChange: (html: string) => void; disabled?: boolean };
export default function RegionHtmlEditor({ value, onChange, disabled = false }: Props) {
  const [source, setSource] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, strike: false, code: false, codeBlock: false, horizontalRule: false }),
      Link.configure({ openOnClick: false, autolink: false, linkOnPaste: false, HTMLAttributes: { target: null, rel: null } }),
    ],
    content: cleanRegionHtml(value),
    editorProps: { attributes: { role: "textbox", "aria-label": "Description de la région", "aria-multiline": "true", class: "region-rich-text" } },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : cleanRegionHtml(current.getHTML())),
  });
  useEffect(() => { editor?.setEditable(!disabled && !source, false); }, [editor, disabled, source]);
  useEffect(() => {
    if (editor && !source && cleanRegionHtml(editor.getHTML()) !== cleanRegionHtml(value)) editor.commands.setContent(cleanRegionHtml(value), false);
  }, [editor, value, source]);
  if (!editor) return <p>Chargement de l’éditeur…</p>;
  const button = (label: string, action: () => void, active = false, unavailable = false) =>
    <button type="button" disabled={disabled || source || unavailable} aria-pressed={active} onClick={action}>{label}</button>;
  const applyLink = () => {
    const url = normalizeRegionLink(href);
    if (!url) { setLinkError("Saisissez une URL HTTP(S) ou un chemin interne, par exemple /regions/alpes."); return; }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    else chain.setLink({ href: url }).run();
    setLinkOpen(false);
  };
  return <div className="region-html-editor">
    <div className="region-editor-toolbar" role="group" aria-label="Mise en forme de la description">
      {button("Paragraphe", () => editor.chain().focus().setParagraph().run(), editor.isActive("paragraph"))}
      {button("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
      {button("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
      {button("Gras", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
      {button("Italique", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
      {button("Saut de ligne", () => editor.chain().focus().setHardBreak().run())}
      {button("Puces", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
      {button("Liste numérotée", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
      {button("Citation", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
      {button("Lien", () => { setHref(editor.getAttributes("link").href || ""); setLinkError(""); setLinkOpen(true); }, editor.isActive("link"))}
      {button("Supprimer le lien", () => editor.chain().focus().extendMarkRange("link").unsetLink().run(), false, !editor.isActive("link"))}
      {button("Annuler", () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
      {button("Rétablir", () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
      {button("Effacer le formatage", () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
      <button type="button" disabled={disabled} aria-pressed={source} onClick={() => { if (source) { const html = cleanRegionHtml(value); editor.commands.setContent(html); onChange(editor.isEmpty ? "" : cleanRegionHtml(editor.getHTML())); } setSource(!source); setLinkOpen(false); }}>{source ? "Éditeur visuel" : "HTML source"}</button>
    </div>
    {linkOpen && !source && <div className="region-editor-link" role="group" aria-label="Modifier le lien">
      <label htmlFor="region-link">Adresse du lien</label>
      <input id="region-link" autoFocus value={href} disabled={disabled} onChange={(event) => setHref(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyLink(); } if (event.key === "Escape") setLinkOpen(false); }} placeholder="https://… ou /stations/…" />
      <button type="button" disabled={disabled} onClick={applyLink}>Appliquer le lien</button><button type="button" onClick={() => { setLinkOpen(false); editor.commands.focus(); }}>Fermer</button>
      {linkError && <p role="alert">{linkError}</p>}
    </div>}
    {source ? <label className="region-editor-source">HTML de la description<textarea aria-label="HTML de la description" rows={16} spellCheck={false} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /><small>Le HTML est nettoyé à la sauvegarde et au retour à l’éditeur visuel. Les liens internes sont convertis en URL HTTPS absolues.</small></label> : <EditorContent editor={editor} />}
  </div>;
}
