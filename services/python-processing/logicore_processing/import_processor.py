from __future__ import annotations

import csv
import hashlib
import io
import re
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

from openpyxl import load_workbook


MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_ROWS = 5_000
MAX_COLUMNS = 50
MAX_XLSX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
MAX_XLSX_ARCHIVE_FILES = 200
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
ONBOARDING_HEADERS = (
    "full_name",
    "phone",
    "email",
    "visa_type",
    "joined_at",
    "notes",
)
REQUIRED_ONBOARDING_HEADERS = {"full_name", "phone", "visa_type", "notes"}
VISA_TYPES = {"OWN_VISA", "NEED_VISA", "NEED_VISA_AND_LICENSE"}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9 ()-]{5,30}[0-9]$")


class ImportValidationError(ValueError):
    """Raised when the import file itself cannot be safely processed."""


def _clean_header(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def _clean_text(value: Any, *, max_length: int) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return str(value).strip()[:max_length]


def _read_csv(content: bytes) -> tuple[list[str], list[tuple[int, dict[str, Any]]]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ImportValidationError("CSV must be UTF-8 encoded") from exc
    if "\x00" in text:
        raise ImportValidationError("CSV contains invalid NUL bytes")

    reader = csv.reader(io.StringIO(text, newline=""))
    try:
        raw_headers = next(reader)
    except StopIteration as exc:
        raise ImportValidationError("Import file is empty") from exc

    headers = [_clean_header(value) for value in raw_headers]
    if len(headers) > MAX_COLUMNS:
        raise ImportValidationError(f"Import has more than {MAX_COLUMNS} columns")

    rows: list[tuple[int, dict[str, Any]]] = []
    for row_number, values in enumerate(reader, start=2):
        if not any(str(value).strip() for value in values):
            continue
        if len(rows) >= MAX_ROWS:
            raise ImportValidationError(f"Import exceeds the {MAX_ROWS} row limit")
        if len(values) > len(headers):
            raise ImportValidationError(f"CSV row {row_number} has more values than the header row")
        padded = values + [""] * max(0, len(headers) - len(values))
        rows.append((row_number, dict(zip(headers, padded, strict=False))))
    return headers, rows


def _read_xlsx(content: bytes) -> tuple[list[str], list[tuple[int, dict[str, Any]]]]:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            members = archive.infolist()
            if len(members) > MAX_XLSX_ARCHIVE_FILES:
                raise ImportValidationError("XLSX archive contains too many files")
            if any(member.flag_bits & 0x1 for member in members):
                raise ImportValidationError("Encrypted XLSX files are not accepted")
            if sum(member.file_size for member in members) > MAX_XLSX_UNCOMPRESSED_BYTES:
                raise ImportValidationError("XLSX expands beyond the safe processing limit")
    except zipfile.BadZipFile as exc:
        raise ImportValidationError("XLSX file is not a valid archive") from exc

    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=False)
    except Exception as exc:
        raise ImportValidationError("XLSX file could not be opened") from exc

    try:
        worksheet = workbook.active
        iterator = worksheet.iter_rows()
        try:
            header_cells = next(iterator)
        except StopIteration as exc:
            raise ImportValidationError("Import file is empty") from exc

        headers = [_clean_header(cell.value) for cell in header_cells]
        if len(headers) > MAX_COLUMNS:
            raise ImportValidationError(f"Import has more than {MAX_COLUMNS} columns")

        rows: list[tuple[int, dict[str, Any]]] = []
        for row_number, cells in enumerate(iterator, start=2):
            if len(rows) >= MAX_ROWS:
                raise ImportValidationError(f"Import exceeds the {MAX_ROWS} row limit")
            if any(cell.data_type == "f" for cell in cells):
                raise ImportValidationError(
                    f"Formula cells are not accepted (first found on row {row_number})"
                )
            values = [cell.value for cell in cells]
            if not any(value not in (None, "") for value in values):
                continue
            padded = values + [None] * max(0, len(headers) - len(values))
            rows.append((row_number, dict(zip(headers, padded, strict=False))))
        return headers, rows
    finally:
        workbook.close()


def _validate_headers(headers: Iterable[str]) -> None:
    normalized = list(headers)
    if not normalized or all(not item for item in normalized):
        raise ImportValidationError("Header row is missing")
    if any(not item for item in normalized):
        raise ImportValidationError("Every import column must have a header")
    if len(normalized) != len(set(normalized)):
        raise ImportValidationError("Import contains duplicate headers")
    missing = sorted(REQUIRED_ONBOARDING_HEADERS.difference(normalized))
    if missing:
        raise ImportValidationError(f"Missing required columns: {', '.join(missing)}")


def _parse_date(value: Any) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = _clean_text(value, max_length=32)
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError as exc:
        raise ValueError("Use YYYY-MM-DD") from exc


def _row_error(row: int, field: str, code: str, message: str) -> dict[str, Any]:
    return {"row": row, "field": field, "code": code, "message": message}


def _normalize_onboarding_row(
    source_row: int,
    raw: dict[str, Any],
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    errors: list[dict[str, Any]] = []
    full_name = _clean_text(raw.get("full_name"), max_length=120)
    phone = _clean_text(raw.get("phone"), max_length=32)
    email = _clean_text(raw.get("email"), max_length=254).lower()
    visa_type = _clean_text(raw.get("visa_type"), max_length=40).upper()
    notes = _clean_text(raw.get("notes"), max_length=1_000)

    for field, value in (("full_name", full_name), ("email", email), ("notes", notes)):
        if value.startswith(("=", "+", "-", "@")):
            errors.append(
                _row_error(source_row, field, "FORMULA_VALUE_REJECTED", "Formula-like text is not accepted")
            )

    if len(full_name) < 2:
        errors.append(_row_error(source_row, "full_name", "INVALID_NAME", "Full name must contain at least 2 characters"))
    if not PHONE_PATTERN.fullmatch(phone):
        errors.append(_row_error(source_row, "phone", "INVALID_PHONE", "Phone must contain 7 to 32 valid characters"))
    if email and not EMAIL_PATTERN.fullmatch(email):
        errors.append(_row_error(source_row, "email", "INVALID_EMAIL", "Email format is invalid"))
    if visa_type not in VISA_TYPES:
        errors.append(_row_error(source_row, "visa_type", "INVALID_VISA_TYPE", f"Visa type must be one of: {', '.join(sorted(VISA_TYPES))}"))
    if not notes:
        errors.append(_row_error(source_row, "notes", "NOTES_REQUIRED", "Notes are required for onboarding"))

    try:
        joined_at = _parse_date(raw.get("joined_at"))
    except ValueError as exc:
        joined_at = ""
        errors.append(_row_error(source_row, "joined_at", "INVALID_DATE", str(exc)))

    if errors:
        return None, errors
    return {
        "source_row": source_row,
        "full_name": full_name,
        "phone": phone,
        "email": email or None,
        "visa_type": visa_type,
        "joined_at": joined_at or None,
        "notes": notes,
    }, []


def preview_import(*, filename: str, content: bytes, data_type: str) -> dict[str, Any]:
    if not content:
        raise ImportValidationError("Import file is empty")
    if len(content) > MAX_FILE_BYTES:
        raise ImportValidationError(f"Import exceeds the {MAX_FILE_BYTES // (1024 * 1024)} MB limit")

    normalized_type = _clean_header(data_type).upper()
    if normalized_type in {"DRIVERS_ONBOARDING", "ONBOARDING"}:
        normalized_type = "ONBOARDING"
    if normalized_type != "ONBOARDING":
        raise ImportValidationError("Only ONBOARDING imports are enabled in this completed workflow")

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ImportValidationError("Use CSV or XLSX files only")

    headers, source_rows = _read_csv(content) if extension == ".csv" else _read_xlsx(content)
    _validate_headers(headers)

    valid_rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    seen_phones: dict[str, int] = {}
    for source_row, raw in source_rows:
        normalized, row_errors = _normalize_onboarding_row(source_row, raw)
        if normalized is not None:
            phone_key = re.sub(r"[^0-9]", "", normalized["phone"])
            first_row = seen_phones.get(phone_key)
            if first_row is not None:
                row_errors.append(
                    _row_error(source_row, "phone", "DUPLICATE_IN_FILE", f"Phone duplicates row {first_row}")
                )
                normalized = None
            else:
                seen_phones[phone_key] = source_row
        if normalized is not None:
            valid_rows.append(normalized)
        errors.extend(row_errors)

    rows_total = len(source_rows)
    rows_valid = len(valid_rows)
    return {
        "ok": rows_total > 0 and rows_valid == rows_total,
        "data_type": normalized_type,
        "file_name": Path(filename).name,
        "file_sha256": hashlib.sha256(content).hexdigest(),
        "headers": [header for header in headers if header],
        "expected_headers": list(ONBOARDING_HEADERS),
        "rows_total": rows_total,
        "rows_valid": rows_valid,
        "rows_invalid": rows_total - rows_valid,
        "rows": valid_rows,
        "errors": errors[:200],
        "errors_truncated": len(errors) > 200,
    }
