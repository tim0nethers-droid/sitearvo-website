export default function SectionTitle({ eyebrow, title, description, align = 'center' }) {
  return <div className={`section-title section-title--${align}`}>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>;
}
