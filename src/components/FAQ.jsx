import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { faqQuestions } from '../data/faqs';

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return <div className="faq-list">{faqQuestions.map(([question, answer], index) => {
    const expanded = open === index;
    return <article className={`faq-item ${expanded ? 'is-open' : ''}`} key={question}>
      <h3><button type="button" aria-expanded={expanded} aria-controls={`faq-panel-${index}`} onClick={() => setOpen(expanded ? -1 : index)}><span>{question}</span><ChevronDown aria-hidden="true" /></button></h3>
      <div id={`faq-panel-${index}`} className="faq-panel" hidden={!expanded}><p>{answer}</p></div>
    </article>;
  })}</div>;
}
