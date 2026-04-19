import jwt from "jsonwebtoken";

const isDev = process.env.NODE_ENV === "development";

if (!process.env.SESSION_SECRET) {
  if (!isDev) {
    throw new Error(
      "[jwt] SESSION_SECRET 환경변수가 설정되지 않았습니다. " +
      "프로덕션 환경에서는 반드시 SESSION_SECRET을 설정해야 합니다.",
    );
  }
  // 개발 환경에서만 경고 출력 후 dev fallback 허용
  console.warn(
    "[jwt] WARNING: SESSION_SECRET not set — using insecure dev fallback. " +
    "Set SESSION_SECRET before production deployment.",
  );
}

const JWT_SECRET = process.env.SESSION_SECRET ?? "lito-dev-secret-UNSAFE-do-not-deploy";
const JWT_EXPIRES_IN = "30d";

export interface JwtPayload {
  userId: number;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
