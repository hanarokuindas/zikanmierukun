const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? "/zikanmierukun" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
};

export default nextConfig;
