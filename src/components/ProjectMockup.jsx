export default function ProjectMockup({ project, large = false, device = 'desktop' }) {
  return <div className={`project-visual project-visual--${project.tone} project-layout--${project.visual} ${large ? 'project-visual--large' : ''} project-device--${device}`} role="img" aria-label={`${project.title} ${device} concept preview`}>
    <div className="project-browser-bar"><span></span><span></span><span></span><b>{project.slug}.demo</b></div>
    <div className="project-screen">
      <div className="project-screen-nav"><strong>{project.code}</strong><i></i><i></i><i></i></div>
      <div className="project-screen-copy"><small>{project.industry}</small><b>{project.title}</b><span></span><span></span><em>{project.visual === 'dashboard' || project.visual === 'admin' ? 'View dashboard' : project.visual === 'commerce' || project.visual === 'grocery' || project.visual === 'pharmacy' ? 'Shop now' : project.visual === 'property' ? 'View listings' : 'Explore'}</em></div>
      <div className="project-screen-panels"><i></i><i></i><i></i></div>
    </div>
  </div>;
}
