# Push instructions

This folder is already a git repo with one commit. To publish:

1. Create a new EMPTY repo on GitHub (no README/license), e.g. `mira-whatsapp-agent-eval`.
2. From this folder:

```
git remote add origin https://github.com/<your-username>/mira-whatsapp-agent-eval.git
git branch -M main
git push -u origin main
```

If you connect Git access here, I can run the push for you in the next step instead.

## Before making it public
- Confirm no secrets are present (this repo intentionally contains none: no tokens, keys, hosts, or phone numbers).
- The dataset messages are paraphrased/anonymized. Keep them that way.
- A quick nod from the business owner that an anonymized write-up is fine.
