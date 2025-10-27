'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

const ComingSoonAnimation = () => {
  const logoRef = useRef<HTMLDivElement>(null);
  const comingSoonRef = useRef<HTMLDivElement>(null);
  const veryTextRef = useRef<HTMLSpanElement>(null);
  const anticipationPulseRef = useRef<HTMLDivElement>(null);
  const countdownFlashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Logo putoamis- ja kirjainefektit
    const logoLetters = logoRef.current?.querySelectorAll('span');
    
    // Logo putoaa ensin
    anime({
      targets: logoRef.current,
      translateY: [-100, 0],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutBounce',
      complete: function() {
        // Kirjainefektit kun logo on pudonnut
        logoLetters?.forEach((letter, index) => {
          anime({
            targets: letter,
            translateY: [-20, 0],
            opacity: [0, 1],
            duration: 300,
            delay: 100 + index * 100,
            easing: 'easeOutExpo',
            complete: function() {
              // Lisää korostusefekti kirjaimelle
              anime({
                targets: letter,
                color: ['#EF5350', 'rgb(70, 64, 241)'],
                textShadow: ['0 0 10px rgba(255, 204, 0, 0.7)', '0 0 0 rgba(255, 204, 0, 0)'],
                duration: 500,
                easing: 'easeOutQuad'
              });
            }
          });
        });
      }
    });

    // Initial "coming soon" text animation
    anime({
      targets: comingSoonRef.current?.querySelector('.coming-text'),
      translateY: [30, 0],
      opacity: [0, 0.9],
      duration: 800,
      delay: 500,
      easing: 'easeOutQuart'
    });

    anime({
      targets: comingSoonRef.current?.querySelector('.soon-text'),
      translateY: [30, 0],
      opacity: [0, 0.9],
      duration: 800,
      delay: 700,
      easing: 'easeOutQuart'
    });

    // Function to animate "very" appearing
    const showVery = () => {
      // Add anticipation pulse behind the text
      anime({
        targets: anticipationPulseRef.current,
        opacity: [0, 0.4, 0],
        scale: [0.8, 1.8],
        duration: 800,
        easing: 'easeOutQuart'
      });
      
      // Screen flash for dramatic effect
      anime({
        targets: countdownFlashRef.current,
        opacity: [0, 0.2, 0],
        duration: 150,
        delay: 600,
        easing: 'easeInOutQuart'
      });

      // Expand the width of "very" to make space naturally
      anime({
        targets: veryTextRef.current,
        width: ['0px', '80px'],
        duration: 400,
        delay: 400,
        easing: 'easeOutQuart'
      });

      // Then animate "very" appearing with dramatic entrance
      anime({
        targets: veryTextRef.current,
        opacity: [0, 1],
        scale: [0, 1.1, 1],
        translateY: [20, -3, 0],
        duration: 700,
        delay: 700,
        easing: 'easeOutElastic(1.2, .8)'
      });
    };

    // Function to animate "very" disappearing
    const hideVery = () => {
      // Animate "very" disappearing with dramatic exit
      anime({
        targets: veryTextRef.current,
        opacity: [1, 0],
        scale: [1, 0.8, 0],
        translateY: [0, 10, -30],
        rotate: [0, 5, -10],
        duration: 600,
        easing: 'easeInBack(1.7)',
        complete: function() {
          // Collapse the width back to 0
          anime({
            targets: veryTextRef.current,
            width: ['80px', '0px'],
            duration: 500,
            easing: 'easeOutElastic(1, .6)'
          });
        }
      });
    };

    // Start the animation cycle after initial load
    setTimeout(() => {
      const animationCycle = () => {
        // Add subtle logo shake before "very" appears for anticipation
        anime({
          targets: logoRef.current,
          translateX: [0, -2, 2, -1, 1, 0],
          duration: 300,
          delay: 1800,
          easing: 'easeInOutQuart'
        });
        
        // Show "very" after 2 seconds
        setTimeout(showVery, 2000);
        
        // Hide "very" after 4 seconds (2 seconds after showing)
        setTimeout(hideVery, 4000);
      };

      // Start first cycle
      animationCycle();
      
      // Repeat every 6 seconds
      setInterval(animationCycle, 6000);
    }, 1500);

    // Floating particles
    const createParticle = () => {
      if (!logoRef.current) return;
      
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = Math.random() * 6 + 2 + 'px';
      particle.style.height = particle.style.width;
      particle.style.backgroundColor = `rgba(255, ${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 0.7)`;
      particle.style.borderRadius = '50%';
      particle.style.left = Math.random() * 100 + 'vw';
      particle.style.top = '100vh';
      particle.style.pointerEvents = 'none';
      particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px rgba(255, 255, 255, 0.5)`;
      document.body.appendChild(particle);

      anime({
        targets: particle,
        translateY: [0, -window.innerHeight - 100],
        translateX: [0, (Math.random() - 0.5) * 300],
        opacity: [0.7, 0],
        scale: [0, 1, 0.5, 0],
        rotate: [0, Math.random() * 360],
        duration: Math.random() * 4000 + 6000,
        easing: 'linear',
        complete: () => particle.remove()
      });
    };

    // Create particles periodically with varying intensity
    const particleInterval = setInterval(createParticle, 600);
    
    // Increase particle intensity during "very" moments
    setTimeout(() => {
      setInterval(() => {
        // Burst of particles before "very" appears
        setTimeout(() => {
          for(let i = 0; i < 5; i++) {
            setTimeout(createParticle, i * 100);
          }
        }, 1800);
      }, 6000);
    }, 1500);

    return () => {
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Logo with letter-by-letter animation */}
      <div 
        ref={logoRef}
        className="text-4xl md:text-6xl font-bold mb-8 opacity-0"
        style={{ textShadow: 'rgba(255, 88, 88, 0.6) 0px 4px 8px;', color: "rgb(70, 64, 241)" }}
      >
        H<span className="opacity-0"  style={{color: "rgba(85, 80, 230, 0.79)" }}>a</span><span className="opacity-0"style={{color: "rgba(85, 80, 230, 0.79)" }} >p</span><span className="opacity-0" style={{color: "rgba(85, 80, 230, 0.79)" }}>p</span><span className="opacity-0" style={{color: "rgba(85, 80, 230, 0.79)" }} >y</span>A<span className="opacity-0"style={{color: "rgba(85, 80, 230, 0.79)" }}>p</span><span className="opacity-0"style={{color: "rgba(85, 80, 230, 0.79)" }}>p</span>
        <span className="opacity-0"  style={{color: "rgba(85, 80, 230, 0.79)" }}>l</span><span className="opacity-0"  style={{color: "rgba(85, 80, 230, 0.79)" }}>a</span><span className="opacity-0"style={{color: "rgba(85, 80, 230, 0.79)" }}>i</span><span className="opacity-0"style={{color: "rgba(85, 80, 230, 0.79)" }}>d</span>
      </div>
      
      {/* Coming soon text with "very" animation */}
      <div 
        ref={comingSoonRef}
        className="relative h-24 flex items-center justify-center"
      >
        <span className="coming-text text-xl md:text-3xl opacity-0" style={{ color: "rgb(70, 64, 241)"}}>COMING</span>
        <span 
          ref={veryTextRef}
          className="very-text text-xl md:text-4xl font-bold text-red-400 mx-2"
          style={{
            
            animation: 'glow 2s ease-in-out infinite alternate',
            width: '0px',
            display: 'inline-block',
            overflow: 'hidden',
            height: "3.5rem"
          }}
        >
          very
        </span>
        <span className="soon-text text-xl md:text-3xl"style={{ color: "rgb(70, 64, 241)"}}>SOON</span>
        
        {/* Anticipation pulse effect */}
        <div 
          ref={anticipationPulseRef}
          className="absolute w-16 h-16 border-2 border-red-400/50 rounded-full opacity-0 -z-10"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      
      {/* Screen flash effect */}
      <div 
        ref={countdownFlashRef}
        className="fixed inset-0 bg-white/10 opacity-0 pointer-events-none"
      />
      
      {/* Glow animation keyframes (add to your global CSS) */}
      <style jsx>{`
        @keyframes glow {
          from { text-shadow: 0 2px 2px rgba(0,0,0,0.3), 0 0 3px rgba(255, 107, 107, 0.5); }
          to { text-shadow: 0 2px 2px rgba(0,0,0,0.3), 0 0 5px rgba(255, 107, 107, 0.8), 0 0 7px rgba(255, 107, 107, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default ComingSoonAnimation;