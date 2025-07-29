# Vercel Deployment Checklist

Use this checklist to ensure your MonkaBreak Web3 project is ready for Vercel deployment.

## ✅ Pre-Deployment Checklist

### 1. Code Quality
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Project builds successfully (`npm run build`)
- [ ] All dependencies are properly installed

### 2. Environment Variables
- [ ] `NEXT_PUBLIC_CONVEX_URL` is set to your Convex deployment URL
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set (optional but recommended)
- [ ] No sensitive environment variables are committed to git

### 3. Configuration Files
- [ ] `vercel.json` is present and properly configured
- [ ] `next.config.js` is optimized for production
- [ ] `package.json` has correct scripts and dependencies
- [ ] `tsconfig.json` is properly configured

### 4. Static Assets
- [ ] `public/manifest.json` is present
- [ ] `public/robots.txt` is present
- [ ] `public/sitemap.xml` is present
- [ ] Favicon and app icons are in place

### 5. SEO and Performance
- [ ] Meta tags are properly configured in `layout.tsx`
- [ ] Open Graph tags are set
- [ ] Twitter Card tags are configured
- [ ] Viewport settings are optimized

## 🚀 Deployment Steps

### 1. GitHub Repository
- [ ] Code is pushed to GitHub
- [ ] Repository is public or Vercel has access
- [ ] Main branch contains the latest code

### 2. Vercel Setup
- [ ] Vercel account is created
- [ ] GitHub repository is connected to Vercel
- [ ] Project is imported in Vercel dashboard

### 3. Environment Variables in Vercel
- [ ] `NEXT_PUBLIC_CONVEX_URL` is set in Vercel dashboard
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set (if using)
- [ ] Variables are set for all environments (Production, Preview, Development)

### 4. Build Configuration
- [ ] Framework preset is set to Next.js
- [ ] Build command is `npm run build`
- [ ] Output directory is `.next`
- [ ] Install command is `npm install`

## 🔍 Post-Deployment Verification

### 1. Build Success
- [ ] Build completes without errors
- [ ] No TypeScript compilation errors
- [ ] All dependencies are installed correctly

### 2. Application Functionality
- [ ] Homepage loads correctly
- [ ] Wallet connection works
- [ ] Convex integration is functional
- [ ] Game creation and joining works
- [ ] Real-time updates are working

### 3. Performance
- [ ] Page load times are acceptable
- [ ] Images are optimized
- [ ] Bundle size is reasonable
- [ ] Core Web Vitals are good

### 4. SEO and Accessibility
- [ ] Meta tags are present
- [ ] Open Graph tags work
- [ ] Robots.txt is accessible
- [ ] Sitemap is accessible

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in Vercel dashboard
   - Verify all dependencies are in `package.json`
   - Ensure TypeScript compilation passes locally

2. **Environment Variables**
   - Verify variables are set in Vercel dashboard
   - Check variable names match exactly
   - Ensure variables are set for all environments

3. **Convex Connection Issues**
   - Verify `NEXT_PUBLIC_CONVEX_URL` is correct
   - Check Convex deployment status
   - Ensure CORS is properly configured

4. **Wallet Connection Issues**
   - Verify WalletConnect project ID is set
   - Check that wallet providers are accessible
   - Test with different browsers

### Performance Optimization

1. **Bundle Size**
   - Monitor bundle size in Vercel dashboard
   - Use dynamic imports for large components
   - Optimize third-party dependencies

2. **Image Optimization**
   - Use Next.js Image component
   - Configure proper image domains
   - Optimize image formats

3. **Caching**
   - Configure proper cache headers
   - Use Vercel's edge caching
   - Optimize static assets

## 📞 Support

If you encounter issues:

1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
2. Review Vercel build logs
3. Test locally with `npm run build`
4. Verify environment variables are set correctly
5. Check Convex deployment status

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Vercel Dashboard](https://vercel.com/dashboard) 