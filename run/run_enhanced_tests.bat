@echo off
setlocal enabledelayedexpansion

:: Check if a test name was provided
if "%~1"=="" (
    echo Running all PDF Operations tests
    python run_pdf_tests.py --all
) else (
    echo Running PDF test: %1
    python run_pdf_tests.py %1
)

:: Check exit code
if %errorlevel% equ 0 (
    echo.
    echo Tests completed successfully.
) else (
    echo.
    echo Tests completed with errors.
)

echo.
echo Available tests: merge, split, compress, rotate, watermark, page_numbers, header_footer
echo.
echo Usage:
echo   run_enhanced_tests.bat          - Run all tests
echo   run_enhanced_tests.bat [test]   - Run a specific test
echo.
pause
