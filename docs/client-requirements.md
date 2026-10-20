# Fuerte Website — What We Still Need

Everything still needed to launch the new website. Items marked **🔴 blocks launch** must be answered before go-live. The rest can follow, or the related content stays hidden until it arrives.

**Owner key:** **Client** = Fuerte management · **Counsel** = Qatari lawyer · **Agency** = website team

Per-page detail for every placeholder is in [`content-placeholders.md`](content-placeholders.md) (appendix, 250 items). Answering the sections below clears almost all of them.

---

## 1. Company identity & legal details: Client

- [ ] 🔴 **Legal name in English exactly as on the Commercial Registration (CR)**, the **Arabic trade name**, and the legal form (e.g. W.L.L.)
- [ ] 🔴 **CR number**, registered activities, and registered address (does it match *2nd Floor, Al Kazim Building, Umm Ghuwailina, P.O. Box 9044*?)
- [x] 🔴 **Correct email domain**: `fuertetechnologies.com` (confirmed 19 Oct 2026). The site now uses **contact@fuertetechnologies.com**. Please make sure this mailbox exists and is monitored; the brochure printed it on the misspelled `fuertechnologies.com`.
- [ ] 🔴 Email addresses for: sales/RFQs, privacy requests, security reports, support (or confirm contact@ handles all of them)
- [ ] 🔴 Website domain to use, plus access to its DNS. Also: should we register `.qa` / `.com.qa`?
- [ ] Trade/municipality licence number and establishment card number
- [ ] Year founded, number of employees, number of certified engineers
- [ ] Office hours (e.g. Sunday–Thursday 8:00–17:00)
- [ ] Is +974 7125 8588 also the WhatsApp number? Is there a dedicated 24/7 emergency line?
- [ ] Leadership team: names, titles, short bios, photos

## 2. Licences, certifications & registrations: Client
*Only what Fuerte actually holds will appear on the site. Please send copies with numbers and expiry dates.*

- [ ] **MoI SSD (CCTV) licence**: held? Licence number? If not, which licensed partner handles CCTV approvals?
- [ ] **QCDD (Civil Defence) registration** for fire alarm work: held? If not, which partner?
- [ ] **ISO certificates** (9001 / 27001 / 45001 / 14001): which ones, with numbers and expiry dates
- [ ] **ICV certificate** and score
- [ ] Government and oil & gas vendor registrations (e.g. Monaqasat, operator vendor lists)
- [ ] Vendor partnerships and partner levels (network, CCTV, cabling, servers/storage, ERP brands)
- [ ] Manufacturer cabling warranty programmes Fuerte can register
- [ ] Staff certifications: cyber (OSCP, CEH, CREST, CISSP, CISM, ISO 27001 LA), data center, HSE (H2S, working at height, first aid)
- [ ] Insurance: public liability, professional indemnity, workers' compensation

## 3. Proof & brand assets: Client

- [ ] 🔴 **Logo** in vector format (SVG, AI or PDF), English and Arabic lockups
- [ ] **Client logos**, each with **written permission** to display
- [ ] Verified numbers for the home page: projects delivered, devices/cable points installed, certified engineers
- [ ] At least one **testimonial** (name, title, organisation, permission)
- [ ] **Case studies** (aim for 3–6, ideally one per industry): challenge → solution → measurable result, with photos and permission
- [ ] Real project photos (racks, cabling, control rooms, installs). These replace the Chicago stock images.
- [ ] Documents for the Vendor Pack: company profile PDF (new), capability statement, HSE policy, quality policy
- [ ] Current job vacancies (if any)

## 4. Service scope: confirm or remove (Client)

- [ ] Hazardous-area (Ex-rated) work for oil & gas, and remote-site coverage
- [ ] In-house software development, and which ERP/application platforms Fuerte implements
- [ ] Fire suppression (FM-200) scope and partner
- [ ] AV: simultaneous interpretation scope; GSAS experience (BMS); hotel PMS platforms supported
- [ ] **Managed SOC**: in-house, in Qatar, or via a partner? Analyst hours, alert response targets, log retention, data location
- [ ] VAPT: retest terms and report turnaround
- [ ] Incident response: 24/7 number, remote/on-site response times, terms for non-clients, retainer option
- [ ] VoIP: carriers integrated, number porting process
- [ ] Any regions/sites Fuerte does **not** cover

