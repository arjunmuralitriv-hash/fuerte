# Fuerte website: English content drafts (Phase 1)

English copy for every page in the approved site map (plan sections 1, 5, 6, 7 and 9). Arabic is produced later through the glossary-driven pipeline (plan section 3), seeded from [`en/glossary.md`](en/glossary.md).

**Status:** draft for client sign-off. Nothing here is approved for publication. Legal pages also need Qatari counsel review.

## Conventions

- **Front-matter on every page:** `title`, `metaTitle` (under 60 characters), `metaDescription` (under 155 characters), `slug`, `primaryKeyword`, plus optional `secondaryKeywords`. Service pages also carry `pillar` for breadcrumbs.
- **Slugs are canonical paths without the locale prefix.** The build adds `/en` or `/ar`. Sub-service files sit in pillar folders for tidiness, but their slugs are flat (`/services/cctv`, not `/services/elv/cctv`).
- **Sub-service pages** open with a 40–60-word direct answer and include question-style H2s, "What's included", "Industries we serve", a 4–6-question FAQ and a service-specific CTA. Resource augmentation and AMC have no sub-pages, so their pillar pages follow the same pattern.
- **CTAs** use the same three labels everywhere: "Book a free site survey" (primary), "Request a quote" (secondary), "WhatsApp an engineer" (always visible). Service pages use a service-specific version of the primary CTA.
- **Spelling:** British English (organisation, licence, fibre, centre), except these fixed industry terms, which keep US spelling: *data center*, *command and control center*, *security operations center*, *contact center*.
- **Brand name:** "Fuerte Technologies & Contracting Services" on first mention, then "Fuerte". The legal name is a placeholder until it is confirmed against the CR.
- **HTML comments** (`<!-- … -->`) are notes for designers and developers. Don't render them.
- **Placeholders:** `[CONFIRM: …]` = a fact the client must verify; `[PLACEHOLDER: …]` = an asset or content the client must supply; `[EMAIL]` = email address (now resolved to contact@fuertetechnologies.com, 19 Oct 2026); `[CR NUMBER]` = commercial registration number.

## Rules applied

