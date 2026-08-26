# Persistent Project Instructions & Rules

## API Integration & Removal Rules
1. **VoltxSMS / m29 API integration**:
   - Source: `https://voltxsms.com/m29/#/doc/api`
   - Services integrated: Get Number, Console, Summary, Access List, Sender/Range, 2oo9 Terminal.
   - Module location: `src/services/voltxApi.ts`

2. **API Removal Rule (Strict User Command)**:
   - When the user asks in Bengali or English to remove all APIs (e.g., "এপিআই সব রিমুভ করো", "সকল এপিআই রিমুভ করো", "remove all api", "delete api"):
   - ONLY remove/detach the API integration endpoints, while preserving the user account code, SUPER X SMS branding, and UI layout.
