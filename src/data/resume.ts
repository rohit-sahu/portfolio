// Single source of truth for the deployed site URL (layout, robots, sitemap,
// OG image all import from here). Keep DEFAULT_SITE_URL in sync with the
// fallback in .env.example and docker-compose.yml (those can't import TS).
export const DEFAULT_SITE_URL = "https://rohitkumar.dev";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
export const siteHost = new URL(siteUrl).hostname;

export type Profile = {
  name: string;
  role: string;
  tagline: string;
  location: string;
  phone: string;
  email: string;
  github: string;
  linkedin: string;
  resumeUrl: string;
  photoUrl: string;
};

export type Stat = {
  label: string;
  value: string;
};

export type SkillGroup = {
  category: string;
  icon: string;
  skills: string[];
};

export type Experience = {
  company: string;
  location: string;
  title: string;
  period: string;
  points: string[];
};

export type EducationItem = {
  year: string;
  degree: string;
  school: string;
  marks: string;
};

export type ResumeData = {
  profile: Profile;
  summary: string[];
  stats: Stat[];
  skillGroups: SkillGroup[];
  experiences: Experience[];
  education: EducationItem[];
};

// Fallback content: seeds the database on first run, and is used as a
// safety net if it's unreachable. The admin page at /admin edits the live
// copy stored in MongoDB (see src/lib/resume-data.ts), not this file.
export const defaultResumeData: ResumeData = {
  profile: {
    name: "Rohit Kumar",
    role: "Lead Software Engineer",
    tagline:
      "Architecting secure, high-throughput enterprise systems with Java, Spring Boot & React.",
    location: "Bengaluru, Karnataka, India",
    phone: "+91 8744940280",
    email: "rohitraj.r@hotmail.com",
    github: "https://github.com/rohit-sahu",
    linkedin: "https://linkedin.com/in/rohit-sahu",
    resumeUrl: "/Rohit_Resume.pdf",
    photoUrl: "/profile.jpg",
  },

  summary: [
    "Highly accomplished Lead Software Engineer with 9 years of robust experience architecting, scaling, and securing enterprise-grade full-stack applications across the complete software development life cycle (SDLC).",
    "Proven expertise in Java 21, Spring Boot 3.x, React.js, and cloud-native microservices, with a track record of driving system migrations that improved high-concurrency throughput by 35% and mitigated 40+ high-severity CVEs.",
    "Technical proficiency spans the complete Spring ecosystem (Security, Cloud), distributed event streaming (Kafka Stream), Elasticsearch indexing, and cloud DevOps tooling including AWS EKS, Docker, and Kubernetes.",
    "Adept at leading cross-functional Agile teams to design secure zero-trust architectures (mTLS, OAuth 2.0), manage cloud-native deployments, and optimize high-throughput service-to-service communication using Apache Kafka.",
  ],

  stats: [
    { label: "Years of Experience", value: "9+" },
    { label: "High-Severity CVEs Fixed", value: "40+" },
    { label: "Throughput Improvement", value: "35%" },
    { label: "Active Users Served", value: "3M+" },
  ],

  skillGroups: [
  {
    category: "Programming Languages",
    icon: "code",
    skills: ["Java (up to 21)", "JavaScript", "Node.js", "SQL"],
  },
  {
    category: "Backend Frameworks",
    icon: "server",
    skills: ["Spring Boot 3.x", "Spring Framework 6/7", "Spring Security", "Flowable BPM"],
  },
  {
    category: "Data Access & Processing",
    icon: "database",
    skills: ["Spring Cloud", "Spring Batch", "Spring Data JPA", "Hibernate"],
  },
  {
    category: "Event Streaming & Messaging",
    icon: "stream",
    skills: ["Apache Kafka", "Kafka Streams"],
  },
  {
    category: "Search & Indexing",
    icon: "search",
    skills: ["Apache Solr", "Elasticsearch"],
  },
  {
    category: "Architecture & Protocols",
    icon: "network",
    skills: ["Microservices", "REST", "GraphQL", "mTLS", "OAuth 2.0", "Zero Trust", "MVC"],
  },
  {
    category: "Frontend & Web",
    icon: "layout",
    skills: ["React.js", "Redux", "HTML5", "CSS3", "jQuery", "Bootstrap", "AJAX"],
  },
  {
    category: "Databases & Storage",
    icon: "storage",
    skills: ["PostgreSQL", "MySQL", "Oracle", "Redis", "Cassandra", "MongoDB", "Azure Blob", "H2"],
  },
  {
    category: "Cloud & DevOps",
    icon: "cloud",
    skills: ["AWS (EC2/S3)", "EKS", "AKS", "Docker", "Kubernetes", "Jenkins", "CI/CD"],
  },
  {
    category: "Monitoring & Security",
    icon: "shield",
    skills: ["Grafana", "Splunk", "Kibana", "Istio", "SonarQube", "xMatters"],
  },
  {
    category: "Tools & Version Control",
    icon: "tool",
    skills: ["Git", "GitHub", "IntelliJ IDEA", "VS Code", "JMeter", "VisualVM"],
    },
  ],

  experiences: [
    {
      company: "Ivanti (via ASM Technologies)",
    location: "Bangalore",
    title: "Lead Engineer – Ivanti Access Product Team",
    period: "Aug 2025 – Present",
    points: [
      "Engineered high-throughput enterprise microservices for the Ivanti Access identity product, embedding zero-trust security frameworks to automate Conditional Access and seamless Zero Sign-On (ZSO) authentication.",
      "Led a team of 4 software engineers to orchestrate the end-to-end migration of enterprise microservices from Java 11 to Java 17 and 21, leveraging virtual threads to improve high-concurrency throughput by 35%.",
      "Collaborated cross-functionally to architect and execute a seamless upgrade framework from Spring Boot 2.x (Spring 5) to Spring Boot 3.x (Spring 6), mitigating 40+ high-severity CVEs across legacy dependencies.",
      "Engineered and integrated secure RESTful APIs with automated X.509 certificate generation and mTLS protocols for tamper-proof service-to-service communication.",
      "Reduced production bugs by 25% by leading code reviews and setting up SonarQube quality gates to enforce zero-trust security standards.",
    ],
  },
  {
    company: "Bounteous X Accolite",
    location: "Bangalore",
    title: "Technical Lead Engineer",
    period: "Jan 2025 – Aug 2025",
    points: [
      "Engineered and scaled an automated document approval framework for private wealth management (PWM) client onboarding, integrating directly with core platform systems for Morgan Stanley.",
      "Led an Agile team of 4 software engineers, orchestrating task delegation, cross-functional alignment, and front-end to back-end architecture integrations.",
      "Implemented secure RESTful API and SOAP endpoints for distributed service-to-service communication; established strict unit testing layers and quality gates for zero-defect deployment.",
    ],
  },
  {
    company: "Walmart Global Tech",
    location: "Bangalore",
    title: "Software Engineer III",
    period: "Feb 2022 – Jan 2025",
    points: [
      "Led an Agile team of 4 engineers using Scrum to deliver 3 core People Tech products (People-Api, External-Apply, File-Resource-Service) 2 weeks ahead of schedule, boosting sprint velocity by 15%.",
      "Designed, developed, and maintained enterprise web applications across the full architectural lifecycle using Java, Node.js, and Spring Boot.",
      "Designed and deployed 15+ RESTful and GraphQL APIs, reducing data latency by 22% and improving service-to-service efficiency for 3M+ active users.",
      "Coordinated with cross-functional teams aligning backend microservices with React.js, HTML5, CSS3, and JavaScript to engineer responsive, user-friendly UI components.",
      "Integrated and optimized distributed storage using MSSQL, Azure Blob, and MeghaCache (Memcached) for efficient data storage and retrieval.",
      "Enforced 100% code quality and security standards using Spring Security, peer reviews, and Grafana/Kibana/Splunk monitoring with xMatters alerting.",
    ],
  },
  {
    company: "Magicbricks",
    location: "Bangalore",
    title: "Software Engineer",
    period: "Mar 2020 – Feb 2022",
    points: [
      "Debugged and resolved production and non-production application issues.",
      "Architected and developed high-scale backend engines for core property ecosystems (Rental Agreement, Home Loan, Search, mbContact, ContactBroker, PropertyDetails) using Spring Boot, Spring MVC, Spring Batch, and Apache Kafka.",
      "Optimized global product search and indexing using Apache Solr, alongside responsive React.js, Redux, and JavaScript UI components.",
      "Streamlined distributed data management by tuning and scaling MySQL, Redis, and Cassandra clusters; maintained 100% code quality via rigid linting standards.",
    ],
  },
  {
    company: "Kuliza",
    location: "Bangalore",
    title: "Software Developer",
    period: "Sep 2019 – Mar 2020",
    points: [
      "Developed a high-throughput Loan Origination System (LOS) using Java, Spring Boot, Hibernate, and PostgreSQL, deployed on Apache Tomcat.",
      "Architected and integrated automated business workflows using Flowable BPM, streamlining complex multi-step processes.",
      "Secured application infrastructure with Keycloak as centralized IAM, enforcing OAuth 2.0 protocol standards.",
    ],
  },
  {
    company: "Dexcel Electronics",
    location: "Bangalore",
    title: "Software Engineer",
    period: "Nov 2017 – Sep 2019",
    points: [
      "Developed full-stack software architectures for enterprise products (dexHrms, onsiteEM, BEL ARM2 DBQ, Aditya MSSC, IOCL, PMT, Sukshm) using Spring Boot, Spring MVC, and Hibernate.",
      "Engineered responsive, dynamic web interfaces integrating MySQL and Redis with React.js, jQuery, AJAX, and Bootstrap.",
    ],
    },
  ],

  education: [
    {
      year: "2016",
      degree: "B.Tech in Computer Science & Engineering",
      school: "United College of Engineering & Research, Greater Noida",
      marks: "68%",
    },
    {
      year: "2012",
      degree: "12th Standard",
      school: "R.B.S College, Hajipur",
      marks: "68.8%",
    },
    {
      year: "2010",
      degree: "10th Standard",
      school: "K.R.K High School, Bihar State Board",
      marks: "71.2%",
    },
  ],
};
