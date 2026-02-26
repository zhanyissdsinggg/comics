"use client";

import { useTranslations } from 'next-intl';

export default function SiteFooter() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer className="mt-12 hidden border-t border-neutral-900 bg-neutral-950/90 text-neutral-400 md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <a href="/events" className="hover:text-white">
            {tNav('events')}
          </a>
          <a href="/faq" className="hover:text-white">
            {tNav('faq')}
          </a>
          <a href="/support" className="hover:text-white">
            {tNav('support')}
          </a>
          <span className="text-neutral-700">|</span>
          <a href="/privacy-policy" className="hover:text-white">
            {t('privacyPolicy')}
          </a>
          <a href="/terms-of-service" className="hover:text-white">
            {t('termsOfService')}
          </a>
        </div>
        <div className="text-[11px] text-neutral-500">
          {t('copyright')}
        </div>
      </div>
    </footer>
  );
}
