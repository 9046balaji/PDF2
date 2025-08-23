import os
import tempfile
from celery import Celery
from pypdf import PdfMerger
import boto3
from botocore.exceptions import ClientError

# --- Celery and S3 Configuration ---
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')

S3_ENDPOINT_URL = os.environ.get('S3_ENDPOINT_URL', 'http://minio:9000')
S3_ACCESS_KEY = os.environ.get('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.environ.get('S3_SECRET_KEY', 'minioadmin')
S3_BUCKET = 'pdfs'

celery = Celery('tasks', broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)

s3 = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT_URL,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY
)

# --- Helper Function ---
def run_task_with_s3(input_keys, output_key, task_func, **kwargs):
    """
    A helper to manage S3 downloads/uploads for a task.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        input_paths = []
        for key in input_keys:
            path = os.path.join(tmpdir, os.path.basename(key))
            s3.download_file(S3_BUCKET, key, path)
            input_paths.append(path)

        output_path = os.path.join(tmpdir, os.path.basename(output_key))
        
        # Execute the core PDF logic
        task_func(input_paths, output_path, **kwargs)

        # Upload the result
        s3.upload_file(output_path, S3_BUCKET, output_key)
        
    return {
        "key": output_key,
        "filename": os.path.basename(output_key),
        "size": s3.head_object(Bucket=S3_BUCKET, Key=output_key)['ContentLength']
    }

# --- Core Task Logic (from pdf_tool.py) ---
def merge_task_logic(input_paths, output_path, **kwargs):
    merger = PdfMerger()
    for path in input_paths:
        merger.append(path)
    merger.write(output_path)
    merger.close()

def split_task_logic(input_paths, output_path, **kwargs):
    """Split PDF into multiple files by pages"""
    import pikepdf
    from pathlib import Path
    
    pdf = pikepdf.open(input_paths[0])
    pages = kwargs.get('pages', '')
    
    if not pages:
        # Split every page
        for i, page in enumerate(pdf.pages):
            new_pdf = pikepdf.new()
            new_pdf.pages.append(page)
            split_path = str(output_path).replace('.pdf', f'_page_{i+1}.pdf')
            new_pdf.save(split_path)
    else:
        # Parse page ranges like "1-3,5,7-9"
        page_ranges = []
        for part in pages.split(','):
            if '-' in part:
                start, end = map(int, part.split('-'))
                page_ranges.extend(range(start, end + 1))
            else:
                page_ranges.append(int(part))
        
        for i, page_num in enumerate(page_ranges):
            if 1 <= page_num <= len(pdf.pages):
                new_pdf = pikepdf.new()
                new_pdf.pages.append(pdf.pages[page_num - 1])
                split_path = str(output_path).replace('.pdf', f'_page_{page_num}.pdf')
                new_pdf.save(split_path)

def compress_task_logic(input_paths, output_path, **kwargs):
    """Compress PDF file"""
    import pikepdf
    
    quality = kwargs.get('quality', 'medium')
    pdf = pikepdf.open(input_paths[0])
    
    # Apply compression based on quality setting
    if quality == 'low':
        pdf.save(output_path, linearize=True, compress_streams=True, preserve_pdfa=False)
    elif quality == 'high':
        pdf.save(output_path, linearize=True, compress_streams=False, preserve_pdfa=True)
    else:  # medium
        pdf.save(output_path, linearize=True, compress_streams=True, preserve_pdfa=True)

def rotate_task_logic(input_paths, output_path, **kwargs):
    """Rotate PDF pages"""
    import pikepdf
    
    angle = int(kwargs.get('angle', '90'))
    pdf = pikepdf.open(input_paths[0])
    
    # Rotate all pages
    for page in pdf.pages:
        page.rotate(angle, relative=True)
    
    pdf.save(output_path)

# --- Celery Task Definition ---
@celery.task(bind=True)
def process_pdf_task(self, command, file_keys, params):
    """The main Celery task that dispatches to the correct PDF operation."""
    self.update_state(state='PROGRESS', meta={'status': f'Starting {command}...'})
    
    # Determine the function to run based on the command
    task_map = {
        'merge': merge_task_logic,
        'split': split_task_logic,
        'compress': compress_task_logic,
        'rotate': rotate_task_logic,
    }

    if command not in task_map:
        raise ValueError(f"Unknown command: {command}")

    # Define a unique output key
    output_key = f"processed/{command}-{os.path.basename(file_keys[0])}"
    
    result = run_task_with_s3(
        input_keys=file_keys,
        output_key=output_key,
        task_func=task_map[command],
        **params
    )
    
    self.update_state(state='SUCCESS')
    return result