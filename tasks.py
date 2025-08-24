import os
import tempfile
import traceback
import logging
import shutil
from celery import Celery, shared_task, chain
from pypdf import PdfReader, PdfWriter
import pikepdf
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import pdfplumber
from pdf2image import convert_from_path
from PIL import Image
import docx
import openpyxl

# AI/ML imports with graceful fallbacks
try:
    from langchain.document_loaders import PyPDFLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.embeddings import HuggingFaceEmbeddings
    from langchain.vectorstores import FAISS
    from langchain.chains import RetrievalQA
    from langchain.prompts import PromptTemplate
    from langchain.llms import HuggingFacePipeline
    from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logging.warning("AI features not available - install langchain and transformers")

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logging.warning("spaCy not available - NER features disabled")

try:
    from gensim import corpora
    from gensim.models import LdaModel
    GENSIM_AVAILABLE = True
except ImportError:
    GENSIM_AVAILABLE = False
    logging.warning("gensim not available - topic modeling disabled")

try:
    import mlflow.pyfunc
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    logging.warning("MLflow not available - model management disabled")

# Celery configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

celery = Celery('pdf_tasks', broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# AI-POWERED DOCUMENT INTELLIGENCE
# ============================================================================

@shared_task
def chat_with_pdf(file_key: str, question: str) -> dict:
    """
    Chat with PDF using RAG (Retrieval-Augmented Generation)
    """
    if not file_key or not question:
        return {"error": "File key or question is missing", "status": "failed"}

    if not AI_AVAILABLE:
        return {"error": "AI features not available", "status": "failed"}

    temp_dir = None
    try:
        if not os.path.exists(file_key):
            raise FileNotFoundError(f"File not found: {file_key}")
        
        # Step 1: Load PDF
        loader = PyPDFLoader(file_key)
        documents = loader.load()
        
        if not documents:
            raise ValueError("No content loaded from PDF.")
        
        # Step 2: Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        texts = text_splitter.split_documents(documents)
        
        # Step 3: Create embeddings with error handling
        try:
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        except Exception as embed_err:
            logger.error(f"Embedding model load failed: {embed_err}")
            raise RuntimeError("Failed to load embedding model.") from embed_err
        
        # Step 4: Create vector store in a temp dir for safety
        temp_dir = "temp_faiss_index"
        os.makedirs(temp_dir, exist_ok=True)
        vectorstore = FAISS.from_documents(texts, embeddings)
        vectorstore.save_local(temp_dir)
        vectorstore = FAISS.load_local(temp_dir, embeddings, allow_dangerous_deserialization=True)
        
        # Step 5: Set up LLM with local pipeline and error handling
        try:
            model_name = "google/flan-t5-large"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            llm_pipeline = pipeline("text2text-generation", model=model, tokenizer=tokenizer, max_length=512)
            llm = HuggingFacePipeline(pipeline=llm_pipeline)
        except Exception as llm_err:
            logger.error(f"LLM model load failed: {llm_err}")
            raise RuntimeError("Failed to load LLM model.") from llm_err
        
        # Custom prompt
        prompt_template = """Use the following pieces of context to answer the question. If you don't know the answer, say "I don't know."
        Context: {context}
        Question: {question}
        Answer:"""
        PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
        
        # Step 6: Create QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
            chain_type_kwargs={"prompt": PROMPT}
        )
        
        # Step 7: Run query with timeout or error catch
        try:
            result = qa_chain.run(question)
            if not result.strip():
                raise ValueError("Empty response from LLM.")
        except Exception as query_err:
            logger.error(f"Query failed: {query_err}")
            raise RuntimeError("Failed during query execution.") from query_err
        
        return {"answer": result, "status": "success"}
    
    except (FileNotFoundError, ValueError, RuntimeError) as e:
        logger.warning(f"Handled error: {e}")
        return {"error": str(e), "status": "failed", "trace": traceback.format_exc()}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"error": "Unexpected error during RAG processing", "status": "failed", "trace": traceback.format_exc()}
    finally:
        # Cleanup temp resources
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

