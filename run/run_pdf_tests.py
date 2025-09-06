"""
PDF Operations Test Runner

This script runs all PDF operation tests in the test directory.
"""
import os
import sys
import time
import argparse
import subprocess
import json
from pathlib import Path

# Set up the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_DIR = os.path.join(BASE_DIR, 'tests')

# Available test modules
TEST_MODULES = {
    'split': 'test_split_pdf.py',
    'compress': 'test_compress_pdf.py',
    'rotate': 'test_rotate_pdf.py',
    'watermark': 'test_watermark_pdf.py',
    'page_numbers': 'test_page_numbers_pdf.py',
    'header_footer': 'test_header_footer_pdf.py',
}

# Function to run a specific test
def run_test(test_name, verbose=False):
    """Run a specific test module"""
    if test_name not in TEST_MODULES:
        print(f"Error: Test '{test_name}' not found. Available tests: {', '.join(TEST_MODULES.keys())}")
        return False
        
    test_file = os.path.join(TEST_DIR, TEST_MODULES[test_name])
    print(f"Running test: {test_name} ({test_file})")
    
    # Command to run the test
    if verbose:
        cmd = [sys.executable, test_file]
    else:
        cmd = [sys.executable, "-m", "pytest", test_file, "-v"]
    
    # Run the test and capture output
    start_time = time.time()
    try:
        process = subprocess.run(cmd, capture_output=True, text=True)
        elapsed_time = time.time() - start_time
        
        # Print output
        print(f"\nTest {test_name} completed in {elapsed_time:.2f} seconds")
        print("Output:")
        print("=" * 50)
        print(process.stdout)
        
        if process.stderr:
            print("Errors:")
            print("=" * 50)
            print(process.stderr)
        
        return process.returncode == 0
    except Exception as e:
        print(f"Error running test {test_name}: {str(e)}")
        return False

def run_all_tests(verbose=False):
    """Run all available tests"""
    results = {}
    overall_success = True
    
    for test_name in TEST_MODULES:
        print(f"\n{'=' * 50}")
        print(f"Running test: {test_name}")
        print(f"{'=' * 50}")
        
        success = run_test(test_name, verbose)
        results[test_name] = 'PASS' if success else 'FAIL'
        
        if not success:
            overall_success = False
    
    # Print summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    for test_name, result in results.items():
        print(f"{test_name}: {result}")
    
    print(f"\nOverall status: {'PASS' if overall_success else 'FAIL'}")
    return overall_success

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run PDF operations tests')
    parser.add_argument('test', nargs='?', help='Specific test to run')
    parser.add_argument('-a', '--all', action='store_true', help='Run all tests')
    parser.add_argument('-v', '--verbose', action='store_true', help='Run tests in verbose mode')
    args = parser.parse_args()
    
    if args.all:
        success = run_all_tests(args.verbose)
    elif args.test:
        success = run_test(args.test, args.verbose)
    else:
        parser.print_help()
        sys.exit(1)
    
    sys.exit(0 if success else 1)
