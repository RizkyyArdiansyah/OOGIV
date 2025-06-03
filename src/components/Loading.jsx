import React, { useState, useEffect } from 'react';

const Loading = ({ isLoading = true, onComplete = () => {} }) => {
  const [progress, setProgress] = useState(0);
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Sparkle component
  const Sparkle = ({ delay, left, top }) => (
    <div 
      className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        animationDelay: `${delay}ms`,
        animationDuration: '2s'
      }}
    />
  );

  // Generate sparkles
  const sparkles = Array.from({ length: 50 }, (_, i) => (
    <Sparkle 
      key={i}
      delay={Math.random() * 2000}
      left={Math.random() * 100}
      top={Math.random() * 100}
    />
  ));

  useEffect(() => {
    if (!isLoading) return;

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 5);

    // Open curtains after 4 seconds
    const curtainTimer = setTimeout(() => {
      setCurtainsOpen(true);
    }, 10);

    // Show content after curtains open
    const contentTimer = setTimeout(() => {
      setShowContent(true);
      onComplete();
    }, 3);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(curtainTimer);
      clearTimeout(contentTimer);
    };
  }, [isLoading, onComplete]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-white" />
      
      {/* Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {sparkles}
      </div>

      {/* Loading text */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-gradient-to-r from-red-custom from-10% via-yellow-custom via-40% to-blue-custom to-80% bg-clip-text text-transparent text-4xl md:text-5xl font-bold text-center animate-pulse">
          <span className="tracking-widest">LOADING</span>
          <span className="inline-block animate-bounce">
            {progress < 33 ? '' : progress < 66 ? '.' : progress < 100 ? '..' : '...'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 z-20">
        <div className="w-72 md:w-80 h-1 bg-white bg-opacity-20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-custom rounded-full shadow-lg transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-white text-sm text-center mt-2 font-medium">
          {progress}%
        </div>
      </div>

      {/* Left curtain (Blue) */}
      <div 
        className={`absolute top-0 left-0 w-1/2 h-full bg-blue-custom shadow-2xl z-30 transition-transform duration-[1000ms] rounded-xl ease-out ${
          curtainsOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      />

      {/* Right curtain (Red) */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full bg-red-custom shadow-2xl z-30 transition-transform duration-[1000ms] rounded-xl ease-out ${
          curtainsOpen ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
    </div>
  );
};

export default Loading;