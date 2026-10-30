# Milestone 12c — remote session (31 Oct) and final MCQ exam (2 Nov)

| | |
|---|---|
| **Status** | ✅ **Approved by the owner on 29 Oct 2026** ("approve all": M12C-D1 – M12C-D12 as recommended). **Built and tried 29–30 Oct 2026**: remote session live (with the student timer, owner approval 30 Oct); final exam tried locally, question bank of 75 approved by the owner 30 Oct ([evidence](../evidence/m12c/2026-10-29-remote-session-trial.md)). |
| **Owner request (29 Oct 2026)** | A remote task session at home, monitored on the dashboard and counted as attendance, including uploading the students' AI project to GitHub; a server-marked MCQ exam on the course site |
| **Builds on** | Milestones 10–12 (live) and 12b (counter, requests — tested locally, push pending) · [operations guide](../PHASE-2-OPERATIONS.md) |

## 1. Schedule (owner, 29 Oct 2026)

| Date | Event |
|---|---|
| Thu 29 – Fri 30 Oct | Units 4–5 in class (4 lectures a day) |
| **Sat 31 Oct, 11:00 – 15:00 IST** | **Remote session at home** — task of at least 1.5–2 hours, monitored on the dashboard |
| **Mon 2 Nov** | 2-hour physical concluding session (remaining Unit 4: advanced commands), then the **MCQ exam** in the lab/classroom on students' own phones — **25 questions, 30 minutes, pass mark 40 %, result shown at once** |

**Build timeline:** plan approved 29 Oct → remote-session features built and tried locally, pushed by **Fri 30 Oct evening**
→ exam mode built, question bank reviewed by the owner, tried locally, pushed by **Sun 1 Nov**.

## 2. Remote session (Sat 31 Oct, 11:00 – 15:00)

Students sign in and work at home; every piece of work carries a time, so the dashboard shows who worked and when.

| Part | Task | How it is seen |
|---|---|---|
| **A — course site** | Finish missions M-12 – M-15, the Unit 4 and 5 quizzes and the Self-check | Dashboard (already recorded); mission and self-check times |
| **B — AI project on GitHub** | Push the AI project they already built to a **public** GitHub repository, meeting the checklist below; paste the repository link on the account page | Link, checklist result and commit times on the dashboard |
| **C — class activity (optional)** | Fork the class repository `sbccas/sy-ai-2026-wall`, add `<roll-no>.md` (name, one line about their project), open a pull request; paste the PR link | PR link on the dashboard; PRs visible on GitHub with times |

**Project checklist (Part B), checked automatically when the student submits the link** — from the student's browser
with GitHub's public data, re-checkable by faculty: repository is public · README.md (project name, what it does, how
to run, team) · `.gitignore` · at least 5 commits · at least one pull request merged from a branch · a tag or release
`v1.0`. **No API keys or passwords in the repository** (AI projects often contain keys: `.env` must be in `.gitignore`;
the task sheet explains this).

**Session report (dashboard):** choose a time window (default Sat 31 Oct 11:00 – 15:00) → one row per student: roll no,
name, first and last activity in the window, **active time** (from progress saves, below), missions and self-check
done in the window, project submitted (✓, checklist score, commits made in the window), class PR link; CSV for
attendance. "At least 1.5 h active" is highlighted; faculty make the final judgement.

**Active time (M12C-D2):** each progress save already reaches `save_progress`; it would also record the save time in a
private activity log. Active time = the number of distinct 5-minute periods with activity. Read only by faculty of
the student's batch; included in "Download my data"; removed with the account.

**Students' side:** the account page gets **"Remote session — Sat 31 Oct"** with the three parts, the checklist and the
two link boxes (project repository, class PR).

## 3. Final exam (Mon 2 Nov) — exam mode, marked on the server

