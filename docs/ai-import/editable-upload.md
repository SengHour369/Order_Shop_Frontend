# Editable workbook preview

Uploading a workbook stages its bytes, requests advisory worksheet analysis, then opens the preview. Extracted Excel headers and cell values appear in the table immediately, before mapping confirmation. Corrections entered in these original columns are carried into the selected backend fields when the user confirms the mapping; confirmation remains explicit.

After confirming a worksheet mapping, **Add row** appends an editable local draft. **Remove** discards an unsaved new row. **Save changes** saves corrections and new rows sequentially, using the revision returned by each request. Added rows are included in the normal validation, independent review, and execution workflow. Product photos are attached after the new row is saved.

The new AI-service endpoint is `POST /api/ai/imports/{batchId}/sheets/{sheetId}/rows`. Its request contains `version`, a stable client-generated UUID in `rowId`, and string-valued `values`. Its response contains the updated `batch` and saved `row`.

The endpoint locks the batch, checks ownership/review access, the worksheet's confirmed mapping and domain permission, enforces the configured workbook row limit, and rejects unknown fields or manually supplied image references. Adding a row increments the revision and invalidates prior validation and approval. Reusing an existing row UUID cannot create a duplicate.

Deploy the updated AI-service source before using **Save** on new rows. No database migration is required: new rows use the existing import staging tables. Original workbook downloads preserve the uploaded file; added rows are staged separately.