- The competitor is never named.
- No certification, licence or approval is claimed as held. ISO, ICV, MoI SSD, QCDD and vendor partnerships are all behind `[CONFIRM]`. CCTV copy says "designed to MoI SSD requirements" until a licence is confirmed.
- No invented client names, statistics or testimonials. All proof uses `[PLACEHOLDER]`.
- Brochure fixes: "contracting" replaces "contractual", "As a startup" is removed, and the website domain `fuertetechnologies.com` is used (pending confirmation). Chicago imagery is replaced by Doha and 3D renders in the design brief.
- Contact details come from the brochure: +974 7125 8588; 2nd Floor, Al Kazim Building, Umm Ghuwailina, P.O. Box 9044, Doha. Email is contact@fuertetechnologies.com (the brochure's contact@ mailbox on the confirmed domain).
- Every legal page is marked "DRAFT: requires Qatari counsel review".

## Checks run

A script checked every file for: all front-matter fields filled; `metaTitle` under 60 and `metaDescription` under 155 characters; unique `metaTitle` and `primaryKeyword` across pages (no cannibalisation); exactly one H1; 40–60-word opening answer, 4–6 FAQs, "What's included" and "Industries we serve" on every service page; no broken internal links; no orphan pages; no banned terms (competitor name, "contractual", "startup"). All pass.

Keyword placement was then reviewed with the `marketing:seo-audit` on-page checklist: the primary keyword (or a natural variant) is in each `metaTitle` and in the first 100 words. H1s are kept as short page labels; the longer `title` field carries the keyword for the `<title>`/breadcrumb. RFQ, vendor-pack, careers and cookie-banner microcopy follows the `design:ux-copy` patterns: verb-first buttons, errors that say what happened and how to fix it, unticked consent boxes.

The user's technical SEO launch checklist is kept in [`seo-technical-checklist.md`](seo-technical-checklist.md), with each item tagged as a content or build responsibility.

## Not covered here (follow-ups)

- 404 page copy (plan section 9: "404 with a mini 3D scene")
- Projects/case studies and Clients & Partners pages (need client assets first)
- Tools pages (CCTV and storage planner, cabling points estimator, server-room readiness check, cyber health score): Release 2
- Image alt text (no images yet)
- Arabic versions of every page (plan section 3)


## File index


### Core and conversion pages

| File | Slug | Primary keyword |
|---|---|---|
| [en/home.md](en/home.md) | `/` | IT and ELV contractor Qatar |
| [en/about.md](en/about.md) | `/about` | contracting company Doha |
| [en/amc-plans.md](en/amc-plans.md) | `/amc-plans` | AMC plans Qatar |
| [en/careers.md](en/careers.md) | `/careers` | ELV jobs Qatar |
| [en/contact-rfq.md](en/contact-rfq.md) | `/contact` | contact Fuerte |
| [en/emergency-cyber-response.md](en/emergency-cyber-response.md) | `/emergency-cyber-response` | cyber incident response Qatar |
| [en/glossary.md](en/glossary.md) | `/glossary` | ELV glossary |
| [en/vendor-pack.md](en/vendor-pack.md) | `/vendor-pack` | Fuerte vendor pack |

### Services

| File | Slug | Primary keyword |
|---|---|---|
| [en/services/index.md](en/services/index.md) | `/services` | IT and ELV services Qatar |
| [en/services/amc.md](en/services/amc.md) | `/services/amc` | annual maintenance contract Qatar |
| [en/services/cyber-security.md](en/services/cyber-security.md) | `/services/cyber-security` | cyber security company Qatar |
| [en/services/cyber-security/grc.md](en/services/cyber-security/grc.md) | `/services/grc` | PDPPL compliance Qatar |
| [en/services/cyber-security/managed-soc.md](en/services/cyber-security/managed-soc.md) | `/services/managed-soc` | managed SOC Qatar |
| [en/services/cyber-security/security-awareness-training.md](en/services/cyber-security/security-awareness-training.md) | `/services/security-awareness-training` | security awareness training Qatar |
| [en/services/cyber-security/vapt.md](en/services/cyber-security/vapt.md) | `/services/vapt` | VAPT Qatar |
| [en/services/data-center.md](en/services/data-center.md) | `/services/data-center` | data center services Qatar |
| [en/services/data-center/data-center-design-build.md](en/services/data-center/data-center-design-build.md) | `/services/data-center-design-build` | data center contractor Qatar |
| [en/services/data-center/data-center-network.md](en/services/data-center/data-center-network.md) | `/services/data-center-network` | data center network Qatar |
| [en/services/data-center/servers-storage-backup.md](en/services/data-center/servers-storage-backup.md) | `/services/servers-storage-backup` | backup and disaster recovery Qatar |
| [en/services/elv.md](en/services/elv.md) | `/services/elv` | ELV contractor Qatar |
| [en/services/elv/access-control.md](en/services/elv/access-control.md) | `/services/access-control` | access control system Qatar |
| [en/services/elv/audio-visual.md](en/services/elv/audio-visual.md) | `/services/audio-visual` | audio visual solutions Qatar |
| [en/services/elv/bms.md](en/services/elv/bms.md) | `/services/bms` | BMS contractor Qatar |
| [en/services/elv/cctv.md](en/services/elv/cctv.md) | `/services/cctv` | CCTV installation Qatar |
| [en/services/elv/fire-alarm.md](en/services/elv/fire-alarm.md) | `/services/fire-alarm` | fire alarm system Qatar |
| [en/services/elv/home-automation.md](en/services/elv/home-automation.md) | `/services/home-automation` | home automation Qatar |
| [en/services/elv/public-address.md](en/services/elv/public-address.md) | `/services/public-address` | public address system Qatar |
| [en/services/resource-augmentation.md](en/services/resource-augmentation.md) | `/services/resource-augmentation` | IT staff augmentation Qatar |
| [en/services/technology.md](en/services/technology.md) | `/services/technology` | IT services Qatar |
| [en/services/technology/business-applications.md](en/services/technology/business-applications.md) | `/services/business-applications` | ERP implementation Qatar |
| [en/services/technology/it-consulting.md](en/services/technology/it-consulting.md) | `/services/it-consulting` | IT consulting Qatar |
| [en/services/technology/network-design.md](en/services/technology/network-design.md) | `/services/network-design` | network installation Qatar |
| [en/services/technology/structured-cabling.md](en/services/technology/structured-cabling.md) | `/services/structured-cabling` | structured cabling Doha |
| [en/services/technology/unified-communications.md](en/services/technology/unified-communications.md) | `/services/unified-communications` | IP PBX Qatar |

### Industries

| File | Slug | Primary keyword |
|---|---|---|
| [en/industries/banking.md](en/industries/banking.md) | `/industries/banking` | bank cyber security Qatar |
| [en/industries/education.md](en/industries/education.md) | `/industries/education` | school IT solutions Qatar |
| [en/industries/government.md](en/industries/government.md) | `/industries/government` | government IT contractor Qatar |
| [en/industries/healthcare.md](en/industries/healthcare.md) | `/industries/healthcare` | healthcare IT solutions Qatar |
| [en/industries/hospitality-retail.md](en/industries/hospitality-retail.md) | `/industries/hospitality-retail` | hotel IT solutions Qatar |
| [en/industries/oil-gas.md](en/industries/oil-gas.md) | `/industries/oil-gas` | oil and gas IT services Qatar |
| [en/industries/residential.md](en/industries/residential.md) | `/industries/residential` | compound security systems Qatar |

### Insights (cornerstone guides)

| File | Slug | Primary keyword |
|---|---|---|
| [en/insights/moi-ssd-cctv-approval-qatar.md](en/insights/moi-ssd-cctv-approval-qatar.md) | `/insights/moi-ssd-cctv-approval-qatar` | MoI SSD CCTV approval Qatar |
| [en/insights/pdppl-compliance-checklist-qatar.md](en/insights/pdppl-compliance-checklist-qatar.md) | `/insights/pdppl-compliance-checklist-qatar` | PDPPL compliance checklist |
| [en/insights/structured-cabling-standards-cat6-cat6a-fibre.md](en/insights/structured-cabling-standards-cat6-cat6a-fibre.md) | `/insights/structured-cabling-standards-cat6-cat6a-fibre` | Cat6 vs Cat6A |

### Legal (all DRAFT: requires Qatari counsel review)

| File | Slug | Primary keyword |
|---|---|---|
| [en/legal/accessibility-statement.md](en/legal/accessibility-statement.md) | `/legal/accessibility-statement` | Fuerte accessibility statement |
| [en/legal/ai-assistant-notice.md](en/legal/ai-assistant-notice.md) | `/legal/ai-assistant-notice` | Fuerte AI assistant |
| [en/legal/cookies.md](en/legal/cookies.md) | `/legal/cookies` | Fuerte cookie notice |
| [en/legal/data-request.md](en/legal/data-request.md) | `/legal/data-request` | Fuerte data request |
| [en/legal/legal-information.md](en/legal/legal-information.md) | `/legal/legal-information` | Fuerte commercial registration |
| [en/legal/privacy.md](en/legal/privacy.md) | `/legal/privacy` | Fuerte privacy notice |
| [en/legal/responsible-disclosure.md](en/legal/responsible-disclosure.md) | `/legal/responsible-disclosure` | Fuerte responsible disclosure |
| [en/legal/terms.md](en/legal/terms.md) | `/legal/terms` | Fuerte terms of use |

Total: 52 pages, plus this README and `seo-technical-checklist.md`.

## Client questions: [CONFIRM] and [PLACEHOLDER] summary

Answering these questions clears almost every placeholder in the drafts. The full per-file list is in the appendix below.

### A. Company identity and legal (blocks launch)

1. **Legal name in English, exactly as on the CR**, plus the **Arabic trade name** and **legal form** (e.g. W.L.L.).
2. **CR number** `[CR NUMBER]`, registered activities and registered address (does it match the brochure address?).
3. ~~**Email domain**~~: confirmed `fuertetechnologies.com` (19 Oct 2026); general contact is contact@fuertetechnologies.com. Still needed: dedicated addresses (if any) for privacy, security reports and support.
4. **Website domain** and whether to register `.qa` / `.com.qa`.
5. Trade or municipality licence number and establishment card number (for the Legal Information page and vendor pack).
6. **Year founded**, employee count and number of certified engineers.
7. Leadership names, titles, bios and photos.
8. Office hours.

### B. Licences, certifications and registrations (show only what is held)

9. **MoI SSD licence**: held? Number? If not, which licensed partner handles CCTV submissions?
10. **QCDD registration** for fire alarm work: held? If not, which partner?
11. **ISO certificates** (9001, 27001, 45001, 14001): which are held, with numbers and expiry dates.
12. **ICV certificate** and score.
13. Government supplier registrations (e.g. Monaqasat) and oil and gas operator vendor registrations.
14. Vendor partnerships and partner levels (network, CCTV, cabling, ERP, server and storage brands).
15. Manufacturer cabling warranty programmes Fuerte can register.
16. Staff certifications: security (OSCP, CEH, CREST, CISSP, CISM, ISO 27001 LA), data center design, HSE (H2S, working at height, first aid).
17. Insurance: public liability, professional indemnity, workers' compensation.

### C. Proof and assets

18. Client logos, each with **written permission**.
19. Verified stats for the home proof strip: projects delivered, devices or points installed, certified engineers.
20. At least one testimonial with name, title, organisation and permission.
21. Case studies for each industry: challenge, solution, measurable result, with permission.
22. Logo vector, photos and the new company profile PDF, capability statement, HSE policy and quality policy PDFs.
23. Current job vacancies.

### D. Service scope (confirm or remove)

24. Hazardous-area (Ex-rated) work for oil and gas, and remote-site coverage.
25. In-house software development capability, and the ERP or application platforms implemented.
26. Fire suppression (FM-200) scope and partner.
27. Simultaneous interpretation AV scope; GSAS project experience; supported hotel PMS platforms.
28. SOC operating model: in-house, in Qatar or partner? Analyst hours, alert response targets, log retention and data location.
29. VAPT: retest terms and report turnaround.
30. Incident response: a dedicated 24/7 number, remote and on-site response targets, terms for non-clients, and whether a retainer is offered.
31. Carrier integration and number porting for VoIP.

### E. Commercial terms

32. **AMC tiers**: hours, response and restoration times, preventive visits, spare parts, service credits, contract length, upgrade and downgrade terms, and the final exclusions list.
33. Quote validity, payment terms, and where full commercial terms are published (E-Commerce Law Art. 55).
34. Lead response target (e.g. 1 working day), quote turnaround and RFQ budget bands.
35. Resource augmentation: roles available, CV lead time, employment model (Fuerte sponsorship or subcontract), minimum term, replacement and conversion terms.
36. Careers: visa sponsorship, graduate roles, benefits, training policy, talent-pool retention.
37. File upload limit for the RFQ form; vendor-pack link expiry.
38. Consultancy pricing: publish a starting price or not.

### F. Regulatory wording (for counsel or an expert to verify)

39. PDPPL: competent department name within NCSA, penalty figures, rights wording, response timeframe, breach-notification threshold and the 72-hour guidance, lawful-basis terminology, and whether special-category data needs a permit.
40. MoI SSD: law title (Law 9 of 2011), covered facility list, retention periods, approved product list, submission route, timelines, certificate name and renewal, home CCTV rules and penalties.
41. QCDD: submission route and maintenance frequency.
42. NIA: current version and applicability. QCB requirements for banks. Ministry of Public Health references for healthcare.
43. Decree-Law 16/2010 Art. 51 field list; VoIP legality wording; cybercrime reporting body; responsible-disclosure safe-harbour wording.
44. Retention schedule: enquiries, contracts, applicants, vendor-pack requests, security logs and AI assistant logs.
45. Processor list: host, database region, email provider, CRM (Zoho or HubSpot), AI provider and its no-training terms.
46. Cookie names and durations: regenerate from a live-site scan before launch.
47. Accessibility audit result and known issues.


## Appendix: every placeholder, by file

Generated from the drafts. Each line is one unique item in that file; the same question often repeats across pages, so answer the summary above first and these will mostly resolve themselves. `[EMAIL]` and `[CR NUMBER]` appear throughout and are not listed per file.


**en/home.md** (8)

- [PLACEHOLDER: number of projects delivered]
- [PLACEHOLDER: number of devices or cable points installed]
- [PLACEHOLDER: number of certified engineers]
- [PLACEHOLDER: year founded]
- [CONFIRM: list only certifications and licences Fuerte actually holds, e.g. ISO 9001, ISO 27001, ICV score, MoI SSD licence, QCDD registration. Show none until confirmed.]
- [PLACEHOLDER: client logos, each with written permission on file]
- [PLACEHOLDER: one verified client quote with name, title and organisation, used with written permission]
- [CONFIRM: dedicated 24/7 emergency number]

**en/about.md** (6)

- [PLACEHOLDER: year founded]
- [PLACEHOLDER: number of employees and certified engineers]
- [PLACEHOLDER: names, titles and short bios of the leadership team, with photos]
- [CONFIRM: HSE certifications held, e.g. ISO 45001 or ISO 14001. Do not display any until confirmed.]
- [CONFIRM: list each certification, licence and registration actually held, with number and expiry date. Candidates: ISO 9001, ISO 27001, ISO 45001, ICV certificate and score, MoI SSD licence, QCDD registration, Ministry of Commerce and Industry registration.]
- [PLACEHOLDER: technology partner logos, shown only under each vendor's partner-programme rules]

**en/amc-plans.md** (17)

- [CONFIRM]
- [CONFIRM: hours]
- [CONFIRM: e.g. 4 business hours]
- [CONFIRM: e.g. 2 hours]
- [CONFIRM: e.g. 30 minutes]
- [CONFIRM: e.g. next business day]
- [CONFIRM: e.g. 8 hours]
- [CONFIRM: e.g. 4 hours]
- [CONFIRM: e.g. 2 business days]
- [CONFIRM: e.g. 2]
- [CONFIRM: e.g. 4]
- [CONFIRM: e.g. 12]
- [CONFIRM: parts policy]
- [CONFIRM: QCDD requirements]
- [CONFIRM: final exclusions list with Qatari counsel, to align with the AMC terms (Decree-Law 16/2010 Art. 55 transparency).]
- [CONFIRM: downgrade terms.]
- [CONFIRM: number]

**en/careers.md** (7)

- [CONFIRM: training and certification policy]
- [CONFIRM: benefits to list, e.g. accommodation, transport, annual ticket, medical insurance. Only list what is offered.]
- [PLACEHOLDER: current vacancies with title, location, type and closing date]
- [CONFIRM: 12]
- [CONFIRM: visa sponsorship policy.]
- [CONFIRM: graduate or trainee roles.]
- [CONFIRM: number]

**en/contact-rfq.md** (8)

- [CONFIRM: response target, e.g. 1 working day]
- [CONFIRM: e.g. Sunday to Thursday, 8:00 to 17:00]
- [PLACEHOLDER: map pin; load the map only after consent, or use a static image]
- [CONFIRM: 25]
- [CONFIRM: budget bands]
- [CONFIRM: accept non-Qatar numbers]
- [CONFIRM: response target]
- [PLACEHOLDER: link to a relevant case study for the selected service]

**en/emergency-cyber-response.md** (7)

- [CONFIRM: dedicated 24/7 incident response number and whether it is staffed 24/7]
- [CONFIRM: number]
- [CONFIRM: remote response target and on-site response target in Doha.]
- [CONFIRM: NCSA reporting channel and wording with counsel.]
- [CONFIRM: whether offered]
- [CONFIRM: emergency engagement terms for non-clients.]
- [CONFIRM: correct reporting body name.]

**en/glossary.md** (1)

- [CONFIRM: title]

**en/vendor-pack.md** (19)

- [CONFIRM: CR copy and expiry date]
- [CONFIRM]
- [PLACEHOLDER: new company profile PDF]
- [PLACEHOLDER: capability statement PDF]
- [CONFIRM: only if held, e.g. ISO 9001, ISO 27001, ISO 45001, ISO 14001]
- [CONFIRM: only if held, with score and expiry]
- [CONFIRM: only if held, with licence number]
- [CONFIRM: only if held]
- [CONFIRM: public liability, professional indemnity, workers' compensation]
- [CONFIRM: whether to include]
- [PLACEHOLDER: HSE policy PDF]
- [PLACEHOLDER: quality policy PDF]
- [PLACEHOLDER]
- [PLACEHOLDER: clients who have agreed to be named]
- [CONFIRM: link expiry]
- [CONFIRM: legal name exactly as on the CR]
- [CONFIRM: Arabic trade name as on the CR]
- [CONFIRM: fuertetechnologies.com]
- [PLACEHOLDER: year founded]

**en/industries/banking.md** (2)

- [PLACEHOLDER: banking case study with client permission]
- [CONFIRM: QCB-related project experience.]

**en/industries/education.md** (1)

- [PLACEHOLDER: education case study with client permission]

**en/industries/government.md** (4)

- [CONFIRM: government supplier registrations held, e.g. MoF/Monaqasat registration, ICV certificate.]
- [PLACEHOLDER: government case study with client permission: challenge, solution, measurable result]
- [CONFIRM: clearance or vetting process available for staff working on government sites.]
- [CONFIRM: data location options]

**en/industries/healthcare.md** (2)

- [PLACEHOLDER: healthcare case study with client permission]
- [CONFIRM: any Ministry of Public Health requirements to reference.]

**en/industries/hospitality-retail.md** (2)

- [PLACEHOLDER: hospitality or retail case study with client permission]
- [CONFIRM: PMS platforms supported.]

**en/industries/oil-gas.md** (5)

- [CONFIRM: experience on hazardous-area (Ex-rated) installations and any operator vendor registrations. Remove hazardous-area references if not offered.]
- [PLACEHOLDER: oil and gas case study with client permission]
- [CONFIRM: HSE training and certifications held, e.g. H2S, working at height, first aid, operator-specific inductions.]
- [CONFIRM: remote-site coverage.]
- [CONFIRM: vendor registrations with operators. Do not list any until confirmed.]

**en/industries/residential.md** (1)

- [PLACEHOLDER: residential compound case study with client permission]

**en/insights/moi-ssd-cctv-approval-qatar.md** (20)

- [CONFIRM]
- [PLACEHOLDER: author name, role and credentials]
- [PLACEHOLDER: reviewer name and role]
- [PLACEHOLDER: date]
- [CONFIRM: law title and implementing regulations.]
- [CONFIRM: confirm the current list before publishing]
- [CONFIRM: whether MoI publishes a list of licensed companies, and its link.]
- [CONFIRM: if Fuerte holds an SSD licence, add: "Fuerte is an SSD-licensed contractor, licence no. [number]
- [CONFIRM: each item against current SSD specifications]
- [CONFIRM: period(s); do not publish a number until confirmed]
- [CONFIRM: whether SSD maintains an approved product list]
- [CONFIRM: submission method, e.g. MoI e-services portal or in person, and any fees.]
- [CONFIRM: typical timeline]
- [CONFIRM: name of the document issued and whether it must be renewed.]
- [CONFIRM: whether SSD requires a maintenance contract for certain facilities.]
- [CONFIRM: rules for private homes.]
- [CONFIRM: typical weeks]
- [CONFIRM: penalties with counsel before publishing specifics.]
- [CONFIRM: requirements for private residences.]
- [CONFIRM: licence status wording.]

**en/insights/pdppl-compliance-checklist-qatar.md** (13)

- [PLACEHOLDER: author name, role and credentials]
- [PLACEHOLDER: legal or privacy reviewer]
- [PLACEHOLDER: date]
- [CONFIRM: current name of the competent department within NCSA and link to its guidelines.]
- [CONFIRM: wording against the law's text]
- [CONFIRM: timeframe set by law or guidelines]
- [CONFIRM: full list]
- [CONFIRM]
- [CONFIRM: timeframe and threshold with counsel]
- [CONFIRM with counsel]
- [CONFIRM: figures and articles with counsel.]
- [CONFIRM: scope wording with counsel.]
- [CONFIRM with counsel.]

**en/insights/structured-cabling-standards-cat6-cat6a-fibre.md** (4)

- [PLACEHOLDER: author name, role and credentials, e.g. RCDD or vendor cabling certification]
- [PLACEHOLDER: date]
- [CONFIRM: current QCS section and CRA or operator in-building guidelines to cite.]
- [CONFIRM: Fuerte's manufacturer programme registrations before implying eligibility.]

**en/legal/accessibility-statement.md** (7)

- [PLACEHOLDER: date]
- [CONFIRM: website domain]
- [CONFIRM: policy reference.]
- [PLACEHOLDER: "Fully conformant" / "Partially conformant" with WCAG 2.2 AA, based on the audit dated [date]
- [PLACEHOLDER: list any known issues found in the audit, with planned fix dates. Example: "Some third-party embedded maps may not be fully keyboard accessible. We provide the address as text on the same page."]
- [CONFIRM after testing.]
- [CONFIRM: e.g. 5]

**en/legal/ai-assistant-notice.md** (8)

- [CONFIRM: guideline title and version.]
- [PLACEHOLDER: date]
- [CONFIRM: AI provider, e.g. Anthropic]
- [CONFIRM: provider list]
- [CONFIRM: provider terms]
- [CONFIRM: region]
- [CONFIRM: e.g. 12 months]
- [CONFIRM: whether calls are recorded, and the retention period.]

**en/legal/cookies.md** (5)

- [PLACEHOLDER: date]
- [CONFIRM: legal name as on the CR]
- [PLACEHOLDER: consent cookie name]
- [CONFIRM]
- [CONFIRM with counsel]

**en/legal/data-request.md** (3)

- [CONFIRM: timeframe]
- [CONFIRM]
- [CONFIRM: competent department and contact details.]

**en/legal/legal-information.md** (13)

- [CONFIRM: article reference and required fields with counsel.]
- [CONFIRM: legal name exactly as on the CR]
- [CONFIRM: Arabic trade name exactly as on the CR]
- [CONFIRM: e.g. W.L.L., sole proprietorship]
- [CONFIRM: activities as listed on the CR]
- [CONFIRM: matches CR]
- [CONFIRM: fuertetechnologies.com]
- [CONFIRM: number]
- [CONFIRM: number, if to be shown]
- [CONFIRM: only if held]
- [CONFIRM]
- [CONFIRM: any other licence relevant to the services offered]
- [CONFIRM: legal name]

**en/legal/privacy.md** (19)

- [PLACEHOLDER: date]
- [CONFIRM: legal name as on the CR]
- [CONFIRM: dedicated privacy email, e.g. privacy@ the confirmed domain]
- [CONFIRM: whether Fuerte uses any lead-data providers.]
- [CONFIRM wording with counsel]
- [CONFIRM: lawful-basis terminology under PDPPL with counsel.]
- [CONFIRM: e.g. Vercel, Cloudflare]
- [CONFIRM: e.g. Supabase (Middle East region) or Microsoft Azure (Qatar Central)]
- [CONFIRM: e.g. Resend]
- [CONFIRM: Zoho CRM or HubSpot]
- [CONFIRM: AI provider, e.g. Anthropic]
- [CONFIRM: Qatar or GCC region]
- [CONFIRM: transfer list and safeguards.]
- [CONFIRM]
- [CONFIRM: period required by law, e.g. 10 years for commercial records]
- [CONFIRM: 12]
- [CONFIRM: final list of rights against the PDPPL text.]
- [CONFIRM: timeframe]
- [CONFIRM: competent department name and contact.]

**en/legal/responsible-disclosure.md** (9)

- [PLACEHOLDER: date]
- [CONFIRM: dedicated address, e.g. security@ the confirmed domain]
- [CONFIRM: PGP key for encrypted reports, if offered.]
- [CONFIRM: main domain]
- [CONFIRM: e.g. 3]
- [CONFIRM: e.g. 10]
- [CONFIRM: whether Fuerte offers any reward. If not, state "We do not currently offer financial rewards."]
- [CONFIRM: wording with counsel.]
- [PLACEHOLDER: researchers who have reported valid issues, with permission]

**en/legal/terms.md** (5)

- [PLACEHOLDER: date]
- [CONFIRM: legal name as on the CR]
- [CONFIRM: standard quote validity, payment terms and where full commercial terms are published, to meet Decree-Law 16/2010 Art. 55 transparency requirements.]
- [CONFIRM: wording with counsel.]
- [CONFIRM: courts with counsel.]

**en/services/amc.md** (5)

- [CONFIRM: QCDD maintenance registration if required]
- [CONFIRM: standard and multi-year terms offered.]
- [CONFIRM: parts policy per tier.]
- [CONFIRM: service-credit policy.]
- [CONFIRM: dedicated support email and portal, if any.]

**en/services/cyber-security.md** (3)

- [CONFIRM: dedicated 24/7 emergency number]
- [CONFIRM: staff certifications held, e.g. OSCP, CEH, CISSP, CISM, ISO 27001 Lead Auditor. Show only verified certifications.]
- [CONFIRM: where SOC logs and test data are stored, and whether a Qatar or GCC data location can be guaranteed.]

**en/services/cyber-security/grc.md** (5)

- [CONFIRM: ISO 27001 implementation experience]
- [CONFIRM: current NIA version and applicability with NCSA guidance.]
- [CONFIRM: current competent department name.]
- [CONFIRM: penalty figures with counsel.]
- [CONFIRM with counsel.]

**en/services/cyber-security/managed-soc.md** (5)

- [CONFIRM: retention period and data location]
- [CONFIRM: whether the SOC is operated in-house, in Qatar, or with a partner, and its hours of human analyst coverage.]
- [CONFIRM: notification targets by severity.]
- [CONFIRM: storage location. If data stays in Qatar or the GCC, say so here.]
- [CONFIRM: response targets for critical, high, medium and low alerts.]

**en/services/cyber-security/vapt.md** (4)

- [CONFIRM: retesting terms, e.g. one free retest within 60 days.]
- [CONFIRM: number]
- [CONFIRM: tester certifications held, e.g. OSCP, CEH, CREST.]
- [CONFIRM: data retention period for test evidence.]

**en/services/data-center.md** (1)

- [CONFIRM: any formal data center design certifications held by Fuerte staff.]

**en/services/data-center/data-center-design-build.md** (1)

- [CONFIRM: QCDD-approved suppression partner]

**en/services/data-center/servers-storage-backup.md** (1)

- [CONFIRM: platforms supported and partner status.]

**en/services/elv.md** (1)

- [CONFIRM: Fuerte's MoI SSD licence status and number, and QCDD registration status. If held, state "MoI SSD-approved CCTV contractor, licence no. [number]

**en/services/elv/audio-visual.md** (1)

- [CONFIRM: scope]

**en/services/elv/bms.md** (1)

- [CONFIRM: GSAS project experience before stating it.]

**en/services/elv/cctv.md** (3)

- [CONFIRM: if Fuerte holds an MoI SSD licence, replace the last sentence with "Fuerte is an MoI SSD-approved CCTV contractor, licence no. [number]
- [CONFIRM: current MoI SSD retention period(s) by facility type before publishing any number.]
- [CONFIRM: vendor partnerships and any SSD-approved product list.]

**en/services/elv/fire-alarm.md** (5)

- [CONFIRM: Fuerte's QCDD registration status. If Fuerte is not registered, name the QCDD-approved partner used for design approval and certification.]
- [CONFIRM: exact submission route and whether Fuerte or a registered partner submits.]
- [CONFIRM: current QCDD maintenance frequency requirements.]
- [CONFIRM: hazardous-area scope]
- [CONFIRM: suppression scope and partner.]

**en/services/elv/public-address.md** (1)

- [CONFIRM: hazardous-area scope]

**en/services/resource-augmentation.md** (6)

- [CONFIRM: roles Fuerte can staff today and typical lead time for each.]
- [CONFIRM: replacement terms]
- [CONFIRM: typical number]
- [CONFIRM: whether placed engineers are Fuerte employees under Fuerte sponsorship, or subcontracted.]
- [CONFIRM: minimum engagement, e.g. one month.]
- [CONFIRM: conversion terms and any fee.]

**en/services/technology.md** (2)

- [CONFIRM: list vendor partnerships and partner levels Fuerte holds.]
- [CONFIRM: any regions or sites Fuerte does not cover.]

**en/services/technology/business-applications.md** (2)

- [CONFIRM: ERP and application platforms Fuerte implements or resells, and any partner status.]
- [CONFIRM: in-house development capability.]

**en/services/technology/it-consulting.md** (1)

- [CONFIRM: whether to publish a starting price.]

**en/services/technology/network-design.md** (1)

- [CONFIRM: vendor partnerships and partner levels.]

**en/services/technology/structured-cabling.md** (2)

- [CONFIRM: manufacturer warranty programmes Fuerte can register]
- [CONFIRM: workmanship warranty period and manufacturer programmes.]

**en/services/technology/unified-communications.md** (3)

- [CONFIRM: carriers Fuerte integrates with]
- [CONFIRM: process with local carriers.]
- [CONFIRM: wording with Qatari counsel or CRA guidance.]

_250 file-level items in total._
