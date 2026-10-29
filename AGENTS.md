# Repository working instructions

Preserve approved website behavior unless a change is explicitly requested.

For every open-source delivery, maintain a sanitized development record using
`docs/development/TEMPLATE.md`. Record available token totals and their scope,
input/cache/output relationships, conversation turns, tool calls, failures,
compactions, start/cutoff times and timezone, elapsed versus active time, timing
coverage and uncertainty, actual validation, publication/deployment status,
sources/licenses, and temporary-file cleanup with sizes. Mark unknown data as
unrecorded. Never infer duration from tokens or present estimates as actual bills.
Keep dated snapshots immutable and link the current record from both READMEs.

Publish only allowlisted aggregate data. Never commit credentials, API keys,
passwords, cookies, access tokens, private keys, verification codes, authorization
QR codes, secret-bearing URLs, raw chat/tool logs, private account information or
private machine paths. Document configuration names and setup steps with safe
placeholders only. Review text and image metadata before staging and pushing.

Documentation and artwork must remain usable independently of the assistant,
its local profile and private logs. Do not add runtime dependencies for reporting.
