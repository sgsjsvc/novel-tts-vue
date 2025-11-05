# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Novel Text-to-Speech (TTS) Processing and Analysis Tool** built with Vue 3, TypeScript, and Vite. The application allows users to upload novel files, parse chapters using AI models, and play audio versions with a comprehensive UI.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (localhost:3000) with hot reload
- `npm run build` - Production build with type checking
- `npm run type-check` - Run TypeScript type checking
- `npm run preview` - Preview production build locally
- `npm run build-only` - Build without type checking

### Node.js Requirements
Requires Node.js `^20.19.0 || >=22.12.0`

## Architecture Overview

### Core Structure
- **Component-Based Architecture** using Vue 3 Composition API
- **Service Layer** in `src/services/api.ts` for HTTP communication
- **State Management** using Vue's reactivity system
- **TypeScript** throughout for type safety

### Key Components
1. **App.vue** - Root component with novel upload, selection, and infinite scroll orchestration
2. **ChapterTable.vue** - Chapter listing with status indicators and action buttons
3. **GlobalPlayer.vue** - Collapsible audio player with line-by-line playback and highlighting
4. **LogDrawer.vue** - Slide-out system log viewer with real-time updates
5. **useIntersectionObserver.ts** - Composable for infinite scroll implementation

### API Integration
- Backend server runs at `http://127.0.0.1:8080`
- Development server proxies `/api` routes to backend
- API calls centralized in `src/services/api.ts` using Axios
- Features novel/chapter data fetching, parsing initiation, and audio file URLs

### Build Configuration
- **Vite** with Vue plugin and TypeScript support
- **Path aliases**: `@/*` maps to `./src/*`
- **Development server**: Host enabled on port 3000 with API proxy
- **Type checking**: Uses `vue-tsc` for Vue component type validation

### Development Workflow
1. Install dependencies: `npm install`
2. Start development: `npm run dev` (includes hot reload and API proxy)
3. Type checking runs automatically during build process
4. Production build runs type checking and compilation in parallel

## Special Notes
- Uses Element Plus component library for UI elements
- Implements infinite scroll for chapter loading
- Features a global audio player that persists across navigation
- Includes comprehensive logging system for debugging
- All components follow Vue 3 Composition API patterns