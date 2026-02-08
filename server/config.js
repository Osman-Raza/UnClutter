function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
  },
};