@shared_task
def analyze_pdf(file_key: str) -> dict:
    """
    AI-powered PDF analysis: summarization, NER, topic modeling
    """
    if not file_key:
        return {"error": "File key is missing", "status": "failed"}

    if not AI_AVAILABLE:
        return {"error": "AI features not available", "status": "failed"}

    try:
        # Extract text
        if not os.path.exists(file_key):
            raise FileNotFoundError(f"File not found: {file_key}")
        
        reader = PdfReader(file_key)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text += page_text
        
        if not text:
            raise ValueError("No text extracted from PDF.")
        
        # Truncate text for models if too long
        if len(text) > 10000:
            text = text[:10000]
            logger.warning("Text truncated for processing.")
        
        # Summarization with local model
        try:
            model_name = "facebook/bart-large-cnn"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            summarizer = pipeline("summarization", model=model, tokenizer=tokenizer)
            summary = summarizer(text[:1024], max_length=130, min_length=30, do_sample=False)[0]['summary_text']
        except Exception as sum_err:
            logger.error(f"Summarization failed: {sum_err}")
            raise RuntimeError("Failed during summarization.") from sum_err
        
        # NER with spaCy
        entities = {"persons": [], "dates": [], "locations": []}
        if SPACY_AVAILABLE:
            try:
                nlp = spacy.load("en_core_web_sm")
                doc = nlp(text)
                entities = {
                    "persons": list(set(ent.text for ent in doc.ents if ent.label_ == "PERSON")),
                    "dates": list(set(ent.text for ent in doc.ents if ent.label_ == "DATE")),
                    "locations": list(set(ent.text for ent in doc.ents if ent.label_ == "GPE")),
                }
            except Exception as ner_err:
                logger.error(f"NER failed: {ner_err}")
                # Continue without NER
        
        # Topic modeling
        topics = []
        if GENSIM_AVAILABLE:
            try:
                if SPACY_AVAILABLE:
                    doc = nlp(text)
                    tokens = [token.text.lower() for token in doc if not token.is_stop and not token.is_punct and len(token.text) > 2]
                else:
                    # Simple tokenization fallback
                    tokens = [word.lower() for word in text.split() if len(word) > 2]
                
                if tokens:
                    dictionary = corpora.Dictionary([tokens])
                    corpus = [dictionary.doc2bow(tokens)]
                    lda = LdaModel(corpus, num_topics=3, id2word=dictionary, passes=10, random_state=42)
                    topics = [lda.print_topic(i) for i in range(3)]
            except Exception as topic_err:
                logger.error(f"Topic modeling failed: {topic_err}")
                # Continue without topic modeling
        
        return {
            "summary": summary,
            "entities": entities,
            "topics": topics,
            "status": "success"
        }
    
    except (FileNotFoundError, ValueError, RuntimeError) as e:
        logger.warning(f"Handled error: {e}")
        return {"error": str(e), "status": "failed", "trace": traceback.format_exc()}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"error": "Unexpected error during analysis", "status": "failed", "trace": traceback.format_exc()}

@shared_task
def classify_document(file_key: str) -> dict:
    """
    Document classification using MLflow models
    """
    if not file_key:
        return {"error": "File key is missing", "status": "failed"}

    if not MLFLOW_AVAILABLE:
        return {"error": "MLflow not available", "status": "failed"}

    try:
        # Extract text from PDF
        reader = PdfReader(file_key)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text += page_text
        
        if not text:
            raise ValueError("No text for classification.")
        
        try:
            model_uri = "models:/classifier/Production"
            model = mlflow.pyfunc.load_model(model_uri)
        except Exception as ml_err:
            logger.error(f"Model load failed: {ml_err}")
            raise RuntimeError("MLflow model not available.") from ml_err
        
        input_data = {"text": [text]}
        prediction = model.predict(input_data)
        return {"classification": prediction[0], "status": "success"}
    
    except (ValueError, RuntimeError) as e:
        return {"error": str(e), "status": "failed", "trace": traceback.format_exc()}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"error": "Unexpected error in classification", "status": "failed", "trace": traceback.format_exc()}

@shared_task
def combine_results(results: list) -> dict:
    try:
        classify_res, analyze_res = results
        if classify_res.get("status") != "success" or analyze_res.get("status") != "success":
            raise ValueError("One or more upstream tasks failed")
        
        return {
            "classification": classify_res.get("classification"),
            "entities": analyze_res.get("entities"),
            "status": "success"
        }
    except ValueError as e:
        logger.warning(f"Combine results error: {e}")
        return {"error": str(e), "status": "failed"}
    except Exception as e:
        logger.error(f"Unexpected combine error: {e}\n{traceback.format_exc()}")
        return {"error": "Combine failed", "status": "failed"}

