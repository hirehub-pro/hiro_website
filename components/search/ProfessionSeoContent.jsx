import Link from 'next/link';
import { useState } from 'react';
import {
  HiCheckCircle,
  HiChevronDown,
  HiChevronRight,
  HiLocationMarker,
  HiOutlineCheck,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi';
import { getProfessionPageContent } from '../../lib/profession-page-content';
import { localizePath } from '../../lib/seo-locale';

export function ProfessionHero({ profession, locale = 'he' }) {
  const content = getProfessionPageContent(profession, locale);

  return (
    <section className="mb-7 border-b border-slate-200/80 pb-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-400">
        <Link href="/" className="transition hover:text-primary">{content.breadcrumbHome}</Link>
        <HiChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <Link href={localizePath('/search', locale)} className="transition hover:text-primary">
          {content.breadcrumbSearch}
        </Link>
        <HiChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="font-semibold text-slate-600">{content.name}</span>
      </nav>

      <div className="flex items-start gap-4">
        <div
          className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black"
          style={{ backgroundColor: `${profession.color || '#1976D2'}16`, color: profession.color || '#1976D2' }}
          aria-hidden="true"
        >
          {content.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-3xl">
            {content.h1}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
            {content.intro}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
        {content.trust.map((label) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <HiOutlineCheck className="h-4 w-4 text-emerald-500" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ProfessionSeoSections({ profession, locale = 'he', relatedProfessions = [] }) {
  const content = getProfessionPageContent(profession, locale);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const hasMoreServices = content.services.length > 4;
  const hasMoreQuestions = content.questions.length > 4;

  return (
    <div className="mt-12 border-t border-slate-200/80 pt-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
        <section aria-labelledby="profession-services">
          <h2 id="profession-services" className="text-xl font-extrabold tracking-tight text-slate-950">
            {content.servicesTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{content.servicesIntro}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {content.services.map((service, index) => (
            <div
              key={service}
              className={`${!showAllServices && index >= 4 ? 'hidden' : 'flex'} items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700`}
            >
              <HiCheckCircle className="h-4.5 w-4.5 shrink-0 text-primary" />
              {service}
            </div>
          ))}
          </div>
          {hasMoreServices ? (
            <button
              type="button"
              onClick={() => setShowAllServices((current) => !current)}
              aria-expanded={showAllServices}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-primary transition hover:bg-primary-50"
            >
              {showAllServices ? content.showLess : content.showMore}
              <HiChevronDown className={`h-4 w-4 transition-transform ${showAllServices ? 'rotate-180' : ''}`} />
            </button>
          ) : null}
        </section>

        <section aria-labelledby="choose-professional">
          <h2 id="choose-professional" className="text-xl font-extrabold tracking-tight text-slate-950">
            {content.howTitle}
          </h2>
          <ol className="mt-4 divide-y divide-slate-200/80">
          {content.how.map(([title, description], index) => (
            <li key={title} className="flex gap-3 py-4 first:pt-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-extrabold text-primary">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            </li>
          ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="profession-questions" className="mt-10 rounded-2xl bg-slate-100/70 px-4 py-2 sm:px-5">
        <h2 id="profession-questions" className="flex items-center gap-2 border-b border-slate-200 py-4 text-lg font-extrabold tracking-tight text-slate-950">
          <HiOutlineQuestionMarkCircle className="h-5 w-5 text-primary" />
          {content.questionsTitle}
        </h2>
        <div className="divide-y divide-slate-200">
          {content.questions.map(([question, answer], index) => (
            <details key={question} hidden={!showAllQuestions && index >= 4} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-slate-900">
                {question}
                <span className="text-slate-400 transition group-open:rotate-90 group-open:text-primary">
                  <HiChevronRight className="h-4 w-4 rtl:rotate-180" />
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
        {hasMoreQuestions ? (
          <button
            type="button"
            onClick={() => setShowAllQuestions((current) => !current)}
            aria-expanded={showAllQuestions}
            className="mx-auto my-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-primary transition hover:bg-white/70"
          >
            {showAllQuestions ? content.showLess : content.showMore}
            <HiChevronDown className={`h-4 w-4 transition-transform ${showAllQuestions ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </section>

      {relatedProfessions.length > 0 ? (
        <section aria-labelledby="related-professions" className="mt-9">
          <div className="mb-3 flex items-center gap-2">
            <HiLocationMarker className="h-5 w-5 text-primary" />
            <h2 id="related-professions" className="text-base font-extrabold tracking-tight text-slate-900">
              {content.related}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedProfessions.map((related) => (
              <Link
                key={related.slug}
                href={localizePath(`/search/${related.slug}`, locale)}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/30 hover:text-primary"
              >
                {related[locale] || related.en}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