## 5. Commercial terms (Client)

- [ ] 🔴 **AMC plans (Bronze/Silver/Gold)**: coverage hours, response and restoration times, preventive visits per year, spare-parts policy, service credits, contract length, upgrade/downgrade terms, exclusions
- [ ] Quote validity and payment terms (required to be published under E-Commerce Law Art. 55)
- [ ] Lead response target (e.g. 1 working day) and quote turnaround
- [ ] RFQ form: budget bands, max upload size (default 25 MB), accept non-Qatar phone numbers?
- [ ] Resource augmentation: roles available, CV lead time, employment model (Fuerte sponsorship or subcontract), minimum term, replacement and conversion terms
- [ ] Careers: visa sponsorship, graduate roles, benefits, training policy
- [ ] Consulting: publish a starting price or not?
- [ ] **CRM choice**: Zoho CRM (default) or HubSpot

## 6. Legal review: Counsel

- [ ] 🔴 Review all 8 legal pages: Privacy, Cookies, Terms, Legal Information (Art. 51), Accessibility, AI Assistant Notice, Responsible Disclosure, Data Request
- [ ] 🔴 PDPPL (Law 13/2016): competent NCSA department name, rights wording, response timeframe, breach notification, lawful-basis terms, special-category data permit
- [ ] 🔴 E-Commerce Law (Decree-Law 16/2010) Art. 51 field list and Art. 54 marketing-consent wording
- [ ] MoI SSD wording (Law 9/2011): retention periods, approval process, penalties. Used in the CCTV pages and guide.
- [ ] QCDD submission route and maintenance frequency
- [ ] NIA (current version), QCB (banks) and Ministry of Public Health (healthcare) references
- [ ] Retention schedule: enquiries, contracts, job applicants, vendor-pack requests, security logs, AI assistant logs
- [ ] Governing law/courts clause, VoIP legality wording, responsible-disclosure safe-harbour wording
- [ ] Arabic versions of legal pages: Arabic is the authoritative text (Law 7/2019)

## 7. Accounts & services to create: Client (Agency sets up)
*Created in Fuerte's name so Fuerte owns them. Invite the agency as an admin.*

- [ ] 🔴 **Hosting**: Vercel (team account) and domain DNS access
- [ ] 🔴 **Transactional email**: Resend (or Fuerte's SMTP) with the confirmed domain verified
- [ ] 🔴 **CRM**: Zoho CRM or HubSpot, with an API/webhook user
- [ ] 🔴 **Database for leads and consents** in a GCC/Qatar region (Supabase Middle East or Azure Qatar Central)
- [ ] 🔴 **Cloudflare Turnstile** (spam protection on forms)
- [ ] **Analytics**: Plausible (cookieless). Optionally GA4, Microsoft Clarity and LinkedIn Insight, which load only after consent.
- [ ] **Google Business Profile**, Bing Places, Apple Business Connect (verified at the office address)
- [ ] Google Search Console and Bing Webmaster Tools
- [ ] Sentry (error monitoring)
- [ ] *Release 2:* WhatsApp Business Cloud API number; Anthropic API account for the AI assistant
- [ ] *Release 3:* Twilio (or a local SIP trunk) and a Qatar number for the voice agent

## 8. People (Client to arrange)

- [ ] 🔴 Native Arabic reviewer: sign-off on the **Home page and legal pages** (the rest is produced with the translation toolchain)
- [ ] 🔴 Qatari counsel (section 6)
- [ ] Photographer for Doha office/team/project shots (optional but recommended)
- [ ] Authors/reviewers named on the Insights guides (name, role, credentials) for E-E-A-T

---

## Where things stand

| Area | Status |
|---|---|
| Phase 0: code setup, design tokens, EN/AR shell, Thinking Orbs | ✅ Done (branch `phase-0-setup`) |
| Phase 1: English copy, 52 pages | ✅ Drafted in `content-drafts/en`, awaiting the answers above |
| Arabic translation | 🔄 In progress |
| Site pages, 3D experience, forms, SEO and compliance features | 🔄 In progress |
| Launch | ⏳ Needs every 🔴 item above |

*Last updated: 18 October 2026*
