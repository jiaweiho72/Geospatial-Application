import { useState, useRef, useEffect } from 'react';

type ZoomableImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function ZoomableImage({ src, alt, className }: ZoomableImageProps) {
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState({
    left: 0,
    top: 0,
    scale: 1,
  });
  const [zIndex, setZIndex] = useState('');

  // Zoom out on scroll
  useEffect(() => {
    const zoomOut = () => setIsZoomedIn(false);
    window.addEventListener('scroll', zoomOut);
    return () => {
      window.removeEventListener('scroll', zoomOut);
    };
  }, []);

  const toggleZoom = () => {
    if (isZoomedIn) {
      zoomOut();
      return;
    }

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || !imageRef.current) return;

    const targetWidth = Math.min(window.innerWidth, imageRef.current.naturalWidth);
    const targetHeight = Math.min(window.innerHeight, imageRef.current.naturalHeight);

    const scaleX = targetWidth / imageRef.current.clientWidth;
    const scaleY = targetHeight / imageRef.current.clientHeight;
    const scale = Math.min(scaleX, scaleY);

    const newWidth = imageRef.current.clientWidth * scale;
    const newHeight = imageRef.current.clientHeight * scale;

    setTransform({
      left: -rect.left + window.innerWidth / 2 - newWidth / 2,
      top: -rect.top + window.innerHeight / 2 - newHeight / 2,
      scale,
    });
    setZIndex('2');
    setIsZoomedIn(true);
  };

  const zoomOut = () => {
    setTransform({ left: 0, top: 0, scale: 1 });
    setIsZoomedIn(false);
  };

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      onClick={toggleZoom}
      className={`${className} ${isZoomedIn ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
      style={{
        transition: 'transform 0.3s ease-out',
        transformOrigin: 'left top',
        transform: `translate(${transform.left}px, ${transform.top}px) scale(${transform.scale})`,
        position: 'relative',
        zIndex,
      }}
      onTransitionEnd={() => {
        if (!isZoomedIn) setZIndex('');
      }}
    />
  );
}
