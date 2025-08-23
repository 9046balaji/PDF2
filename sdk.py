import requests
import time
import os
from typing import Dict, Any, List

class PDFSDK:
    """A client-side SDK to interact with the PDF Tool API."""
    
    def __init__(self, base_url: str = 'http://127.0.0.1:5000'):
        """
        Initializes the SDK with the base URL of the API.
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()

    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Checks for errors and returns the JSON response."""
        if not response.ok:
            raise requests.exceptions.HTTPError(
                f"API Error: {response.status_code} {response.reason} - {response.text}"
            )
        return response.json()

    def upload(self, file_path: str) -> str:
        """
        Uploads a single file using the simple upload endpoint.

        Args:
            file_path: The local path to the file to upload.

        Returns:
            The S3 key of the uploaded file.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")

        file_name = os.path.basename(file_path)
        with open(file_path, 'rb') as f:
            files = {'file': (file_name, f)}
            response = self.session.post(f'{self.base_url}/upload', files=files)
        
        data = self._handle_response(response)
        print(f"Successfully uploaded '{file_name}'. S3 Key: {data['key']}")
        return data['key']

    def process_file(self, command: str, file_keys: List[str], params: Dict[str, Any] = None) -> str:
        """
        Starts a processing job on one or more uploaded files.

        Args:
            command: The operation to perform (e.g., 'merge', 'compress').
            file_keys: A list of S3 keys for the files to process.
            params: A dictionary of extra parameters for the operation.

        Returns:
            The task ID for the processing job.
        """
        payload = {
            'command': command,
            'file_keys': file_keys,
            'params': params or {}
        }
        response = self.session.post(f'{self.base_url}/process', json=payload)
        data = self._handle_response(response)
        print(f"Started processing task '{command}'. Task ID: {data['task_id']}")
        return data['task_id']

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """

        Checks the status of a processing task.

        Args:
            task_id: The ID of the task to check.

        Returns:
            A dictionary containing the task status and result/error.
        """
        response = self.session.get(f'{self.base_url}/task/{task_id}')
        return self._handle_response(response)

    def poll_for_result(self, task_id: str, interval: int = 5, timeout: int = 300) -> Dict[str, Any]:
        """
        Polls the API until a task is complete or times out.

        Args:
            task_id: The ID of the task to poll.
            interval: The time to wait between checks (in seconds).
            timeout: The maximum time to wait for completion (in seconds).

        Returns:
            The final result object from a successful task.
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            status_data = self.get_task_status(task_id)
            status = status_data.get('status')
            print(f"Polling task {task_id}... Status: {status}")

            if status == 'SUCCESS':
                print("Task completed successfully.")
                return status_data['result']
            if status == 'FAILURE':
                raise RuntimeError(f"Task failed: {status_data.get('error', 'Unknown error')}")
            
            time.sleep(interval)
        
        raise TimeoutError(f"Polling timed out for task {task_id} after {timeout} seconds.")

    def download_file(self, s3_key: str, output_path: str):
        """
        Downloads a processed file.

        Args:
            s3_key: The S3 key of the file to download.
            output_path: The local path to save the file to.
        """
        url = f'{self.base_url}/download'
        with self.session.get(url, params={'key': s3_key}, stream=True) as r:
            r.raise_for_status()
            with open(output_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"Successfully downloaded file to '{output_path}'")

# --- Example Usage ---
if __name__ == '__main__':
    # This is an example of how to use the SDK to merge two PDFs.
    try:
        # Create dummy PDF files for the example
        with open('doc1.pdf', 'w') as f: f.write('dummy pdf 1')
        with open('doc2.pdf', 'w') as f: f.write('dummy pdf 2')
        
        sdk = PDFSDK()
        
        # 1. Upload files
        key1 = sdk.upload('doc1.pdf')
        key2 = sdk.upload('doc2.pdf')

        # 2. Start the processing job
        task_id = sdk.process_file(command='merge', file_keys=[key1, key2])

        # 3. Wait for the job to finish
        result = sdk.poll_for_result(task_id)
        
        # 4. Download the result
        output_filename = result.get('filename', 'merged_result.pdf')
        sdk.download_file(result['key'], output_filename)

        # Clean up dummy files
        os.remove('doc1.pdf')
        os.remove('doc2.pdf')

    except (requests.exceptions.RequestException, RuntimeError, FileNotFoundError) as e:
        print(f"\nAn error occurred: {e}")