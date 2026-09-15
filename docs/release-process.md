# Release Process — DiabCare WoundCam

> Maintained by diab-log (changelog automation agent)

## Versioning

SemVer (`major.minor.patch`) as defined in [semver.org](https://semver.org):

| Bump | When |
|------|------|
| **PATCH** | Bug fixes only (`fix:`) |
| **MINOR** | New features (`feat:`), no breaking changes |
| **MAJOR** | Breaking changes (commit body contains `BREAKING CHANGE:` or type has `!` suffix) |

## Tagging

Releases are tagged on `main` from `develop`:

```bash
git checkout main && git merge develop
git tag -a v0.1.0 -m "v0.1.0"
git push --atomic origin main v0.1.0
```

## Changelog Generation

Changelogs are generated from [Conventional Commits](https://www.conventionalcommits.org/) using
[git-cliff](https://git-cliff.org). Config lives at `cliff.toml` in the repo root.

### Generate from last tag

```bash
npx git-cliff -o CHANGELOG.md
```

### Regenerate full history

```bash
npx git-cliff --unreleased -o CHANGELOG.md
```

### Preview next version

```bash
npx git-cliff --unreleased --tag v0.1.0
```

The generated `CHANGELOG.md` is committed alongside the release tag.

## Planned Releases

| Tag | Date (target) | Contents |
|-----|--------------|----------|
| `v0.1.0` | D10 (Fri 25 Sep) | Capture loop core: guided camera, upload pipeline, wound list |
| `v0.2.0` | TBD | AI proxy, escalation model, patient self-report |
| `v0.3.0` | TBD | PDF reports, EMR import, risk stratification |

## Branch Flow

```
develop  ── PR/merge ──► main ── tag ──► release
   ▲                          │
   └── hotfix ────────────────┘
```

Hotfix branches from `main`, merge back to both `main` and `develop`.