@shared_task
def update_file_metadata(analysis_results: dict, file_id: int) -> str:
    try:
        if analysis_results.get("status") != "success":
            raise ValueError("Analysis failed upstream")
        
        from app import db, FileRecord
        file_record = FileRecord.query.get(file_id)
        if not file_record:
            raise ValueError(f"File record not found: {file_id}")
        
        file_record.doc_type = analysis_results.get('classification')
        file_record.doc_metadata = analysis_results.get('entities')
        db.session.commit()

        if file_record.user.webhook_url:
            import requests
            try:
                requests.post(file_record.user.webhook_url, json={"event": "file_processed", "file_id": file_id, "metadata": analysis_results})
            except Exception as e:
                logger.warning(f"Webhook send failed for user {file_record.user.id}: {e}")

        return f"Metadata updated for file_id {file_id}"
    except ValueError as e:
        logger.warning(f"Metadata update value error: {e}")
        db.session.rollback()
        return f"Failed: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected metadata update error: {e}\n{traceback.format_exc()}")
        db.session.rollback()
        return "Unexpected error in metadata update"

@shared_task
def on_upload_processing(file_id: int, file_key: str):
    try:
        workflow = chain(
            group(classify_document.s(file_key), analyze_pdf.s(file_key)),
            combine_results.s(),
            update_file_metadata.s(file_id)
        )
        result = workflow.apply_async()
        final = result.get(timeout=600)
        return {"status": "success", "result": final}
    except celery.exceptions.TimeoutError:
        logger.error("On-upload processing timeout")
        return {"error": "Processing timed out", "status": "failed"}
    except Exception as e:
        logger.error(f"Unexpected on-upload error: {e}\n{traceback.format_exc()}")
        return {"error": "On-upload processing failed", "status": "failed"}

# ============================================================================
# WORKFLOW AUTOMATION (CHAINED TASKS)
# ============================================================================

@shared_task
def unlock_pdf_task(input_file: str) -> str:
    """Unlock PDF by removing password protection"""
    try:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        # Implementation for unlocking PDF
        output_file = input_file.replace('.pdf', '_unlocked.pdf')
        # For now, just copy the file (implement actual unlocking logic)
        shutil.copy2(input_file, output_file)
        return output_file
    except Exception as e:
        logger.error(f"Unlock failed: {e}")
        raise

@shared_task
def run_ocr_task(input_file: str) -> str:
    """Run OCR on PDF to extract text"""
    try:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        output_file = input_file.replace('.pdf', '_ocr.pdf')
        # For now, just copy the file (implement actual OCR logic)
        shutil.copy2(input_file, output_file)
        return output_file
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        raise

@shared_task
def compress_pdf_task(input_file: str) -> str:
    """Compress PDF file"""
    try:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        output_file = input_file.replace('.pdf', '_compressed.pdf')
        # For now, just copy the file (implement actual compression logic)
        shutil.copy2(input_file, output_file)
        return output_file
    except Exception as e:
        logger.error(f"Compression failed: {e}")
        raise

@shared_task
def add_watermark_task(input_file: str) -> str:
    """Add watermark to PDF"""
    try:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        output_file = input_file.replace('.pdf', '_watermarked.pdf')
        # For now, just copy the file (implement actual watermarking logic)
        shutil.copy2(input_file, output_file)
        return output_file
    except Exception as e:
        logger.error(f"Watermarking failed: {e}")
        raise

@shared_task
def workflow_master(file_key: str, commands: list) -> dict:
    """
    Master workflow that chains multiple PDF operations
    """
    if not file_key or not commands:
        return {"error": "File key or commands missing", "status": "failed"}

    try:
        task_map = {
            "unlock": unlock_pdf_task,
            "ocr": run_ocr_task,
            "compress": compress_pdf_task,
            "watermark": add_watermark_task,
        }
        
        invalid_cmds = [cmd for cmd in commands if cmd not in task_map]
        if invalid_cmds:
            raise ValueError(f"Unknown commands: {', '.join(invalid_cmds)}")
        
        # Build chain
        workflow_chain = task_map[commands[0]].s(file_key)
        for cmd in commands[1:]:
            workflow_chain = workflow_chain | task_map[cmd].s()
        
        # Execute and get result
        async_result = workflow_chain.apply_async()
        final_file = async_result.get(timeout=300)  # 5 min timeout
        
        return {"final_file": final_file, "status": "success"}
    
    except Exception as e:
        logger.error(f"Unexpected error in workflow: {e}")
        return {"error": "Unexpected error in workflow", "status": "failed", "trace": traceback.format_exc()}

# ============================================================================
# CORE PDF PROCESSING TASKS (ENHANCED)
# ============================================================================

