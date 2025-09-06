@echo off
echo Running PDF Tool file upload tests...

cd %~dp0
python -m pytest tests\test_file_uploads.py tests\test_file_types.py tests\test_multiple_files.py -v

if %ERRORLEVEL% EQU 0 (
    echo All tests passed!
) else (
    echo Some tests failed. Please check the output above.
)

pause
