import {
  Apple, Atom, BadgeDollarSign, Blocks, Bot, Boxes, Braces, BrainCircuit, Building2,
  CarTaxiFront, Code2, Database, FileCode2, Gamepad2, Gem, GraduationCap, Handshake,
  HeartPulse, Landmark, Layers3, ListTodo, Mail, Megaphone, MessageSquareText, Monitor,
  MonitorCog, MonitorSmartphone, MousePointerClick, Network, Palette, PanelsTopLeft, Pill,
  Plane, RadioTower, SearchCheck, Share2, ShoppingBag, ShoppingBasket, ShoppingCart,
  Smartphone, Store, Users, Utensils, Wrench,
} from 'lucide-react';

const commonBenefits = ['Clear project planning', 'Responsive user experience', 'Maintainable implementation', 'Performance-focused delivery'];

const createService = (slug, title, shortDescription, capabilities, benefits = commonBenefits, icon = Code2) => ({
  slug,
  id: slug,
  title,
  short: shortDescription,
  shortDescription,
  description: `${shortDescription} SiteArvo plans the experience around your users, business goals and long-term maintainability.`,
  capabilities,
  features: capabilities,
  benefits,
  idealFor: `Businesses that need dependable ${title.toLowerCase()} tailored to clear project requirements.`,
  icon,
  seoTitle: `${title} Services`,
  seoDescription: `${shortDescription} Explore professional ${title.toLowerCase()} with SiteArvo.`,
});

