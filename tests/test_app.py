import pytest
from unittest.mock import patch, MagicMock
import io

# Important: Make sure your app object is importable.
# If your main file is app.py, this will work.
from app import app

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