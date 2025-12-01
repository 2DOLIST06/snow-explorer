<<<<<<< HEAD
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // Autorise les deux syntaxes (domain + remotePatterns)
    domains: [
      "localhost",
      "d38x6kuhd141c9.cloudfront.net",
      "2dolist-ski-images.s3.amazonaws.com",
      "2dolist-ski-images.s3.eu-west-3.amazonaws.com"
    ],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "d38x6kuhd141c9.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "2dolist-ski-images.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "2dolist-ski-images.s3.eu-west-3.amazonaws.com",
      }
    ],
  },
};

module.exports = nextConfig;
=======
module.exports = {
  reactStrictMode: true,
};
>>>>>>> c32facd2a0056499b7519bbda281a285c9fb325d
