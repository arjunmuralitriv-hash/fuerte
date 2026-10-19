---
title: "Responsible disclosure policy"
metaTitle: "Responsible Disclosure Policy | Fuerte Technologies"
metaDescription: "Found a security vulnerability in Fuerte's website or systems? How to report it safely, what is in scope and what you can expect from us."
slug: "/legal/responsible-disclosure"
primaryKeyword: "Fuerte responsible disclosure"
---

> **DRAFT: requires Qatari counsel review.** Particularly the "safe harbour" section, which must be checked against Qatar's Cybercrime Prevention Law (Law No. 14 of 2014). Publish together with `/.well-known/security.txt`.

# Responsible disclosure policy

**Last updated:** [PLACEHOLDER: date]

We take the security of our systems seriously. If you believe you have found a security vulnerability in a Fuerte website or service, please tell us. We'll work with you to fix it.

## How to report

Email **contact@fuertetechnologies.com** [CONFIRM: dedicated address, e.g. security@ the confirmed domain] with:
- a description of the vulnerability and its potential impact
- the URL or system affected
- step-by-step instructions to reproduce it
- any proof-of-concept, screenshots or logs
- how you would like to be credited, if at all.

[CONFIRM: PGP key for encrypted reports, if offered.]

## In scope

- [CONFIRM: main domain] and its subdomains
- Fuerte's public APIs and forms

## Out of scope

- Client systems that Fuerte installs or manages. Report these to the client directly.
- Third-party services we use (such as hosting, email or CRM providers). Report to the provider.
- Denial-of-service attacks, spam or social engineering of our staff
- Physical attacks on our offices
- Reports from automated scanners without a proven impact
- Missing best-practice headers or settings with no demonstrated risk

## Rules

When testing, please:
- only test what is in scope
- never access, change or delete data that isn't yours; stop and report if you reach personal data
- don't disrupt our services or degrade them for other users
- don't use the vulnerability beyond what is needed to prove it
- give us reasonable time to fix the issue before telling anyone else
- follow the laws of Qatar.

## What you can expect from us

- We acknowledge your report within [CONFIRM: e.g. 3] working days.
- We give you an initial assessment within [CONFIRM: e.g. 10] working days.
- We keep you updated while we fix it.
- We tell you when it is fixed and, if you wish, credit you on this page.

[CONFIRM: whether Fuerte offers any reward. If not, state "We do not currently offer financial rewards."]

## Safe harbour

If you act in good faith and follow this policy, we will not take legal action against you or ask authorities to do so for your research, to the extent permitted by the laws of Qatar. This does not cover activity that breaches the law or harms others. [CONFIRM: wording with counsel.]

## security.txt

Our contact details for security reports are also published at `/.well-known/security.txt`.

## Hall of thanks

[PLACEHOLDER: researchers who have reported valid issues, with permission]
