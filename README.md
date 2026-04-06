# Pulsetto Feedback Monitor

Simple MVP pipeline that collects public Reddit mentions of **"Pulsetto"** and stores them in `data/mentions.csv`.

## What it does

- Fetches Reddit search results for keyword `Pulsetto`
- Normalizes fields into a consistent schema
- Stores rows in CSV
- Avoids duplicates using `url` as unique key

Saved columns:

- `title`
- `body_text`
- `subreddit`
- `author`
- `created_date` (UTC ISO format)
- `url`
- `source` (`reddit`)

## Local setup

1. Create and activate a virtual environment (recommended):

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. (Optional) set a custom Reddit user agent:

   ```bash
   export REDDIT_USER_AGENT="PulsettoFeedbackMonitor/0.1"
   ```

## Run

```bash
python scripts/run_pipeline.py
```

Output is written to:

- `data/mentions.csv`
