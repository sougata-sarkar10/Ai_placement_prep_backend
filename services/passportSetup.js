import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as OAuth2Strategy } from 'passport-oauth2'; 
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// 👑 ENVIRONMENT RESOLUTION: Determine the backend domain name on-the-fly
const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://ai-placement-prep-backend.onrender.com' // Your live Render backend
  : 'http://localhost:5000';                        // Your local laptop backend

// ---- GOOGLE STRATEGY CONFIGURED ----
if (process.env.Google_Client_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.Google_Client_ID,
    clientSecret: process.env.Google_Client_secret,
    // 👑 FIXED: Uses dynamic BACKEND_URL context
    callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ providerId: profile.id, provider: 'google' });
      if (!user) {
        user = await User.create({
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          provider: 'google',
          providerId: profile.id,
          avatar: profile.photos?.[0]?.value
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

// ---- STREAMLINED OAUTH2 LINKEDIN STRATEGY FOR OPENID CONNECT ----
if (process.env.Linkedin_Cient_ID) {
  const LinkedInOidcStrategy = new OAuth2Strategy({
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: process.env.Linkedin_Cient_ID,
    clientSecret: process.env.Linkedin_Client_secret,
    // 👑 FIXED: Uses dynamic BACKEND_URL context
    callbackURL: `${BACKEND_URL}/api/auth/linkedin/callback`,
    scope: ['openid', 'profile', 'email'],
    state: true
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const oidcData = await response.json();
      const targetId = oidcData.sub;
      if (!targetId) {
        return done(new Error("Unable to parse sub key out of LinkedIn OpenID payload."), null);
      }

      let user = await User.findOne({ providerId: targetId, provider: 'linkedin' });
      
      if (!user) {
        user = await User.create({
          name: oidcData.name || "LinkedIn Member",
          email: oidcData.email || "",
          provider: 'linkedin',
          providerId: targetId,
          avatar: oidcData.picture || ""
        });
      }
      return done(null, user);
    } catch (err) {
      console.error("❌ Error during manual LinkedIn OIDC profile fetch:", err.message);
      return done(err, null);
    }
  });

  LinkedInOidcStrategy.name = 'linkedin';
  passport.use('linkedin', LinkedInOidcStrategy);
}

export default passport;