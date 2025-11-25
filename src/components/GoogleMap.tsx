const GoogleMap = () => {
  return (
    <section id="map" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Find Us / Hanapin Kami
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Visit our barangay hall at Salud Mitra, Baguio City
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg border border-border">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.4110!2d120.6010!3d16.4110!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTbCsDI0JzM5LjYiTiAxMjDCsDM2JzAzLjYiRQ!5e0!3m2!1sen!2sph!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Barangay Salud Mitra Location"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleMap;
