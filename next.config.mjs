let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  compress: false, // Disable compression in development
  webpack: (config, { dev, isServer }) => {
    // Development optimizations
    if (dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
        moduleIds: 'named',
        chunkIds: 'named',
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 20,
              enforce: true,
              chunks: 'all'
            }
          }
        },
        runtimeChunk: 'single'
      }
    }

    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 10000,
          maxSize: 250000,
        }
      }
    }

    return config
  },
  // Improve caching behavior
  generateBuildId: async () => 'build',
  // Disable compression middleware
  poweredByHeader: false,
  generateEtags: true,
  // Add output configuration for better chunk handling
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['react', 'react-dom']
  }
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
