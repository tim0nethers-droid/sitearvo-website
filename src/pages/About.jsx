import { AppIcon } from '../catalog/icons';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SectionTitle from '../components/SectionTitle';
import CTA from '../components/CTA';

const values = [
  ['gem', 'Quality', 'Careful thinking and high standards in every detail.'],
  ['scale', 'Transparency', 'Clear scope, honest updates and open communication.'],
  ['lightbulb', 'Innovation', 'Modern solutions chosen for real business value.'],
  ['shield-check', 'Reliability', 'Dependable delivery and foundations built to last.'],
  ['users', 'Client Success', 'Decisions anchored to your customers and growth goals.'],
];

export default function About() {
  return <>
    <SEO title="About Us" description="Meet SiteArvo, a modern web design and development agency creating fast, beautiful and result-driven digital experiences." path="/about" />
    <PageHero eyebrow="About SiteArvo" title="Digital Work That Moves Businesses Forward">
      We combine thoughtful strategy, sharp design and reliable development to create websites that earn attention and drive action.
    </PageHero>
    <section className="section">
      <div className="container story-grid">
        <div className="story-visual">
          <img src="/sitearvo-logo.png" width="256" height="256" alt="SiteArvo logo" />
          <p>Design <i>•</i> Develop <i>•</i> Grow</p>
        </div>
        <div>
          <span className="eyebrow">Who we are</span>
          <h2>Small enough to care. Skilled enough to deliver.</h2>
          <p>SiteArvo is a modern web design and development agency focused on creating fast, beautiful and result-driven digital experiences.</p>
          <p>We turn business goals into clear digital experiences—balancing aesthetics, usability, performance and search readiness from the start.</p>
          <div className="inline-points">
            <span><AppIcon icon="badge-check" /> Strategy-led</span>
            <span><AppIcon icon="badge-check" /> Detail-focused</span>
            <span><AppIcon icon="badge-check" /> Growth-minded</span>
          </div>
        </div>
      </div>
    </section>
    <section className="section section--alt">
      <div className="container mission-grid">
        <article className="mission-card"><AppIcon icon="target" /><span>Our Mission</span><h3>Build stronger digital foundations</h3><p>Help businesses build a strong online presence through modern design and reliable technology.</p></article>
        <article className="mission-card"><AppIcon icon="eye" /><span>Our Vision</span><h3>Become a trusted digital partner</h3><p>Be the team businesses rely on when they are ready to grow online with clarity and confidence.</p></article>
        <article className="mission-card"><AppIcon icon="rocket" /><span>Our Approach</span><h3>Strategy before pixels</h3><p>Understand the real problem, create the right experience and build it to perform for the long term.</p></article>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <SectionTitle eyebrow="How we collaborate" title="Clear from First Conversation to Launch" description="A practical working style built around shared understanding, visible progress and thoughtful decisions." />
        <div className="client-workflow">
          <article><AppIcon icon="message-square-text" /><span>01</span><h3>Listen first</h3><p>We clarify your audience, priorities, content and definition of success.</p></article>
          <article><AppIcon icon="target" /><span>02</span><h3>Align the direction</h3><p>You see the structure and visual direction before development moves ahead.</p></article>
          <article><AppIcon icon="rocket" /><span>03</span><h3>Build and support</h3><p>We test carefully, launch cleanly and remain available for ongoing support.</p></article>
        </div>
      </div>
    </section>
    <section className="section section--alt">
      <div className="container">
        <SectionTitle eyebrow="What guides us" title="Values Behind Every Project" />
        <div className="values-grid">{values.map(([icon, title, text]) => <article className="value-card" key={title}><AppIcon icon={icon} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div>
    </section>
    <CTA />
  </>;
}
