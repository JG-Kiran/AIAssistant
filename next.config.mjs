/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // This is to prevent a build error for the 're2' package, which is an
        // optional, server-side-only dependency of the 'email-reply-parser'.
        // We are telling Webpack to not try and bundle 're2' for the client-side.
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                re2: false,
            };
        }

        return config;
    },
};

export default nextConfig; 