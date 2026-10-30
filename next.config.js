/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Modules natifs / wasm de conversion photo : non empaquetés par webpack.
    serverComponentsExternalPackages: ["sharp", "libheif-js"],
    // Photos HEIC d'iPhone (2 à 4 Mo chacune) : la limite par défaut (1 Mo) les refuserait.
    serverActions: { bodySizeLimit: "100mb" },
  },
};
module.exports = nextConfig;
