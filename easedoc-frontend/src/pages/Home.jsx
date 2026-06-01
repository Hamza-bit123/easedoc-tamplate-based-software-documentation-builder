import { useContext } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import EasDocLoader from "../components/EasDocLoader";
import {
  FiArrowRight,
  FiCheckCircle,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiGrid,
  FiImage,
  FiLayers,
  FiLogIn,
  FiUserPlus,
} from "react-icons/fi";
import { FaServer } from "react-icons/fa";
import "./Home.css";

const DOCUMENT_TYPES = [
  {
    id: "srs",
    name: "SRS",
    title: "Software Requirements Specification",
    description:
      "Capture functional and non-functional requirements with structured sections aligned to industry standards.",
    icon: <FiFileText size={28} />,
  },
  {
    id: "sds",
    name: "SDS",
    title: "System Design Specification",
    description:
      "Document system architecture, interfaces, data design, and deployment planning in one place.",
    icon: <FaServer size={28} />,
  },
  {
    id: "sdd",
    name: "SDD",
    title: "Software Design Description",
    description:
      "Describe software structure, components, interfaces, and traceability to requirements.",
    icon: <FiLayers size={28} />,
  },
];

const STANDARDS = [
  {
    type: "SRS",
    items: [
      {
        name: "IEEE 830-1998",
        description: "Recommended practice for Software Requirements Specifications.",
      },
      {
        name: "ISO/IEC/IEEE 29148:2018",
        description: "Requirements engineering for systems and software.",
      },
    ],
  },
  {
    type: "SDS",
    items: [
      {
        name: "ISO/IEC/IEEE 12207:2026",
        description: "Software life cycle processes and design context.",
      },
      {
        name: "ISO/IEC/IEEE 15288:2023",
        description: "System life cycle processes for design specifications.",
      },
    ],
  },
  {
    type: "SDD",
    items: [
      {
        name: "IEEE 1016-2009",
        description: "Standard for Software Design Descriptions.",
      },
      {
        name: "ISO/IEC/IEEE 42010:2022",
        description: "Architecture description for software and systems.",
      },
    ],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    description: "Register for free and sign in to your personal EaseDoc workspace.",
    icon: <FiUserPlus />,
  },
  {
    step: "02",
    title: "Choose type & standard",
    description: "Select SRS, SDS, or SDD, then pick the standard that matches your project.",
    icon: <FiCheckCircle />,
  },
  {
    step: "03",
    title: "Start from a template",
    description: "Use a pre-built template with the correct sections already in place.",
    icon: <FiFileText />,
  },
  {
    step: "04",
    title: "Write in the editor",
    description: "Fill structured blocks—text, images, and tables—section by section.",
    icon: <FiEdit3 />,
  },
  {
    step: "05",
    title: "Preview & validate",
    description: "Check required sections, figure numbering, and layout before you publish.",
    icon: <FiEye />,
  },
  {
    step: "06",
    title: "Export your document",
    description: "Download a polished PDF or Word file ready for review or submission.",
    icon: <FiDownload />,
  },
];

const TEMPLATE_SECTIONS = [
  {
    type: "SRS",
    standard: "IEEE 830-1998",
    sections: [
      "Introduction",
      "Overall Description",
      "Specific Requirements",
      "External Interface Requirements",
      "Non-functional Requirements",
    ],
  },
  {
    type: "SRS",
    standard: "ISO/IEC/IEEE 29148",
    sections: [
      "Purpose and Scope",
      "Stakeholders and System Context",
      "System Requirements",
      "Verification and Validation Criteria",
    ],
  },
  {
    type: "SDS",
    standard: "ISO/IEC/IEEE 12207",
    sections: [
      "Introduction",
      "System Architecture",
      "Data Design",
      "Interface Design",
      "Deployment Design",
    ],
  },
  {
    type: "SDD",
    standard: "IEEE 1016-2009",
    sections: [
      "Introduction",
      "Design Overview",
      "Architectural Design",
      "Component Design",
      "Data Design",
      "Interface Design",
      "Requirements Traceability",
    ],
  },
  {
    type: "SDD",
    standard: "ISO/IEC/IEEE 42010",
    sections: [
      "Architecture Purpose",
      "Stakeholders and Concerns",
      "Architecture Viewpoints",
      "Architecture Views",
      "Architecture Decisions",
    ],
  },
];

const FEATURES = [
  {
    icon: <FiFileText />,
    title: "Standard-aligned templates",
    description: "Built-in structures for SRS, SDS, and SDD documents.",
  },
  {
    icon: <FiImage />,
    title: "Figures & tables",
    description: "Separate image and table blocks with automatic captions and numbering.",
  },
  {
    icon: <FiGrid />,
    title: "Block-based editor",
    description: "Clean paragraphs, images, and tables—never mixed in one blob of text.",
  },
  {
    icon: <FiDownload />,
    title: "PDF & Word export",
    description: "Export preserves sections, formatting, figures, and tables.",
  },
];

