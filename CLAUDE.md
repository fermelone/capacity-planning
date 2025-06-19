# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `yarn dev` or `npm run dev` - Start development server (available at http://localhost:5173)
- `yarn build` or `npm run build` - Build for production (runs TypeScript compilation then Vite build)
- `yarn lint` or `npm run lint` - Run ESLint
- `yarn preview` or `npm run preview` - Preview production build locally

### Installation
- `yarn` or `npm install` - Install dependencies

## Architecture Overview

This is a **Gitpod Flex Capacity Planning** tool - a React TypeScript application for planning AWS runner infrastructure. The app helps users calculate capacity requirements, configure subnets, and manage runner allocations across AWS regions.

### Core Application Structure

**Main Components:**
- Single-page application in `src/App.tsx` (970+ lines) containing all business logic
- Uses shadcn/ui component library with extensive Radix UI components
- State managed entirely with React hooks (no external state management)

**Key Features:**
1. **Environment Calculation**: User count and environments per user configuration
2. **Network Configuration**: AWS region selection, availability zones, VPC CIDR blocks
3. **Subnet Management**: Create/configure subnets within VPC with IP calculations
4. **Runner Configuration**: Allocate runners across regions with subnet assignments
5. **Export Functionality**: PDF, CSV, and text format exports using jsPDF and PapaParse
6. **URL State Sharing**: Configuration encoded in URL parameters for sharing

### Data Models

**Core Interfaces:**
- `Runner`: Represents compute runners with region, user allocation, and subnet assignments
- `Subnet`: VPC subnet configuration with CIDR calculations and available IPs

**State Management:**
- All state in App component using useState hooks
- URL-based state persistence for sharing configurations
- Real-time capacity calculations and validation warnings

### UI Component Architecture

**Component Library**: shadcn/ui components built on Radix UI primitives
- Extensive use of Card, Table, Input, Select, Button components
- Tooltip integration for help text
- Toast notifications for user feedback

**Styling**: Tailwind CSS with custom theme configuration

### Development Configuration

**Build System**: Vite with TypeScript
- Path alias `@/*` maps to `./src/*`
- React plugin for JSX support
- Lucide React excluded from optimization

**Linting**: ESLint with React and TypeScript configurations
- React hooks plugin
- React refresh plugin for development

**Important Notes:**
- No test suite currently configured
- No backend API - purely client-side application
- Deployed to Netlify (https://flex-capacity-planner.netlify.app)
- IP calculations account for AWS reserved IPs (first 4 + last 1 in each subnet)