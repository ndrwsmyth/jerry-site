"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import GameStart from "./GameStart";

declare global {
  interface Window {
    MSStream?: unknown;
  }
}

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false); // New state for detection
  
  const { ref: inViewRef } = useInView({
    threshold: 0.5,
  });

  useEffect(() => {
    // Low Power Mode detection workaround (only run if iOS detected for efficiency)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window.MSStream);
    if (isIOS) {
      const testVideo = document.createElement('video');
      testVideo.setAttribute('playsinline', '');
      testVideo.setAttribute('muted', '');
      testVideo.setAttribute('loop', '');
      testVideo.style.display = 'none';
      // Use a tiny test video source (create a small MP4 file or use a data URL for a blank video)
      testVideo.src = '/videos/tiny-test.mp4'; // Replace with your actual tiny test video path (~1KB silent clip)
      
      const handleSuspend = () => {
        setIsLowPowerMode(true);
        testVideo.remove(); // Clean up
      };

      testVideo.addEventListener('suspend', handleSuspend);
      document.body.appendChild(testVideo);
      testVideo.play().catch(() => {}); // Attempt play, ignore errors here

      return () => {
        testVideo.removeEventListener('suspend', handleSuspend);
        testVideo.remove();
      };
    }
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (videoElement && !isLowPowerMode) { // Only proceed if not low power
      const handleError = (e: Event) => {
        console.error('Video error:', e);
        setIsAutoplayBlocked(true);
      };
      
      const handleLoadedData = () => {
        console.log('Video loaded successfully');
        setIsLoaded(true);
        
        // Try to play after the video is loaded
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Autoplay failed after load:', error);
            setIsAutoplayBlocked(true);
          });
        }
      };

      const handleTimeUpdate = () => {
        if (videoElement && videoElement.currentTime >= 7.6) {
          videoElement.currentTime = 7.2;
        }
      };

      const handlePlay = () => {
        console.log('Video started playing');
        setIsPlaying(true);
      };

      const handlePause = () => {
        console.log('Video paused');
        setIsPlaying(false);
      };

      const handleCanPlay = () => {
        if (!isPlaying) {
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log('Final autoplay attempt failed:', error);
              setIsAutoplayBlocked(true);
            });
          }
        }
      };

      videoElement.addEventListener('error', handleError);
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
      videoElement.addEventListener('canplay', handleCanPlay);
      
      // Load the video only if not low power
      videoElement.load();

      return () => {
        videoElement.removeEventListener('error', handleError);
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        videoElement.removeEventListener('canplay', handleCanPlay);
      };
    } else if (isLowPowerMode) {
      setIsAutoplayBlocked(true); // Directly block if low power
    }
  }, [isPlaying, isLowPowerMode]);

  return (
    <div ref={inViewRef} className="relative min-h-[200px] h-screen w-full overflow-hidden bg-black">
      {/* Background Video - only render source if not low power */}
      <video
        ref={videoRef}
        className={`absolute w-full h-full object-cover transition-all duration-1000 ease-in-out
          min-h-[600px] scale-[1.02]
          ${isLoaded && !isAutoplayBlocked ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
        autoPlay={!isLowPowerMode}
        loop
        preload={isLowPowerMode ? "none" : "auto"}
      >
        {!isLowPowerMode && (
          <source src="/videos/intro_crop_noaudio.mp4" type="video/mp4" />
        )}
        Your browser does not support the video tag.
      </video>

      {/* Static Poster Image (shown when autoplay blocked or low power) */}
      {(isAutoplayBlocked || isLowPowerMode) && (
        <div 
          className="absolute w-full h-full object-cover min-h-[600px] scale-[1.02] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-poster.jpg')" }}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* GameStart component - pass isAutoplayBlocked to show immediately */}
      <GameStart forceVisible={isAutoplayBlocked || isLowPowerMode} />
    </div>
  );
}