from __future__ import annotations

import io
import unittest

from openpyxl import Workbook

from logicore_processing.import_processor import ImportValidationError, preview_import


class ImportProcessorTests(unittest.TestCase):
    def test_valid_onboarding_csv_is_normalized(self) -> None:
        content = (
            "full_name,phone,email,visa_type,joined_at,notes\n"
            " Salman Khan ,+971500000001,SALMAN@example.com,own_visa,2026-01-01,Initial onboarding\n"
        ).encode()

        result = preview_import(filename="drivers.csv", content=content, data_type="drivers_onboarding")

        self.assertTrue(result["ok"])
        self.assertEqual(result["rows_valid"], 1)
        self.assertEqual(result["rows"][0]["full_name"], "Salman Khan")
        self.assertEqual(result["rows"][0]["email"], "salman@example.com")
        self.assertEqual(result["rows"][0]["visa_type"], "OWN_VISA")

    def test_invalid_and_duplicate_rows_are_not_returned_as_valid(self) -> None:
        content = (
            "full_name,phone,email,visa_type,joined_at,notes\n"
            "Valid Name,+971500000001,,OWN_VISA,2026-01-01,First\n"
            "Duplicate Name,+971500000001,,OWN_VISA,2026-01-02,Second\n"
            "X,abc,bad-email,UNKNOWN,01/03/2026,\n"
        ).encode()

        result = preview_import(filename="drivers.csv", content=content, data_type="ONBOARDING")

        self.assertFalse(result["ok"])
        self.assertEqual(result["rows_total"], 3)
        self.assertEqual(result["rows_valid"], 1)
        codes = {error["code"] for error in result["errors"]}
        self.assertIn("DUPLICATE_IN_FILE", codes)
        self.assertIn("INVALID_EMAIL", codes)
        self.assertIn("INVALID_DATE", codes)

    def test_formula_in_xlsx_is_rejected(self) -> None:
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["full_name", "phone", "email", "visa_type", "joined_at", "notes"])
        sheet.append(["=1+1", "+971500000001", "", "OWN_VISA", "2026-01-01", "note"])
        output = io.BytesIO()
        workbook.save(output)

        with self.assertRaisesRegex(ImportValidationError, "Formula cells"):
            preview_import(filename="drivers.xlsx", content=output.getvalue(), data_type="ONBOARDING")

    def test_formula_like_csv_text_is_rejected(self) -> None:
        content = (
            "full_name,phone,email,visa_type,joined_at,notes\n"
            "Valid Name,+971500000001,,OWN_VISA,2026-01-01,=HYPERLINK(\"https://example.invalid\")\n"
        ).encode()

        result = preview_import(filename="drivers.csv", content=content, data_type="ONBOARDING")

        self.assertEqual(result["rows_valid"], 0)
        self.assertIn("FORMULA_VALUE_REJECTED", {item["code"] for item in result["errors"]})

    def test_missing_required_header_is_rejected(self) -> None:
        content = b"full_name,phone,email,visa_type,joined_at\nName,+971500000001,,OWN_VISA,2026-01-01\n"
        with self.assertRaisesRegex(ImportValidationError, "Missing required columns: notes"):
            preview_import(filename="drivers.csv", content=content, data_type="ONBOARDING")

    def test_unsupported_type_is_rejected(self) -> None:
        with self.assertRaisesRegex(ImportValidationError, "Only ONBOARDING"):
            preview_import(filename="finance.csv", content=b"x\n1\n", data_type="PAYABLE")


if __name__ == "__main__":
    unittest.main()
