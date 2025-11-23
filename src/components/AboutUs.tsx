import { Card, CardContent } from "@/components/ui/card";

const AboutUs = () => {
  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            About Barangay Salud Mitra
          </h2>
        </div>

        <Card className="max-w-4xl mx-auto shadow-medium">
          <CardContent className="p-8 md:p-12">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Barangay Salud Mitra, established in 1968, was formerly known as Jungle Town. 
              With a population of 1,344 residents, our barangay is located at coordinates 16.4110, 120.6010. 
              The barangay was renamed in honor of Congressman Ramon Mitra Sr.'s wife. 
              We are committed to providing efficient, transparent, and accessible services to all residents.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AboutUs;
