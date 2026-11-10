# Contributing to Scrum Master

Thanks for your interest! Contributions are welcome.

## Getting started

1. Fork the repo and clone your fork.
2. Follow the setup in [README.md](./README.md).
3. Create a branch: `git checkout -b feat/my-change`.
4. Make your changes, run `npx tsc --noEmit` and `npm run build`.
5. Open a pull request against `main`.

## Guidelines

- Keep changes focused and small. One PR per concern.
- Match the existing code style (Poppins-based UI, Tailwind 4 + shadcn).
- Don't commit secrets (`.env.local`, service role keys).
- Add or update tests where applicable.
- For UI changes, verify both light and dark mode and mobile widths.

## Reporting bugs

Open an issue with reproduction steps, expected vs. actual behavior, and
browser/OS details.

## Code of conduct

Be respectful and constructive. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

By contributing you agree your contributions are licensed under the MIT License.
