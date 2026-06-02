"use client";

import Link from "next/link";
import EditorialHero from "./EditorialHero";
import SurfacePanel from "./SurfacePanel";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";

function toSectionId(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ActionLink({ item, className }) {
  if (!item?.label || !item?.href) {
    return null;
  }

  if (item.external) {
    return (
      <a href={item.href} className={className}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

function LegalSectionCard({ section, index }) {
  const sectionId = toSectionId(section?.title || `section-${index + 1}`);

  return (
    <SurfacePanel
      id={sectionId}
      appearance="dark"
      accent={index % 3 === 0 ? "cyan" : index % 3 === 1 ? "rose" : "amber"}
      className="scroll-mt-24"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/46">
            Section {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-3 font-display text-[1.8rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
            {section.title}
          </h2>
        </div>

        <span className={`${storefrontBadgeClass} text-white/62`}>
          Legal
        </span>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-[1.74] text-white/72">
        {Array.isArray(section?.paragraphs)
          ? section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))
          : null}

        {Array.isArray(section?.bullets) && section.bullets.length > 0 ? (
          <ul className="grid gap-2.5">
            {section.bullets.map((item) => (
              <li
                key={item}
                className={`${storefrontInfoCardClass} rounded-[20px] px-4 py-3`}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {section?.children}
      </div>
    </SurfacePanel>
  );
}

export default function LegalEditorialLayout({
  eyebrow,
  title,
  description,
  heroStats = [],
  heroActions = null,
  sideDesk,
  overviewTitle,
  overviewDescription,
  overviewCards = [],
  quickLinks = [],
  sections = [],
  contactTitle,
  contactDescription = "",
  contactCard = null,
}) {
  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(103,232,249,0.12)]">
      <div className="flex flex-col gap-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow={eyebrow}
            title={title}
            description={description}
            actions={heroActions}
            stats={heroStats}
          />

          <StorefrontDesk
            eyebrow={sideDesk?.eyebrow}
            title={sideDesk?.title}
            description={sideDesk?.description}
            actions={
              sideDesk?.actions ? (
                <ul className="grid gap-2.5">
                  {sideDesk.actions.map((item) => (
                    <li key={`${item.label}-${item.href}`}>
                      <ActionLink
                        item={item}
                        className={
                          item.primary
                            ? storefrontPrimaryButtonClass
                            : storefrontSecondaryButtonClass
                        }
                      />
                      {item.note ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/45">
                          {item.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <SurfacePanel appearance="dark" accent="cyan" className="space-y-5">
            <StorefrontSectionHeading
              eyebrow="Quick read"
              title={overviewTitle}
              description={overviewDescription}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {overviewCards.map((item) => (
                <div
                  key={item.label}
                  className={`${storefrontInfoCardClass} px-4 py-4`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/46">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm leading-[1.68] text-white/78">
                    {item.value}
                  </p>
                  {item.hint ? (
                    <p className="mt-2 text-xs leading-5 text-white/54">
                      {item.hint}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="dark" accent="rose" className="space-y-5">
            <StorefrontSectionHeading
              eyebrow="Jump links"
              title="Skip to the section you need"
              description="Most readers do not need the whole document. These links get you to the right lane faster."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {quickLinks.map((item) => (
                <a
                  key={item.title}
                  href={`#${toSectionId(item.title)}`}
                  className={`${storefrontInfoCardClass} px-4 py-4 transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.075)]`}
                >
                  <p className="text-sm font-semibold tracking-[-0.02em] text-white">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-[1.64] text-white/62">
                      {item.description}
                    </p>
                  ) : null}
                </a>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {sections.map((section, index) => (
            <LegalSectionCard
              key={section.title}
              section={section}
              index={index}
            />
          ))}

          {contactTitle ? (
            <SurfacePanel
              appearance="dark"
              accent="cyan"
              className="space-y-5 xl:col-span-2"
              id={toSectionId(contactTitle)}
            >
              <StorefrontSectionHeading
                eyebrow="Direct contact"
                title={contactTitle}
                description={contactDescription}
              />
              {contactCard}
            </SurfacePanel>
          ) : null}
        </section>
      </div>
    </StorefrontPage>
  );
}