export const HomeOrRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <EasDocLoader message="Loading EaseDoc" />;
  }

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/user"} replace />;
  }

  return <Home />;
};

function Home() {
  return (
    <div className="home-page">
      <header className="home-nav">
        <Link to="/" className="home-brand">
          <span className="home-brand-sparkle">✦</span>
          EaseDoc
        </Link>
        <nav className="home-nav-links">
          <a href="#standards">Standards</a>
          <a href="#how-it-works">How it works</a>
          <a href="#sections">Template sections</a>
        </nav>
        <div className="home-nav-actions">
          <Link to="/login" className="home-btn home-btn-ghost">
            <FiLogIn /> Log in
          </Link>
          <Link to="/register" className="home-btn home-btn-primary">
            Get started <FiArrowRight />
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-eyebrow">Technical documentation, simplified</p>
          <h1>
            Write standards-compliant
            <span className="home-gradient-text"> SRS, SDS & SDD </span>
            documents with confidence
          </h1>
          <p className="home-hero-lead">
            Template based software documentaion builder system
          </p>
          <div className="home-hero-actions">
            <Link to="/register" className="home-btn home-btn-primary home-btn-lg">
              Create free account <FiArrowRight />
            </Link>
            <Link to="/login" className="home-btn home-btn-outline home-btn-lg">
              I already have an account
            </Link>
          </div>
        </div>
        <div className="home-hero-visual">
          <div className="home-hero-card">
            <div className="home-hero-card-header">
              <span className="home-dot" />
              <span className="home-dot" />
              <span className="home-dot" />
            </div>
            <div className="home-hero-card-body">
              <p className="home-mock-title">1. Introduction</p>
              <p className="home-mock-line" />
              <p className="home-mock-line short" />
              <p className="home-mock-title">2. System Architecture</p>
              <div className="home-mock-figure">Figure 2-1</div>
              <p className="home-mock-title">3. Component Design</p>
              <div className="home-mock-table" />
            </div>
          </div>
        </div>
      </section>

      <section className="home-section" id="document-types">
        <div className="home-section-head">
          <h2>Document types</h2>
          <p>Choose the kind of technical document you need to produce.</p>
        </div>
        <div className="home-type-grid">
          {DOCUMENT_TYPES.map((doc) => (
            <article key={doc.id} className="home-type-card">
              <div className="home-type-icon">{doc.icon}</div>
              <span className="home-type-badge">{doc.name}</span>
              <h3>{doc.title}</h3>
              <p>{doc.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section-alt" id="standards">
        <div className="home-section-head">
          <h2>Supported standards</h2>
          <p>
            Templates are aligned with widely used IEEE and ISO/IEC/IEEE standards for
            requirements and design documentation.
          </p>
        </div>
        <div className="home-standards-grid">
          {STANDARDS.map((group) => (
            <div key={group.type} className="home-standards-group">
              <h3 className="home-standards-type">{group.type}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.name}>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section" id="how-it-works">
        <div className="home-section-head">
          <h2>How to use EaseDoc</h2>
          <p>From sign-up to export in six straightforward steps.</p>
        </div>
        <div className="home-steps-grid">
          {HOW_IT_WORKS.map((item) => (
            <article key={item.step} className="home-step-card">
              <div className="home-step-icon">{item.icon}</div>
              <span className="home-step-num">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section-alt" id="sections">
        <div className="home-section-head">
          <h2>Common template sections</h2>
          <p>
            Each template opens with the sections expected by its standard—ready for
            you to fill in.
          </p>
        </div>
        <div className="home-template-sections-grid">
          {TEMPLATE_SECTIONS.map((tpl) => (
            <article key={`${tpl.type}-${tpl.standard}`} className="home-template-card">
              <div className="home-template-card-head">
                <span className="home-type-badge">{tpl.type}</span>
                <h3>{tpl.standard}</h3>
              </div>
              <ol>
                {tpl.sections.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Why teams choose EaseDoc</h2>
        </div>
        <div className="home-features-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="home-feature-card">
              <div className="home-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <h2>Ready to write your next document?</h2>
        <p>Join EaseDoc and create your first standards-based document in minutes.</p>
        <div className="home-hero-actions">
          <Link to="/register" className="home-btn home-btn-primary home-btn-lg">
            Sign up free <FiArrowRight />
          </Link>
          <Link to="/login" className="home-btn home-btn-outline home-btn-lg home-btn-on-dark">
            Log in
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <p>© {new Date().getFullYear()} EaseDoc — Structured technical documentation</p>
      </footer>
    </div>
  );
}

export default Home;