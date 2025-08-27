# tasks.py
# This file defines the Celery tasks referenced in the Flask blueprint.
# Assumptions:
# - Celery is configured in your app (e.g., in app/__init__.py with celery = Celery(app)).
# - For PDF processing, we use pypdf to extract text. Install via pip install pypdf.
# - For AI features (chat, analyze), we use xAI's Grok API for querying/analyzing PDF content.
#   Get API details and key from https://x.ai/api.
# - For classification, we use a simple ML model with scikit-learn (install via pip install scikit-learn).
#   This is a basic example; replace with MLflow integration if needed.
# - For workflow, we execute a series of commands as steps, assuming commands are strings like "analyze", "classify", etc.
# - Error handling and logging added for robustness.
# - Note: Scanning the PDF means extracting text from it, which is done here to enable querying.

from celery import shared_task
from pdf_processor import PDFProcessor, PDFOperationError
import logging
import os
from typing import List, Dict, Any
import requests  # For API calls

try:
    from pypdf import PdfReader
except ImportError:
    raise ImportError("pypdf is required for PDF processing. Install with 'pip install pypdf'.")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    # Example: Pre-trained or simple model; in production, load from MLflow.
except ImportError:
    raise ImportError("scikit-learn is required for classification. Install with 'pip install scikit-learn'.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Placeholder for xAI Grok API key and endpoint. Replace with actual values.
# See https://x.ai/api for details on how to obtain and use the API.
GROK_API_KEY = os.getenv('GROK_API_KEY', 'SET_GROK_API_KEY_ENV_VAR_IN_PRODUCTION')
GROK_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions'  # Example endpoint; check docs for exact.

def extract_pdf_text(fpath: str) -> str:
    """
    Extract all text from the PDF file for scanning/processing.
    """
    try:
        reader = PdfReader(fpath)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        logger.info(f"Extracted text from PDF: {fpath}, length: {len(text)}")
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF {fpath}: {str(e)}")
        raise ValueError("Failed to extract PDF text")

def call_grok_api(prompt: str, model: str = 'grok-4') -> str:
    """
    Call xAI Grok API with a prompt to get a response.
    Handles chat, analysis, etc.
    """
    try:
        headers = {
            'Authorization': f'Bearer {GROK_API_KEY}',
            'Content-Type': 'application/json'
        }
        data = {
            'model': model,
            'messages': [{'role': 'user', 'content': prompt}]
        }
        response = requests.post(GROK_API_ENDPOINT, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()['choices'][0]['message']['content']
        logger.info("Grok API call successful")
        return result
    except Exception as e:
        logger.error(f"Error calling Grok API: {str(e)}")
        raise ValueError("Failed to call AI API")

@shared_task
def chat_with_pdf(fpath: str, question: str) -> Dict[str, Any]:
    """
    Scan the PDF (extract text) and answer the user's question about it using Grok API.
    """
    try:
        pdf_text = extract_pdf_text(fpath)
        if not pdf_text:
            return {"error": "No text extracted from PDF"}
        
        prompt = f"Based on the following PDF content, answer this question: {question}\n\nPDF Content:\n{pdf_text[:8000]}"  # Truncate if too long; adjust as needed.
        answer = call_grok_api(prompt)
        return {"answer": answer}
    except Exception as e:
        return {"error": str(e)}

@shared_task
def analyze_pdf(fpath: str) -> Dict[str, Any]:
    """
    Scan and analyze the PDF: summarize, key insights, etc., using Grok API.
    """
    try:
        pdf_text = extract_pdf_text(fpath)
        if not pdf_text:
            return {"error": "No text extracted from PDF"}
        
        prompt = f"Analyze and summarize the following PDF content. Provide key points, structure, and insights:\n\n{pdf_text[:8000]}"
        analysis = call_grok_api(prompt)
        return {"analysis": analysis}
    except Exception as e:
        return {"error": str(e)}

@shared_task
def classify_document(fpath: str) -> Dict[str, Any]:
    """
    Classify the document using a simple ML model (e.g., topic classification).
    This is a placeholder; integrate with MLflow for production models.
    Example categories: 'invoice', 'contract', 'report', 'other'.
    """
    try:
        pdf_text = extract_pdf_text(fpath)
        if not pdf_text:
            return {"error": "No text extracted from PDF"}
        
        # Simple example ML model (train on dummy data for demo).
        # In real use, load model from MLflow.
        categories = ['invoice', 'contract', 'report', 'other']
        train_texts = [
            "Invoice number total amount due date",  # invoice
            "Agreement parties terms conditions signature",  # contract
            "Annual report financials analysis charts",  # report
            "Random text miscellaneous"  # other
        ]
        vectorizer = TfidfVectorizer()
        X_train = vectorizer.fit_transform(train_texts)
        y_train = [0, 1, 2, 3]
        model = MultinomialNB()
        model.fit(X_train, y_train)
        
        X_test = vectorizer.transform([pdf_text])
        pred = model.predict(X_test)[0]
        category = categories[pred]
        logger.info(f"Classified document {fpath} as {category}")
        return {"category": category}
    except Exception as e:
        return {"error": str(e)}

@shared_task
def workflow_master(fpath: str, commands: List[str]) -> Dict[str, Any]:
    """
    Execute a workflow of commands on the PDF.
    Commands are strings like 'extract_text', 'analyze', 'classify', 'chat:question_here'.
    Returns results from each step.
    """
    try:
        results = {}
        pdf_text = None  # Cache extracted text
        
        for cmd in commands:
            if cmd == 'extract_text':
                pdf_text = extract_pdf_text(fpath)
                results['extract_text'] = pdf_text[:500] + '...'  # Truncated for response
            elif cmd == 'analyze':
                if pdf_text is None:
                    pdf_text = extract_pdf_text(fpath)
                prompt = f"Summarize: {pdf_text[:8000]}"
                results['analyze'] = call_grok_api(prompt)
            elif cmd == 'classify':
                if pdf_text is None:
                    pdf_text = extract_pdf_text(fpath)
                results['classify'] = classify_document(fpath)['category']  # Reuse function
            elif cmd.startswith('chat:'):
                question = cmd.split(':', 1)[1]
                if pdf_text is None:
                    pdf_text = extract_pdf_text(fpath)
                prompt = f"Answer '{question}' based on: {pdf_text[:8000]}"
                results[f'chat_{question}'] = call_grok_api(prompt)
            else:
                results[cmd] = {"error": "Unknown command"}
        
        return {"workflow_results": results}
    except Exception as e:
        return {"error": str(e)}

# Additional tasks for enhanced functionality

@shared_task
def multi_document_chat(file_paths: List[str], question: str) -> Dict[str, Any]:
    """
    Chat with multiple PDF documents at once.
    """
    try:
        all_texts = []
        for fpath in file_paths:
            try:
                text = extract_pdf_text(fpath)
                all_texts.append(text)
            except Exception as e:
                logger.warning(f"Failed to extract text from {fpath}: {e}")
        
        if not all_texts:
            return {"error": "No text could be extracted from any PDF"}
        
        combined_text = "\n\n---\n\n".join(all_texts)
        prompt = f"Based on the following multiple PDF documents, answer this question: {question}\n\nDocuments:\n{combined_text[:8000]}"
        answer = call_grok_api(prompt)
        return {"answer": answer}
    except Exception as e:
        return {"error": str(e)}

@shared_task
def import_from_drive(user_id: int, drive_file_id: str) -> Dict[str, Any]:
    """
    Import a file from Google Drive and process it.
    This is a placeholder for Google Drive integration.
    """
    try:
        # Placeholder implementation
        # In real implementation, you would:
        # 1. Use Google Drive API to download the file
        # 2. Save it to the uploads folder
        # 3. Create a FileRecord entry
        # 4. Return the file key
        
        logger.info(f"Importing Drive file {drive_file_id} for user {user_id}")
        return {"status": "imported", "file_id": drive_file_id}
    except Exception as e:
        return {"error": str(e)}

@shared_task
def process_pdf_task(operation: str, input_paths: List[str], output_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generic processing task that calls PDFProcessor methods in the background.
    Supports single-file and multi-file operations (e.g., merge_pdfs).
    """
    try:
        logger.info(f"[Celery] {operation} -> inputs: {input_paths}, output: {output_path}")
        processor = PDFProcessor()
        method = getattr(processor, operation)
        # Prepare arguments
        kwargs = params.copy() if isinstance(params, dict) else {}
        if operation == 'merge_pdfs':
            result_text = method(pdf_list=input_paths, output_path=output_path)
        else:
            # Use first input for single-file ops
            result_text = method(input_path=input_paths[0], output_path=output_path, **kwargs)
        # Normalize result to previous schema expected by frontend (key, filename, size)
        try:
            size = os.path.getsize(output_path)
            key = os.path.basename(output_path)
        except Exception:
            size = None
            key = os.path.basename(output_path)
        return {"key": key, "filename": key, "size": size, "message": result_text}
    except Exception as e:
        logger.error(f"[Celery] Task failed: {e}", exc_info=True)
        return {"status": "FAILURE", "error": str(e)}

# Celery configuration
from celery import Celery

# Configure Celery
celery = Celery('pdf_tool')

# Use Redis as broker and backend
celery.conf.update(
    broker_url=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
)

# Optional: Configure task routes
celery.conf.task_routes = {
    'tasks.chat_with_pdf': {'queue': 'ai'},
    'tasks.analyze_pdf': {'queue': 'ai'},
    'tasks.classify_document': {'queue': 'ai'},
    'tasks.workflow_master': {'queue': 'ai'},
    'tasks.multi_document_chat': {'queue': 'ai'},
    'tasks.process_pdf_task': {'queue': 'pdf'},
    'tasks.import_from_drive': {'queue': 'pdf'},
}

if __name__ == '__main__':
    celery.start()