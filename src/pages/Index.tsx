import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Announcements from "@/components/Announcements";
import AboutUs from "@/components/AboutUs";
import Information from "@/components/Information";
import Officials from "@/components/Officials";
import GoogleMap from "@/components/GoogleMap";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Announcements />
        <Services />
        <AboutUs />
        <Information />
        <Officials />
        <GoogleMap />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
