import { useEffect, useState } from 'react';
import Image from 'next/image';

export const DEFAULT_PROFILE_IMAGE = '/default-profile.svg';

function normalizeImageSource(src) {
  return typeof src === 'string' && src.trim() ? src.trim() : DEFAULT_PROFILE_IMAGE;
}

export default function ProfileImage({ src, alt = 'Profile', onError, ...imageProps }) {
  const requestedSource = normalizeImageSource(src);
  const [imageSource, setImageSource] = useState(requestedSource);

  useEffect(() => {
    setImageSource(requestedSource);
  }, [requestedSource]);

  function handleImageError(event) {
    onError?.(event);
    if (imageSource !== DEFAULT_PROFILE_IMAGE) {
      setImageSource(DEFAULT_PROFILE_IMAGE);
    }
  }

  return (
    <Image
      {...imageProps}
      src={imageSource}
      alt={alt}
      onError={handleImageError}
    />
  );
}
