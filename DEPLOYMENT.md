# Vercel Deployment Guide

This guide will help you deploy the MonkaBreak Web3 game to Vercel.

## Prerequisites

1. A Vercel account
2. A Convex account and deployment
3. A WalletConnect project ID (optional but recommended)

## Environment Variables

Set the following environment variables in your Vercel project dashboard:

### Required Variables

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

### Optional Variables

```bash
# WalletConnect Configuration (recommended for better wallet support)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Custom environment variables
CUSTOM_KEY=your-custom-key
```

## Deployment Steps

### 1. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing this project

### 2. Configure Build Settings

Vercel should automatically detect this as a Next.js project. The build settings are already configured in `vercel.json`:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Set Environment Variables

1. In your Vercel project dashboard, go to "Settings" → "Environment Variables"
2. Add each environment variable listed above
3. Make sure to set them for all environments (Production, Preview, Development)

### 4. Deploy

1. Click "Deploy" in the Vercel dashboard
2. Wait for the build to complete
3. Your app will be available at the provided Vercel URL

## Post-Deployment

### 1. Verify Convex Integration

1. Check that your Convex deployment is working
2. Verify that the `NEXT_PUBLIC_CONVEX_URL` is correctly set
3. Test the game functionality

### 2. Configure Custom Domain (Optional)

1. In your Vercel dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Configure DNS settings as instructed by Vercel

### 3. Set up Monitoring

1. Enable Vercel Analytics (optional)
2. Set up error monitoring
3. Configure performance monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are properly installed
   - Verify TypeScript compilation passes locally
   - Check build logs in Vercel dashboard

2. **Environment Variables**
   - Ensure all required environment variables are set
   - Check that variable names match exactly
   - Verify values are correct

3. **Convex Connection Issues**
   - Verify `NEXT_PUBLIC_CONVEX_URL` is correct
   - Check Convex deployment status
   - Ensure CORS is properly configured

4. **Wallet Connection Issues**
   - Verify WalletConnect project ID is set
   - Check that wallet providers are accessible
   - Test with different browsers

### Performance Optimization

1. **Image Optimization**
   - Use Next.js Image component for optimized images
   - Configure proper image domains in `next.config.js`

2. **Bundle Optimization**
   - Monitor bundle size in Vercel dashboard
   - Use dynamic imports for large components
   - Optimize third-party dependencies

3. **Caching**
   - Configure proper cache headers
   - Use Vercel's edge caching features
   - Optimize static assets

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive environment variables to git
   - Use Vercel's environment variable management
   - Regularly rotate sensitive keys

2. **CORS Configuration**
   - Configure proper CORS settings for your domain
   - Restrict access to necessary origins only

3. **Content Security Policy**
   - Implement proper CSP headers
   - Monitor for security vulnerabilities

## Monitoring and Maintenance

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Update Convex deployment regularly

2. **Performance Monitoring**
   - Monitor Core Web Vitals
   - Track user experience metrics
   - Optimize based on performance data

3. **Error Tracking**
   - Set up error monitoring
   - Track and resolve issues promptly
   - Monitor user feedback

## Support

If you encounter issues during deployment:

1. Check the Vercel documentation
2. Review build logs in Vercel dashboard
3. Test locally with `npm run build`
4. Verify all environment variables are set correctly
5. Check Convex deployment status

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev) 