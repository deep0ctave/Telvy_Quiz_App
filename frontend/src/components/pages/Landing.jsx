import { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LandingPage() {
  const root = useRef(null);
  const scope = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    scope.current = createScope({ root }).add((self) => {
      // More prominent floating Question Marks
      animate('.question-float', {
        translateY: [
          { to: -20, duration: 2500 },
          { to: 0, duration: 2500 },
        ],
        loop: true,
        direction: 'alternate',
        easing: 'inOutSine',
        delay: (_, i) => i * 200,
      });

      // Scroll-based fade-in
      const fadeTargets = root.current.querySelectorAll('.fade-in');
      fadeTargets.forEach((el) => {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            animate(el, {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 700,
              easing: 'out(3)',
            });
            observer.disconnect();
          }
        }, { threshold: 0.2 });
        observer.observe(el);
      });
    });

    return () => scope.current.revert();
  }, [isAuthenticated, navigate]);

  return (
    <div ref={root} className="h-[80vh] relative bg-base-100 text-base-content flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Floating Question Marks */}
      <div className="absolute top-10 left-10 question-float opacity-70 text-primary">
        <QuestionMark />
      </div>
      <div className="absolute top-1/3 right-12 question-float opacity-80 scale-100 text-secondary">
        <QuestionMark />
      </div>
      <div className="absolute bottom-16 left-1/4 question-float opacity-70 scale-90 text-accent">
        <QuestionMark />
      </div>
      <div className="absolute bottom-10 right-10 question-float opacity-60 scale-95 text-primary">
        <QuestionMark />
      </div>
      <div className="absolute top-1/4 left-1/3 question-float opacity-60 scale-75 text-secondary">
        <QuestionMark />
      </div>
      <div className="absolute top-2/3 right-1/4 question-float opacity-60 scale-75 text-accent">
        <QuestionMark />
      </div>

      {/* Updated Logo (non-animated) */}
      <svg
        className="w-32 h-32 text-primary mb-6 drop-shadow-xl"
        viewBox="0 0 1024 1024"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.9 0-372-166.1-372-372S306.1 140 512 140s372 166.1 372 372-166.1 372-372 372z" />
        <path d="M464 336h96c8.8 0 16 7.2 16 16v320c0 8.8-7.2 16-16 16h-96c-8.8 0-16-7.2-16-16V352c0-8.8 7.2-16 16-16z" />
        <circle cx="512" cy="736" r="32" fill="white" />
      </svg>

      {/* Text Section */}
      <div className="fade-in">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary ">
          Welcome to <span className="text-primary">Telvy</span>
        </h1>
        <p className="mt-4 text-lg text-base-content/80 max-w-xl">
          Play. Learn. Compete. The smarter way to quiz.
        </p>

              <div className="mt-10 flex gap-4 justify-center">
        <a href="/login">
          <button className="btn btn-primary text-lg px-8 py-3 rounded-full shadow-lg hover:scale-105 transition-transform">
            Login
          </button>
        </a>
        <a href="/register">
          <button className="btn btn-outline text-lg px-8 py-3 rounded-full hover:scale-105 transition-transform">
            Register
          </button>
        </a>
      </div>
      </div>
    </div>
  );
}

// Question mark SVG component
function QuestionMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-inherit">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.25 15.75h-1.5v-1.5h1.5v1.5zm1.82-6.17c-.47.49-.82.88-.82 1.92h-1.5c0-1.52.55-2.2 1.09-2.76.48-.48.91-.91.91-1.59 0-.73-.6-1.25-1.25-1.25s-1.25.52-1.25 1.25H9c0-1.5 1.17-2.75 2.75-2.75s2.75 1.21 2.75 2.65c0 .9-.55 1.47-1.43 2.3z" />
    </svg>
  );
}

export default LandingPage;
