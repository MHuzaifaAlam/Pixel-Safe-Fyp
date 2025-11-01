import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Shield, Zap, Eye, Users } from "lucide-react";
import Footer from "../components/layout/Footer";

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;

    // Smooth scroll + stacking animation
    gsap.set(section, { zIndex: 3, position: "relative" });

    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=100%",
      pin: true,
      scrub: true,
      pinSpacing: false,
      onEnter: () => gsap.to(section, { opacity: 1, duration: 0.6 }),
      onLeaveBack: () => gsap.to(section, { opacity: 0.7, duration: 0.4 }),
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const features = [
    {
      icon: Shield,
      title: "Advanced Detection",
      description:
        "State-of-the-art AI algorithms detect even the most sophisticated image manipulations.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Process images in seconds with our optimized neural network architecture.",
    },
    {
      icon: Eye,
      title: "Visual Analysis",
      description:
        "Detailed heatmaps and visual indicators show exactly where tampering occurred.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Share results, collaborate on investigations, and maintain detailed audit trails.",
    },
  ];

  return (
    <Motion.div
      id="landing-page"
      ref={sectionRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen text-white bg-black overflow-hidden"
    >
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        >
          <source src="./background2.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90"></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 text-center pt-24 pb-16">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
                Pixel-Safe
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Advanced AI forensic analysis for digital image integrity. Detect
              tampering, verify authenticity, and protect your digital assets.
            </p>
          </Motion.div>

          {/* CTA Buttons */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
          >
            <Link to="/upload">
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg font-semibold text-white shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
              >
                Start Analysis
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Motion.button>
            </Link>
            <Link to="/extension">
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border border-cyan-400 rounded-lg font-semibold text-cyan-400 hover:bg-cyan-400/10 transition-all duration-300"
              >
                Try Browser Extension
              </Motion.button>
            </Link>
          </Motion.div>
        </div>
      </section>

      {/* Why Choose Pixel-Safe */}
      <section className="py-28 bg-gradient-to-b from-black via-[#0a0a0a] to-black overflow-visible relative z-[3]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Why Choose Pixel-Safe?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Our cutting-edge technology provides unparalleled accuracy in
              detecting image manipulation and ensuring digital integrity.
            </p>
          </Motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group relative p-6 bg-[#111]/80 backdrop-blur-md rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-black overflow-visible">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="p-10 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 rounded-2xl border border-cyan-500/20 backdrop-blur-sm"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent leading-snug">
              Ready to Secure Your Digital Assets?
            </h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed">
              Join thousands of professionals who trust Pixel-Safe for their
              digital forensic needs.
            </p>
            <Link to="/upload">
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg font-semibold text-white shadow-lg hover:shadow-cyan-400/25 transition-all duration-300"
              >
                Get Started Now
              </Motion.button>
            </Link>
          </Motion.div>
        </div>
      </section>
      <Footer/>

    </Motion.div>
  );
};

export default LandingPage;
