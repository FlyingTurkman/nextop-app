/** @type {import('next').NextConfig} */
const nextConfig = {
    // The desktop package is read-only, so the image optimization cache cannot be written;
    // disable optimization and serve images as-is.
    images: {
        unoptimized: true
    },
    allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
