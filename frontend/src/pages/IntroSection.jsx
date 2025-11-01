import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export default function IntroSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const words = titleRef.current.querySelectorAll(".word");

      // Word bounce-in animation
      gsap.fromTo(
        words,
        { opacity: 0, x: -100, scale: 0.95 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1,
          ease: "elastic.out(1, 0.6)",
          stagger: 0.25,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 65%",
          },
        }
      );

      // Pin and stay fixed while next slides in
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        pinSpacing: false, // Important: lets next section overlap
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="intro"
      ref={sectionRef}
      className="h-screen flex items-center justify-center bg-gradient-to-b from-[#050505] to-[#0B0C10] overflow-hidden relative z-10"
    >
      <h1
        ref={titleRef}
        className="text-6xl md:text-8xl font-extrabold text-center"
      >
        {["Pixel", "Safe"].map((word, i) => (
          <span
            key={i}
            className="word inline-block mx-2 bg-gradient-to-r from-cyan-400 via-violet-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg"
          >
            {word}
          </span>
        ))}
      </h1>
    </section>
  );
}
