export type ThreePlConfig = {
  baseUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
};

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getThreePlConfig(): ThreePlConfig {
  return {
    baseUrl: readEnv("THREEPL_BASE_URL"),
    tokenUrl: readEnv("THREEPL_TOKEN_URL"),
    clientId: readEnv("THREEPL_CLIENT_ID"),
    clientSecret: readEnv("THREEPL_CLIENT_SECRET"),
  };
}

