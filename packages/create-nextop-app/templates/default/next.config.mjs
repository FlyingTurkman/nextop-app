/** @type {import('next').NextConfig} */
const nextConfig = {
    // Masaüstü paketi read-only olduğundan image optimizasyon cache'i yazılamaz;
    // optimizasyonu kapatıp görselleri olduğu gibi sun.
    images: {
        unoptimized: true
    }
}

export default nextConfig
