import Head from "next/head";
import { BedDouble, ExternalLink, Mail, Map, MountainSnow } from "lucide-react";

const contactTopics = [
  {
    icon: BedDouble,
    title: "Hébergements",
    description: "Des pistes pour trouver un hébergement adapté à vos envies, à votre budget et à la composition de votre groupe.",
  },
  {
    icon: MountainSnow,
    title: "Domaines skiables",
    description: "Des conseils pour choisir une station ou un domaine skiable en fonction de votre niveau et de votre façon de profiter de la montagne.",
  },
  {
    icon: Map,
    title: "Activités & bonnes adresses",
    description: "Une sélection de liens utiles, d’activités et de bonnes adresses pour préparer chaque étape de votre séjour.",
  },
];

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>Contact | Snow Explorer</title>
        <meta name="description" content="Contactez Snow Explorer pour être conseillé dans la préparation de votre prochain séjour au ski." />
        <link rel="canonical" href="https://www.snow-explorer.com/contact" />
      </Head>

      <main className="contact-page">
        <section className="contact-hero">
          <div className="contact-hero__intro">
            <p className="eyebrow">Parlons de votre séjour</p>
            <h1>Un projet de séjour à la montagne&nbsp;?</h1>
            <p>
              N’hésitez pas à nous contacter si vous souhaitez préparer un séjour dans une station de ski. Nous pouvons vous orienter vers les hébergements, les activités et les domaines skiables qui correspondent à votre projet.
            </p>
          </div>

          <aside className="contact-card" aria-label="Coordonnées de contact">
            <span className="contact-card__icon"><Mail aria-hidden="true" /></span>
            <p className="eyebrow">Nous écrire</p>
            <h2>Parlez-nous de vos envies</h2>
            <p>Indiquez-nous vos dates, le nombre de voyageurs et ce que vous recherchez. Nous vous répondrons par e-mail.</p>
            <a className="contact-card__email" href="mailto:support@2dolist.fr">
              support@todolist.fr
              <ExternalLink size={18} aria-hidden="true" />
            </a>
          </aside>
        </section>

        <section className="contact-help" aria-labelledby="contact-help-title">
          <div className="contact-help__heading">
            <p className="eyebrow">Comment nous pouvons vous aider</p>
            <h2 id="contact-help-title">Les repères utiles pour construire votre séjour</h2>
            <p>
              Nous pouvons vous transmettre une sélection de bonnes adresses et de liens pour vous aider à organiser votre séjour de bout en bout, puis effectuer vos réservations directement auprès des professionnels concernés.
            </p>
          </div>

          <div className="contact-topics">
            {contactTopics.map(({ icon: Icon, title, description }) => (
              <article key={title} className="contact-topic">
                <span><Icon aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
