/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Version-skew zaštita: ako korisnik ima otvorenu karticu s JS bundleom
  // od PRETHODNOG Vercel deploya i klikne na <Link> nakon što je novi deploy
  // otišao live, Next.js ovo koristi da otkrije neusklađenost (preko
  // response headera) i sam napravi hard navigation umjesto da soft
  // navigacija tiho ne uspije. VERCEL_DEPLOYMENT_ID Vercel postavlja
  // automatski u buildu; lokalno/izvan Vercela je undefined pa se ponašanje
  // ne mijenja.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
};

export default nextConfig;
