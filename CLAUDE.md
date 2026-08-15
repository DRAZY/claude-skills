# claude-skills — project rules

Project-scoped conventions for this repo. These live next to the code they
govern rather than in a global config.

## Scope

Skills in this repo are scoped to **local, self-directed work where the user
stays in the loop and drives each step**.

Contributions that recommend external or third-party services holding
account-level automation access — a tool that acts on someone's social account,
for example — are declined as out-of-scope, not as low quality. Say so plainly
when declining; the distinction matters to the contributor.

## Sync scripts

Sync scripts that update a local install live inside this repo, and they must be
surgical:

- Touch only this repo's own skills within `~/.claude/skills/`. A live install
  carries 50+ unrelated skills alongside them.
- Never overwrite or clobber skills this repo doesn't own.
- Always offer a preview step before writing changes.

## Blog-writer skill

The blog-writer skill is **universal and topic-agnostic**, standing alongside
the script-writer skill. It is deliberately not security-locked: security is one
archetype among several, alongside tutorial walkthroughs, market and industry
analysis, commentary, and vulnerability writeups.

It supports variable length, from short posts to in-depth long-form. Publishing
homes each carry their own voice and format profile (a personal site and a work
blog are different targets). When given only an angle or topic, the skill asks
clarifying questions to sharpen context before drafting.
