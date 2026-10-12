# English / Khmer AI seed dataset

The generated file is `D:\fronend_order\ai-training-data\eshop-bilingual-10000000-draft.jsonl.gz`.
`ai-training-data/manifest.json` records the verified counts, compressed size and SHA-256 checksum; `samples.json` provides readable English/Khmer examples.

## What it contains

- 10,000,000 synthetic examples: 5,000,000 English and 5,000,000 Khmer.
- 40 commerce/support topics × 125 product descriptions × 10 phrasing styles × 100 contextual combinations × 2 languages.
- 8,000,000 TRAIN, 1,200,000 VALIDATION and 800,000 TEST examples.
- Draft examples only; no customer history, credentials or payment confirmations are imported.

This is a template-generated corpus, **not ten million independent facts or human-written answers**. Assistant responses repeat across contexts. It is useful for testing data ingestion and as a draft review pool; quantity does not establish model quality. Review factual accuracy, Khmer fluency, context relevance and repetition before fine-tuning. Product-grouped splits preserve the original assignments, but closely related templates still cross subsets; these splits are not a reliable independent evaluation benchmark.

Ollama has not been trained or modified. The export is a draft artifact, separate from the existing approved-only training export workflow. Do not feed it directly into a production training run without review.

## Backend changes

The existing Java seed package now supports random access through `exampleAt(index)` and bounded `batch(offset,count)` generation. The first 100,000 examples preserve their original content, language and split.

`AiTrainingDataSeeder` commits each batch and its checkpoint in one PostgreSQL transaction. A row lock serializes workers for the same dataset. A failed batch rolls back both inserts and progress; rerunning continues from the last committed offset. Content-hash conflicts are ignored so existing reviews remain unchanged. Generator-version mismatches fail rather than rewriting a dataset. Runtime seeding remains disabled by default and the startup target remains 100,000 unless configured explicitly.

Apply these migrations in order:

1. `ai-service/src/main/resources/db/upgrade/20261011_ai_training.sql` (existing schema).
2. `ai-service/src/main/resources/db/upgrade/20261012_ai_training_seed_progress.sql` (new checkpoint table; already applied locally).

To populate the database later, set `AI_TRAINING_SEED_TARGET=10000000` and `AI_TRAINING_SEED_BATCH_SIZE=1000`. Use the existing one-shot `AiTrainingDataSeeder.main` with `AI_TRAINING_JDBC_URL`, `AI_TRAINING_JDBC_USERNAME`, and `AI_TRAINING_JDBC_PASSWORD` supplied through the environment. Do not put secrets in source control. In a packaged Spring Boot jar, run:

```powershell
java -Xmx256m -Dloader.main=com.example.eshop.ai.seed.AiTrainingDataSeeder -cp ai-service/target/ai-service-0.0.1-SNAPSHOT.jar org.springframework.boot.loader.launch.PropertiesLauncher
```

The database population has **not** run for 10 million examples. C: had approximately 1.6 GB free during inspection; the current 100,000 examples occupy approximately 91 MB including indexes. Ten million rows will require several GB, with additional space for WAL and PostgreSQL maintenance. Provision database disk capacity before running the loader. The compressed artifact is on D:.

Inspect loader progress with:

```sql
SELECT d.code, p.generator_version, p.next_index, p.target_count, p.updated_at
FROM ai_training.seed_progress p
JOIN ai_training.datasets d ON d.id = p.dataset_id;
```

## Reproduce the compressed export

From the backend repository, with a JDK 17 or newer:

```powershell
./ai-service/tools/export-training-seed.ps1 -OutputPath 'D:\exports\eshop-draft.jsonl.gz' -Count 10000000
```

The exporter uses a 128 MB heap, refuses to overwrite an existing output, and publishes the final filename only after closing the gzip stream. An interrupted `.partial` file is incomplete; choose a new output path or remove only that known partial file before retrying. Offline export restarts from the beginning; database seeding resumes from its checkpoint.

## Verification

Java seed tests cover original 100,000-example uniqueness and language balance, context boundaries, deterministic generation, unchanged product splits, and JSON escaping. PostgreSQL integration tests cover idempotent replay, expansion, preserved human reviews, and rollback/resume after an injected checkpoint failure. All exported lines are independently parsed as JSON, counted by language and split, and checked as draft records; the full gzip stream is read to verify its checksum integrity.
