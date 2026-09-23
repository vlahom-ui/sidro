/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx", "tesseract.js", "@napi-rs/canvas", "pdfjs-dist"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // lib/ocr-data/*.traineddata.gz (OCR jezični podaci) se učitavaju preko
  // dinamički građenog fs puta u runtimeu, ne preko import/require, pa ih
  // Next.jev automatski file-tracing ne prepoznaje sam od sebe — moraju se
  // eksplicitno uključiti u serverless bundle rute koja radi OCR fallback.
  outputFileTracingIncludes: {
    "/api/venues/*/import/upload": ["./lib/ocr-data/**"],
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
