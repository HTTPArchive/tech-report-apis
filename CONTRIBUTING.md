# Contributing to Tech Report APIs

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [issues](https://github.com/HTTPArchive/tech-report-apis/issues) if there's something similar to what you have in mind. If not, you can open a new issue and provide as much detail as possible about what you'd like to see or what problem you're experiencing.

## Fork & create a branch

If this is something you think you can fix, then fork the repository and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```bash
git checkout -b feature/325-add-japanese-localisation
```

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

## Write a good commit message

A good commit message serves at least three important purposes:

- To speed up the reviewing process.
- To help us write a good release note.
- To help the future maintainers of Project Name (it could be you!), say five years into the future, to find out why a particular change was made to the code or why a specific feature was added.

Here's an example of a good commit message structure:

```bash
Short (50 chars or less) summary of changes

More detailed explanatory text, if necessary.  Wrap it to about 72
characters or so.  In some contexts, the first line is treated as the
subject of an email and the rest of the text as the body.  The blank
line separating the summary from the body is critical (unless you omit
the body entirely); tools like rebase can get confused if you run the
two together.

Further paragraphs come after blank lines.

- Bullet points are okay, too

- Typically a hyphen or asterisk is used for the bullet, followed by a
  single space, with blank lines in between, but conventions vary here

- Use a hanging indent
```

## Submit a pull request

Once you've pushed your branch to your fork, you're ready to submit a pull request. We recommend opening a pull request early, and marking it as "Work in Progress" (prefix the title with `WIP:`), so that you can receive feedback early.

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To update your pull request, follow these steps:

1. `git fetch origin`
2. `git rebase origin/main`
3. `git push --force-with-lease origin <your-branch>`

Thank you for your contributions!