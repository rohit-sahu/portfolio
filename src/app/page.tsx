import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import ExperienceSection from "@/components/ExperienceSection";
import Education from "@/components/Education";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import CursorGlow from "@/components/CursorGlow";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollToTop from "@/components/ScrollToTop";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { getResumeData } from "@/lib/resume-data";

export default async function Home() {
  const data = await getResumeData();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030014]">
      <BackgroundOrbs />
      <CursorGlow />
      <ScrollProgress />
      <Navbar resumeUrl={data.profile.resumeUrl} />
      <main>
        <Hero profile={data.profile} stats={data.stats} />
        <About summary={data.summary} />
        <Skills skillGroups={data.skillGroups} />
        <ExperienceSection experiences={data.experiences} />
        <Education education={data.education} />
        <Contact profile={data.profile} />
      </main>
      <Footer profile={data.profile} />
      <ScrollToTop />
      <ThemeSwitcher />
    </div>
  );
}
