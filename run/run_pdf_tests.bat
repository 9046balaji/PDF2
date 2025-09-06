@echo off
echo Running PDF Operations Tests
echo ===========================
echo Running all tests in sequence:

python run_pdf_tests.py --all

echo ===========================
echo Test execution complete.
echo.
echo You can also run specific tests with:
echo   run_pdf_tests.bat [test_name]
echo.
echo Available tests: split, compress, rotate, watermark, page_numbers, header_footer
pause
