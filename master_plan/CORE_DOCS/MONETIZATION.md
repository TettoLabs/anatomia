# Monetization

Revenue model, pricing strategy, and path to profitability.

---

## Revenue Philosophy

### Core Principle: Value Before Revenue

1. **Free tier must be genuinely useful** - Not crippled or annoying
2. **Paid tier must provide clear additional value** - Not arbitrary gates
3. **Pricing must feel fair** - Aligned with value delivered
4. **Upgrade path must be natural** - Users want to pay, not forced to

### The Free/Paid Split Logic

**Free = Setup + Manual Maintenance**
- Full init with smart analysis
- All core modes
- Manual evolve
- Health check

**Paid = Automation + Intelligence**
- Auto-learning (daemon)
- Snapshots and history
- Dashboard and analytics
- Advanced features

The key: Free users do manual work. Paid users get automation.

---

## Pricing Tiers

### Free (Forever Free)

**What's included:**
- `ana init` with full smart analysis
- All 5 core modes (architect, code, debug, docs, test)
- `ana evolve` (manual context update)
- `ana health` (context freshness check)
- `ana teach` (add explicit knowledge)
- Git hook tracking (data collection for future learning)
- Works offline, no account required

**Limits:**
- No auto-learning (manual evolve only)
- No snapshots
- No dashboard
- No custom modes
- No Pattern Cloud access

**Why this works:**
- Genuinely useful for getting started
- Demonstrates value before asking for money
- Creates habit and dependency
- Collects data that powers learning (consented)

---

### Pro - $19/month

**What's included (everything in Free, plus):**
- **Semantic query search** - LLM-powered queries (uses your API key)
- **Public node access** - Query nextjs.org/.ana/, stripe.com/.ana/, etc.
- **Local dashboard** - Web UI for analytics and context management
- **Context snapshots** - Save and restore context states
- **Advanced features** - Based on user feedback during MVP3
- **Priority support** - Email support with 24h response

**Target user:**
- Power users who use AI daily
- Developers working with multiple services/frameworks
- Freelancers/consultants (time = money)
- Solo devs managing complex codebases

**Why $19/month:**
- Low enough for individual payment (no manager approval needed)
- Below psychological threshold ($20)
- Competitive with similar dev tools
- At 1000 users = $19K MRR (sustainable indie business)

---

### Team - $99/month + $15/seat

**What's included (everything in Pro, plus):**
- **Cloud node sync** - Team nodes synchronized across services
- **Shared pattern library** - Collective team knowledge compounds
- **Onboarding analytics** - Track time to productivity with federated nodes
- **Team federation dashboard** - Visualize node network across org
- **Admin controls** - Manage team nodes and access
- **Slack integration** - Notifications for broadcasts and inbox messages
- **Priority support** - 4h response, Slack channel

**Base includes:** 5 seats
**Additional seats:** $15/month each

**Target user:**
- Engineering teams with monorepos/microservices (5-50 people)
- Companies with multiple services needing coordination
- Teams wanting to share AI context across services

**Why $99 + $15/seat:**
- Team pricing justifies manager approval
- Per-seat scales with value
- Federation value compounds with team size
- At 100 teams = $15K+ MRR per month

---

### Enterprise - Custom Pricing

**What's included (everything in Team, plus):**
- **SSO/SAML** - Enterprise authentication
- **Audit logs** - Complete activity tracking
- **API access** - Full programmatic access
- **Custom integrations** - Jira, GitHub Enterprise, etc.
- **On-prem option** - Self-hosted deployment
- **Dedicated support** - Named account manager, SLA
- **Custom training** - Onboarding for large teams

**Target user:**
- Large enterprises (100+ developers)
- Compliance-sensitive industries
- Organizations with security requirements

**Pricing approach:**
- Annual contracts ($50K-200K+)
- Based on developer count
- Custom scoping

---

## Conversion Mechanics

### Free → Pro Conversion Triggers

**Trigger 1: Semantic query need**
```
When keyword query returns poor results:
"Semantic search (LLM-powered) could find better answers.
Pro unlocks semantic queries for $19/mo."
```

**Trigger 2: Public node interest**
```
When user asks about framework docs:
"Want to query nextjs.org/.ana/ directly?
Pro enables public node access."
```

**Trigger 3: Feature discovery**
```
When user tries Pro feature:
"Dashboard analytics are a Pro feature.
Start 14-day free trial?"
```

**Trigger 4: Time investment**
```
After 30 days of active use:
"You've invested 12 hours in context.
Pro adds semantic search and public nodes for $19/mo."
```

