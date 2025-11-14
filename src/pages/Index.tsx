import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Information from "@/components/Information";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Services />
        <Information />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
