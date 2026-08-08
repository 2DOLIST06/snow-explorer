import Head from "next/head";
import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  title: string;
  pageTitle: string;
  description: string;
  canonicalPath: `/${string}`;
  children: ReactNode;
};

const SITE_URL = "https://www.snow-explorer.com";

export default function LegalPageLayout({ title, pageTitle, description, canonicalPath, children }: LegalPageLayoutProps) {
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />
      </Head>
      <main className="legal-page">
        <article className="legal-page__content">
          <header className="legal-page__header">
            <p className="eyebrow">Informations légales</p>
            <h1>{title}</h1>
            <p className="legal-page__updated">Dernière mise à jour : 8 août 2026</p>
          </header>
          <div className="legal-page__body">{children}</div>
        </article>
      </main>
    </>
  );
}
