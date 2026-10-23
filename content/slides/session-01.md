---
title: Why version control?
session: 01
unit: 1
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 1 · Unit 1 · Introduction to Version Control</p>

# Why version control?

Git & GitHub Fundamentals · SBCCAS, Amroli

Notes:
Welcome the class. Today has no installation and no commands: only the *why*. By the end, every student should be able to explain why Git exists and name the three kinds of VCS.
Timeline: hook 10 min · story 20 · VCS types 25 · Git vs GitHub 20 · group activity 30 · exit ticket 15.

---
<!-- slide: center big -->
## Which one is the latest?

```output
project.zip
project_v2.zip
project_FINAL.zip
project_FINAL_really.zip
project_FINAL_use_THIS_one.zip
```

Notes:
Show the real folder on your desktop if you prepared it. Ask: "Which file is the latest? Who changed what?" Let 2–3 students share their own "final_final" stories; everyone has one.

---
## Meet the Amroli Canteen team

| Student | Builds |
|---|---|
| **Krish** | menu & cart pages |
| **Dhruvi** | order system (Python) |
| **Meet** | database |
| **Hetvi** | team lead · README · reviews |

A BCA final-year project: **order samosas and chai before the lunch break**, no queue.

Notes:
This team appears in every unit: lessons, missions, quizzes and these slides. Introduce them like real people. Students remember stories better than definitions.

---
<!-- slide: content reveal -->
## Week 1: how they shared code

- 📱 WhatsApp: "sending app.py, use this one"
- 💾 Pen drives passed around the lab
- 📧 Email attachments with `_v2`, `_v3`, `_final`
- 🗂️ One laptop held the "real" copy

Notes:
Reveal one point at a time (→). Ask: "Who has worked like this?" Hands will go up. That's the point: it works until it doesn't.

---
<!-- slide: three -->
## Five problems in two weeks

:::neon+ 1 · Lost work
Krish's login page worked Monday. Tuesday's "improvement" broke it. Monday's version is gone.
:::

:::neon+ 2 · File chaos
`menu_FINAL_use_this.html`, but which one?
:::

:::neon+ 3 · Overwritten
Dhruvi and Krish both edited `app.py`. The last one sent "won".
:::

:::neon+ 4 · Who broke it?
Total shows ₹0. When? Who? Why? Nobody knows.
:::

:::neon+ 5 · No backup
Meet's laptop crashed. His database work was only there.
:::

Notes:
Reveal each problem and ask the class how they would solve it *without* new tools. Then: "Professional teams solve all five with one tool: version control."

---
<!-- slide: center big -->
## Version control is a ==time machine== for your project

Like **checkpoints in a video game**: fall into lava, restart from the last checkpoint, not from the beginning.

Each checkpoint is called a **commit**.

Notes:
Key definition: a version control system records changes to files over time so you can see who changed what and bring back any earlier version.

---
<!-- slide: content reveal -->
## A VCS answers four questions about every change

- **What** changed? (exact lines)
- **Who** changed it?
- **When**?
- **Why**? (the message the author wrote)

:::tip+ Back to the canteen
Problem 4 "who broke the total?" is answered in seconds with `git log`.
:::

---
## Three kinds of version control

:::diagram vcs-types

Notes:
Walk left to right. Local = personal diary. Centralized = one library book for the whole class. Distributed = everyone owns a full photocopy. Ask: "What happens in each picture if the server or the laptop dies?"

---
## Local · Centralized · Distributed

| | Local | Centralized | **Distributed (Git)** |
|---|---|---|---|
| History lives | one computer | one server | **every computer** |
| Work offline | ✓ | ✗ | **✓** |
| Teamwork | ✗ | ✓ | **✓** |
| One machine dies | history lost | everyone stuck | **nothing lost** |
| Examples | RCS | CVS, SVN | **Git**, Mercurial |

---
<!-- slide: center -->
:::insight Why Git won
Created in **2005** by **Linus Torvalds** (creator of Linux) to manage thousands of Linux developers.

Fast · works offline · cheap branching · free and open source.
:::

Today: almost every software company, from startups to Google and Microsoft.

---
## Git vs GitHub

:::diagram git-vs-github

Notes:
The most common exam mistake: "GitHub is a version control system." Git is the VCS; GitHub is a website that hosts Git repositories. GitLab and Bitbucket are alternatives.

---
<!-- slide: quiz -->
## Quick check: which statement is ==wrong==?

1. Git works without the internet
2. GitHub is a website that hosts Git repositories
3. GitHub is the version control system and Git is its app
4. Every Git clone contains the full history

:::reveal+ Answer
**3** is wrong. **Git** is the version control system; **GitHub** is a hosting service built around it.
:::

---
<!-- slide: activity 25 -->
## Group activity · paper, groups of 4

Draw how *your* team would share code for a project **without Git**.

- List three things that could go wrong
- Circle the one that would hurt most
- One person presents in 1 minute

Notes:
Press T to start the 25-minute timer (20 min work + presentations). Walk around. Collect the best "what could go wrong" answers. They make good exam questions.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. Which VCS type has a single point of failure?
2. Why can Git work offline?
3. Name one alternative to GitHub.

:::reveal+ Answers
1 · **Centralized** · 2 · every copy has the **full history** · 3 · **GitLab**, Bitbucket or Gitea
:::

---
<!-- slide: content -->
## Recap & homework

- A **VCS** records what, who, when and why for every change
- **Local → Centralized → Distributed**; Git is distributed
- **Git** = tool on your computer · **GitHub** = website for teams

:::example Before next session
Read *Installing Git on Windows* in Unit 1. Bring a **personal email** you can open in class and your **phone** (for GitHub two-factor authentication).
:::
