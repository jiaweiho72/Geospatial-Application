/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // basePath: process.env.NEXT_PUBLIC_ROOT_URL_FRONTEND,
    basePath: "/blockfinder3/container/blockfindercontainers-sp7as-frontend",
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'template-a-pafw-sftp-myproject-8twc0tf.s3.amazonaws.com',
          port: '',
          pathname: '/fireaccesswayimage-vz9n6/**',
        },
        {
          protocol: 'https',
          hostname: 'template-a-pafw-sftp-myproject-8twc0tf.s3.amazonaws.com',
          port: '',
          pathname: '/dronemap-dv5hs/**',
        },
        {
          protocol: 'https',
          hostname: 'template-a-pafw-sftp-myproject-8twc0tf.s3.amazonaws.com',
          port: '',
          pathname: '/temp-vqeur/**',
        },
      ],
    },
  };

export default nextConfig;