export const serviceCategories = [
  {
    id: 'mobile-app-development',
    shortTitle: 'Mobile Apps',
    title: 'Mobile App Development',
    description: 'Purpose-built mobile experiences designed around platform expectations, usability and business workflows.',
    icon: Smartphone,
    services: [
      createService('native-app-development', 'Native App Development', 'Create platform-focused mobile applications with responsive interactions and dependable performance.', ['Platform-specific user journeys', 'Device feature integrations', 'API-connected experiences', 'App testing and release support'], undefined, Blocks),
      createService('ios-app-development', 'iOS App Development', 'Build polished iPhone and iPad experiences aligned with Apple platform conventions.', ['iPhone and iPad interfaces', 'API integrations', 'App Store release preparation', 'Performance and usability testing'], undefined, Apple),
      createService('android-app-development', 'Android App Development', 'Develop responsive Android applications for modern phones and tablets.', ['Adaptive Android interfaces', 'Device integrations', 'API-connected applications', 'Testing across screen sizes'], undefined, Bot),
      createService('ionic-app-development', 'Ionic App Development', 'Build cross-platform mobile experiences from a shared web-technology codebase.', ['Cross-platform interfaces', 'Reusable components', 'Native device plugins', 'API integrations'], undefined, Layers3),
      createService('react-native-app-development', 'React Native App Development', 'Create cross-platform mobile apps with React-based, reusable application architecture.', ['iOS and Android delivery', 'Reusable React components', 'Navigation and state flows', 'Third-party API integration'], undefined, Atom),
    ],
  },
  {
    id: 'web-development',
    shortTitle: 'Web Development',
    title: 'Web Development',
    description: 'Modern websites and web applications built for clarity, speed, extensibility and real business use.',
    icon: Code2,
    services: [
      createService('website-designing', 'Website Designing', 'Design professional, responsive websites that communicate value clearly and guide visitors toward action.', ['Business websites', 'Responsive page systems', 'Landing pages', 'Website redesigns'], undefined, Palette),
      createService('ruby-on-rails-development', 'Ruby on Rails Development', 'Plan and develop structured Rails applications for requirement-led web products.', ['Business web applications', 'Database-backed workflows', 'API integrations', 'Application maintenance'], undefined, Gem),
      createService('python-development', 'Python Development', 'Build requirement-led Python solutions and integrations for practical business workflows.', ['Web application features', 'Data-processing workflows', 'API integrations', 'Automation utilities'], undefined, Braces),
      createService('angular-development', 'Angular Development', 'Develop structured Angular frontends for feature-rich business applications.', ['Dashboards', 'Admin interfaces', 'Component systems', 'API-integrated applications'], undefined, PanelsTopLeft),
      createService('reactjs-development', 'ReactJS Development', 'Build fast, scalable and modern React applications with reusable components.', ['Business websites', 'Dashboards', 'Admin panels', 'SaaS interfaces', 'Interactive web applications', 'API-integrated applications'], ['Reusable component architecture', 'Fast interactive experiences', 'Scalable frontend foundations', 'Maintainable code'], Atom),
      createService('nodejs-development', 'Node.js Development', 'Develop event-driven backend services and APIs for connected digital products.', ['REST APIs', 'Application backends', 'Third-party integrations', 'Realtime-ready services'], undefined, Network),
      createService('mean-stack-development', 'MEAN Stack Development', 'Create coordinated MongoDB, Express, Angular and Node.js application solutions.', ['Full-stack web applications', 'Admin platforms', 'API services', 'Data-driven workflows'], undefined, Layers3),
      createService('php-mysql-development', 'PHP / MySQL Development', 'Build database-driven PHP applications and reliable website functionality.', ['Business applications', 'Custom forms and workflows', 'Database integrations', 'Existing PHP improvements'], undefined, Database),
      createService('laravel-development', 'Laravel Development', 'Create structured PHP applications using Laravel conventions and maintainable architecture.', ['Custom web portals', 'Business workflows', 'API development', 'Application modernization'], undefined, Boxes),
      createService('websocket-development', 'WebSocket Development', 'Add realtime communication features to web and application experiences.', ['Live notifications', 'Realtime dashboards', 'Chat features', 'Live status updates'], undefined, RadioTower),
    ],
  },
  {
    id: 'cms-ecommerce-development',
    shortTitle: 'CMS & E-commerce',
    title: 'CMS & E-commerce Development',
    description: 'Content and commerce platforms configured around manageable publishing and intuitive buying journeys.',
    icon: ShoppingCart,
    services: [
      createService('spree-commerce-development', 'Spree Commerce Development', 'Develop flexible commerce experiences using the Spree Commerce ecosystem.', ['Custom storefronts', 'Product and order workflows', 'Payment integrations', 'Commerce API integration'], undefined, ShoppingBag),
      createService('wordpress-development', 'WordPress Development', 'Create manageable WordPress websites with professional design and clear content structure.', ['Business websites', 'Custom page layouts', 'Content publishing setup', 'Performance optimization'], undefined, FileCode2),
      createService('magento-development', 'Magento Development', 'Build and improve Magento storefront experiences for complex commerce requirements.', ['Storefront implementation', 'Catalogue experiences', 'Checkout integrations', 'Performance improvements'], undefined, Store),
      createService('woocommerce-development', 'WooCommerce Development', 'Turn WordPress into a practical online store with a clear purchasing experience.', ['Product catalogues', 'Checkout setup', 'Payment integrations', 'Store optimization'], undefined, ShoppingCart),
      createService('shopify-development', 'Shopify Development', 'Create polished Shopify storefronts that make products easy to discover and purchase.', ['Theme implementation', 'Product and collection structure', 'App integrations', 'Storefront optimization'], undefined, ShoppingBag),
    ],
  },
  {
    id: 'desktop-application-development',
    shortTitle: 'Desktop Apps',
    title: 'Desktop Application Development',
    description: 'Cross-platform desktop software experiences built with familiar web technologies.',
    icon: Monitor,
    services: [
      createService('electron-js-application-development', 'Electron JS Application Development', 'Build cross-platform desktop applications with web technology and native desktop capabilities.', ['Windows and macOS interfaces', 'Desktop workflow tools', 'Local data features', 'API-connected applications'], undefined, MonitorCog),
    ],
  },
  {
    id: 'digital-marketing',
    shortTitle: 'Digital Marketing',
    title: 'Digital Marketing',
    description: 'Practical digital campaigns and search foundations designed around measurable business objectives.',
    icon: Megaphone,
    services: [
      createService('seo', 'Search Engine Optimization — SEO', 'Improve technical and on-page search foundations so content can be understood and discovered.', ['Technical SEO review', 'Metadata and content structure', 'Core Web Vitals guidance', 'On-page optimization'], ['Improved crawlability', 'Clearer search signals', 'Better page experience', 'Sustainable SEO foundations'], SearchCheck),
      createService('social-media-marketing', 'Social Media Marketing — SMM', 'Plan platform-aware social content and campaigns around brand and audience goals.', ['Content direction', 'Campaign planning', 'Platform-ready creatives', 'Performance review'], undefined, Share2),
      createService('pay-per-click-advertising', 'Pay Per Click Advertising — PPC', 'Structure focused paid campaigns with clear landing experiences and conversion goals.', ['Campaign structure', 'Keyword and audience planning', 'Landing-page alignment', 'Performance monitoring'], undefined, MousePointerClick),
      createService('facebook-paid-marketing', 'Facebook Paid Marketing', 'Create focused Meta advertising campaigns aligned with defined audiences and offers.', ['Audience planning', 'Campaign setup', 'Creative direction', 'Conversion tracking support'], undefined, BadgeDollarSign),
      createService('sms-marketing', 'SMS Marketing', 'Plan permission-based SMS communication for timely customer updates and campaigns.', ['Campaign planning', 'Message journeys', 'Integration support', 'Opt-in workflow guidance'], undefined, MessageSquareText),
      createService('email-marketing', 'Email Marketing', 'Build useful email journeys for leads, customers and ongoing brand communication.', ['Campaign templates', 'Lead nurture flows', 'Form integrations', 'Performance-ready structure'], undefined, Mail),
      createService('affiliate-marketing', 'Affiliate Marketing', 'Plan affiliate programme experiences and tracking-ready campaign journeys.', ['Programme structure', 'Partner landing pages', 'Tracking integration support', 'Campaign optimization'], undefined, Handshake),
    ],
  },
  {
    id: 'industry-solutions',
    shortTitle: 'Industry Solutions',
    title: 'Industry Solutions',
    description: 'Digital product directions shaped around the workflows and audiences of specific industries.',
    icon: Building2,
    services: [
      createService('education-solutions', 'Education Solutions', 'Create accessible digital experiences for institutes, educators and learning businesses.', ['Education websites', 'Programme discovery', 'Student-facing interfaces', 'Mobile and web experiences'], undefined, GraduationCap),
      createService('fintech-solutions', 'Fintech Solutions', 'Build clear, secure-minded interfaces and connected workflows for financial technology products.', ['Customer dashboards', 'Responsive web applications', 'API-connected experiences', 'Mobile interfaces'], undefined, Landmark),
      createService('healthcare-solutions', 'Healthcare Solutions', 'Design accessible, reassuring digital experiences for healthcare and wellness organizations.', ['Practice websites', 'Service discovery', 'Appointment enquiry flows', 'Accessible interfaces'], undefined, HeartPulse),
      createService('grocery-solutions', 'Grocery Solutions', 'Create convenient product discovery and ordering experiences for grocery businesses.', ['Product catalogues', 'Ordering interfaces', 'Mobile experiences', 'Commerce integrations'], undefined, ShoppingBasket),
      createService('food-delivery-solutions', 'Food Delivery Solutions', 'Develop responsive ordering and status experiences around food-delivery workflows.', ['Ordering journeys', 'Mobile interfaces', 'Realtime status features', 'Admin workflows'], undefined, Utensils),
      createService('pharmacy-solutions', 'Pharmacy Solutions', 'Build clear product and enquiry experiences for pharmacy businesses within applicable requirements.', ['Product catalogues', 'Responsive websites', 'Mobile experiences', 'Enquiry workflows'], undefined, Pill),
      createService('taxi-booking-solutions', 'Taxi Booking Solutions', 'Create mobile-first booking and realtime status experiences for transport services.', ['Booking interfaces', 'Driver and customer journeys', 'Realtime updates', 'API integrations'], undefined, CarTaxiFront),
      createService('travel-solutions', 'Travel Solutions', 'Build engaging travel discovery, enquiry and booking-oriented digital experiences.', ['Destination websites', 'Tour catalogues', 'Enquiry and booking flows', 'SEO-ready content'], undefined, Plane),
    ],
  },
  {
    id: 'specialized-development',
    shortTitle: 'Specialized Development',
    title: 'Specialized Development Services',
    description: 'Custom capabilities for organizations with specialized platforms, staffing or product requirements.',
    icon: Wrench,
    services: [
      createService('redmine-development', 'Redmine Development', 'Configure and extend Redmine experiences around project and issue-management workflows.', ['Redmine configuration', 'Workflow customization', 'Plugin integration', 'Interface improvements'], undefined, ListTodo),
      createService('hire-full-time-developers', 'Hire Full-Time Developers', 'Discuss dedicated development capacity aligned with your technology and delivery requirements.', ['React developers', 'Node.js developers', 'Python developers', 'PHP developers', 'Mobile app developers'], ['Flexible technology alignment', 'Clear role requirements', 'Collaborative delivery', 'No invented rate cards'], Users),
      createService('custom-ecommerce-development', 'Custom E-commerce Development', 'Build tailored commerce workflows when standard storefront platforms are not enough.', ['Custom catalogues', 'Buyer and admin workflows', 'Payment and API integrations', 'Scalable commerce interfaces'], undefined, Store),
      createService('game-development', 'Game Development', 'Create custom interactive and game-development solutions based on project requirements.', ['Interactive prototypes', 'Web-based games', 'Game interface design', 'Requirement-led development'], ['Custom interaction design', 'Cross-device planning', 'Performance awareness', 'Scope-led delivery'], Gamepad2),
      createService('artificial-intelligence-development', 'Artificial Intelligence Development', 'Integrate practical AI-powered features into web and application experiences using suitable external services.', ['AI API integrations', 'Chatbot integration', 'Workflow automation', 'AI-assisted application features'], ['Practical feature planning', 'Responsible integration approach', 'Human-centred workflows', 'No proprietary-model claims'], BrainCircuit),
    ],
  },
];

export const services = serviceCategories.flatMap(category => category.services.map(service => ({ ...service, categoryId: category.id, categoryTitle: category.title })));

export const serviceBySlug = slug => services.find(service => service.slug === slug);

export const categoryById = id => serviceCategories.find(category => category.id === id);

export const homepageServiceCategories = [
  { title: 'Web Development', short: 'Modern websites and web applications built for speed, clarity and growth.', icon: Code2 },
  { title: 'Mobile App Development', short: 'Platform-aware mobile experiences for iOS, Android and cross-platform delivery.', icon: Smartphone },
  { title: 'E-commerce Solutions', short: 'Storefronts and custom commerce journeys designed around confident purchasing.', icon: ShoppingBag },
  { title: 'UI/UX Design', short: 'Professional, responsive interfaces that make every interaction feel clear.', icon: MonitorSmartphone },
  { title: 'Digital Marketing', short: 'Search, social and paid campaign foundations aligned with measurable goals.', icon: Megaphone },
  { title: 'Maintenance & Support', short: 'Ongoing updates, performance care and dependable post-launch website support.', icon: Wrench },
];
