---
name: fuerte-arabic
description: Arabic (ar) terminology glossary, register and typography rules for every piece of Fuerte Technologies & Contracting Services copy (Qatar IT, ELV and cyber security contractor). Use this skill whenever you write, translate, review or back-translate Arabic for the Fuerte website or its documents, including content-drafts/ar/*.md pages, messages/ar.json UI strings, metadata, alt text, emails, the vendor pack or tender text, and whenever an English Fuerte page changes and its Arabic twin must follow, even if the request only says "update the Arabic" or "RTL copy".
---

# Fuerte Arabic copy

Fuerte's buyers are Qatari government entities, banks, schools, hospitals, hotels, oil and gas operators and compounds. They read Arabic the way it appears in Qatari tenders and Gulf B2B documents: formal Modern Standard Arabic, with standards, product names and acronyms left in Latin script. Under Qatar's Law No. 7 of 2019 on protecting the Arabic language, the Arabic text is the authoritative version, so precision matters more than elegance, and on legal pages precision is everything.

The English drafts in `content-drafts/en/` are the source. Each Arabic page in `content-drafts/ar/` is a twin at the same relative path, loaded by the same template, so its structure has to match exactly even though its sentences are rewritten.

## Workflow for one page

1. Read the English file in full, including HTML comments and placeholder tokens.
2. Rewrite each block for an Arabic reader (see "Register"). Translate meaning, not word order: merge or split sentences where Arabic reads better, but do not add claims, drop caveats or soften a `[CONFIRM]` condition.
3. Apply the glossary below. One English term maps to one Arabic term across the whole site; if a term is missing, add it to the glossary table here first so the next page uses the same choice.
4. Keep the structure identical (see "Structure that must not change").
5. Write the front-matter (see "Front-matter and SEO").
6. Run the parity check (headings, FAQ count, slug, links, tokens, meta lengths) against the English twin and fix every failure.
7. For Home and legal pages, and for any page with dense regulatory content, back-translate into English and compare meaning sentence by sentence; fix drift in the Arabic, not in the back-translation.

## Structure that must not change

The page templates read these files by position and key, so the Arabic must line up with the English 1:1.

- **Front-matter keys** stay in English and in the same order: `title`, `metaTitle`, `metaDescription`, `slug`, `pillar` (service pages), `primaryKeyword`, `secondaryKeywords`.
- **`slug` and `pillar` values** are copied unchanged (`"/services/cctv"`, `"elv"`). Never transliterate or translate them.
- **Headings:** same number of `#`, `##` and `###` headings, same levels, same order. Translate the heading text.
- **FAQ:** the same number of `###` questions under the FAQ `##` heading ("الأسئلة الشائعة").
- **Lists, tables, block quotes and horizontal rules (`---`)** keep the same count of items, rows and columns. Translate cell text; keep numbering.
- **Internal links** keep the exact same path: `[استكشف خدمات مراكز البيانات ←](/services/data-center)`. Only the link text changes.
- **HTML comments** (`<!-- … -->`) stay in place. They are for designers and developers, who work in English, so keep them in English unless an Arabic-specific note helps (then add the note in English inside the same comment, e.g. "AR: …").
- **Bold labels** such as `**Primary CTA:**`, `**Eyebrow:**` are template labels; translate them consistently (table below) so a template that parses them can map both languages.
- **Code spans** (`` `tabular-nums` ``, `` `/.well-known/security.txt` ``) stay as they are.
- **Template variables** in curly braces (`{first name}`, `{reference}`, `{email}`, `{count}`, `{n}`, `{step name}`, `{service or 'a project'}`) are filled in by the app. Copy them exactly, in English; reword the Arabic around them so the sentence still reads correctly whatever value is inserted (e.g. «يرجى تصحيح الحقول التالية قبل الإرسال: {count}.» avoids number agreement).
- **HTML attributes in dev notes** (`autocomplete="name"`, `type="tel"`) stay as written.
- **External links** (`https://wa.me/97471258588`) keep the same URL.

## Placeholder tokens: copy verbatim

`[CONFIRM: …]`, `[PLACEHOLDER: …]`, `[CONFIRM]`, `[PLACEHOLDER]`, `[EMAIL]` and `[CR NUMBER]` are questions for the client, tracked by a script that matches the English and Arabic files token for token. Copy every token exactly, in English, including its inner text, punctuation and any nested brackets such as `licence no. [number]`. Do not translate, shorten, merge, split or reorder the text inside the brackets, and keep each token in the same paragraph or list item as in English. The Arabic sentence around a token may be reworded; the token itself is untouchable. When a client answer replaces a token, the Arabic answer goes into both files at once.

## Register

- **Modern Standard Arabic, formal B2B.** No Gulf dialect, no Egyptian or Levantine colloquialisms, no transliterated English slang. Tone: confident and plain, like a well-written tender response, not marketing hype. Avoid stacked superlatives (الأفضل، الرائد، الأول) and unverifiable claims, exactly as in English.
- **Voice:** Fuerte speaks as "نحن" (نصمم، ننفذ، نتولى). Body copy addresses the reader respectfully in the plural (مبناكم، أنظمتكم، فريقكم). Buttons and CTAs use the singular masculine imperative, which is the Arabic UI convention and matches `messages/ar.json` (احجز، اطلب، حمّل، تواصل). Form microcopy (labels, helpers, errors, success messages, the auto-reply email) also uses the singular, because it speaks to one person filling in one form.
- **Sentences:** prefer verbal sentences (فعل + فاعل) and active voice. Break long English noun stacks into a clear construct (إضافة) or a relative clause instead of a chain of four nouns.
- **Spelling:** full hamzas (إنشاء، أنظمة، مسؤول), tā' marbūṭa (شبكة), alif maqṣūra (على، إلى). Use tanwīn al-fatḥ on the alif where it is written (شريكًا، دائمًا). Add shadda only where it prevents a misreading (مُدار، حمّل). No tatweel (ـ) and no decorative diacritics.
- **Headings:** short and nominal or imperative, no full stop at the end of an H1. English question H2s stay questions in Arabic and end with «؟».
- **Brand:** first mention «فورت تكنولوجيس اند كونتراكتينغ سرفيسس», then «فورت» (both as in `messages/ar.json`). Never "فويرتي" or a translated name. The legal Arabic trade name is a `[CONFIRM]` until it is checked against the CR.
- **Tagline:** «تقنية. مقاولات. تشغيل دون انقطاع.»

## Latin script that stays Latin

Qatari engineers, consultants and procurement teams read these in Latin and search for them that way. Writing them in Arabic letters makes them harder to recognise.

- **Standards and versions:** ISO 9001, ISO 27001, ISO 45001, ISO 14001, ISO/IEC, TIA-568, ISO/IEC 11801, BICSI, WCAG 2.2 AA, NFPA 72, BS 5839, EN 54, IEEE 802.3bt, OSCP, CEH, CREST, CISSP, CISM, RCDD.
- **Cable and product classes:** Cat6, Cat6A, OS2, OM3, OM4, OM5, PoE, PoE++, FM-200, IP-PBX, Wi-Fi 6/6E/7, PTZ, NVR, 4K, 10 Gbps, 500 MHz.
- **Acronyms used as names:** ELV (after the Arabic term), VAPT, BMS, SOC, SIEM, SOAR, EDR, NGFW, NMS, VMS, ANPR, VLAN, SD-WAN, VPN, UPS, DR, RPO, RTO, ERP, CRM, HVAC, KNX, BACnet, Modbus, OTDR, RFQ, BOQ, AMC, SLA, HSE, GRC, PDPPL, NIA, ICV, GSAS, QCS, PMS, OWASP, API.
- **Regulators' short forms:** MoI SSD, QCDD, NCSA, QCB, MoCI, CRA. Give the official Arabic name in full at first use, with the short form in parentheses, then use the Arabic name or the short form.
- **Brands and platforms:** WhatsApp is written «واتساب» in running text (that is how Qatari users write it); every other brand (Microsoft Teams, Cisco, Anthropic, Vercel, Zoho, HubSpot) stays in Latin.
- **Pattern at first use:** Arabic term, then the acronym in parentheses: «تقييم الثغرات واختبار الاختراق (VAPT)». After that, either form, chosen for readability. In headings and metaTitles, keep the acronym when users search for it (VAPT, BMS, CCTV, ERP).
- **Bidi:** a Latin token next to Arabic punctuation renders correctly; do not add spaces inside parentheses to "fix" it, and never put Arabic letters inside a Latin token (write «معيار ISO 27001», not «ISO ٢٧٠٠١» or «آيزو 27001»).

## Numerals, dates, times, money, phones

- **Digits:** Western (0–9) everywhere, including legal citations, prices and dates. This is common Qatari business practice and the site default (plan section 12). Never Eastern Arabic digits (٠١٢٣).
- **Thousands and decimals:** «5,000» and «99.9%» as in English.
- **Law citations:** «القانون رقم (13) لسنة 2016 بشأن حماية خصوصية البيانات الشخصية». Article: «المادة (55)». Decree-law: «المرسوم بقانون رقم (16) لسنة 2010».
- **Dates:** day, Gulf month name, year: «18 أكتوبر 2026». Months: يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر. Numeric dates DD/MM/YYYY. Gregorian unless the client asks for Hijri as well.
- **Times and days:** 24-hour «8:00 إلى 17:00»; «من الأحد إلى الخميس»; «على مدار الساعة طوال أيام الأسبوع» for 24/7 in prose, and «24/7» in labels and stats.
- **Durations:** use the correct number agreement: «ساعتان»، «3 ساعات»، «11 ساعة»، «يوم عمل واحد»، «يوما عمل». With a digit, the counted noun follows the Arabic rules for that number (3–10 plural, 11+ singular accusative).
- **Money:** «5,000 ريال قطري»; in tables and labels «QAR 5,000» is acceptable.
- **Phone numbers stay LTR.** Write the international format «+974 7125 8588» with spaces exactly as in English, and wrap every phone number in Unicode directional isolates: U+2066 (LEFT-TO-RIGHT ISOLATE) before and U+2069 (POP DIRECTIONAL ISOLATE) after. Without them the bidi algorithm reverses the digit groups in an RTL paragraph («8588 7125 974+»). The isolates are invisible and survive Markdown, front-matter and JSON; strip them before building a `tel:` or `wa.me` link. Email addresses and URLs are all strong Latin characters and render correctly without isolates. The parity check script flags any unwrapped `+974` number.
- **Measurements:** digit, space, Latin unit: «100 m», «10 Gbps», «500 MHz». In prose you may write «100 متر».

## Punctuation and quotation marks

- Arabic comma «،», semicolon «؛» and question mark «؟». Full stop «.», colon «:» and exclamation «!» are shared.
- Inside a Latin token, list of acronyms or code, keep Latin punctuation (`ISO 9001, ISO 27001` inside a `[CONFIRM]` stays as is).
- Quotation marks: «…» (guillemets) for quotes, defined terms and button names in prose. Keep straight quotes `"…"` in YAML front-matter values (they are syntax) and inside placeholder tokens.
- Parentheses and brackets are mirrored by the browser; type them normally.
- **Text arrows point forward in reading order:** English «→» becomes «←» in Arabic link text («استكشف خدمات التيار الخفيف ←»). The interpunct «·» stays.
- No space before «،» «؛» «؟» «:»; one space after.
- Do not use «/» to mean "or" in Arabic prose; write «أو».

## Front-matter and SEO

- `title`: natural Arabic page title with the primary keyword.
- `metaTitle`: at most 60 characters (count code points; the brand suffix «| فورت» counts). Lead with what Qatari users type; keep acronyms in Latin.
- `metaDescription`: at most 155 characters, one or two complete sentences ending with a call to action where the English has one.
- `primaryKeyword`: the phrase a Qatari buyer actually types into Google in Arabic, not a literal translation. Usually «شركة …» or «تركيب …» plus «في قطر» or «الدوحة», e.g. «تركيب كاميرات مراقبة في قطر», «شركة أمن سيبراني في قطر», «عقد صيانة سنوية في قطر». Keep each page's Arabic primary keyword unique across the site (no cannibalisation).
- `secondaryKeywords`: 3–5 Arabic variants: dialect-neutral synonyms (أنظمة التيار الخفيف / شركات التيار الخفيف), Latin-acronym forms Qatari users mix in («شركة VAPT في قطر»), and «الدوحة» variants. The per-page map is in `references/seo-keywords.md`.
- If the English has no `secondaryKeywords`, the Arabic has none either.

## Fixed UI and CTA labels

| English | Arabic |
|---|---|
| Book a free site survey | احجز معاينة مجانية للموقع |
| Book a free [service] site survey | احجز معاينة مجانية لموقعك لأنظمة [الخدمة] / لـ[الخدمة] |
| Request a quote | اطلب عرض سعر |
| WhatsApp an engineer | تواصل مع مهندس عبر واتساب |
| Download the vendor pack | حمّل ملف المورّد |
| Primary CTA / Secondary CTA / Tertiary link | الدعوة الرئيسية / الدعوة الثانوية / رابط إضافي |
| Eyebrow | العنوان التمهيدي |
| Scroll cue | إشارة التمرير |
| Frequently asked questions | الأسئلة الشائعة |
| What's included | ما تشمله الخدمة |
| Industries we serve | القطاعات التي نخدمها |
| Last updated | آخر تحديث |
| Survey / Quote / WhatsApp (mobile bar) | معاينة / عرض سعر / واتساب |
| Explore … → | استكشف … ← |
| DRAFT: requires Qatari counsel review. | مسودة: تتطلب مراجعة محامٍ قطري. |

## Terminology glossary

One Arabic form per term. "First use" shows the full form with the acronym; later mentions may use the short form.

### Core technical terms (from `content-drafts/en/glossary.md`)

| # | English | Arabic (first use) | Short / later use | Notes |
|---|---|---|---|---|
| 1 | ELV systems | أنظمة التيار الخفيف (ELV) | التيار الخفيف | As in `messages/ar.json`. SEO variant: «أنظمة الجهد المنخفض جدًا» only in keywords, never in copy. |
| 2 | Structured cabling | الكابلات الهيكلية | الكابلات الهيكلية | Tender variant «التمديدات الشبكية الهيكلية»; search variant «تمديد شبكات». |
| 3 | Cat6 | كابلات Cat6 | Cat6 | Latin. |
| 4 | Cat6A | كابلات Cat6A | Cat6A | Latin. |
| 5 | Fibre (single-mode, multi-mode) | الألياف الضوئية (أحادية النمط ومتعددة الأنماط) | الألياف الضوئية | OS2 / OM3 / OM4 / OM5 in Latin. |
| 6 | OTDR testing | اختبار OTDR (قياس الانعكاس الضوئي في المجال الزمني) | اختبار OTDR | |
| 7 | Fusion splicing | اللحام الانصهاري للألياف الضوئية | اللحام الانصهاري | |
| 8 | Power over Ethernet (PoE) | تغذية الطاقة عبر الإيثرنت (PoE) | PoE | |
| 9 | Next-generation firewall (NGFW) | جدار الحماية من الجيل التالي (NGFW) | جدار الحماية | |
| 10 | Network monitoring system (NMS) | نظام مراقبة الشبكة (NMS) | NMS | |
| 11 | Wi-Fi heat-map | خريطة حرارية لتغطية Wi-Fi | الخريطة الحرارية | |
| 12 | Network segmentation | تقسيم الشبكة إلى مناطق معزولة | تقسيم الشبكة | VLAN stays Latin. |
| 13 | VoIP | الاتصال الصوتي عبر بروتوكول الإنترنت (VoIP) | VoIP | |
| 14 | IP-PBX | مقسم هاتفي IP-PBX | IP-PBX | Search variant «سنترال IP». |
| 15 | Enterprise resource planning (ERP) | نظام تخطيط موارد المؤسسات (ERP) | ERP | |
| 16 | Data center | مركز البيانات | مراكز البيانات (pl.) | Never «داتا سنتر» in copy. |
| 17 | Modular data center | مركز بيانات معياري | | |
| 18 | Raised floor | الأرضية المرتفعة | | |
| 19 | Hot and cold aisle containment | عزل الممرات الساخنة والباردة | العزل الحراري للممرات | |
| 20 | UPS | نظام الطاقة غير المنقطعة (UPS) | UPS | |
| 21 | Precision cooling | التبريد الدقيق | | In-row cooling: «التبريد بين الخزائن (In-row)». |
| 22 | FM-200 | نظام الإطفاء بغاز FM-200 | FM-200 | Trade name, Latin. Clean agent: «عامل إطفاء نظيف». |
| 23 | Disaster recovery (DR) | التعافي من الكوارث (DR) | | RPO «نقطة الاستعادة المستهدفة (RPO)»; RTO «زمن الاستعادة المستهدف (RTO)». |
| 24 | Spine-leaf network | شبكة Spine-Leaf | | Explain once: «بطبقتين: مبدّلات العمود الفقري ومبدّلات الأطراف». |
| 25 | CCTV | كاميرات المراقبة (CCTV) | كاميرات المراقبة | Variant: «المراقبة بالفيديو». In headings keep «CCTV» if the English does. |
| 26 | Video management system (VMS) | نظام إدارة الفيديو (VMS) | VMS | |
| 27 | ANPR | التعرف الآلي على لوحات المركبات (ANPR) | ANPR | Not LPR / ALPR. |
| 28 | Video analytics | تحليلات الفيديو الذكية | تحليلات الفيديو | |
| 29 | Command and control center | مركز القيادة والتحكم | | |
| 30 | Access control | أنظمة التحكم في الدخول | التحكم في الدخول | |
| 31 | Intrusion detection | أنظمة كشف التسلل | كشف التسلل | Cyber: «كشف التسلل إلى الشبكة». |
| 32 | Addressable fire alarm | نظام إنذار الحريق المعنوَن | الإنذار المعنوَن | Conventional: «التقليدي». |
| 33 | Public address (PA) and voice evacuation | نظام النداء العام (PA) والإخلاء الصوتي | النداء العام | Search variant «نظام الإذاعة الداخلية». |
| 34 | Building management system (BMS) | نظام إدارة المباني (BMS) | BMS | |
| 35 | VAPT | تقييم الثغرات واختبار الاختراق (VAPT) | VAPT | Penetration testing alone: «اختبار الاختراق». |
| 36 | Security operations center (SOC) | مركز العمليات الأمنية (SOC) | SOC | Managed SOC: «مركز عمليات أمنية مُدار». |
| 37 | SIEM | نظام إدارة المعلومات والأحداث الأمنية (SIEM) | SIEM | |
| 38 | Governance, risk and compliance (GRC) | الحوكمة وإدارة المخاطر والامتثال (GRC) | GRC | |
| 39 | Annual maintenance contract (AMC) | عقد الصيانة السنوية (AMC) | AMC | pl. «عقود الصيانة السنوية». |
| 40 | Service level agreement (SLA) | اتفاقية مستوى الخدمة (SLA) | SLA | |

### Service names (pillars and sub-services)

| English | Arabic |
|---|---|
| Technology services (pillar) | خدمات التقنية |
| Network design and installation | تصميم الشبكات وتنفيذها |
| Structured cabling | الكابلات الهيكلية |
| Unified communications | الاتصالات الموحدة |
| IT consulting | استشارات تقنية المعلومات |
| Business applications | تطبيقات الأعمال |
| Data center (pillar) | مراكز البيانات |
| Data center design and build | تصميم مراكز البيانات وإنشاؤها |
| Data center network | شبكات مراكز البيانات |
| Servers, storage and backup | الخوادم والتخزين والنسخ الاحتياطي |
| ELV systems (pillar) | أنظمة التيار الخفيف |
| CCTV and command and control center | كاميرات المراقبة ومركز القيادة والتحكم |
| Access control | أنظمة التحكم في الدخول |
| Fire alarm | أنظمة إنذار الحريق |
| Public address and voice evacuation | النداء العام والإخلاء الصوتي |
| Building management system | نظام إدارة المباني (BMS) |
| Audio visual / smart meeting rooms | الأنظمة السمعية والبصرية / قاعات الاجتماعات الذكية |
| Home automation | أتمتة المنازل الذكية |
| Cyber security (pillar) | الأمن السيبراني |
| VAPT | تقييم الثغرات واختبار الاختراق |
| Managed SOC | مركز العمليات الأمنية المُدار |
| Security awareness training | التدريب على التوعية الأمنية |
| GRC and PDPPL compliance | الحوكمة والمخاطر والامتثال وحماية البيانات الشخصية |
| Resource augmentation | توفير الكوادر التقنية |
| AMC and support | عقود الصيانة السنوية والدعم الفني |
| AMC plans | باقات الصيانة السنوية |
| Emergency cyber response | الاستجابة الطارئة للحوادث السيبرانية |

### Industries

| English | Arabic |
|---|---|
| Government | الجهات الحكومية |
| Banking and finance | البنوك والمؤسسات المالية |
| Education | التعليم |
| Healthcare | الرعاية الصحية |
| Hospitality and retail | الضيافة والتجزئة |
| Oil and gas | النفط والغاز |
| Residential (compounds) | المجمعات السكنية |

### Laws, authorities and standards (official names; never literal)

| English | Arabic | Notes |
|---|---|---|
| PDPPL (Law No. 13 of 2016) | قانون حماية خصوصية البيانات الشخصية، القانون رقم (13) لسنة 2016 | Short: «قانون حماية البيانات الشخصية (PDPPL)». |
| Decree-Law No. 16 of 2010 | المرسوم بقانون رقم (16) لسنة 2010 بإصدار قانون المعاملات والتجارة الإلكترونية | |
| Law No. 7 of 2019 | القانون رقم (7) لسنة 2019 بشأن حماية اللغة العربية | |
| Law No. 9 of 2011 | القانون رقم (9) لسنة 2011 بتنظيم كاميرات وأجهزة المراقبة الأمنية | Title still `[CONFIRM: title]` in English. |
| Law No. 14 of 2014 | القانون رقم (14) لسنة 2014 بإصدار قانون مكافحة الجرائم الإلكترونية | |
| National Cyber Security Agency (NCSA) | الوكالة الوطنية للأمن السيبراني | |
| National Information Assurance (NIA) standard | المعيار الوطني لضمان أمن المعلومات (NIA) | |
| MoI Security Systems Department (SSD) | إدارة نظم الأمن بوزارة الداخلية (MoI SSD) | Short: «إدارة نظم الأمن». |
| Qatar Civil Defence Department (QCDD) | الإدارة العامة للدفاع المدني (QCDD) | Short: «الدفاع المدني». |
| Qatar Central Bank (QCB) | مصرف قطر المركزي | |
| Ministry of Commerce and Industry (MoCI) | وزارة التجارة والصناعة | |
| Ministry of Interior | وزارة الداخلية | |
| Ministry of Public Health | وزارة الصحة العامة | |
| Ministry of Finance / Monaqasat | وزارة المالية / بوابة المناقصات الحكومية (Monaqasat) | |
| Communications Regulatory Authority (CRA) | هيئة تنظيم الاتصالات (CRA) | |
| Qatar Construction Specifications (QCS) | المواصفات القطرية للإنشاءات (QCS) | |
| In-Country Value (ICV) | القيمة المحلية المضافة (ICV) | |
| GSAS | نظام تقييم الاستدامة العالمي (GSAS) | |
| Commercial registration (CR) | السجل التجاري | CR number: «رقم السجل التجاري». |
| WCAG 2.2 AA | إرشادات WCAG 2.2 بمستوى المطابقة AA | |
| Law No. 7 of 2002 (copyright) | القانون رقم (7) لسنة 2002 بشأن حماية حق المؤلف والحقوق المجاورة | |
| Mada (Qatar Assistive Technology Center) | مركز التكنولوجيا المساعدة «مدى» | |
| GDPR | اللائحة الأوروبية العامة لحماية البيانات (GDPR) | |

### Commercial, project and legal terms

| English | Arabic |
|---|---|
| Site survey | معاينة الموقع |
| Request for quotation (RFQ) | طلب عرض سعر (RFQ) |
| Quote / proposal | عرض سعر / عرض فني ومالي |
| Bill of quantities (BOQ) | جدول الكميات (BOQ) |
| Tender | مناقصة |
| Procurement | إدارة المشتريات |
| Main contractor / consultant / client | المقاول الرئيسي / الاستشاري / المالك أو العميل |
| Handover / handover pack | التسليم / ملف التسليم |
| As-built drawings | المخططات النهائية كما نُفذت (As-built) |
| Shop drawings | المخططات التنفيذية (Shop drawings) |
| Commissioning | التشغيل التجريبي والاختبار |
| Preventive / corrective maintenance | الصيانة الوقائية / الصيانة التصحيحية |
| Response time / restoration time | زمن الاستجابة / زمن الاستعادة |
| Named engineer | مهندس مخصص |
| Spare parts | قطع الغيار |
| Service credits | تعويضات الخدمة |
| Fixed-cost / time and materials | بتكلفة ثابتة / على أساس الوقت والمواد |
| Zero downtime | تشغيل دون انقطاع |
| Health, safety and environment (HSE) | الصحة والسلامة والبيئة (HSE) |
| Vendor pack | ملف المورّد |
| Vendor-neutral | محايدون تجاه العلامات التجارية |
| Takeover audit | تدقيق الاستلام |
| Vulnerability / patch | ثغرة / تحديث أمني |
| Phishing simulation | محاكاة التصيد الاحتيالي |
| Incident response | الاستجابة للحوادث |
| Ransomware | برمجيات الفدية |
| Hardening | تحصين الأنظمة |
| Personal data / data subject | البيانات الشخصية / صاحب البيانات |
| Personal data of a special nature | البيانات الشخصية ذات الطبيعة الخاصة |
| Competent department / authority | الإدارة المختصة / الجهة المختصة |
| Power surge | الارتفاع المفاجئ في الجهد الكهربائي |
| Controller / processor (PDPPL) | المراقب (الجهة المتحكمة في البيانات) / المعالج |
| Data subject request | طلب صاحب البيانات |
| Consent | الموافقة |
| Cookies | ملفات تعريف الارتباط (الكوكيز) |
| Responsible disclosure | الإفصاح المسؤول عن الثغرات |
| Safe harbour | الحماية القانونية للباحثين (Safe harbour) |
| Terms of use | شروط الاستخدام |
| Privacy notice | إشعار الخصوصية |
| Accessibility statement | بيان إمكانية الوصول |
| Governing law / courts | القانون الواجب التطبيق / المحاكم المختصة |
| Liability | المسؤولية |

## Legal pages

Every file under `legal/` opens with the block quote «> **مسودة: تتطلب مراجعة محامٍ قطري.** …» in place of the English DRAFT line, and keeps it until counsel signs off. Because the Arabic will be the controlling text:

- Translate obligations precisely: "must" «يجب», "may" «يجوز», "will" (commitment) «سنقوم بـ / نلتزم بـ», "we do not" «لا نقوم بـ». Do not turn a "may" into a "will".
- Keep every numbered clause and its numbering.
- Use the official Arabic law names above and cite articles as «المادة (X)».
- Back-translate the page and compare clause by clause before marking it ready for counsel.
- Home and all legal pages need a native Arabic reviewer before publication.

## Self-check before saving a page

The SEO keyword map for every page is in `references/seo-keywords.md`; keep it in sync when a primary keyword changes.


- Same heading count per level, same FAQ count, same slug and pillar, same internal link paths.
- Same multiset of placeholder tokens and `{template variables}`, character for character.
- Labels shown after a counter (e.g. «مشروعًا منفذًا») use the form for 11–99; flag them if the number could be 3–10.
- `metaTitle` ≤ 60 and `metaDescription` ≤ 155 characters.
- No Eastern Arabic digits, no English "," or "?" in Arabic prose, every «→» flipped to «←».
- Phone numbers wrapped in U+2066 … U+2069.
- Glossary terms used consistently; any new term added to the glossary above.