@shared_task
def merge_pdfs_task(input_files: list, output_file: str) -> dict:
    """Merge multiple PDFs into one"""
    try:
        merger = PdfReader(input_files[0])
        writer = PdfWriter()
        
        for file_path in input_files:
            reader = PdfReader(file_path)
            for page in reader.pages:
                writer.add_page(page)
        
        with open(output_file, 'wb') as output:
            writer.write(output)
        
        return {"status": "success", "output_file": output_file}
    except Exception as e:
        logger.error(f"Merge failed: {e}")
        return {"error": str(e), "status": "failed"}

@shared_task
def split_pdf_task(input_file: str, output_dir: str, pages: str = None) -> dict:
    """Split PDF into multiple files"""
    try:
        reader = PdfReader(input_file)
        
        if not pages:
            # Split every page
            for i, page in enumerate(reader.pages):
                writer = PdfWriter()
                writer.add_page(page)
                output_path = os.path.join(output_dir, f'page_{i+1}.pdf')
                with open(output_path, 'wb') as output:
                    writer.write(output)
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
                if 1 <= page_num <= len(reader.pages):
                    writer = PdfWriter()
                    writer.add_page(reader.pages[page_num - 1])
                    output_path = os.path.join(output_dir, f'page_{page_num}.pdf')
                    with open(output_path, 'wb') as output:
                        writer.write(output)
        
        return {"status": "success", "output_dir": output_dir}
    except Exception as e:
        logger.error(f"Split failed: {e}")
        return {"error": str(e), "status": "failed"}

@shared_task
def compress_pdf_task(input_file: str, output_file: str, quality: str = 'medium') -> dict:
    """Compress PDF file"""
    try:
        # Implementation for compression
        # For now, just copy the file
        shutil.copy2(input_file, output_file)
        return {"status": "success", "output_file": output_file}
    except Exception as e:
        logger.error(f"Compression failed: {e}")
        return {"error": str(e), "status": "failed"}

@shared_task
def rotate_pdf_task(input_file: str, output_file: str, angle: int = 90) -> dict:
    """Rotate PDF pages"""
    try:
        reader = PdfReader(input_file)
        writer = PdfWriter()
        
        for page in reader.pages:
            page.rotate(angle)
            writer.add_page(page)
        
        with open(output_file, 'wb') as output:
            writer.write(output)
        
        return {"status": "success", "output_file": output_file}
    except Exception as e:
        logger.error(f"Rotation failed: {e}")
        return {"error": str(e), "status": "failed"}

# ============================================================================
# TASK STATUS AND MONITORING
# ============================================================================

def get_task_status(task_id: str) -> dict:
    """Get the status of a Celery task"""
    try:
        result = celery.AsyncResult(task_id)
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "info": result.info if result.ready() else None
        }
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        return {"error": str(e), "status": "unknown"}

# ============================================================================
# CELERY CONFIGURATION
# ============================================================================

@celery.task(bind=True)
def process_pdf_task(self, command: str, file_paths: list, **kwargs) -> dict:
    """
    Main Celery task that dispatches to the correct PDF operation
    """
    self.update_state(state='PROGRESS', meta={'status': f'Starting {command}...'})
    
    task_map = {
        'merge': merge_pdfs_task,
        'split': split_pdf_task,
        'compress': compress_pdf_task,
        'rotate': rotate_pdf_task,
        'chat_pdf': chat_with_pdf,
        'analyze_pdf': analyze_pdf,
        'classify_document': classify_document,
        'workflow': workflow_master,
    }
    
    if command not in task_map:
        return {"error": f"Unknown command: {command}", "status": "failed"}
    
    try:
        if command in ['chat_pdf', 'analyze_pdf', 'classify_document']:
            # AI tasks take file_key and additional params
            file_key = file_paths[0] if file_paths else kwargs.get('file_key')
            if command == 'chat_pdf':
                question = kwargs.get('question', '')
                result = task_map[command](file_key, question)
            elif command == 'classify_document':
                result = task_map[command](file_key)
            else:
                result = task_map[command](file_key)
        elif command == 'workflow':
            # Workflow takes file_key and commands
            file_key = file_paths[0] if file_paths else kwargs.get('file_key')
            commands = kwargs.get('commands', [])
            result = task_map[command](file_key, commands)
        else:
            # Standard PDF operations
            output_file = kwargs.get('output_file', f'processed_{command}.pdf')
            result = task_map[command](file_paths, output_file, **kwargs)
        
        self.update_state(state='SUCCESS', meta={'status': 'Completed successfully'})
        return result
    
    except Exception as e:
        logger.error(f"Task {command} failed: {e}")
        self.update_state(state='FAILURE', meta={'status': f'Failed: {str(e)}'})
        return {"error": str(e), "status": "failed"}

