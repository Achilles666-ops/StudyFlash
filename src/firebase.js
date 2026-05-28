import { auth, googleProvider, signInWithGoogle as originalSignIn, handleRedirectResult as originalHandleRedirect } from './lib/firebase';

export const getAuthInstance = () => {
  return auth;
};

export const getGoogleProvider = () => {
  return googleProvider;
};

export const signInWithGoogle = () => {
  return originalSignIn();
};

export const handleRedirectResult = () => {
  return originalHandleRedirect();
};
