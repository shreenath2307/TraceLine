# Traceline — AI Indoor Positioning for Sparse Infrastructure

Modern Multi-Page React application engineered for sparse enterprise RTLS deployments with high-performance animations, spring physics, and real-time canvas positioning simulation.

## Tech Stack
- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) Multi-Page Application (MPA)
- **Animation Engine**: [Framer Motion](https://www.framer.com/motion/) (spring physics, layout transitions, scroll triggers, presence state)
- **Deployment**: [Vercel](https://vercel.com/) with static clean URLs for all routes
- **Simulation**: High-FPS HTML5 Canvas mathematical Gauss-Newton trilateration engine
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern dark-mode Glassmorphic CSS design system with HSL tailored signals

## Project Structure
- `index.html` - Home page entry (`/`)
- `business/index.html` - Business analysis & market sizing entry (`/business`)
- `pricing/index.html` - Deployment plans & hardware density estimator entry (`/pricing`)
- `security/index.html` - Zero-trust data flow & DPDP Act compliance entry (`/security`)
- `console/index.html` - Interactive positioning console & benchmark suite entry (`/console`)
- `src/entries/` - Dedicated entry points for each page
- `src/context/AnimationContext.jsx` - Global animation pause/resume controller
- `src/components/` - Shared components:
  - `Navbar.jsx` - Frosted glass navigation with Framer Motion active pill
  - `Footer.jsx` - Team directory and metadata
  - `Wordmark.jsx` - Interactive dot-matrix "traceline" SVG wordmark
  - `Background.jsx` - Atmospheric video and radial glow backdrops
  - `PauseButton.jsx` - Global animation pause/play floating action button
- `src/pages/` - Application views:
  - `HomePage.jsx` - Landing overview, problem analysis, 7 capabilities, pipeline
  - `ConsolePage.jsx` - The full interactive console (Live Radar Map, Placement Optimizer, Error Heatmap, Stress Tester, Devices/Health, Privacy & Audit)
  - `BusinessPage.jsx` - TAM/SAM/SOM breakdown, animated SVG charts, and interactive ROI calculator
  - `PricingPage.jsx` - 2 BHK / 3 BHK flat size estimator, enquiry form, and FAQ accordion
  - `SecurityPage.jsx` - Cryptographic pillars, zero-trust data flow, and DPDP Act compliance
- `src/team.json` - Team details, roles, and institutional affiliations

## Quick Start
```bash
# Install dependencies
npm install

# Start local development server (port 3000)
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```