@shared_task
def find_frequent_workflows():
    try:
        from app import db, User, ProcessingRecord
        from collections import Counter
        import datetime

        users = User.query.all()
        for user in users:
            records = ProcessingRecord.query.filter_by(user_id=user.id).order_by(ProcessingRecord.created_at.asc()).limit(100).all()
            if not records:
                continue
            
            sessions = []
            current_session = []
            for i in range(len(records)):
                if current_session:
                    time_diff = (records[i].created_at - records[i-1].created_at).total_seconds()
                    if time_diff > 300:
                        sessions.append(tuple(current_session))
                        current_session = []
                current_session.append(records[i].command)
            if current_session:
                sessions.append(tuple(current_session))
            
            if not sessions:
                continue
            
            most_common = Counter(sessions).most_common(1)
            if most_common:
                user.suggested_workflow = list(most_common[0][0])
                db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Frequent workflows error: {e}\n{traceback.format_exc()}")

@shared_task
def multi_document_chat(file_keys: list, question: str) -> dict:
    if not file_keys or not question:
        return {"error": "File keys or question missing", "status": "failed"}

    temp_dir = None
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        from langchain import HuggingFacePipeline, PromptTemplate, RetrievalQA

        all_texts = []
        for file_key in file_keys:
            if not os.path.exists(file_key):
                logger.warning(f"Skipping missing file: {file_key}")
                continue
            
            loader = PyPDFLoader(file_key)
            documents = loader.load()
            if not documents:
                logger.warning(f"No content in {file_key}")
                continue
            
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            texts = text_splitter.split_documents(documents)
            all_texts.extend(texts[:100])
        
        if not all_texts:
            raise ValueError("No content loaded from any files.")
        
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': device}
        )
        
        temp_dir = "temp_multi_faiss"
        os.makedirs(temp_dir, exist_ok=True)
        vectorstore = FAISS.from_documents(all_texts, embeddings)
        vectorstore.save_local(temp_dir)
        vectorstore = FAISS.load_local(temp_dir, embeddings, allow_dangerous_deserialization=True)
        
        model_name = "google/flan-t5-large"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        pipeline_device = 0 if torch.cuda.is_available() else -1
        llm_pipeline = pipeline("text2text-generation", model=model, tokenizer=tokenizer, max_length=512, device=pipeline_device)
        llm = HuggingFacePipeline(pipeline=llm_pipeline)
        
        prompt_template = """Use the following pieces of context to answer the question. If you don't know the answer, say "I don't know."
        Context: {context}
        Question: {question}
        Answer:"""
        PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
            chain_type_kwargs={"prompt": PROMPT}
        )
        
        result = qa_chain.run(question)
        if not result.strip():
            raise ValueError("Empty response from LLM.")
        
        return {"answer": result, "status": "success"}
    
    except (FileNotFoundError, ValueError) as e:
        logger.warning(f"Handled multi-chat error: {e}")
        return {"error": str(e), "status": "failed", "trace": traceback.format_exc()}
    except Exception as e:
        logger.error(f"Unexpected multi-chat error: {e}\n{traceback.format_exc()}")
        return {"error": "Unexpected error in multi-document chat", "status": "failed", "trace": traceback.format_exc()}
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

@shared_task
def import_from_drive(user_id: int, drive_file_id: str) -> dict:
    try:
        from app import db, User, FileRecord
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseDownload
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        import json
        import io

        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User not found: {user_id}")
        
        creds = Credentials.from_authorized_user_info(json.loads(user.google_drive_token), SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
        
        service = build('drive', 'v3', credentials=creds)
        
        request = service.files().get_media(fileId=drive_file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        file_content = fh.getvalue()
        
        metadata = service.files().get(fileId=drive_file_id, fields='name').execute()
        original_filename = metadata['name']
        unique_filename = f"{user.id}_{drive_file_id}_{original_filename}"
        
        # Assuming a function to save to local storage
        def save_to_uploads(content, filename):
            filepath = os.path.join('uploads', filename)
            with open(filepath, 'wb') as f:
                f.write(content)
            return filepath

        file_key = save_to_uploads(file_content, unique_filename)
        
        file_record = FileRecord(
            filename=unique_filename,
            original_filename=original_filename,
            file_size=len(file_content),
            file_type='pdf',
            user_id=user_id
        )
        db.session.add(file_record)
        db.session.commit()
        
        on_upload_processing.delay(file_record.id, file_key)
        
        return {"file_key": file_key, "status": "success"}
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected import error: {e}\n{traceback.format_exc()}")
        return {"error": "Import failed", "status": "failed"}

if __name__ == '__main__':
    celery.start()