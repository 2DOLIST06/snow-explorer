// src/pages/index.tsx
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  getResortsApiUrl,
  getLatestAddedResorts,
  getSafeApiUrlForLogs,
  getServerResortsApiUrls,
  getValidActiveResorts,
  parseResortsPayload,
  type Resort,
} from "@/lib/api/resorts";

type HomeProps = {
  initialResorts: Resort[];
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Snow Explorer",
  url: "https://www.snow-explorer.com/",
  inLanguage: "fr-FR",
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Snow Explorer",
  url: "https://www.snow-explorer.com/",
  logo: "https://www.snow-explorer.com/logo.png",
};

const Home: NextPage<HomeProps> = ({ initialResorts }) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Resort[]>([]);
  const [allResorts, setAllResorts] = useState<Resort[]>(initialResorts);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number>(-1);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const heroSlides = useMemo(
    () => [
      "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg",
      "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg",
      "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg",
    ],
    [],
  );

  const fetchUrl = useMemo(() => {
    return getResortsApiUrl({ query });
  }, [query]);

  useEffect(() => {
    let cancel = false;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const response = await fetch(fetchUrl);

        if (!response.ok) {
          throw new Error("Impossible de récupérer les stations");
        }

        const activeOnly = getValidActiveResorts(
          parseResortsPayload(await response.json()),
        );

        if (!cancel) {
          setItems(activeOnly);
        }
      } catch (error) {
        console.error("Échec de la recherche de stations:", error);
        if (!cancel) {
          setItems([]);
        }
      } finally {
        if (!cancel) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancel = true;
      clearTimeout(timeout);
    };
  }, [fetchUrl]);

  useEffect(() => {
    let cancel = false;

    async function loadAllResorts() {
      try {
        const response = await fetch(getResortsApiUrl());

        if (!response.ok) {
          throw new Error("Impossible de récupérer les stations");
        }

        const activeOnly = getValidActiveResorts(
          parseResortsPayload(await response.json()),
        );

        if (!cancel) {
          setAllResorts(activeOnly);
        }
      } catch (error) {
        console.error("Échec du rafraîchissement des stations:", error);
      }
    }

    loadAllResorts();

    return () => {
      cancel = true;
    };
  }, []);

  const featuredResorts = useMemo(() => {
    const source = allResorts.length > 0 ? allResorts : items;

    return getLatestAddedResorts(source);
  }, [allResorts, items]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!boxRef.current) {
        return;
      }

      if (!boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (
      !open &&
      (event.key === "ArrowDown" || event.key === "Enter")
    ) {
      setOpen(true);
      return;
    }

    if (!open) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setCursor((currentCursor) =>
        Math.min(currentCursor + 1, items.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      setCursor((currentCursor) =>
        Math.max(currentCursor - 1, 0),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();

      const picked = items[cursor] || items[0];

      if (picked) {
        handlePick(picked);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setCursor(-1);
    }
  }

  function handlePick(resort: Resort) {
    setQuery(resort.name);
    setOpen(false);
    setCursor(-1);

    router.push(`/stations/${resort.slug}`);
  }

  const contentSectionStyle: React.CSSProperties = {
    marginTop: 32,
    padding: "32px clamp(20px, 4vw, 44px)",
    borderRadius: 24,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #cbd5e1",
    boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  };

  const h2Style: React.CSSProperties = {
    margin: 0,
    fontSize: "clamp(1.65rem, 3vw, 2.2rem)",
    lineHeight: 1.2,
    fontWeight: 900,
    color: "#0f172a",
  };

  const h3Style: React.CSSProperties = {
    margin: "26px 0 0",
    fontSize: "clamp(1.25rem, 2.3vw, 1.55rem)",
    lineHeight: 1.3,
    fontWeight: 800,
    color: "#0f172a",
  };

  const paragraphStyle: React.CSSProperties = {
    margin: "16px 0 0",
    fontSize: 17,
    lineHeight: 1.75,
    color: "#334155",
  };

  return (
    <>
      <Head>
        <title>
          Guide des stations de ski en France | Snow Explorer
        </title>

        <meta
          name="description"
          content="Découvrez et comparez les stations de ski en France selon leur domaine skiable, leur altitude, leurs pistes, la météo, la neige et les webcams."
        />
        <link rel="canonical" href="https://www.snow-explorer.com/" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="Snow Explorer" />
        <meta property="og:title" content="Guide des stations de ski en France | Snow Explorer" />
        <meta property="og:description" content="Découvrez et comparez les stations de ski en France selon leur domaine skiable, leur altitude, leurs pistes, la météo, la neige et les webcams." />
        <meta property="og:url" content="https://www.snow-explorer.com/" />
        <meta property="og:image" content="https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg" />
        <meta property="og:image:alt" content="Station de ski en France entourée de montagnes enneigées" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Guide des stations de ski en France | Snow Explorer" />
        <meta name="twitter:description" content="Découvrez et comparez les stations de ski en France selon leur domaine skiable, leur altitude, leurs pistes, la météo, la neige et les webcams." />
        <meta name="twitter:image" content="https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #dbeafe 0%, #f8fafc 34%, #e2e8f0 100%)",
          color: "#0f172a",
        }}
      >
        <section
          style={{
            width: "100%",
            minHeight: 560,
            position: "relative",
          }}
        >
          <Image
            src={heroSlides[0]}
            alt="Station de ski en France entourée de montagnes enneigées"
            fill
            priority
            sizes="100vw"
            style={{
              objectFit: "cover",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.62) 0%, rgba(2,6,23,0.25) 45%, rgba(2,6,23,0.72) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 3,
              maxWidth: 1240,
              margin: "0 auto",
              padding: "110px 24px 80px",
              color: "white",
            }}
          >
            <h1
              style={{
                margin: 0,
                maxWidth: 950,
                fontSize: "clamp(2.3rem, 6vw, 4.2rem)",
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              Guide des stations de ski en France
            </h1>

            <p
              style={{
                marginTop: 18,
                maxWidth: 850,
                fontSize: 20,
                lineHeight: 1.6,
                opacity: 0.96,
              }}
            >
              Snow Explorer vous aide à découvrir les stations de ski
              en France et à choisir celle qui correspond le mieux à
              votre séjour. Consultez les principales informations de
              chaque station, comparez les domaines skiables et
              vérifiez les conditions avant de partir.
            </p>

            <div
              ref={boxRef}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 880,
                marginTop: 28,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                aria-label="Rechercher une station de ski"
                placeholder="Rechercher une station : Auron, Chamonix, Val Thorens..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                  setCursor(-1);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                style={{
                  width: "100%",
                  padding: "20px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.62)",
                  background: "rgba(255,255,255,0.96)",
                  fontSize: 19,
                  outline: "none",
                  boxShadow: "0 12px 28px rgba(2,6,23,0.2)",
                }}
              />

              {open && (
                <div
                  role="listbox"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    marginTop: 8,
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#ffffff",
                    maxHeight: 320,
                    overflowY: "auto",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                  }}
                >
                  {loading && (
                    <div
                      style={{
                        padding: 12,
                        color: "#666666",
                      }}
                    >
                      Chargement…
                    </div>
                  )}

                  {!loading && items.length === 0 && (
                    <div
                      style={{
                        padding: 12,
                        color: "#666666",
                      }}
                    >
                      Aucun résultat
                    </div>
                  )}

                  {!loading &&
                    items.map((resort, index) => (
                      <div
                        key={resort.id}
                        role="option"
                        aria-selected={cursor === index}
                        onMouseDown={(event) =>
                          event.preventDefault()
                        }
                        onClick={() => handlePick(resort)}
                        onMouseEnter={() => setCursor(index)}
                        style={{
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          cursor: "pointer",
                          background:
                            cursor === index
                              ? "#f3f4f6"
                              : "#ffffff",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {resort.name}
                        </div>

                        <div
                          style={{
                            color: "#6b7280",
                          }}
                        >
                          {resort.region?.name || ""}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div
          style={{
            maxWidth: 1320,
            margin: "26px auto 0",
            padding: "0 24px 64px",
          }}
        >
          <section>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "end",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 34,
                  fontWeight: 900,
                }}
              >
                Top stations du moment
              </h2>

              <span
                style={{
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                Faites glisser le diaporama →
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                overflowX: "auto",
                paddingBottom: 6,
                scrollSnapType: "x mandatory",
              }}
            >
              {featuredResorts.map((resort) => {
                const logoUrl = resort.logo_url || resort.logoUrl;

                return (
                  <Link
                    key={resort.id}
                    href={`/stations/${resort.slug}`}
                    style={{
                      minWidth: 320,
                      maxWidth: 340,
                      width: "100%",
                      border: "none",
                      borderRadius: 18,
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                      boxShadow: "0 10px 24px rgba(2,6,23,0.16)",
                      position: "relative",
                      scrollSnapAlign: "start",
                    }}
                  >
                    <div
                      style={{
                        minHeight: 230,
                        display: "flex",
                        flexDirection: "column",
                        background: "white",
                      }}
                    >
                      <div
                        style={{
                          minHeight: 168,
                          padding: 22,
                          display: "grid",
                          placeItems: "center",
                          background: "#ffffff",
                        }}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`Logo ${resort.name} - Snow Explorer`}
                            style={{
                              display: "block",
                              width: "100%",
                              height: 124,
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            style={{
                              fontSize: 42,
                              fontWeight: 900,
                              color: "#0f3760",
                            }}
                          >
                            {resort.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          padding: "14px 16px 16px",
                          background: "#0f3760",
                          color: "white",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 24,
                          }}
                        >
                          {resort.name}
                        </div>

                        <div
                          style={{
                            opacity: 0.92,
                          }}
                        >
                          {resort.region?.name || "Région à définir"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "Expériences neige",
                text: "Ski alpin, raquettes, snowboard, spa et soirées en altitude.",
              },
              {
                title: "Préparer son séjour",
                text: "Hébergements, transports, location de matériel et informations utiles avant le départ.",
              },
              {
                title: "Actualités des stations",
                text: "Neige fraîche, ouvertures des domaines et conditions dans les stations.",
              },
              {
                title: "Webcams et météo",
                text: "Consultez les images disponibles et les tendances météo de chaque station.",
              },
            ].map((card) => (
              <article
                key={card.title}
                style={{
                  borderRadius: 18,
                  background: "#ffffffcc",
                  border: "1px solid #cbd5e1",
                  padding: "18px 16px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 22,
                  }}
                >
                  {card.title}
                </h3>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#475569",
                    lineHeight: 1.55,
                  }}
                >
                  {card.text}
                </p>
              </article>
            ))}
          </section>

          <div
            style={{
              maxWidth: 1040,
              margin: "0 auto",
            }}
          >
            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Trouvez une station de ski adaptée à votre séjour
              </h2>

              <p style={paragraphStyle}>
                Toutes les stations de ski ne proposent pas la même
                expérience. Certaines disposent d’un grand domaine
                skiable avec de nombreuses pistes, tandis que
                d’autres offrent une ambiance plus familiale et un
                accès plus simple pour les débutants.
              </p>

              <p style={paragraphStyle}>
                Snow Explorer rassemble les informations utiles pour
                vous aider à trouver une station de ski en France
                selon vos critères. Vous pouvez notamment consulter
                l’altitude de la station, la taille du domaine, le
                nombre de pistes, les remontées mécaniques et les
                niveaux de difficulté.
              </p>

              <p style={paragraphStyle}>
                Ces informations permettent de mieux comprendre les
                différences entre les stations de ski françaises
                avant de choisir votre prochaine destination. Que
                vous recherchiez une grande station de ski dans les
                Alpes, une station familiale dans les Pyrénées ou un
                domaine plus calme dans un autre massif français,
                vous disposez d’informations simples pour préparer
                votre séjour à la montagne.
              </p>
            </section>

            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Comparez les stations de ski françaises
              </h2>

              <p style={paragraphStyle}>
                Comparer plusieurs stations de ski permet de trouver
                plus facilement celle qui correspond à vos attentes.
                Une station avec beaucoup de pistes rouges et noires
                conviendra davantage aux skieurs expérimentés, alors
                qu’un domaine avec plusieurs espaces pour débutants
                sera plus adapté à une famille ou à une première
                semaine au ski.
              </p>

              <p style={paragraphStyle}>
                Les fiches de Snow Explorer présentent les
                caractéristiques principales de chaque domaine
                skiable :
              </p>

              <ul
                style={{
                  margin: "18px 0 0",
                  paddingLeft: 24,
                  display: "grid",
                  gap: 10,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: "#334155",
                }}
              >
                <li>l’altitude de la station ;</li>
                <li>le dénivelé ;</li>
                <li>le nombre et la longueur des pistes ;</li>
                <li>
                  la répartition entre pistes vertes, bleues, rouges
                  et noires ;
                </li>
                <li>le nombre de remontées mécaniques ;</li>
                <li>les périodes habituelles d’ouverture ;</li>
                <li>la météo et les conditions de neige ;</li>
                <li>les snowparks proposés ;</li>
                <li>les webcams disponibles.</li>
              </ul>

              <p style={paragraphStyle}>
                Vous pouvez ainsi comparer les stations de ski en
                France à partir de critères concrets, sans devoir
                rechercher les informations sur plusieurs sites
                différents.
              </p>
            </section>

            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Découvrez les domaines skiables en France
              </h2>

              <p style={paragraphStyle}>
                La France compte des stations de ski réparties dans
                plusieurs massifs. Chaque région possède ses propres
                paysages, son altitude et son type de domaine
                skiable.
              </p>

              <p style={paragraphStyle}>
                Les Alpes regroupent de nombreuses stations de haute
                altitude et certains des plus grands domaines
                skiables français. Les Pyrénées proposent également
                un large choix de stations, avec des domaines adaptés
                aux familles comme aux skieurs confirmés.
              </p>

              <p style={paragraphStyle}>
                Le Jura, les Vosges et le Massif central possèdent
                des stations généralement plus petites, souvent
                appréciées pour leur accessibilité et leur ambiance
                plus calme. Chaque massif permet donc de vivre un
                séjour différent selon la destination choisie.
              </p>

              <p style={paragraphStyle}>
                Snow Explorer vous permet d’explorer les stations de
                ski françaises par région et de consulter les
                informations principales de chaque domaine.
              </p>
            </section>

            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Choisissez votre station selon votre niveau
              </h2>

              <p style={paragraphStyle}>
                Le choix d’une station de ski dépend aussi de votre
                niveau, de celui des autres participants et du type
                de séjour recherché.
              </p>

              <h3 style={h3Style}>
                Une station de ski pour débutants
              </h3>

              <p style={paragraphStyle}>
                Pour apprendre à skier dans de bonnes conditions, il
                est préférable de choisir une station avec des pistes
                vertes et bleues, des espaces d’apprentissage et des
                remontées faciles d’accès.
              </p>

              <p style={paragraphStyle}>
                La taille du domaine n’est pas toujours le critère le
                plus important. Une station plus petite peut être
                mieux adaptée à un débutant qu’un très grand domaine
                difficile à parcourir.
              </p>

              <h3 style={h3Style}>
                Une station pour skier en famille
              </h3>

              <p style={paragraphStyle}>
                Une station de ski familiale doit proposer des pistes
                adaptées à plusieurs niveaux. Les enfants et les
                débutants doivent pouvoir évoluer sur des secteurs
                accessibles, pendant que les skieurs plus
                expérimentés profitent du reste du domaine.
              </p>

              <p style={paragraphStyle}>
                L’organisation de la station, l’accès aux pistes et
                la diversité des activités peuvent également avoir
                leur importance lors d’un séjour en famille.
              </p>

              <h3 style={h3Style}>
                Un domaine skiable pour les skieurs confirmés
              </h3>

              <p style={paragraphStyle}>
                Les skieurs expérimentés recherchent généralement des
                pistes rouges et noires, un dénivelé important et un
                domaine suffisamment étendu. La présence d’un
                snowpark peut également intéresser les amateurs de
                freestyle, tandis que certains skieurs privilégient
                les stations proposant de grands secteurs adaptés au
                freeride.
              </p>

              <p style={paragraphStyle}>
                Les informations présentes sur chaque fiche
                permettent de vérifier rapidement si une station
                correspond à ce type de pratique.
              </p>
            </section>

            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Consultez la météo et les conditions de neige
              </h2>

              <p style={paragraphStyle}>
                La météo peut changer rapidement en montagne. Avant
                de rejoindre une station de ski, il est utile de
                consulter les prévisions, les températures et les
                conditions d’enneigement.
              </p>

              <p style={paragraphStyle}>
                Snow Explorer regroupe ces informations sur les
                fiches des stations. Les webcams permettent également
                d’observer directement les conditions visibles sur
                place.
              </p>

              <p style={paragraphStyle}>
                Ces données peuvent vous aider à mieux préparer votre
                journée ou votre séjour. Elles restent toutefois
                indicatives et doivent être complétées par les
                informations officielles diffusées par la station,
                notamment pour l’ouverture des pistes et des
                remontées mécaniques.
              </p>
            </section>

            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Découvrez les principales stations de ski en France
              </h2>

              <p style={paragraphStyle}>
                Snow Explorer référence des stations situées dans les
                différents massifs français. Vous pouvez découvrir
                leurs caractéristiques, consulter leur domaine
                skiable et comparer les informations qui vous
                intéressent.
              </p>

              <p style={paragraphStyle}>
                Chaque fiche présente les données essentielles pour
                comprendre la configuration de la station et
                préparer votre visite. Vous pouvez ainsi rechercher
                une station selon sa localisation, son altitude, la
                taille de son domaine ou le niveau de ses pistes.
              </p>

              <p style={paragraphStyle}>
                L’objectif est de vous permettre de trouver plus
                facilement une station de ski en France sans
                multiplier les recherches.
              </p>
            </section>

            <section style={contentSectionStyle}>
              <h2 style={h2Style}>
                Préparez votre prochain séjour au ski
              </h2>

              <p style={paragraphStyle}>
                Le choix de la station influence directement le
                déroulement du séjour. Avant de réserver, il est
                utile de vérifier que le domaine skiable correspond
                au niveau des participants, que les pistes sont
                suffisamment variées et que les conditions
                habituelles conviennent à la période choisie.
              </p>

              <p style={paragraphStyle}>
                Snow Explorer vous aide à parcourir les stations de
                ski en France, à comparer leurs principales
                caractéristiques et à trouver une destination adaptée
                à votre projet.
              </p>

              <p style={paragraphStyle}>
                Commencez votre recherche et découvrez les stations
                de ski françaises qui correspondent le mieux à votre
                prochain séjour à la montagne.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;

const BUILD_FETCH_ATTEMPTS = 4;
const RETRYABLE_BUILD_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function sanitizeBuildError(error: unknown, url: string, safeUrl: string): Error {
  const source = error instanceof Error ? error : new Error(String(error));
  const sanitized = new Error(source.message.split(url).join(safeUrl));
  sanitized.name = source.name;
  sanitized.stack = source.stack?.split(url).join(safeUrl);
  return sanitized;
}

async function fetchResortsDuringBuild(url: string): Promise<Response> {
  const safeUrl = getSafeApiUrlForLogs(url);

  for (let attempt = 1; attempt <= BUILD_FETCH_ATTEMPTS; attempt += 1) {
    try {
      console.info(
        `[homepage:getStaticProps] GET ${safeUrl} attempt=${attempt}/${BUILD_FETCH_ATTEMPTS}`,
      );
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      const contentType = response.headers.get("content-type") || "unknown";
      console.info(
        `[homepage:getStaticProps] attempt=${attempt} status=${response.status} content-type=${contentType}`,
      );

      // A suspended hosting service is a permanent configuration failure, not a
      // transient 503. Return immediately so getStaticProps can try the next
      // configured API origin instead of retrying the same suspended service.
      if (response.status === 503 && contentType.toLowerCase().includes("text/html")) {
        const body = await response.clone().text();
        if (/service\s+suspended/i.test(body)) {
          console.error(
            `[homepage:getStaticProps] ${safeUrl} reports a suspended service; trying the next configured API origin`,
          );
          return response;
        }
      }

      if (response.ok || !RETRYABLE_BUILD_STATUSES.has(response.status)) {
        return response;
      }

      if (attempt === BUILD_FETCH_ATTEMPTS) {
        return response;
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1_000, 10_000)
        : 1_000 * 2 ** (attempt - 1);
      console.warn(
        `[homepage:getStaticProps] transient HTTP ${response.status}; retrying in ${delayMs}ms`,
      );
      await wait(delayMs);
    } catch (error) {
      const sanitizedError = sanitizeBuildError(error, url, safeUrl);
      console.error(
        `[homepage:getStaticProps] attempt=${attempt} request error:`,
        sanitizedError,
      );
      if (attempt === BUILD_FETCH_ATTEMPTS) {
        throw sanitizedError;
      }
      await wait(1_000 * 2 ** (attempt - 1));
    }
  }

  throw new Error("Unreachable build-time resort fetch state");
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const urls = getServerResortsApiUrls();
  const failures: string[] = [];

  try {
    for (const url of urls) {
      const safeUrl = getSafeApiUrlForLogs(url);
      const response = await fetchResortsDuringBuild(url);
      const contentType = response.headers.get("content-type") || "unknown";

      if (!response.ok) {
        const responseBody = (await response.text()).replace(/\s+/g, " ").slice(0, 500);
        const failure =
          `GET ${safeUrl} failed with HTTP ${response.status}` +
          (responseBody ? `; response=${responseBody}` : "");
        failures.push(failure);
        console.error(`[homepage:getStaticProps] ${failure}`);
        continue;
      }
      if (!contentType.toLowerCase().includes("application/json")) {
        const failure = `GET ${safeUrl} returned an unexpected content-type: ${contentType}`;
        failures.push(failure);
        console.error(`[homepage:getStaticProps] ${failure}`);
        continue;
      }

      const resorts = parseResortsPayload(await response.json());
      const activeResorts = getValidActiveResorts(resorts);
      const initialResorts = getLatestAddedResorts(activeResorts);
      console.info(
        `[homepage:getStaticProps] received=${resorts.length} valid-active=${activeResorts.length} rendered=${initialResorts.length}`,
      );

      return { props: { initialResorts }, revalidate: 3600 };
    }

    throw new Error(`All configured resort API origins failed:\n${failures.join("\n")}`);
  } catch (error) {
    console.error("[homepage:getStaticProps] Resort preload failed:", error);
    throw error;
  }
};
