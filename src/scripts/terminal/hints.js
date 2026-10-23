/**
 * Plain-English hint lines (PRD T-07). Errors are printed exactly as real Git prints them;
 * when a command fails, the first matching rule below adds one short explanation underneath.
 * Order matters: more specific patterns first.
 */
const RULES = [
  [/not a git repository/, 'This folder is not a Git project yet. Run git init here, or cd into your project folder first.'],
  [/Please tell me who you are|unable to auto-detect email/, 'Git needs your name and email before it can save a commit. Set them once with git config --global user.name and user.email.'],
  [/pathspec '.*' did not match any file/, 'Git cannot find a file with that name. Check the spelling with ls or git status.'],
  [/pathspec '.*' did not match any (file|branch)/, 'Git cannot find that name. Check the spelling with git branch or ls.'],
  [/src refspec .* does not match any/, 'There is no branch with that name that has commits. Make your first commit, or check the branch name with git branch.'],
  [/Updates were rejected because the remote contains work|tip of your current branch is behind/, 'GitHub has commits you do not have yet. Run git pull first, then push again.'],
  [/has no upstream branch/, 'Git does not know where to push this branch yet. Use git push -u origin <branch> the first time.'],
  [/No configured push destination|No remote repository specified|No such remote|does not appear to be a git repository|repository '.*' not found/, 'Git does not know where to send or get the work. See your remotes with git remote -v, or add GitHub with git remote add origin <url>.'],
  [/remote .* already exists/, 'You already added a remote with that name. See it with git remote -v.'],
  [/CONFLICT|Automatic merge failed/, 'Both branches changed the same lines. Open the file, keep the right version, delete the <<<<<<< ======= >>>>>>> marker lines, then git add and git commit.'],
  [/unmerged files|unresolved conflict|You have not concluded your merge|resolve your current index first/, 'A merge is still in progress. Fix the conflicted files, git add them and git commit — or cancel with git merge --abort.'],
  [/Your local changes to the following files would be overwritten/, 'You have unsaved (uncommitted) edits that would be lost. Commit them, or put them aside with git stash, then try again.'],
  [/untracked working tree files would be overwritten/, 'A new file you have not committed has the same name as a file on the other branch. Commit it, move it, or delete it first.'],
  [/is not fully merged/, 'This branch has work that is not in your current branch. Merge it first, or use -D if you really want to throw that work away.'],
  [/cannot delete branch .* (checked out|used by worktree)/, 'You are standing on this branch. Switch to another branch first (git switch main), then delete it.'],
  [/a branch named .* already exists/, 'That branch name is taken. Pick another name, or switch to it with git switch.'],
  [/invalid reference|not a valid object name|unknown revision|ambiguous argument|is not a valid reference/, 'Git cannot find that branch, commit or tag. Check names with git branch, git log --oneline or git tag.'],
  [/does not have any commits yet|bad default revision 'HEAD'/, 'This repository has no commits yet. Add a file and make your first commit.'],
  [/tag '.*' already exists/, 'A tag with that name exists already. Tags are meant to stay fixed; pick a new name such as v1.1.'],
  [/No stash entries|stash@\{\d+\} is not a valid reference/, 'There is nothing in the stash. git stash list shows what is saved.'],
  [/Aborting commit due to empty commit message/, 'A commit needs a message. Use git commit -m "what you changed".'],
  [/You have nothing to amend/, 'There is no commit to fix yet. Make a normal commit first.'],
  [/refusing to merge unrelated histories/, 'These two histories have no commit in common (for example a new GitHub repo created with a README). Usually it is easier to clone the GitHub repo and copy your files in.'],
  [/destination path .* already exists/, 'A folder with that name is already here. cd somewhere else, or give the clone another folder name.'],
  [/is not a git command/, 'That is not a Git command — check the spelling. git help lists the common ones.'],
  [/No such file or directory/, 'There is no file or folder with that name here. Use ls to see what is in this folder and pwd to see where you are.'],
];

/** Returns the hint for this error text, or null. */
export function hintFor(text) {
  for (const [re, hint] of RULES) if (re.test(text)) return hint;
  return null;
}
