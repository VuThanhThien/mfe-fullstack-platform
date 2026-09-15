export type AuthConfig = {
  secret: string;
  expires: string;
  refreshSecret: string;
  refreshExpires: string;
  forgotSecret: string;
  forgotExpires: string;
  confirmEmailSecret: string;
  confirmEmailExpires: string;
  /** Parent domain for refresh cookie SSO (e.g. `.platform.tld`). Empty/omit = host-only. */
  cookieDomain?: string;
};
