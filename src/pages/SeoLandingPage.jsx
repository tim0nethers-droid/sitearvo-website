import { ArrowRight, BadgeCheck, Check, CircleHelp } from 'lucide-react';
import { AppIcon } from '../catalog/icons';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import CTA from '../components/CTA';
import NotFound from './NotFound';
import { combineSchemas, faqSchema } from '../config/seo';
import { seoPageBySlug } from '../data/seoPages';
import { company } from '../config/company';

export default function SeoLandingPage({ guide = false }) {
  const { slug } = useParams();
  const page = seoPageBySlug(guide ? `guides/${slug}` : slug);
  if (!page) return <NotFound />;
  const path = `/${page.slug}`;
  const articleSchema = page.article ? {
    '@type': 'Article',
    headline: page.title,
    description: page.metaDescription,
    mainEntityOfPage: `${company.domain}${path}`,
    image: `${company.domain}/og.png`,
    datePublished: '2026-08-13',
    dateModified: '2026-08-13',
    author: { '@id': `${company.domain}/#organization` },
    publisher: { '@id': `${company.domain}/#organization` },
    inLanguage: 'en-IN',
  } : null;

  return <>
    <SEO title={page.metaTitle} description={page.metaDescription} path={path} type={page.article ? 'article' : 'website'} schema={combineSchemas(articleSchema, faqSchema(page.faqs))} />
    <section className="seo-landing-hero"><div className="container"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p><div className="seo-highlight-row">{page.highlights.map(item => <span key={item}><BadgeCheck aria-hidden="true" />{item}</span>)}</div><div className="hero-actions"><Link className="button" to="/contact">Get a Free Consultation <ArrowRight /></Link><Link className="button button--secondary" to="/pricing">View Packages</Link></div></div></section>
    <section className="section"><div className="container seo-content-layout"><article className="seo-longform">{page.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul>}</section>)}</article><aside className="seo-related"><span>Explore SiteArvo</span>{page.related.map(([label, href]) => <Link key={href} to={href}>{label}<ArrowRight aria-hidden="true" /></Link>)}<p>Need help choosing the right scope?</p><Link className="button" to="/contact">Discuss Your Project</Link></aside></div></section>
    <section className="section section--alt"><div className="container seo-faq"><div><span className="eyebrow">Helpful answers</span><h2>Frequently Asked Questions</h2><p>Clear answers for planning your website or application project.</p></div><div>{page.faqs.map(([question, answer]) => <article key={question}><CircleHelp aria-hidden="true" /><div><h3>{question}</h3><p>{answer}</p></div></article>)}</div></div></section>
    <CTA />
  </>;
}

