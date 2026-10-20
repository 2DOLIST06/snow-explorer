import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { cleanActivityHtml } from "@/lib/activities";
import ActivityImageInput from "./ActivityImageInput";
const Image = Node.create({ name: "activityImage", group: "block", atom: true,
  addAttributes: () => ({ src: { default: "" }, alt: { default: "" } }),
  parseHTML: () => [{ tag: "img[src]" }], renderHTML: ({ HTMLAttributes }) => ["img", HTMLAttributes],
});
const ActivityLink = Link.extend({ addAttributes() { return { ...this.parent?.(), class: { default: null } }; } });
export default function ActivityRichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [href, setHref] = useState(""); const [asButton, setAsButton] = useState(false);
  const [src, setSrc] = useState(""); const [alt, setAlt] = useState(""); const [error, setError] = useState("");
  const editor = useEditor({ immediatelyRender: false,
    extensions: [Image, StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false }), ActivityLink.configure({ openOnClick: false, autolink: false })],
    content: cleanActivityHtml(value), editorProps: { attributes: { class: "region-rich-text", "aria-label": "Contenu enrichi de l’activité" } },
    onUpdate: ({ editor: current }) => onChange(cleanActivityHtml(current.getHTML())),
  });
  useEffect(() => { if (editor && cleanActivityHtml(editor.getHTML()) !== cleanActivityHtml(value)) editor.commands.setContent(cleanActivityHtml(value), false); }, [editor, value]);
  if (!editor) return <p>Chargement de l’éditeur…</p>;
  const validUrl = (url: string) => { try { const parsed = new URL(url); if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw Error(); setError(""); return true; } catch { setError("Saisissez une URL absolue HTTPS."); return false; } };
  return <div className="region-html-editor">
    <div className="region-editor-toolbar">
      <button type="button" onClick={() => editor.chain().focus().setParagraph().run()}>Paragraphe</button>
      {([2, 3, 4] as const).map(level => <button key={level} type="button" onClick={() => editor.chain().focus().toggleHeading({ level }).run()}>H{level}</button>)}
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>Gras</button><button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>Italique</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>Liste</button><button type="button" onClick={() => editor.chain().focus().undo().run()}>Annuler</button>
      <button type="button" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>Retirer le lien</button>
    </div>
    <EditorContent editor={editor} />
    <details><summary>Insérer un lien ou bouton</summary><label>URL du lien<input value={href} onChange={e => setHref(e.target.value)} /></label><label><input type="checkbox" checked={asButton} onChange={e => setAsButton(e.target.checked)} />Présenter comme un bouton</label>
      <button type="button" onClick={() => { if (!validUrl(href)) return; if (editor.state.selection.empty) editor.chain().focus().insertContent({ type: "text", text: asButton ? "Découvrir l’activité" : href, marks: [{ type: "link", attrs: { href, target: "_blank", class: asButton ? "activity-button" : null } }] }).run(); else editor.chain().focus().setLink({ href, target: "_blank" }).updateAttributes("link", { class: asButton ? "activity-button" : null }).run(); }}>Insérer / appliquer au texte sélectionné</button>
    </details>
    <details><summary>Insérer une image</summary><ActivityImageInput value={src} onChange={setSrc} /><label>Texte alternatif<input value={alt} onChange={e => setAlt(e.target.value)} /></label><button type="button" onClick={() => { if (validUrl(src)) editor.chain().focus().insertContent({ type: "activityImage", attrs: { src, alt } }).run(); }}>Insérer l’image</button></details>
    {error && <p role="alert">{error}</p>}
  </div>;
}
