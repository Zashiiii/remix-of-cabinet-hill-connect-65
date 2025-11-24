import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Statistics from "@/components/Statistics";
import Services from "@/components/Services";
import Announcements from "@/components/Announcements";
import AboutUs from "@/components/AboutUs";
import Information from "@/components/Information";
import Officials from "@/components/Officials";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Statistics />
        <Services />
        <Announcements />
        <AboutUs />
        <Information />
        <Officials />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
