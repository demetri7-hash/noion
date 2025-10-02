<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# NOION Analytics - AI-Powered Restaurant Analytics Platform

## Project Overview
SaaS platform providing AI-driven human analytics for restaurants using POS data integration and behavioral analysis.

## Architecture
- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Express.js with MongoDB, Redis for caching
- **AI**: Anthropic Claude for insight generation
- **Integrations**: Toast POS API, Stripe payments, SendGrid emails

## Development Status
- [x] ✅ **Clarify Project Requirements** - AI-powered restaurant analytics platform
- [x] ✅ **Scaffold the Project** - Next.js with TypeScript and full stack setup
- [ ] 🚧 **Customize the Project** - Adding database models, authentication, POS integration
- [ ] ⏰ **Install Required Extensions** - TBD based on setup requirements
- [ ] ⏰ **Compile the Project** - Install dependencies and resolve issues  
- [ ] ⏰ **Create and Run Task** - Setup development and build tasks
- [ ] ⏰ **Launch the Project** - Start development server
- [ ] ⏰ **Ensure Documentation is Complete** - Update README and cleanup

## Key Features
- POS system integration (Toast API)
- AI-powered insight generation
- Revenue leakage detection
- Employee performance analytics
- Free discovery reports (65% conversion tool)
- Multi-tier subscription system

## Business Model
- **Pulse Tier**: $29-99/month (lead generation)
- **Intelligence Tier**: $299-799/month (core analytics)
- **Command Tier**: $2,500-10K/month (enterprise)

## Security Requirements
- JWT authentication
- API key encryption
- Rate limiting
- Input validation
- HTTPS enforcement