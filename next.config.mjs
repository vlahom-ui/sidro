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
  //
  // tesseract.js/tesseract.js-core: createWorker() u Node okruženju pokreće
  // worker preko `new Worker(workerPath)` (worker_threads) s dinamički
  // građenom putanjom (path.join(__dirname, ...) u
  // tesseract.js/src/worker/node/defaultOptions.js) — to Next.jev statički
  // file-tracing ne prati (nije require/import poziv), pa
  // worker-script/node/index.js i njegovi transitivni require-ovi
  // (worker-script/index.js preko `require('..')`, pa dalje utils/constants)
  // ispadnu iz produkcijskog paketa. Posljedica u produkciji: "Cannot find
  // module '..'" i zahtjev visi do hard timeouta umjesto da baci grešku.
  // Rješenje: eksplicitno uključi cijeli paket, isto kao ocr-data gore.
  outputFileTracingIncludes: {
    "/api/venues/*/import/upload": [
      "./lib/ocr-data/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      // Datoteke forsirano uključene gore (glob include) se ne skeniraju
      // dalje za NJIHOVE require-ove — svaki paket koji worker-script stablo
      // zahtijeva (potvrđeno statičkim praćenjem require() poziva od
      // worker-script/node/index.js nadalje) mora biti naveden posebno,
      // inače ostane izostavljen unatoč tome što je gornji include
      // "pokrio" datoteku koja ga zahtijeva. wasm-feature-detect
      // (worker-script/node/getCore.js) i bmp-js (worker-script/utils/
      // setImage.js) su ovako otkriveni tek u produkciji (svaki zasebnim
      // "Cannot find module" padom) — is-url/node-fetch/regenerator-runtime
      // Next.jev file-tracing ipak uspije sam pronaći, ali su ovdje
      // navedeni eksplicitno da se ne oslanjamo na tu nepouzdanu detekciju.
      "./node_modules/wasm-feature-detect/**",
      "./node_modules/bmp-js/**",
      "./node_modules/is-url/**",
      "./node_modules/node-fetch/**",
      "./node_modules/regenerator-runtime/**",
    ],
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
