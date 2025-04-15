# Gitpod Flex Capacity Planning

A web-based tool to help plan Gitpod Flex runner infrastructure across AWS regions.

## Overview

This application helps you plan your [Gitpod Flex runner](https://www.gitpod.io/docs/flex/introduction/runners) infrastructure by:

- Calculating capacity requirements based on expected users and environments
- Planning subnet configurations across AWS regions and availability zones
- Visualizing runner capacity and utilization
- Generating exportable reports in PDF, CSV, and text formats

## Features

- Configure expected users and environments per user
- Set up AWS regions, availability zones, and VPC CIDR blocks
- Create and manage subnet configurations
- Allocate runners across regions with subnet assignments
- Calculate capacity and utilization metrics
- Export planning data in multiple formats
- Share configurations via URL

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Yarn or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/capacity-planning.git
cd capacity-planning

# Install dependencies
yarn
# or
npm install
```

### Development

```bash
# Start the development server
yarn dev
# or
npm run dev
```

The application will be available at http://localhost:5173

### Building for Production

```bash
# Build the application
yarn build
# or
npm run build

# Preview the production build
yarn preview
# or
npm run preview
```

## Technologies

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
