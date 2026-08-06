# ID-page verification inventory

This inventory covers the three record pages: customer vendor (`/app/vendors/[id]`), Manage account (`/manage/accounts/[id]`), and Manage contact (`/manage/contacts/[id]`). It distinguishes automated evidence from the browser and production checks that still require an authenticated, disposable-record run.

| Acceptance area | Unit / route coverage | Integration / live coverage | Playwright / manual proof |
| --- | --- | --- | --- |
| Shared menu, edit, danger, history, and dirty-draft behavior | `record-overflow-menu.test.ts`, `draft-state.test.ts`, `record-editing.test.ts` | N/A | Keyboard menu, focus restoration, mobile sheet |
| Vendor edit, lifecycle, monitoring, deletion preview, history | `api/portal/vendors/[id]/route.test.ts`, `monitoring/route.test.ts` | Pilot and tenant-isolation integration suites | Authenticated vendor flow; desktop and mobile screenshots |
| Account edit, ID-based primary contact, archive/restore, deletion preview, history | `api/manage/accounts/[id]/route.test.ts` | Atomic record-mutation and tenant-isolation live suites | Account edit/conflict/archive/history and Archived-list proof |
| Contact edit, primary contact, movement, deactivate/restore, deletion preview, history | `api/manage/contacts/[id]/route.test.ts` | Atomic record-mutation and tenant-isolation live suites | Contact edit/move/history/workspace-removal proof |
| Tenant and role boundaries | Route authorization tests and repository tests | `tenant-isolation.live.integration.test.ts` | Authenticated customer/operator roles |
| URL tabs, back/forward, no overflow, quiet triggers, focus, touch | N/A | N/A | Required at 1440×900, 1024×768, 820×1180, 390×844, and 375×812 |
| Production database posture | N/A | Supabase migration/security/performance advisor checks | N/A |

## Required release evidence

Capture screenshots under `output/playwright/id-pages-final/` using only disposable records. Do not save browser auth state, private source files, or customer data. The required image names are defined in `07_TESTING_BROWSER_QA_AND_RELEASE.md`.

## Current status

The component, route, unit, integration, build, and public-browser checks are tracked in `STATUS.md`. A release verdict of `ID_PAGES_COMPLETE` additionally requires merged chunks, an exact-main quality gate, live Supabase checks, authenticated record-page screenshots, and disposable production smoke journeys. Until those are completed, the valid verdict is `INTERNAL_TESTING_ONLY`.
