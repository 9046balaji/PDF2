import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from unittest.mock import patch, MagicMock
import io

# Important: Make sure your app object is importable.
# If your main file is app.py, this will work.
from ..app import app
import json
import json

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_upload_success(client):
    """
    Tests the simple /upload endpoint, mocking the S3 call.
    """
    # We use 'patch' to replace the real s3 client with a mock
    with patch('app.s3') as mock_s3:
        # We don't need a real clamav connection for this test
        with patch('app.cd', None):
            file_data = (io.BytesIO(b"dummy pdf content"), 'test.pdf')
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')

            assert response.status_code == 200
            assert 'key' in response.json
            # Verify that our mock s3 client's upload_fileobj method was called once
            mock_s3.upload_fileobj.assert_called_once()

def test_full_workflow(client):
    """
    Tests the entire /process -> /task -> /download workflow using mocks.
    """
    # 1. MOCK EXTERNAL SERVICES
    # Mock the Celery task so we don't need a real worker
    mock_task = MagicMock()
    mock_task.id = "test-task-123"

    # Mock S3 to simulate file download and upload
    mock_s3 = MagicMock()
    
    # Mock the AsyncResult to control the task status
    mock_async_result = MagicMock()
    
    # Configure the mock to return different values on subsequent calls
    mock_async_result.configure_mock(
        **{
            "state": "SUCCESS",
            "result": {
                "key": "processed/final.pdf",
                "filename": "final.pdf",
                "size": 12345
            }
        }
    )

    # Apply the mocks using patch
    with patch('tasks.process_pdf_task.apply_async', return_value=mock_task) as mock_apply_async, \
         patch('app.s3', mock_s3), \
         patch('celery.result.AsyncResult', return_value=mock_async_result) as mock_celery_result:

        # 2. CALL THE /process ENDPOINT
        process_payload = {
            "command": "merge",
            "file_keys": ["uploads/doc1.pdf", "uploads/doc2.pdf"]
        }
        response = client.post('/process', json=process_payload)
        
        assert response.status_code == 202
        assert response.json['task_id'] == "test-task-123"
        mock_apply_async.assert_called_once() # Check that a task was started

        # 3. CALL THE /task/<id> ENDPOINT
        task_id = response.json['task_id']
        response = client.get(f'/task/{task_id}')

        assert response.status_code == 200
        assert response.json['status'] == 'SUCCESS'
        assert response.json['result']['key'] == 'processed/final.pdf'
        mock_celery_result.assert_called_with(task_id, app=app.celery) # Check that we tried to get the task result

        # 4. CALL THE /download ENDPOINT
        # Simulate the file object that S3 would return
        mock_s3.get_object.return_value = {
            'Body': io.BytesIO(b'final merged pdf content'),
            'ContentType': 'application/pdf'
        }
        result_key = response.json['result']['key']
        response = client.get(f'/download?key={result_key}')

        assert response.status_code == 200
        assert response.mimetype == 'application/pdf'
        assert response.data == b'final merged pdf content'
        mock_s3.get_object.assert_called_once_with(Bucket='pdfs', Key=result_key) # Check that we tried to download from S3
        def test_download_with_missing_key(client):
            """Test downloading a file with a missing key parameter."""
            response = client.get('/download')
            assert response.status_code == 400
            assert b"Missing 'key' parameter" in response.data

        def test_download_with_path_traversal(client):
            """Test downloading a file with path traversal attempts."""
            # Test with parent directory reference
            response = client.get('/download?key=../some_file.pdf')
            assert response.status_code == 400
            assert b"Invalid file key" in response.data
            
            # Test with forward slash
            response = client.get('/download?key=uploads/some_file.pdf')
            assert response.status_code == 400
            assert b"Invalid file key" in response.data
            
            # Test with backslash
            response = client.get('/download?key=uploads\\some_file.pdf')
            assert response.status_code == 400
            assert b"Invalid file key" in response.data

        def test_download_file_not_found(client):
            """Test downloading a non-existent file."""
            response = client.get('/download?key=nonexistent.pdf')
            assert response.status_code == 404
            assert b"File not found" in response.data

        def test_download_uploaded_file(client):
            """Test downloading a file from the uploads folder."""
            # Create a test file in the uploads folder
            filename = "test_upload.pdf"
            upload_path = os.path.join('uploads', filename)
            
            with open(upload_path, 'wb') as f:
                f.write(b'test pdf content')
            
            try:
                response = client.get(f'/download?key={filename}')
                assert response.status_code == 200
                assert response.data == b'test pdf content'
                assert response.headers['Content-Type'] == 'application/pdf'
                assert response.headers['Content-Disposition'] == f'attachment; filename="{filename}"'
            finally:
                # Clean up
                if os.path.exists(upload_path):
                    os.remove(upload_path)

        def test_download_processed_file(client):
            """Test downloading a file from the processed folder."""
            # Create a test file in the processed folder
            filename = "test_processed.pdf"
            processed_path = os.path.join('processed', filename)
            
            with open(processed_path, 'wb') as f:
                f.write(b'processed pdf content')
            
            try:
                response = client.get(f'/download?key={filename}')
                assert response.status_code == 200
                assert response.data == b'processed pdf content'
                assert response.headers['Content-Type'] == 'application/pdf'
            finally:
                # Clean up
                if os.path.exists(processed_path):
                    os.remove(processed_path)

        def test_upload_and_download_pdf(client):
            """Test uploading and then downloading a PDF file."""
            # Create a PDF file in memory
            file_data = (io.BytesIO(b"PDF test content"), 'test.pdf')
            
            # Upload the file
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')
            assert response.status_code == 200
            
            # Get the file key from the response
            file_key = response.json['key']
            
            # Download the file
            response = client.get(f'/download?key={file_key}')
            assert response.status_code == 200
            assert b"PDF test content" in response.data

        def test_upload_and_download_docx(client):
            """Test uploading and then downloading a DOCX file."""
            # Create a DOCX file in memory
            file_data = (io.BytesIO(b"DOCX test content"), 'test.docx')
            
            # Upload the file
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')
            assert response.status_code == 200
            
            # Get the file key from the response
            file_key = response.json['key']
            
            # Download the file
            response = client.get(f'/download?key={file_key}')
            assert response.status_code == 200
            assert b"DOCX test content" in response.data

        def test_upload_and_download_ipynb(client):
            """Test uploading and then downloading a Jupyter notebook file."""
            # Create a simple Jupyter notebook JSON structure
            notebook_json = {
                "cells": [
                    {
                        "cell_type": "code",
                        "execution_count": 1,
                        "metadata": {},
                        "outputs": [],
                        "source": ["print('Hello Jupyter')"]
                    }
                ],
                "metadata": {
                    "kernelspec": {
                        "display_name": "Python 3",
                        "language": "python",
                        "name": "python3"
                    }
                },
                "nbformat": 4,
                "nbformat_minor": 4
            }
            
            # Convert to bytes
            notebook_bytes = json.dumps(notebook_json).encode('utf-8')
            file_data = (io.BytesIO(notebook_bytes), 'test.ipynb')
            
            # Upload the file
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')
            assert response.status_code == 200
            
            # Get the file key from the response
            file_key = response.json['key']
            
            # Download the file
            response = client.get(f'/download?key={file_key}')
            assert response.status_code == 200
            assert b"Hello Jupyter" in response.data

        def test_upload_and_download_image(client):
            """Test uploading and then downloading an image file."""
            # Create a simple image file
            file_data = (io.BytesIO(b"JFIF image test content"), 'test.jpg')
            
            # Upload the file
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')
            assert response.status_code == 200
            
            # Get the file key from the response
            file_key = response.json['key']
            
            # Download the file
            response = client.get(f'/download?key={file_key}')
            assert response.status_code == 200
            assert b"JFIF image test content" in response.data

        def test_merge_pdfs_and_download(client):
            """Test merging PDFs and downloading the result."""
            # Create two PDF files
            file1_data = (io.BytesIO(b"PDF1 content"), 'test1.pdf')
            file2_data = (io.BytesIO(b"PDF2 content"), 'test2.pdf')
            
            # Upload both files
            response1 = client.post('/upload', data={'file': file1_data}, content_type='multipart/form-data')
            response2 = client.post('/upload', data={'file': file2_data}, content_type='multipart/form-data')
            
            file_key1 = response1.json['key']
            file_key2 = response2.json['key']
            
            # Mock the Celery task
            with patch('tasks.process_pdf_task.delay') as mock_process:
                mock_task = MagicMock()
                mock_task.id = "test-merge-task"
                mock_process.return_value = mock_task
                
                # Set up the task result in app.task_results
                merged_filename = f"merged_test.pdf"
                merged_path = os.path.join('processed', merged_filename)
                
                # Create the merged file
                with open(merged_path, 'wb') as f:
                    f.write(b'Merged PDF content')
                
                try:
                    # Process the merge
                    response = client.post('/process', json={
                        "command": "merge",
                        "file_keys": [file_key1, file_key2]
                    })
                    assert response.status_code == 202
                    
                    # Set up the result manually for testing
                    app.task_results[mock_task.id] = {
                        "key": merged_filename,
                        "filename": merged_filename,
                        "size": len(b'Merged PDF content')
                    }
                    app.task_timestamps[mock_task.id] = time.time()
                    
                    # Get task status
                    response = client.get(f'/task/{mock_task.id}')
                    assert response.status_code == 200
                    
                    # Download the merged file
                    download_key = response.json['result']['key']
                    response = client.get(f'/download?key={download_key}')
                    assert response.status_code == 200
                    assert b"Merged PDF content" in response.data
                finally:
                    # Clean up
                    if os.path.exists(merged_path):
                        os.remove(merged_path)

        def test_split_pdf_and_download(client):
            """Test splitting PDF and downloading the result."""
            # Create a PDF file
            file_data = (io.BytesIO(b"PDF content for splitting"), 'test_split.pdf')
            
            # Upload the file
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')
            file_key = response.json['key']
            
            # Mock the Celery task
            with patch('tasks.process_pdf_task.delay') as mock_process:
                mock_task = MagicMock()
                mock_task.id = "test-split-task"
                mock_process.return_value = mock_task
                
                # Set up the task result in app.task_results
                split_filename = f"split_page_1_test.pdf"
                split_path = os.path.join('processed', split_filename)
                
                # Create the split file
                with open(split_path, 'wb') as f:
                    f.write(b'Split PDF content - page 1')
                
                try:
                    # Process the split
                    response = client.post('/process', json={
                        "command": "split",
                        "file_keys": [file_key],
                        "params": {"pages": "1"}
                    })
                    assert response.status_code == 202
                    
                    # Set up the result manually for testing
                    app.task_results[mock_task.id] = {
                        "key": split_filename,
                        "filename": split_filename,
                        "size": len(b'Split PDF content - page 1')
                    }
                    app.task_timestamps[mock_task.id] = time.time()
                    
                    # Get task status
                    response = client.get(f'/task/{mock_task.id}')
                    assert response.status_code == 200
                    
                    # Download the split file
                    download_key = response.json['result']['key']
                    response = client.get(f'/download?key={download_key}')
                    assert response.status_code == 200
                    assert b"Split PDF content - page 1" in response.data
                finally:
                    # Clean up
                    if os.path.exists(split_path):
                        os.remove(split_path)

        def test_enhanced_convert_ipynb_to_pdf(client):
            """Test converting IPYNB to PDF and downloading the result."""
            # Create a simple Jupyter notebook
            notebook_json = {
                "cells": [{"cell_type": "code", "source": ["print('Hello Jupyter')"], "outputs": []}],
                "metadata": {"kernelspec": {"name": "python3"}},
                "nbformat": 4,
                "nbformat_minor": 4
            }
            
            # Convert to bytes
            notebook_bytes = json.dumps(notebook_json).encode('utf-8')
            file_data = (io.BytesIO(notebook_bytes), 'notebook.ipynb')
            
            # Upload the file
            response = client.post('/upload', data={'file': file_data}, content_type='multipart/form-data')
            assert response.status_code == 200
            file_key = response.json['key']
            
            # Mock the PDF processor
            with patch('app.pdf_processor.ipynb_to_pdf') as mock_converter:
                # Set up the conversion result
                converted_filename = "converted_notebook.pdf"
                converted_path = os.path.join('processed', converted_filename)
                
                # Create a dummy converted file
                with open(converted_path, 'wb') as f:
                    f.write(b'Converted notebook content')
                
                # Configure mock
                mock_converter.return_value = {
                    "key": converted_filename,
                    "filename": converted_filename,
                    "size": len(b'Converted notebook content')
                }
                
                try:
                    # Call the conversion endpoint
                    response = client.post('/enhanced/ipynb-to-pdf', json={"file_key": file_key})
                    assert response.status_code == 200
                    
                    # Download the converted file
                    download_key = response.json['result']['key']
                    response = client.get(f'/download?key={download_key}')
                    assert response.status_code == 200
                    assert b"Converted notebook content" in response.data
                finally:
                    # Clean up
                    if os.path.exists(converted_path):
                        os.remove(converted_path)