| Item | Design |
|---|---|
| Question bank | 75 MCQs, 15 per unit, drafted by Claude from the course content and **reviewed and edited by the owner**. **Never in the public repository**: kept in a git-ignored local file and loaded by the owner in the SQL Editor (M12C-D6) |
| Paper | 25 questions per student, **5 from each unit**, chosen at random; question and option order shuffled per student |
| Timing | 30 minutes from the student's start, measured by the **server clock**; answers saved as each one is chosen, so a reload, dropped network or flat battery loses nothing and the paper resumes; at 30 minutes the paper is submitted with the saved answers |
| Attempts | One per student; only students in the exam's batch; only while faculty have the exam **open** |
| Marking | In the database: correct answers never reach the phone; score and pass/fail (≥ 40 %) shown **as soon as the student submits** (M12C-D8) |
| Faculty | Dashboard → **Exam**: create (title, batch, 25 questions, 30 min, 40 %), **Open** / **Close**, live counts (not started · in progress · submitted), results table with roll no, score, pass/fail, time taken; CSV. Closing submits any unfinished papers |
| Light integrity aid (M12C-D11) | The page counts how often the student leaves it during the exam; faculty see the count; nothing is blocked. Invigilation stays physical |

**Database (migration 6, additive):** `private.exam_questions`, `private.exams`, `private.exam_attempts` (questions
chosen, answers, start, deadline, submitted, score, leave count); functions `exam_status()`, `start_exam()`,
`save_exam_answer()`, `submit_exam()` for students and `faculty_exam_*()` for faculty, all under X1–X6. Tests run only
locally (`npm run sql-check`).

## 4. Readiness risk to act on now

By 28 Oct only **5 students** had completed sign-in (3 in the batch) and **5 more** had started but not saved their profile. The remote session and the exam both need every student **signed in,
with a roll number and in the batch**. Suggested: ask all 80 to complete sign-in in class on Thu/Fri (in Chrome, not
inside WhatsApp — the WhatsApp fix in 12b helps), and check the dashboard count before Saturday.

## 5. Tests (proposed — none run)

**SQL (local):** activity log written on changed saves only, readable by batch faculty only · project and PR links
stored per student, valid GitHub URLs only · session report sees only own batches · exam: closed exam cannot start;
other batch cannot start; one attempt; questions returned without answers; same paper on resume; answer after the
deadline refused; submit marks correctly and is idempotent; pass at exactly 40 %; close submits unfinished papers;
students never read the bank or others' attempts; X1–X6. **`npm test`:** project checklist evaluation from sample
GitHub responses; session-window maths (active 5-minute periods); exam timer display; CSV. **Manual (local trial):**
the owner's accounts and one test student: full remote-session flow; a full exam with a reload in the middle.

## 6. Decisions for the owner

| ID | Question | Technical recommendation |
|---|---|---|
| M12C-D1 | Scope: remote session Parts A, B, C + session report; exam mode as in §3 | Approve |
| M12C-D2 | Record progress-save times (activity log) to show active time | Approve — the only reliable evidence of 1.5–2 hours |
| M12C-D3 | Project repositories must be **public** (so the checklist and faculty can see them) | Approve |
| M12C-D4 | Project checklist as in §2 | Approve or edit |
| M12C-D5 | Class repository `sbccas/sy-ai-2026-wall`, created by the owner on GitHub (Claude drafts its README) | Approve |
| M12C-D6 | Question bank kept out of the public repository, loaded by the owner | Approve — otherwise students could read the answers on GitHub |
| M12C-D7 | 5 questions per unit per student | Approve |
| M12C-D8 | Show score and pass/fail at once; show which answers were wrong only after faculty close the exam | Approve — avoids answers spreading in the room |
| M12C-D9 | One attempt; resume after reload; auto-submit at 30 minutes | Approve |
| M12C-D10 | Faculty open and close the exam by hand on the day | Approve |
| M12C-D11 | Count leaving the exam page (shown to faculty, not blocking) | Approve |
| M12C-D12 | No new consent wording: exam scores, project links and activity times are "course progress" already named in `v1` | Approve (otherwise everyone re-agrees to `v2` before Saturday) |
