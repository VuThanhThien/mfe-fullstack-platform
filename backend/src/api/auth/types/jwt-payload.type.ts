export type JwtPayloadType = {
  id: string;
  sessionId: string;
  scopes: string[];
  iat: number;
  exp: number;
};