### Pro → Team Conversion Triggers

**Trigger 1: Multi-node usage**
```
When user has 3+ nodes in federation:
"Sharing nodes across your team?
Team sync keeps everyone's context current."
```

**Trigger 2: Broadcast usage**
```
After 5th broadcast:
"Coordinating across services frequently?
Team tier syncs broadcasts and patterns automatically."
```

**Trigger 3: Onboarding pain**
```
When new team member joins:
"New developers onboarding?
Team federation shares collective knowledge automatically."
```

### Team → Enterprise Conversion Triggers

**Trigger 1: Scale**
- Team exceeds 20 seats
- Multiple teams from same company

**Trigger 2: Compliance questions**
- Asks about SSO
- Asks about audit logs
- Asks about on-prem

**Trigger 3: Integration needs**
- Requests API access
- Needs custom integrations

---

## Preventing DIY Replacement

**Risk:** "I could just write these files myself"

**Why users won't:**

1. **Time investment**
   - Manual context creation: 2-4 hours
   - Ana init: 30 seconds
   - Ongoing maintenance: hours/week vs automatic

2. **Quality difference**
   - Ana's analysis is comprehensive
   - Patterns detected they'd miss
   - Templates are battle-tested

3. **Learning engine**
   - Outcome tracking is sophisticated
   - Pattern confidence is calculated
   - Hard to replicate manually

4. **Continuous improvement**
   - We improve templates
   - We add new analyzers
   - Community patterns get better

5. **$19 vs hours of work**
   - Developer time: $50-150/hour
   - Pro pays for itself in first hour

---

## Revenue Projections

### Year 1 Targets

| Metric | M3 | M6 | M12 |
|--------|-----|-----|------|
| Free users | 500 | 2,000 | 10,000 |
| Pro users | 20 | 100 | 500 |
| Pro MRR | $380 | $1,900 | $9,500 |
| Team customers | 0 | 5 | 20 |
| Team MRR | $0 | $750 | $3,000 |
| **Total MRR** | **$380** | **$2,650** | **$12,500** |

### Break-even Analysis

**Costs (estimated monthly):**
- Supabase (free tier → $25) = $25
- Vercel (free tier → $20) = $20
- Domain/email = $15
- Misc = $40
- **Total: ~$100/month**

**Break-even:** 6 Pro users ($114 MRR)

**Ramen profitable:** 50 Pro users ($950 MRR)

**Sustainable indie:** 500 Pro users ($9,500 MRR)

---

## Payment Infrastructure

### MVP2 (First Revenue)

**Stripe Checkout:**
- Simple hosted checkout
- Manage subscriptions
- Handle billing emails
- No complex integration

**Implementation:**
- License key stored in `~/.ana/license`
- CLI checks license on Pro command invocation
- Grace period for network issues
- Offline mode with cached validation

### MVP3 (Team/Enterprise)

**Stripe + Custom:**
- Team subscription management
- Seat counting
- Invoice generation for enterprise

---

## Pricing Experiments to Run

### A/B Tests (After Launch)

1. **$19 vs $29 for Pro**
   - Does $29 hurt conversion?
   - Does it attract more serious users?

2. **Monthly vs Annual discount**
   - 20% discount for annual?
   - Does it improve retention?

3. **Trial length**
   - 7-day vs 14-day vs 30-day
   - What maximizes conversion?

### User Research

1. **Willingness to pay survey**
   - What features matter most?
   - What's the price sensitivity?

2. **Competitor pricing analysis**
   - How does this compare?
   - What's the value anchoring?

3. **Enterprise pricing discovery**
   - What budget do teams have?
   - What's the approval process?

---

## Long-term Revenue Opportunities

### Pattern Cloud Marketplace

- Developers share/sell mode templates
- Framework-specific mode packs
- 70/30 revenue split
- Curation and quality control

### Training and Certification

- Anatomia power user certification
- Enterprise training programs
- Consulting for large deployments

### White-label / OEM

- License to other dev tools
- Integration partnerships
- Platform embedding

### API Business

- Usage-based API pricing
- Enterprise API access
- Partner integrations

---

## Key Metrics to Track

### Acquisition
- GitHub stars
- npm downloads
- Website visitors
- Sign-ups

### Activation
- Init completion rate
- First mode usage
- Week 1 retention

### Revenue
- Free → Trial conversion
- Trial → Pro conversion
- Pro → Team conversion
- Churn rate
- LTV

### Engagement
- Evolve frequency
- Mode usage distribution
- Daemon uptime
- Dashboard visits

---

*This is how we make money. Now let's look at how we get users.*
