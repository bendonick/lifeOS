"""Shared helpers for the LifeOS intelligence layer (docs/01-architecture.md).

Scripts here are standalone: cron/launchd runs them, they read and write
`data/lifeos.db` directly, and the webapp only renders what they produced.
Nothing in `src/` imports from this package and nothing here imports from `src/` —
the two sides meet at the database and at `config` keys.
"""
