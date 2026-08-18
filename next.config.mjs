/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // sql.js probes for Node's fs/path/crypto when bundled; in the browser
    // build those must resolve to nothing — the WASM file is fetched from
    // /sql-wasm.wasm instead.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
