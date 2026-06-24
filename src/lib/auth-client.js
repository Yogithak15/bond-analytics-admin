import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.REACT_APP_AUTH_URL || window.location.origin,
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});
