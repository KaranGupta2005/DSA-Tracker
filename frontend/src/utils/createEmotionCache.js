import createCache from '@emotion/cache';

// On the client side, create a meta tag at the top of the <head> and set it as insertionPoint.
// This ensures Emotion styles are loaded first and can be overridden by TailwindCSS.
export default function createEmotionCache() {
  let insertionPoint;

  if (typeof document !== 'undefined') {
    const emotionInsertionPoint = document.querySelector(
      'meta[name="emotion-insertion-point"]'
    );
    insertionPoint = emotionInsertionPoint ?? undefined;
  }

  return createCache({ key: 'mui-style', insertionPoint });
}
